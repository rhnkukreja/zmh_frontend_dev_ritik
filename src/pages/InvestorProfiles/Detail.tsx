import "@/assets/css/vendors/simplebar.css";
import Lucide from "@/components/Base/Lucide";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { useEffect, useMemo, useState, useRef } from "react";
import DOMPurify from "dompurify";
import { decryptNotesText } from "@/utils/notesCrypto";

import _ from "lodash";
import Button from "@/components/Base/Button";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useNavigationHistory } from "@/hooks/useNavigationHistory";
import { AppDispatch, RootState } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchSingleInvestersProfile,
  updateInvestersProfile,
} from "@/stores/investersProfileSlice";
import { Dialog } from "@/components/Base/Headless";
import { investersProfileService } from "@/services/investersProfile";
import { institutionStatsService } from "@/services/institutionStats";
import { domainNotesService } from "@/services/domainNotes";

import LoadingWrapper from "@/components/LoadingWrapper";

import EditableSection from "./components/EditableSections";
import dayjs from "dayjs";
import Tippy from "@/components/Base/Tippy";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import {
  baseURL,
  investorProfileEditableSectionsEquity,
  investorProfileEditableSectionsInvestors,
} from "@/constant";
import { toast } from "react-toastify";
import { DomainNote, InstitutionHierarchyItem } from "@/types/domainNotes";
import { InvestersProfile, KeyContact } from "@/types/investerProfiles";

import clsx from "clsx";
import { FormSwitch } from "@/components/Base/Form";
import FormInput from "@/components/Base/Form/FormInput";
import { Controller, useForm } from "react-hook-form";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import { ChevronLeft } from "lucide-react";
import { setPage } from "@/stores/investersProfileSlice";
import { shouldSuppressLocalErrorToast } from "@/utils/errorToast";

// --- START OF FORMATTING HELPER FUNCTIONS ---
const renderTextWithLinksHtml = (text: string) => {
  let html = text;
  // Replace Bold Text
  html = html.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="font-bold text-gray-900">$1</strong>'
  );
  // Replace Markdown Links
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline ml-1 font-semibold">$1</a>'
  );
  return html;
};

const formatContentHtml = (text: string) => {
  if (!text) return "";
  const lines = text.split("\n");
  
  let html = "";
  let inList = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Handle empty lines
    if (!trimmed) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += '<div class="h-2"></div>';
      return;
    }

    const isBullet = /^[-\*•]\s+/.test(trimmed) || /^[-\*•]$/.test(trimmed);
    const isNumberedHeader = /^\d+\.\s/.test(trimmed);
    const isHashHeader = /^#+\s/.test(trimmed);
    const isShortHeader = trimmed.endsWith(":") && trimmed.length < 80 && !isBullet;

    let cleanLine = trimmed
      .replace(/^[-•]\s*/, "")
      .replace(/^\*(?!\*)\s*/, "")
      .replace(/^#+\s*/, "")
      .trim();

    const contentHtml = renderTextWithLinksHtml(cleanLine);

    if (isNumberedHeader || isShortHeader || isHashHeader) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<div class="font-bold mt-6 mb-3 text-[15px] text-gray-800">${contentHtml}</div>`;
      
    } else if (isBullet) {
      // 🌟 NATIVE HTML LIST FIX 🌟
      // By wrapping adjacent bullets in a standard <ul> tag, rich text editors 
      // will natively keep the text and bullet on the same line perfectly.
      if (!inList) {
        html += '<ul class="list-disc ml-6 mb-4 text-[14px] text-gray-600 marker:text-pink-500 space-y-2">';
        inList = true;
      }
      html += `<li class="leading-relaxed pl-2">${contentHtml}</li>`;
      
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<div class="text-[14px] mb-4 leading-relaxed text-gray-600">${contentHtml}</div>`;
    }
  });

  // Close list if it was the last item
  if (inList) {
    html += "</ul>";
  }

  return html;
};
// --- END OF FORMATTING HELPER FUNCTIONS ---

