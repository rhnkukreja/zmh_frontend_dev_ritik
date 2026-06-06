import "@/assets/css/vendors/simplebar.css";
import Lucide from "@/components/Base/Lucide";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { useEffect, useMemo, useState, useRef } from "react";

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
import { InvestersProfile, KeyContact } from "@/types/investerProfiles";

import clsx from "clsx";
import { FormSwitch } from "@/components/Base/Form";
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

  const navigate = useNavigate();
  const { handleBack } = useNavigationHistory();
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

  const { companyGlobalSearchTicker } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const backToPreviousPage = () => {
    if (from) {
      // If we came from the dashboard with a specific 'from' flag, handle it.
      // However, check if handleBack can handle it if we passed state.
      // Since Dashboard was updated to pass state, handleBack should work.
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
        <div className="flex flex-col justify-between	md:mt-0 md:h-10 md:items-center md:flex-row mb-4">
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

          {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
            <Button
              onClick={() => setIsDeleteModalOpen(true)}
              variant="danger"
              className="bg-theme-2 border-bg-theme-2"
            >
              <Lucide icon="Trash2" className="w-4 h-4 mr-2" />
              Delete Profile
            </Button>
          )}
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
                params?.type! === "investor" && user?.user_type !== "Analyst" && !singleInvesterProfile?.key_contacts && "lg:w-[100%] 2xl:w-[80rem]",
                params?.type! === "investor" && user?.user_type !== "Analyst" && singleInvesterProfile?.key_contacts && "lg:w-[60%] 2xl:w-[54rem]"
              )}
            >

              {params?.type === "investor" &&
                Object.keys(investorProfileEditableSectionsInvestors)?.map(
                  (key, index) => {
                    const typedKey =
                      key as keyof typeof investorProfileEditableSectionsInvestors;
                    const value = singleInvesterProfile?.[typedKey] as string | undefined;
                    
                    const isContentEmpty = !value || value.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, "").trim() === "";

                    if (isContentEmpty) {
                      return null;
                    }

                    const linkKey = `${key}_link` as keyof InvestersProfile;
                    const linkedSources = singleInvesterProfile?.[linkKey] as string | undefined;

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

            {params?.type! === "investor" && (((user?.user_type === "Analyst" || user?.user_type === "Admin")) || (user?.user_type !== "Analyst" && user?.user_type !== "Admin" && singleInvesterProfile?.key_contacts?.length > 0)) && (
                <div className="w-full lg:w-[39%] 2xl:w-[25rem] flex-none lg:mt-0 md:mt-0 sm:mt-2">
                  {singleInvesterProfile?.contact_email && (
                    <div className="flex flex-col box mb-4 p-4 border border-gray-200 rounded-md">
                      <h4 className="text-[18px] font-semibold text-left text-black">
                      {/\S+@\S+\.\S+/.test(singleInvesterProfile.contact_email)
                          ? "Team Contact Details"
                          : "Link to Contact Form"}
                      </h4>
                      <a
                        href={
                        /\S+@\S+\.\S+/.test(singleInvesterProfile.contact_email)
                            ? `mailto:${singleInvesterProfile.contact_email}`
                            : singleInvesterProfile.contact_email
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline mt-2 break-words"
                      >
                        {singleInvesterProfile.contact_email}
                      </a>
                    </div>
                  )}
                  <div className="flex flex-col box">
                    <div
                      className={clsx(
                        "relative flex border-b-2 border-gray-100 flex-col px-4 sm:px-2 items-center transition-all duration-300 ease-in-out",
                        isExpanded ? "min-h-[270px]" : "h-[70px]",
                        !singleInvesterProfile?.key_contacts && "h-[120px]"
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

                    {(!singleInvesterProfile?.key_contacts || singleInvesterProfile?.key_contacts?.length === 0) && !loading &&
                          <div className="p-5 flex items-center justify-center">
                            <h1 className="">No Key Contacts Available</h1>
                          </div>

                    }
                    </div>
                    <div className="pb-4">
                      {loading ? (
                        <div className="mt-[-20px]">
                          <LoadingWrapper height={200} />
                        </div>
                      ) : (
                        <>
                          {singleInvesterProfile?.key_contacts?.map(
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
                      )}
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

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