function Main() {
  const dropzoneSingleRef = useRef<DropzoneElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { currentPage } = location.state || {};

  const { control } = useForm();

  const dispatch: AppDispatch = useAppDispatch();
  const { singleInvesterProfile, loading } = useAppSelector(
    (state) => state.investersProfile
  );

  const { user } = useAppSelector((state) => state.authentiction);
  const params = useParams();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isUploadingContacts, setIsUploadingContacts] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [expandedSections, setExpandedSections] = useState<boolean[]>(() => {
    return Object.keys(investorProfileEditableSectionsInvestors).map((_, idx) => idx === 0);
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingProfile, setIsDownloadingProfile] = useState(false);
  const [isViewNotesModalOpen, setIsViewNotesModalOpen] = useState(false);
  const [isInstitutionNotesLoading, setIsInstitutionNotesLoading] = useState(false);
  const [hasInvestorProfileNotes, setHasInvestorProfileNotes] = useState(false);
  const [institutionNotesHierarchy, setInstitutionNotesHierarchy] = useState<InstitutionHierarchyItem[]>([]);
  const [selectedInstitutionNoteCompany, setSelectedInstitutionNoteCompany] = useState("");
  const [institutionNoteSearch, setInstitutionNoteSearch] = useState("");
  const [investorProfileCompanyNotes, setInvestorProfileCompanyNotes] = useState<DomainNote[]>([]);
  const [activeViewNotesTab, setActiveViewNotesTab] = useState<"company" | "all">("company");
  const [isContactEmailModalOpen, setIsContactEmailModalOpen] = useState(false);
  const [isDeleteContactEmailModalOpen, setIsDeleteContactEmailModalOpen] = useState(false);
  const [contactEmailDraft, setContactEmailDraft] = useState("");
  const [isSavingContactEmail, setIsSavingContactEmail] = useState(false);
  const [isDeletingContactEmail, setIsDeletingContactEmail] = useState(false);

  const navigate = useNavigate();
  const { handleBack } = useNavigationHistory();
  const isAdminOrAnalyst = user?.user_type === "Analyst" || user?.user_type === "Admin";
  const isClientUser = user?.user_type === "Client";
  const { companyGlobalSearchId } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  const institutionDisplayName =
    singleInvesterProfile?.institution_name || singleInvesterProfile?.institution || "";
  const investorProfileInstitutionId = Number(
    singleInvesterProfile?.institution_id ?? singleInvesterProfile?.institution ?? 0
  );
  const investorProfileCompanyName = investorProfileCompanyNotes[0]?.company_name || "";
  const investorProfileNotesTabsEnabled = false;
  const hasTeamContactDetails = Boolean(singleInvesterProfile?.contact_email);
  const hasKeyContacts = Boolean(singleInvesterProfile?.key_contacts?.length);
  const shouldShowContactsSidebar =
    params?.type === "investor" &&
    (isAdminOrAnalyst || (isClientUser ? hasKeyContacts : hasTeamContactDetails || hasKeyContacts));
  const isEmailContact = singleInvesterProfile?.contact_email
    ? /\S+@\S+\.\S+/.test(singleInvesterProfile.contact_email)
    : true;
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const searchParams = new URLSearchParams(location.search);
  const from = searchParams.get("from"); // Value will be 'dashboard'

  const getSingleInvesterProfile = (id: string, type: string) => {
    dispatch(
      fetchSingleInvestersProfile({
        id: Number(id),
        type: type,
      })
    );
  };

  useEffect(() => {
    getSingleInvesterProfile(params.id!, params?.type!);
  }, [params.id, params?.type]);

  useEffect(() => {
    setContactEmailDraft(singleInvesterProfile?.contact_email || "");
  }, [singleInvesterProfile?.contact_email]);

  useEffect(() => {
    let isMounted = true;

    setHasInvestorProfileNotes(false);
    setInstitutionNotesHierarchy([]);
    setInvestorProfileCompanyNotes([]);
    setSelectedInstitutionNoteCompany("");
    setInstitutionNoteSearch("");
    setActiveViewNotesTab("company");

    const preloadInvestorProfileNotes = async () => {
      if (
        params?.type !== "investor" ||
        !investorProfileInstitutionId ||
        !companyGlobalSearchId
      ) {
        return;
      }

      setIsInstitutionNotesLoading(true);

      try {
        const response = await domainNotesService.getCompanyInstitutionNotes(
          companyGlobalSearchId,
          investorProfileInstitutionId
        );

        if (!isMounted) return;

        const companyNotesResults = Array.isArray(response?.results)
          ? response.results
          : [];

        setInvestorProfileCompanyNotes(companyNotesResults);
        setHasInvestorProfileNotes(companyNotesResults.length > 0);
      } catch (error) {
        console.error("Investor profile notes availability error:", error);
        if (isMounted) {
          setHasInvestorProfileNotes(false);
          setInvestorProfileCompanyNotes([]);
        }
      } finally {
        if (isMounted) {
          setIsInstitutionNotesLoading(false);
        }
      }
    };

    preloadInvestorProfileNotes();

    return () => {
      isMounted = false;
    };
  }, [companyGlobalSearchId, investorProfileInstitutionId, params?.type, singleInvesterProfile?.id]);

  const institutionNoteCompanies = useMemo(() => {
    const companyMap = new Map<string, DomainNote[]>();
    const normalizedGlobalCompanyName = investorProfileCompanyName.trim().toLowerCase();

    institutionNotesHierarchy.forEach((item) => {
      Object.entries(item?.sub_heading || {}).forEach(([companyName, notes]) => {
        const normalizedCompanyName = companyName.trim().toLowerCase();
        const belongsToGlobalCompany = notes.some((note) => {
          const noteCompanyId = Number(note.company_id ?? note.company ?? 0);
          const noteCompanyName = (note.company_name || companyName).trim().toLowerCase();

          return (
            (companyGlobalSearchId && noteCompanyId === companyGlobalSearchId) ||
            (!!normalizedGlobalCompanyName && noteCompanyName === normalizedGlobalCompanyName)
          );
        });

        if (belongsToGlobalCompany) {
          return;
        }

        companyMap.set(companyName, [...(companyMap.get(companyName) || []), ...notes]);
      });
    });

    return Array.from(companyMap.entries()).map(([companyName, notes]) => ({
      companyName,
      notes,
    }));
  }, [companyGlobalSearchId, institutionNotesHierarchy, investorProfileCompanyName]);

  const filteredInstitutionNoteCompanies = useMemo(() => {
    const normalizedSearch = institutionNoteSearch.trim().toLowerCase();
    if (!normalizedSearch) return institutionNoteCompanies;

    return institutionNoteCompanies.filter((item) =>
      item.companyName.toLowerCase().includes(normalizedSearch)
    );
  }, [institutionNoteCompanies, institutionNoteSearch]);

  const selectedInstitutionCompanyNotes = useMemo(() => {
    return filteredInstitutionNoteCompanies.find(
      (item) => item.companyName === selectedInstitutionNoteCompany
    )?.notes || [];
  }, [filteredInstitutionNoteCompanies, selectedInstitutionNoteCompany]);

  const investorProfileCompanyNotesCount = investorProfileCompanyNotes.length;

  useEffect(() => {
    if (!filteredInstitutionNoteCompanies.length) {
      setSelectedInstitutionNoteCompany("");
      return;
    }

    const hasSelectedCompany = filteredInstitutionNoteCompanies.some(
      (item) => item.companyName === selectedInstitutionNoteCompany
    );

    if (!hasSelectedCompany) {
      setSelectedInstitutionNoteCompany(filteredInstitutionNoteCompanies[0].companyName);
    }
  }, [filteredInstitutionNoteCompanies, selectedInstitutionNoteCompany]);

  const handleApiCall = async (
    data: { [key: string]: any },
    successMessage: (response: any) => string,
    onSuccess?: () => void
  ) => {
    try {
      const response = await dispatch(
        updateInvestersProfile({
          id: singleInvesterProfile?.id!,
          type: params?.type!,
          data,
        })
      ).unwrap();

      if (response?.results?.id) {
        toast.success(successMessage(response));
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Something went wrong!");
    }
  };
  const areAllGroupsExpanded = () => {
    return expandedSections.slice(1).every(Boolean);
  };
  const toggleAllGroups = () => {
    const shouldExpand = !areAllGroupsExpanded();
    setExpandedSections(prev =>
      prev.map((_, idx) => (idx === 0 ? true : shouldExpand))
    );
  };

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;

    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = async (file: any) => {
        if (file?.status === "added") {
          const fileType = file?.name?.split(".")?.pop()?.toLowerCase();
          if (fileType && !["xlsx", "xls", "csv"].includes(fileType)) {
            toast.error("Only .xlsx, .xls, or .csv files are allowed!");
          } else {
            const rawId = singleInvesterProfile?.institution_id ?? singleInvesterProfile?.institution;
            const institutionId = rawId && !isNaN(Number(rawId)) ? Number(rawId) : null;
            console.log("[KeyContacts Upload] institution_id:", singleInvesterProfile?.institution_id, "institution:", singleInvesterProfile?.institution, "resolved:", institutionId);
            if (!institutionId) {
              toast.error("Institution ID not found. Please contact support.");
            } else {
              setIsUploadingContacts(true);
              try {
                const result = await institutionStatsService.uploadKeyContacts(
                  institutionId,
                  file
                );
                toast.success(
                  `Uploaded successfully! ${result.total_contacts} contacts — ${result.images_added} images added.`
                );
                setIsExpanded(false);
                getSingleInvesterProfile(params.id!, params?.type!);
              } catch (err: any) {
                console.error("[KeyContacts Upload] Error:", err?.message);
              } finally {
                setIsUploadingContacts(false);
              }
            }
          }
          dropzoneInstance.removeFile(file);
        }
        if (file?.status === "error") {
          toast.error("Something went wrong!");
        }
      };

      dropzoneInstance.on("addedfile", handleComplete);
      return () => {
        dropzoneInstance.off("addedfile", handleComplete);
      };
    }
  }, [dropzoneSingleRef.current, isExpanded]);

  const handleExportToPDF = async () => {
    const input = contentRef.current;
    setIsGeneratingPDF(true);

    const elementsToHide = document.querySelectorAll(".exclude-from-pdf");
    elementsToHide.forEach((el) => el.classList.add("hidden"));

    if (input) {
      try {
        const canvas = await html2canvas(input, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: null,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdfWidth = 210;
        const margin = 10;
        const imgWidth = pdfWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Create a new PDF document
        const pdf = new jsPDF("p", "mm", [pdfWidth, imgHeight + 2 * margin]);

        // Add the image to the PDF document
        pdf.addImage(
          imgData,
          "PNG",
          margin,
          margin,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );

        const links = Array.from(input.querySelectorAll("a"));

        links.forEach((link, index) => {
          const { href } = link;
          const text = link.textContent || href;

          const x = margin + 10;
          const y = imgHeight + margin + 10 + index * 10;

          pdf.text(text, x, y);
          pdf.link(x, y - 6, pdf.getTextWidth(text), 10, { url: href });
        });

        pdf.save(`${singleInvesterProfile?.institution_name}.pdf`);
        elementsToHide.forEach((el) => el.classList.remove("hidden"));
        setIsGeneratingPDF(false);
      } catch (error) {
        console.error("Could not generate PDF", error);
        setIsGeneratingPDF(false);
      }
    }
  };

  const updateActive = async (value: boolean) => {
    await handleApiCall({ active: value }, (response) =>
      response?.results?.active
        ? `${response?.results?.institution_name || ""} activated`
        : `${response?.results?.institution_name || ""} deactivated`
    );
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await investersProfileService.deleteInvestersProfile(
        Number(params.id)
      );
      toast.success("Investor Profile deleted successfully");
      setIsDeleteModalOpen(false);
      navigate("/investor-profile");
    } catch (error: any) {
      console.error("Delete error:", error);
      if (shouldSuppressLocalErrorToast(error, "Something went wrong!")) return;
      toast.error(error?.response?.data?.message || "Something went wrong!");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadProfile = async () => {
    const profileId = Number(params.id || singleInvesterProfile?.id);
    if (!profileId) {
      toast.error("Profile ID not found");
      return;
    }

    try {
      setIsDownloadingProfile(true);
      const response = await investersProfileService.downloadInvestersProfiles(
        [profileId],
        "document",
        companyGlobalSearchId
      );
      const blob = response.data as Blob;
      const disposition =
        (response.headers as any)["content-disposition"] ||
        (response.headers as any)["Content-Disposition"];
      let filename: string | null = null;

      if (disposition) {
        const fileNameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/);
        if (fileNameMatch) {
          filename = decodeURIComponent(fileNameMatch[1] || fileNameMatch[2]);
        }
      }

      if (!filename) {
        const name =
          singleInvesterProfile?.institution_name ||
          singleInvesterProfile?.institution ||
          singleInvesterProfile?.equity_firm_name ||
          "Investor Profile";
        filename = `${name} Investor Profile.docx`;
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error("Download error:", error);
      if (shouldSuppressLocalErrorToast(error, "Download failed")) return;
      toast.error(error?.response?.data?.message || "Download failed");
    } finally {
      setIsDownloadingProfile(false);
    }
  };

  const handleSaveContactEmail = async () => {
    const profileId = Number(params.id || singleInvesterProfile?.id);
    const contactEmail = contactEmailDraft.trim();

    if (!profileId) {
      toast.error("Profile ID not found");
      return;
    }

    if (!contactEmail) {
      toast.error("Contact email is required");
      return;
    }

    try {
      setIsSavingContactEmail(true);
      await investersProfileService.patchInvestersProfile(profileId, params?.type!, {
        contact_email: contactEmail,
      });
      toast.success(
        hasTeamContactDetails
          ? "Team contact details updated successfully"
          : "Team contact details added successfully"
      );
      setIsContactEmailModalOpen(false);
      getSingleInvesterProfile(params.id!, params?.type!);
    } catch (error: any) {
      console.error("Contact email update error:", error);
      if (shouldSuppressLocalErrorToast(error, "Failed to update team contact details")) return;
      toast.error(error?.response?.data?.message || "Failed to update team contact details");
    } finally {
      setIsSavingContactEmail(false);
    }
  };

  const handleDeleteContactEmail = async () => {
    const profileId = Number(params.id || singleInvesterProfile?.id);

    if (!profileId) {
      toast.error("Profile ID not found");
      return;
    }

    try {
      setIsDeletingContactEmail(true);
      await investersProfileService.patchInvestersProfile(profileId, params?.type!, {
        contact_email: null,
      });
      toast.success("Team contact details deleted successfully");
      setIsDeleteContactEmailModalOpen(false);
      setIsContactEmailModalOpen(false);
      getSingleInvesterProfile(params.id!, params?.type!);
    } catch (error: any) {
      console.error("Contact email delete error:", error);
      if (shouldSuppressLocalErrorToast(error, "Failed to delete team contact details")) return;
      toast.error(error?.response?.data?.message || "Failed to delete team contact details");
    } finally {
      setIsDeletingContactEmail(false);
    }
  };

  const handleOpenInstitutionNotes = () => {
    if (!institutionDisplayName) {
      toast.error("Institution name not found");
      return;
    }

    setIsViewNotesModalOpen(true);
  };

  const backToPreviousPage = () => {
    if (from === 'ownership') {
      navigate('/', { state: { activeTab: 'ownership' } });
    } else if (from) {
      handleBack("/");
    } else {
      handleBack(`/investor-company-details/${params.id}`);
    }
  };

  const checkImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const validateImages = async () => {
      const tempValidImages: { [key: string]: string } = {};
      for (const contact of singleInvesterProfile?.key_contacts || []) {
        const isValid = await checkImageUrl(contact.image);
        tempValidImages[contact.name] = isValid
          ? contact.image
          : userLinkedinImage;
      }

      setValidImages(tempValidImages);
    };

    validateImages();
  }, [singleInvesterProfile?.key_contacts]);

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12 ">
        <div className="mb-4 flex flex-col justify-between md:mt-0 md:h-10 md:flex-row md:items-center">
          <Button
            onClick={backToPreviousPage}
            variant="primary"
            className="bg-theme-2 border-bg-theme-2 "
          >
            <ChevronLeft
              className="group-[.mode--light]:text-white text-white"
              size={18}
              strokeWidth={1.5}
            />
            Back
          </Button>

          <div className="mt-3 flex shrink-0 items-center gap-2 md:mt-0">
            {params?.type === "investor" && institutionDisplayName && hasInvestorProfileNotes && (
              <Button
                onClick={handleOpenInstitutionNotes}
                variant="danger"
                className="shrink-0 whitespace-nowrap bg-theme-2 border-bg-theme-2"
                disabled={isInstitutionNotesLoading}
              >
                <Lucide icon="FileText" className="mr-2 h-4 w-4" />
                {isInstitutionNotesLoading ? "Loading Notes..." : "View Notes"}
              </Button>
            )}
            <Button
              onClick={handleDownloadProfile}
              variant="danger"
              className="shrink-0 whitespace-nowrap bg-theme-2 border-bg-theme-2"
              disabled={isDownloadingProfile}
            >
              <Lucide icon="Download" className="mr-2 h-4 w-4" />
              {isDownloadingProfile ? "Downloading..." : "Download Profile"}
            </Button>

            {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
              <Button
                onClick={() => setIsDeleteModalOpen(true)}
                variant="danger"
                className="shrink-0 bg-theme-2 border-bg-theme-2 whitespace-nowrap"
              >
                <Lucide icon="Trash2" className="w-4 h-4 mr-2" />
                Delete Profile
              </Button>
            )}
          </div>
        </div>
 
        <div ref={contentRef}>
          <div className="flex justify-between   px-2 gap-y-3 items-center flex-row bg-white box py-2">
            <div>
              <div className=" text-[18px] font-semibold text-left py-1 leading-none ">
                {params?.type! === "investor"
                  ? singleInvesterProfile?.institution_name
                  : singleInvesterProfile?.equity_firm_name}
              </div>

              <div className="flex flex-row   items-center sm:gap-4 ">
                <div className="text-[12px] text-slate-500">
                  <span className="font-bold mr-2">Last updated:</span>
                  {dayjs(singleInvesterProfile?.date_updated).format(
                    "MMMM YYYY"
                  )}
                </div>
              </div>
            </div>

            {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
              <div>
                <Tippy
                  content="Active"
                  options={{
                    theme: "light",
                  }}
                >
                  <div className="mt-2">
                    <Controller
                      name="active"
                      control={control}
                      defaultValue={singleInvesterProfile?.active || false}
                      render={({ field }) => (
                        <FormSwitch>
                          <FormSwitch.Input
                            id="checkbox-switch-7"
                            type="checkbox"
                            checked={field.value}
                            onChange={async (e) => {
                              try {
                                updateActive(e.target.checked);
                                field.onChange(e.target.checked);
                              } catch (error) {
                                console.log("error: ", error);
                              }
                            }}
                          />
                          <FormSwitch.Label htmlFor="checkbox-switch-7"></FormSwitch.Label>
                        </FormSwitch>
                      )}
                    />
                  </div>
                </Tippy>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-col lg:flex-row  gap-x-2">

            <div
              className=
              {clsx(
                "flex flex-col w-full gap-y-2",
                params?.type! === "investor" && (user?.user_type === "Analyst" || user?.user_type === "Admin") && "lg:w-[60%] 2xl:w-[54rem]",
                params?.type! === "investor" && !isAdminOrAnalyst && !shouldShowContactsSidebar && "lg:w-[100%] 2xl:w-[80rem]",
                params?.type! === "investor" && !isAdminOrAnalyst && shouldShowContactsSidebar && "lg:w-[60%] 2xl:w-[54rem]"
              )}
            >

              {params?.type === "investor" &&
                Object.keys(investorProfileEditableSectionsInvestors)?.map(
                  (key, index) => {
                    const typedKey =
                      key as keyof typeof investorProfileEditableSectionsInvestors;
                    const value = singleInvesterProfile?.[typedKey] as string | undefined;
                    
                    const isContentEmpty = !value || value.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, "").trim() === "";

                    if (isContentEmpty && user?.user_type !== "Admin" && user?.user_type !== "Analyst") {
                      return null;
                    }

                    let linkKey = `${key}_link`;

                      // Fix the naming mismatches between the frontend keys and Django database columns
                    if (key === "reporting_expectations") linkKey = "reporting_expectation_link";
                    if (key === "esg_integration_process") linkKey = "esg_integration_link";

                    const linkedSources = singleInvesterProfile?.[linkKey as keyof InvestersProfile] as string | undefined;

                    return (
                      <EditableSection
                        key={index}
                        fetchloading={loading}
                        id={Number(params.id)}
                        title={
                          investorProfileEditableSectionsInvestors?.[typedKey]
                            ?.value
                        }
                        type={params?.type!}
                        // Render using the new formatting logic
                        renderHtml={formatContentHtml(value || "")}
                        field={key as keyof InvestersProfile}
                        expanded={expandedSections[index]}
                        sources={linkedSources}
                        onToggle={() =>
                          setExpandedSections(prev =>
                            prev.map((v, i) => (i === index ? !v : v))
                          )}
                        toggleAllGroups={toggleAllGroups}
                        areAllGroupsExpanded={areAllGroupsExpanded}
                      />
                    );
                  }
                )}

              {params?.type === "equity" &&
                Object.keys(investorProfileEditableSectionsEquity).map(
                  (key, index) => {
                    const typedKey =
                      key as keyof typeof investorProfileEditableSectionsEquity;
                    return (
                      <EditableSection
                        key={index}
                        fetchloading={loading}
                        id={Number(params.id)}
                        title={
                          investorProfileEditableSectionsEquity?.[typedKey]
                            ?.value
                        }
                        type={params?.type!}
                        renderHtml={
                          singleInvesterProfile?.[key]
                          // ?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          // ?.replace(/\n/g, "<br />")
                          // .replace(/\r\n/g, "<br />")
                          // ?.replace(/- (.*?)\:/g, "<li><strong>$1:</strong>")
                          // ?.replace(
                          //   /EQT Absolutes:<br \/>/g,
                          //   "<h3>EQT Absolutes:</h3>"
                          // )
                          // ?.replace(
                          //   /Core KPIs:<br \/>/g,
                          //   "<h3>Core KPIs:</h3>"
                          // )
                          // ?.replace(
                          //   /Portfolio-Specific KPIs:<br \/>/g,
                          //   "<h3>Portfolio-Specific KPIs:</h3>"
                          // )
                          // ?.concat("</li>") || ""
                        }
                        field={key as keyof InvestersProfile}

                      />
                    );
                  }
                )}
            </div>

            {shouldShowContactsSidebar && (
                <div className="w-full lg:w-[39%] 2xl:w-[25rem] flex-none lg:mt-0 md:mt-0 sm:mt-2">
                  {(singleInvesterProfile?.contact_email || isAdminOrAnalyst) && (
                    <div className="mb-4 flex flex-col rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-left text-[18px] font-semibold text-black">
                            {hasTeamContactDetails && !isEmailContact
                              ? "Link to Contact Form"
                              : "Team Contact Details"}
                          </h4>
                          {singleInvesterProfile?.contact_email ? (
                            <a
                              href={
                                isEmailContact
                                  ? `mailto:${singleInvesterProfile.contact_email}`
                                  : singleInvesterProfile.contact_email
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 block break-words text-blue-500 hover:underline"
                            >
                              {singleInvesterProfile.contact_email}
                            </a>
                          ) : (
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              No team contact details have been added yet.
                            </p>
                          )}
                        </div>

                        {isAdminOrAnalyst && (
                          <div className="exclude-from-pdf flex shrink-0 items-center gap-2">
                            <Tippy
                              content={singleInvesterProfile?.contact_email ? "Edit" : "Add"}
                              options={{ theme: "light" }}
                            >
                              <Button
                                size="sm"
                                type="button"
                                variant="outline-primary"
                                className="h-9 w-9 p-0"
                                onClick={() => {
                                  setContactEmailDraft(singleInvesterProfile?.contact_email || "");
                                  setIsContactEmailModalOpen(true);
                                }}
                              >
                                <Lucide
                                  icon={singleInvesterProfile?.contact_email ? "Pencil" : "Plus"}
                                  className="h-4 w-4"
                                />
                              </Button>
                            </Tippy>
                            {singleInvesterProfile?.contact_email && (
                              <Tippy content="Delete" options={{ theme: "light" }}>
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="outline-danger"
                                  className="h-9 w-9 p-0"
                                  onClick={() => setIsDeleteContactEmailModalOpen(true)}
                                >
                                  <Lucide icon="Trash2" className="h-4 w-4" />
                                </Button>
                              </Tippy>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col box">
                    <div
                      className={clsx(
                        "relative flex border-b-2 border-gray-100 flex-col px-4 sm:px-2 items-center transition-all duration-300 ease-in-out",
                        isExpanded ? "min-h-[270px]" : "h-[70px]"
                      )}
                  // user?.user_type?.toLowerCase() === "admin"
                  //     ? "h-[70px] mt-4"
                  //     : "h-[70px] mt-4"
                    >
                      <div className="flex items-start justify-between w-full h-full">
                        <div className="px-3 py-4 w-full">
                          <h4 className="text-[18px] font-semibold leading-none text-black mb-1">
                            Key Contacts
                          </h4>
                          <div className="text-[12px] text-slate-500">
                            <span className="font-bold mr-2">Last Updated:</span>
                            {singleInvesterProfile?.date_updated
                              ? dayjs(singleInvesterProfile.date_updated).format("MMMM YYYY")
                              : "—"}
                          </div>
                        </div>
                      {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                          <div
                            className="exclude-from-pdf ml-4 cursor-pointer flex items-center justify-center bg-transparent rounded-md text-primary px-4 py-2 transition-colors duration-200 hover:bg-primary hover:text-white"
                            onClick={toggleExpand}
                          >
                            <Lucide
                              icon="FileText"
                              className="stroke-[1.3] w-4 h-4 mr-1.5 "
                            />
                            Upload
                          </div>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="w-full mt-3 max-h-[180px] exclude-from-pdf">
                          {isUploadingContacts ? (
                            <div className="flex items-center justify-center h-[120px] text-sm text-slate-500">
                              Uploading contacts...
                            </div>
                          ) : (
                          <Dropzone
                            ref={dropzoneSingleRef}
                            options={{
                              url: "/",
                              autoProcessQueue: false,
                              clickable: true,
                              thumbnailWidth: 100,
                              maxFiles: 1,
                              acceptedFiles: ".xlsx,.xls,.csv",
                            }}
                            className="dropzone w-full flex flex-col justify-center items-center h-full "
                          >
                            <div className="text-sm font-semibold text-gray-800 mb-2">
                              Drop files here or click to upload.
                            </div>
                            <div className="p-4 bg-gray-100 rounded-lg shadow-md">
                              <div className="text-[0.8rem] leading-4 text-gray-600 mb-1">
                                Accepted: <span className="font-medium">.xlsx, .xls, .csv</span>
                              </div>
                              <div className="text-[0.8rem] leading-4 text-gray-600">
                                Required columns: <br />
                                <span className="font-medium text-gray-800">Name</span>,{" "}
                                <span className="font-medium text-gray-800">Designation</span>,{" "}
                                <span className="font-medium text-gray-800">Linkedin</span>
                              </div>
                            </div>
                          </Dropzone>
                          )}
                        </div>
                      )}

                    </div>
                    <div className="pb-4">
                      {loading ? (
                        <div className="mt-[-20px]">
                          <LoadingWrapper height={200} />
                        </div>
                      ) : singleInvesterProfile?.key_contacts?.length ? (
                        <>
                          {singleInvesterProfile.key_contacts.map(
                            (contacts: KeyContact, index: any) => (
                              <div
                                key={index}
                                className="flex py-3 flex-col px-4 border-b border-gray-200 last:border-b-0"
                              >
                                <div className="flex items-center">
                                  <div>
                                    <div className="w-12 h-12 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                    {
                                      //  contacts?.image ?
                                      <img
                                        alt="ZMH Analytics"
                                        src={
                                          validImages[contacts.name] ||
                                          userLinkedinImage
                                        }
                                      />
                                      //  :
                                      // <img
                                      //   alt="ZMH Analytics"
                                      //   src={userLinkedinImage}
                                      // />
                                    }
                                    </div>
                                  </div>
                                  <div className="ml-3.5 w-full">
                                    <div className="flex items-center w-full">
                                      <Tippy
                                        content={contacts?.name || ""}
                                        options={{
                                          theme: "light",
                                        }}
                                      >
                                        <div className="mr-4 font-medium md:max-w-[200px]">
                                          {contacts?.name}
                                        </div>
                                      </Tippy>
                                    </div>
                                    <div className="flex items-center w-full mt-0.5">
                                      <div
                                        className="text-xs text-primary"
                                        dangerouslySetInnerHTML={{
                                          __html: contacts?.designation,
                                        }}
                                      />
                                      {contacts?.linkedin && (
                                      <Button
                                        size="sm"
                                        type="button"
                                        variant="outline-primary"
                                        className="ml-auto exclude-from-pdf"
                                        onClick={() => {
                                          window.open(
                                            contacts?.linkedin,
                                            "_blank"
                                          );
                                        }}
                                      >
                                        LinkedIn
                                      </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </>
                      ) : (
                        <div className="mx-4 mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                            <Lucide icon="Users" className="h-5 w-5 text-slate-400" />
                          </div>
                          <div className="text-sm font-semibold text-slate-700">
                            No key contacts available
                          </div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">
                            Key contact information has not been added for this investor profile yet.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {isViewNotesModalOpen && (
        <Dialog
          size="xl"
          open={isViewNotesModalOpen}
          onClose={() => {
            setIsViewNotesModalOpen(false);
          }}
        >
          {investorProfileNotesTabsEnabled ? (
            <Dialog.Panel className="relative flex h-[82vh] w-[95vw] max-w-[1180px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <button
                type="button"
                aria-label="Close notes modal"
                className="absolute right-5 top-5 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setIsViewNotesModalOpen(false)}
              >
                <Lucide icon="X" className="h-5 w-5" />
              </button>
              <Dialog.Title>
                <div className="border-b border-slate-200 bg-white px-6 py-5 pr-20">
                  <h2 className="text-lg font-semibold text-slate-800">
                    Notes - {institutionDisplayName}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveViewNotesTab("company")}
                      className={clsx(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition",
                        activeViewNotesTab === "company"
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary"
                      )}
                    >
                      {investorProfileCompanyName}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveViewNotesTab("all")}
                      className={clsx(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition",
                        activeViewNotesTab === "all"
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary"
                      )}
                    >
                      All
                    </button>
                  </div>
                </div>
              </Dialog.Title>
              <Dialog.Description className="min-h-0 flex-1 bg-slate-50 p-5">
                {activeViewNotesTab === "company" ? (
                  <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-slate-50 px-6 pb-5 pt-8">
                      <div className="min-w-0 pr-16">
                        <h3 className="text-[18px] font-semibold tracking-[0.01em] text-slate-800 sm:text-[20px]">
                          {investorProfileCompanyName}
                        </h3>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
                            {institutionDisplayName}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1 text-sm font-semibold text-primary shadow-sm">
                            {investorProfileCompanyNotesCount} {investorProfileCompanyNotesCount === 1 ? "note" : "notes"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-hidden bg-white">
                      {isInstitutionNotesLoading ? (
                        <div className="space-y-4 p-6">
                          <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                          <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                          <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                        </div>
                      ) : investorProfileCompanyNotes.length > 0 ? (
                        <div className="flex h-full min-h-0 flex-col">
                          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                            {investorProfileCompanyNotes.map((item) => (
                              <div
                                key={item.id}
                                className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm last:mb-0"
                              >
                                <div>
                                  <div
                                    className="prose max-w-none text-sm leading-7 text-slate-700"
                                    dangerouslySetInnerHTML={{
                                      __html: DOMPurify.sanitize(decryptNotesText(item.notes)),
                                    }}
                                  />
                                  <div className="mt-4 flex justify-end">
                                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                                      {item.created_by_name
                                        ? `By ${item.created_by_name} • ${item.formatted_date || item.date_updated || item.date}`
                                        : item.formatted_date || item.date_updated || item.date}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center text-slate-500">
                          <Lucide icon="FileText" className="mb-4 h-14 w-14 text-slate-300" />
                          <div className="text-base font-semibold text-slate-600">No notes found</div>
                          <div className="mt-1 text-sm text-slate-400">
                            There are no notes available for this institution and company.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/80">
                      <div className="border-b border-slate-200 px-4 py-4">
                        <div className="relative">
                          <Lucide
                            icon="Search"
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                          />
                          <FormInput
                            type="text"
                            value={institutionNoteSearch}
                            onChange={(e) => setInstitutionNoteSearch(e.target.value)}
                            placeholder="Search companies"
                            className="h-11 rounded-xl border-slate-200 bg-white pl-10"
                          />
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                        {isInstitutionNotesLoading ? (
                          <div className="space-y-2 p-2">
                            {Array.from({ length: 8 }).map((_, index) => (
                              <div
                                key={index}
                                className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white"
                              />
                            ))}
                          </div>
                        ) : filteredInstitutionNoteCompanies.length > 0 ? (
                          filteredInstitutionNoteCompanies.map(({ companyName, notes }) => {
                            const isActive = companyName === selectedInstitutionNoteCompany;

                            return (
                              <button
                                key={companyName}
                                type="button"
                                onClick={() => setSelectedInstitutionNoteCompany(companyName)}
                                className={clsx(
                                  "mb-2 w-full rounded-xl border px-4 py-3 text-left transition",
                                  isActive
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold leading-5 text-slate-800">
                                    {companyName}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {notes.length} {notes.length === 1 ? "note" : "notes"}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-5 text-center">
                            <Lucide icon="FileText" className="mb-3 h-12 w-12 text-slate-300" />
                            <div className="text-sm font-semibold text-slate-700">
                              {institutionNoteSearch.trim() ? "No matching companies" : "No notes found"}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {institutionNoteSearch.trim()
                                ? "Try a different company name."
                                : "There are no notes available in the All tab."}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-hidden bg-white">
                      {isInstitutionNotesLoading ? (
                        <div className="space-y-4 p-6">
                          <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                          <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                          <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                        </div>
                      ) : selectedInstitutionNoteCompany ? (
                        <div className="flex h-full min-h-0 flex-col">
                          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                            {selectedInstitutionCompanyNotes.length > 0 ? (
                              selectedInstitutionCompanyNotes.map((item) => (
                                <div key={item.id} className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm last:mb-0">
                                  <div>
                                    <div
                                      className="prose max-w-none text-sm leading-7 text-slate-700"
                                      dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(decryptNotesText(item.notes)),
                                      }}
                                    />
                                    <div className="mt-4 flex justify-end">
                                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                                        {item.created_by_name
                                          ? `By ${item.created_by_name} • ${item.formatted_date || dayjs(item.date_updated || item.date).format("MMMM DD, YYYY")}`
                                          : item.formatted_date || dayjs(item.date_updated || item.date).format("MMMM DD, YYYY")}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
                                <Lucide icon="FileText" className="mb-4 h-14 w-14 text-slate-300" />
                                <div className="text-base font-semibold text-slate-600">No notes found</div>
                                <div className="mt-1 text-sm text-slate-400">
                                  There are no notes for the selected company yet.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center text-slate-500">
                          <Lucide icon="FileText" className="mb-4 h-14 w-14 text-slate-300" />
                          <div className="text-base font-semibold text-slate-600">No notes found</div>
                          <div className="mt-1 text-sm text-slate-400">
                            There are no companies with notes in the All tab.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Dialog.Description>
            </Dialog.Panel>
          ) : (
            <Dialog.Panel className="relative flex h-[82vh] w-[95vw] max-w-[1180px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
              <button
                type="button"
                aria-label="Close notes modal"
                className="absolute right-6 top-6 z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-300 shadow-md transition hover:bg-slate-50 hover:text-slate-500"
                onClick={() => setIsViewNotesModalOpen(false)}
              >
                <Lucide icon="X" className="h-5 w-5" />
              </button>
              <Dialog.Title className="sr-only">
                Investor profile notes for {institutionDisplayName}
              </Dialog.Title>
              <Dialog.Description className="min-h-0 flex-1 bg-slate-50/80 p-5">
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-50 px-6 pb-5 pt-8">
                    <div className="min-w-0 pr-16">
                      {investorProfileCompanyName ? (
                        <h3 className="text-[18px] font-semibold tracking-[0.01em] text-slate-800 sm:text-[20px]">
                          {investorProfileCompanyName}
                        </h3>
                      ) : (
                        <div className="h-7 w-64 animate-pulse rounded-lg bg-slate-200" />
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
                          {institutionDisplayName}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1 text-sm font-semibold text-primary shadow-sm">
                          {investorProfileCompanyNotesCount} {investorProfileCompanyNotesCount === 1 ? "note" : "notes"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden bg-white">
                    {isInstitutionNotesLoading ? (
                      <div className="space-y-4 p-6">
                        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                      </div>
                    ) : investorProfileCompanyNotes.length > 0 ? (
                      <div className="flex h-full min-h-0 flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                          {investorProfileCompanyNotes.map((item) => (
                            <div
                              key={item.id}
                              className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm last:mb-0"
                            >
                              <div>
                                <div
                                  className="prose max-w-none text-sm leading-7 text-slate-700"
                                  dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(decryptNotesText(item.notes)),
                                  }}
                                />
                                <div className="mt-4 flex justify-end">
                                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                                    {item.created_by_name
                                      ? `By ${item.created_by_name} • ${item.formatted_date || item.date_updated || item.date}`
                                      : item.formatted_date || item.date_updated || item.date}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center text-slate-500">
                        <Lucide icon="FileText" className="mb-4 h-14 w-14 text-slate-300" />
                        <div className="text-base font-semibold text-slate-600">No notes found</div>
                        <div className="mt-1 text-sm text-slate-400">
                          There are no notes available for this institution and company.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Description>
            </Dialog.Panel>
          )}
        </Dialog>
      )}

      {isContactEmailModalOpen && (
        <Dialog
          size="md"
          open={isContactEmailModalOpen}
          onClose={() => {
            if (!isSavingContactEmail) {
              setIsContactEmailModalOpen(false);
            }
          }}
        >
          <Dialog.Panel className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <Dialog.Title>
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-800">
                    {hasTeamContactDetails ? "Edit Team Contact Details" : "Add Team Contact Details"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update the email shown in the Team Contact Details section.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => {
                    if (!isSavingContactEmail) {
                      setIsContactEmailModalOpen(false);
                    }
                  }}
                >
                  <Lucide icon="X" className="h-5 w-5" />
                </button>
              </div>
            </Dialog.Title>
            <Dialog.Description className="bg-slate-50 px-6 py-6">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Contact Email
                </label>
                <FormInput
                  type="text"
                  value={contactEmailDraft}
                  onChange={(e) => setContactEmailDraft(e.target.value)}
                  placeholder="Enter team contact email"
                  className="h-11"
                />
              </div>
            </Dialog.Description>
            <Dialog.Footer className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setIsContactEmailModalOpen(false)}
                disabled={isSavingContactEmail}
                className="min-w-24"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveContactEmail}
                disabled={isSavingContactEmail}
                className="min-w-24 bg-theme-2 border-bg-theme-2"
              >
                {isSavingContactEmail
                  ? hasTeamContactDetails
                    ? "Saving..."
                    : "Adding..."
                  : hasTeamContactDetails
                    ? "Save"
                    : "Add"}
              </Button>
            </Dialog.Footer>
          </Dialog.Panel>
        </Dialog>
      )}

      {isDeleteContactEmailModalOpen && (
        <Dialog
          size="md"
          open={isDeleteContactEmailModalOpen}
          onClose={() => {
            if (!isDeletingContactEmail) {
              setIsDeleteContactEmailModalOpen(false);
            }
          }}
        >
          <Dialog.Panel className="p-0 text-center">
            <div className="p-5 text-center">
              <Lucide
                icon="XCircle"
                className="w-16 h-16 mx-auto mt-3 text-danger"
              />
              <div className="mt-5 text-3xl">Delete team contact details?</div>
              <div className="mt-2 text-slate-500">
                This will remove the current contact email from the investor profile.
              </div>
            </div>
            <div className="px-5 pb-8 text-center">
              <Button
                variant="outline-secondary"
                type="button"
                onClick={() => {
                  setIsDeleteContactEmailModalOpen(false);
                }}
                className="w-24 mr-1"
                disabled={isDeletingContactEmail}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                className="w-24"
                onClick={handleDeleteContactEmail}
                disabled={isDeletingContactEmail}
              >
                {isDeletingContactEmail ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}

      {isDeleteModalOpen && (
        <Dialog
          size="md"
          open={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
          }}
        >
          <Dialog.Panel className="p-0 text-center">
            <div className="p-5 text-center">
              <Lucide
                icon="XCircle"
                className="w-16 h-16 mx-auto mt-3 text-danger"
              />
              <div className="mt-5 text-3xl">Are you sure?</div>
              <div className="mt-2 text-slate-500">
                Do you really want to delete this investor profile? <br />
                This action cannot be undone.
              </div>
            </div>
            <div className="px-5 pb-8 text-center">
              <Button
                variant="outline-secondary"
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                }}
                className="w-24 mr-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                className="w-24"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}
    </div>
  );
}

export default Main;