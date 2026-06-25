import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addEditInstitution,
  fetchInstitutions,
  getSingleInstitution,
} from "@/stores/institutionSlice";
import { patchInstitutionInDashboard } from "@/stores/dashboardSlice";
import { Institutions } from "@/types/institutions";
import Button from "@/components/Base/Button";
import { Dialog } from "@/components/Base/Headless";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import Lucide from "@/components/Base/Lucide";
import { toast } from "react-toastify";
import { bytesToMB, createDynamicURL, formatedDate } from "@/utils/helper";
import Litepicker from "@/components/Base/Litepicker";
import TomSelect from "@/components/Base/TomSelect";
import { baseURL } from "@/constant";
import Error from "@/components/Error";
import { generateWhaleWisdomId, scrapeSelectedWhaleWisdom } from "../../AIChatbot/api";
import LoadingIcon from "@/components/Base/LoadingIcon";

interface InstitutionFormData {
  institution: string;
  active?: boolean;
  uploaded_time?: string;
  region: string;
  investor_type: string;
  contact?: string;
  email?: string;
  contact_email?: string;
  whale_wisdom_filer_id: string;
  sec_number?: string;
  proxy_advisor_influence?: string;
  unpri_signatory?: boolean;
}

interface AddEditInstitutionProps {
  addEditInstitutionVisible: boolean;
  setAddEditInstitutionVisible: (visible: boolean) => void;
  selectedInstitution: Institutions | null;
}

interface WhaleWisdomFiler {
  id: string | number;
  name: string;
  cik: string;
  link: string;
}

export const AddEditInstitution: React.FC<AddEditInstitutionProps> = ({
  addEditInstitutionVisible,
  setAddEditInstitutionVisible,
  selectedInstitution,
}) => {
  const dropzoneSingleRef = useRef<DropzoneElement>(null);
  const dispatch = useAppDispatch();
  const { loading, page } = useAppSelector((state) => state.institutions);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Whale Wisdom States
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [filerOptions, setFilerOptions] = useState<WhaleWisdomFiler[]>([]);
  const [showFilerModal, setShowFilerModal] = useState(false);
  const [selectedFilerId, setSelectedFilerId] = useState<string>("");
  const [filerSearchQuery, setFilerSearchQuery] = useState<string>("");
  
  // PDF Scraping & Viewer States
  const [isScrapingPdf, setIsScrapingPdf] = useState(false);
  const [scrapedPdfUrl, setScrapedPdfUrl] = useState<string | null>(null);
  const [scrapedBrochurePageUrl, setScrapedBrochurePageUrl] = useState<string | null>(null);
  const [scrapeMessage, setScrapeMessage] = useState<string>("");
  const [isPdfExpanded, setIsPdfExpanded] = useState<boolean>(false);
  
  const [proxyAdvisoryOptions, setProxyAdvisoryOptions] = useState<string[]>(
    selectedInstitution?.proxy_advisor_influence
      ? selectedInstitution.proxy_advisor_influence.split(", ").map((s) => s.trim())
      : []
  );

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InstitutionFormData>({
    defaultValues: {
      institution: selectedInstitution?.institution || "",
      region: selectedInstitution?.region || "North America",
      investor_type: selectedInstitution?.investor_type || "Investor",
      contact_email: (selectedInstitution as any)?.contact_email || "",
      whale_wisdom_filer_id: selectedInstitution?.whale_wisdom_filer_id?.toString() || "",
      sec_number: (selectedInstitution as any)?.sec_number || "",
      proxy_advisor_influence: selectedInstitution?.proxy_advisor_influence || "",
      unpri_signatory: selectedInstitution?.unpri_signatory || false,
    },
  });

  const watchedInvestorType = watch("investor_type");

  useEffect(() => {
    if (selectedInstitution?.id) {
      dispatch(getSingleInstitution(selectedInstitution.id)).then(
        (action: any) => {
          if (action.payload?.results?.contact_email) {
            setValue("contact_email", action.payload.results.contact_email);
          }
          if (action.payload?.results?.sec_number) {
            setValue("sec_number", action.payload.results.sec_number);
          }
        }
      );
    }
  }, [selectedInstitution?.id]);

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;

    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = (file: any) => {
        if (file?.status === "added") {
          const fileType = file?.name?.split(".")?.pop()?.toLowerCase();
          if (fileType && !["jpeg", "png", "jpg"].includes(fileType)) {
            toast.error("Image type not allowed!");
          } else {
            setLogoFile(file);
          }
          dropzoneInstance.removeFile(file);
        }
        if (file?.status === "error") {
          const fileType = file?.name?.split(".")?.pop();
          if (
            fileType &&
            !["image/jpeg", "image/png", "image/jpg"].includes(fileType)
          ) {
            toast.error("Image type not allowed!");
          } else {
            toast.error("Something went wrong!");
          }
        }
      };

      dropzoneInstance.on("addedfile", handleComplete);

      return () => {
        dropzoneInstance.off("addedfile", handleComplete);
      };
    }
  }, [dropzoneSingleRef.current, addEditInstitutionVisible, logoFile]);

  // Centralized scraping function
  const triggerScraping = async (filer: WhaleWisdomFiler) => {
    setValue("whale_wisdom_filer_id", String(filer.id), {
      shouldValidate: true,
      shouldDirty: true,
    });
    
    setShowFilerModal(false);
    toast.success("Filer ID Added! Fetching SEC Brochure...");
    
    setIsScrapingPdf(true);
    setScrapedPdfUrl(null);
    setScrapedBrochurePageUrl(null);
    setScrapeMessage("");
    setIsPdfExpanded(false); // Auto-expand viewer to show loading animation
    
    try {
      const result = await scrapeSelectedWhaleWisdom(getValues("institution"), filer.link);
      
      // Auto-populate SEC Number
      if (result.sec_number) {
        setValue("sec_number", result.sec_number, { shouldDirty: true });
        toast.success(`SEC Number ${result.sec_number} populated!`);
      }

      if (result.brochure_url) {
        setScrapedPdfUrl(result.brochure_url);
      } else if (result.brochure_page_url) {
        setScrapedBrochurePageUrl(result.brochure_page_url);
        setScrapeMessage(result.iapd_message || "Direct PDF link was not found, but the IAPD brochure page is available.");
      } else {
        setScrapeMessage(result.iapd_message || "No brochure found.");
      }
    } catch (error) {
      setScrapeMessage("Failed to fetch SEC brochure.");
    } finally {
      setIsScrapingPdf(false);
    }
  };

  const handleGenerateWhaleWisdomId = async () => {
    const currentInstitutionName = getValues("institution");

    if (!currentInstitutionName) {
      toast.error("Please enter an Institution Name first.");
      return;
    }

    setIsGeneratingId(true);

    try {
      const data = await generateWhaleWisdomId(currentInstitutionName);

      if (data && data.filers && data.filers.length === 1) {
        // Auto-select if exactly 1 match
        triggerScraping(data.filers[0]);
      } else if (data && data.filers && data.filers.length > 1) {
        // Show modal if multiple matches
        setFilerOptions(data.filers);
        setSelectedFilerId("");
        setFilerSearchQuery("");
        setShowFilerModal(true);
      } else {
        toast.error("Could not find any Filer IDs for this name.");
      }
   } catch (error: any) {
      console.error(error);
      // 🌟 FIX: Use the specific name in the error message!
      toast.error(`No such investor found with the name "${currentInstitutionName}" on WhaleWisdom.`);
    } finally {
      setIsGeneratingId(false);
    }
  };

  const confirmFilerSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedFilerId) {
      toast.error("Please select a Filer ID from the list.");
      return;
    }
    const selectedFiler = filerOptions.find(f => String(f.id) === selectedFilerId);
    if (selectedFiler) {
      triggerScraping(selectedFiler);
    }
  };

  const buildFilerUrl = (link: string): string => {
    if (!link) return "";
    if (link.startsWith("http")) return link;
    const separator = link.startsWith("/") ? "" : "/";
    return "https://whalewisdom.com" + separator + link;
  };

  const onSubmit = async (data: InstitutionFormData) => {
    const transformedData = {
      ...data,
      uploaded_time: data.uploaded_time
        ? formatedDate(data.uploaded_time)
        : null,
      proxy_advisor_influence:
        proxyAdvisoryOptions.length > 0
          ? proxyAdvisoryOptions.join(", ")
          : "",
    };

    if (
      !transformedData.whale_wisdom_filer_id ||
      transformedData.investor_type === "Proponent"
    ) {
      delete transformedData.whale_wisdom_filer_id;
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(transformedData)) {
      if (value !== null && value !== undefined && value !== "") {
        formData.append(key, value as any);
      }
    }

    if (logoFile) {
      formData.append("logo_url", logoFile as any);
    }

    try {
      let response;
      if (selectedInstitution) {
        response = await dispatch(
          addEditInstitution({
            id: selectedInstitution?.id,
            data: formData as unknown as Partial<Institutions>,
          })
        ).unwrap();
      } else {
        response = await dispatch(
          addEditInstitution({
            data: formData as unknown as Partial<Institutions>,
          })
        ).unwrap();

        dispatch(
          fetchInstitutions(
            createDynamicURL(`${baseURL}/institute/`, undefined, page)
          )
        );
      }

      if (response.results?.id) {
        toast.success(
          selectedInstitution
            ? "Institution updated successfully"
            : "Institution saved successfully"
        );
        if (selectedInstitution) {
          dispatch(patchInstitutionInDashboard({
            institutionName: data.institution,
            proxyAdvisorInfluence: proxyAdvisoryOptions.join(", "),
            unpriSignatory: !!data.unpri_signatory,
          }));
        }
      }
    } catch (error) {
      toast.error("Failed to save institution");
    } finally {
      setAddEditInstitutionVisible(false);
    }
  };

  const filteredFilerOptions = filerOptions.filter(
    (filer) =>
      filer.name.toLowerCase().includes(filerSearchQuery.toLowerCase()) ||
      String(filer.id).includes(filerSearchQuery) ||
      String(filer.cik).includes(filerSearchQuery)
  );

  return (
    <>
      <Dialog
        size="xl"
        open={addEditInstitutionVisible}
        onClose={() => {
          if (!showFilerModal) {
            setAddEditInstitutionVisible(false);
          }
        }}
      >
        <Dialog.Panel>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Dialog.Title>
              <h2 className="text-xl font-semibold">
                {selectedInstitution ? "Edit Institution" : "Add New Institution"}
              </h2>
              <div
                onClick={() => setAddEditInstitutionVisible(false)}
                className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
              >
                <Lucide icon="X" className="w-8 h-8 text-slate-400" />
              </div>
            </Dialog.Title>

            <Dialog.Description
              className={`px-6 py-4 space-y-6 max-h-[75vh] overflow-y-auto relative ${
                isScrapingPdf ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="w-full">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Institution Name <span className="text-red-500">*</span>
                  </FormCheck.Label>
                  <Controller
                    name="institution"
                    control={control}
                    rules={{ required: "Institution Name is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <FormInput placeholder="Enter Institution Name" {...field} />
                        {error && (
                          <Error className="text-red-600">{error.message}</Error>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="w-full">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Region <span className="text-red-500">*</span>
                  </FormCheck.Label>
                  <Controller
                    name="region"
                    control={control}
                    defaultValue="North America"
                    rules={{ required: "Region is required" }}
                    render={({ field, fieldState: { error } }) => (
                      <>
                        <TomSelect
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          options={{ placeholder: "Select Region" }}
                          className="w-full text-left"
                        >
                          <option value="North America">North America</option>
                          <option value="EMEA">EMEA</option>
                          <option value="APAC">APAC</option>
                        </TomSelect>
                        {error && (
                          <Error className="text-red-600 mt-2">{error.message}</Error>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="w-full">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Investor Type <span className="text-red-500">*</span>
                  </FormCheck.Label>
                  <Controller
                    name="investor_type"
                    control={control}
                    defaultValue=""
                    rules={{ required: "Type of Investor is required" }}
                    render={({ field }) => (
                      <TomSelect
                        {...field}
                        value={field.value?.toString() || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        options={{ placeholder: "Select Investor Type" }}
                        className="w-full text-left"
                      >
                        <option value="" disabled>
                          Select Type
                        </option>
                        <option value="Investor">Investor</option>
                        <option value="Proponent">Proponent</option>
                      </TomSelect>
                    )}
                  />
                  {errors.investor_type && (
                    <Error className="max-w-[100%]">{errors.investor_type.message}</Error>
                  )}
                </div>

                <div className="w-full">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    Whale Wisdom Filer Id
                  </FormCheck.Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Controller
                        name="whale_wisdom_filer_id"
                        control={control}
                        rules={{
                          required:
                            watchedInvestorType === "Investor"
                              ? "Whale Wisdom Filer Id is required"
                              : false,
                        }}
                        render={({ field }) => (
                          <FormInput placeholder="Enter Whale Wisdom Filer Id" {...field} />
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline-primary"
                      className="w-auto whitespace-nowrap"
                      onClick={handleGenerateWhaleWisdomId}
                      disabled={isGeneratingId}
                    >
                      {isGeneratingId ? (
                        <Lucide icon="Loader" className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Lucide icon="Zap" className="w-4 h-4 mr-2" />
                      )}
                      Generate ID
                    </Button>
                  </div>
                  {errors.whale_wisdom_filer_id && (
                    <Error className="max-w-[100%] mt-1">
                      {errors.whale_wisdom_filer_id.message}
                    </Error>
                  )}
                </div>

                <div className="w-full">
                  <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                    SEC Number
                  </FormCheck.Label>
                  <Controller
                    name="sec_number"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        placeholder="Auto-filled from scrape..."
                        readOnly
                        className="bg-slate-100 text-slate-500 cursor-not-allowed"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="w-full">
                <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                  Contact Email
                </FormCheck.Label>
                <Controller
                  name="contact_email"
                  control={control}
                  render={({ field }) => (
                    <FormInput
                      placeholder="Enter Contact Email"
                      type="email"
                      {...field}
                    />
                  )}
                />
              </div>

              <div className="w-full">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <FormCheck.Label className="font-semibold text-gray-800 mb-0">
                    Proxy Advisory Influence
                  </FormCheck.Label>
                  {/* <a
                    href="https://adviserinfo.sec.gov/firm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm"
                  >
                    Click here to know about IAPD
                  </a> */}
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    "Internal",
                    "ISS",
                    "GL",
                    "Typically does not vote proxies",
                  ].map((option) => (
                    <FormCheck key={option} className="flex items-center gap-2">
                      <FormCheck.Input
                        id={`proxy_${option}`}
                        type="checkbox"
                        checked={proxyAdvisoryOptions.includes(option)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProxyAdvisoryOptions([...proxyAdvisoryOptions, option]);
                          } else {
                            setProxyAdvisoryOptions(
                              proxyAdvisoryOptions.filter((item) => item !== option)
                            );
                          }
                        }}
                      />
                      <FormCheck.Label htmlFor={`proxy_${option}`}>{option}</FormCheck.Label>
                    </FormCheck>
                  ))}
                </div>
              </div>

              <div className="w-full">
                <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2">
                  UN PRI Signatory
                </FormCheck.Label>
                <Controller
                  name="unpri_signatory"
                  control={control}
                  render={({ field }) => (
                    <FormCheck className="flex items-center">
                      <FormCheck.Input
                        id="unpri_signatory"
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <FormCheck.Label htmlFor="unpri_signatory" className="ml-2">
                        Yes
                      </FormCheck.Label>
                    </FormCheck>
                  )}
                />
              </div>

              {(isScrapingPdf || scrapedPdfUrl || scrapedBrochurePageUrl || scrapeMessage) && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="border border-slate-300 rounded-md overflow-hidden flex flex-col bg-slate-50 shadow-sm transition-all duration-300">
                    <div
                      className="bg-slate-200 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-300 transition-colors"
                      onClick={() => setIsPdfExpanded(!isPdfExpanded)}
                    >
                      <span className="text-sm font-semibold text-slate-800 flex items-center">
                        <Lucide icon="FileText" className="w-4 h-4 mr-2" />
                        SEC Brochure Preview
                      </span>

                      <div className="flex items-center gap-4">
                        {scrapedPdfUrl && (
                          <a
                            href={scrapedPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Pop out <Lucide icon="ExternalLink" className="w-3 h-3 ml-1" />
                          </a>
                        )}
                        <div className="p-1 bg-white rounded shadow-sm border border-slate-300">
                          <Lucide
                            icon={isPdfExpanded ? "ChevronUp" : "ChevronDown"}
                            className="w-4 h-4 text-slate-600"
                          />
                        </div>
                      </div>
                    </div>

                    {isPdfExpanded && (
                      <div className="w-full flex flex-col animate-fadeIn">
                        {isScrapingPdf ? (
                          <div className="flex flex-col items-center justify-center py-16">
                            <LoadingIcon color="#800000" icon="three-dots" className="w-10 h-10" />
                            <p className="text-slate-500 mt-3 animate-pulse">
                              Running automation to find the SEC document ID...
                            </p>
                          </div>
                        ) : scrapedPdfUrl ? (
                          <iframe
                            src={`http://localhost:8000/proxy-pdf?pdf_url=${encodeURIComponent(
                              scrapedPdfUrl
                            )}#search="Item 17"`}
                            className="w-full h-[600px] border-none"
                            title="SEC Brochure Inline Viewer"
                          />
                        ) : scrapedBrochurePageUrl ? (
                          <div className="p-8 text-center bg-blue-50 text-blue-800">
                            <p className="mb-4">{scrapeMessage}</p>
                            <a
                              href={scrapedBrochurePageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
                            >
                              Open IAPD brochure page
                            </a>
                          </div>
                        ) : (
                          <div className="p-8 text-center bg-amber-50 text-amber-800">
                            <strong>Document Unavailable:</strong> {scrapeMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Dialog.Description>

            <Dialog.Footer>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setAddEditInstitutionVisible(false)}
                className="w-20 mr-3"
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {loading && (
                  <Lucide
                    icon="Loader"
                    className={"w-4 h-4 mr-1.5 stroke-[1.3] " + (loading ? "animate-spin" : "")}
                  />
                )}
                {selectedInstitution ? "Update" : "Save"}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Panel>
      </Dialog>

      {/* Filer Selection Modal */}
      <Dialog
        size="xl"
        open={showFilerModal}
        onClose={() => setShowFilerModal(false)}
      >
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="text-lg font-semibold">Select Whale Wisdom ID</h2>
            <div
              onClick={() => setShowFilerModal(false)}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>

          <div className="px-4 pt-4 pb-2">
            <div className="relative w-full sm:w-1/2">
              <Lucide
                icon="Search"
                className="absolute inset-y-0 left-0 z-10 w-4 h-4 my-auto ml-3 text-slate-500"
              />
              <FormInput
                type="text"
                placeholder="Search by Name, ID, or CIK..."
                className="pl-10"
                value={filerSearchQuery}
                onChange={(e) => setFilerSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Dialog.Description className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100 text-slate-800 border-b">
                  <tr>
                    <th className="p-3 font-semibold w-16 text-center">Select</th>
                    <th className="p-3 font-semibold">ID</th>
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">CIK</th>
                    <th className="p-3 font-semibold">WhaleWisdom Page</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFilerOptions.length > 0 ? (
                    filteredFilerOptions.map((filer) => {
                      const finalUrl = buildFilerUrl(filer.link);
                      const isSelected = selectedFilerId === String(filer.id);

                      return (
                        <tr
                          key={filer.id}
                          className={
                            "border-b transition-all duration-200 cursor-pointer " +
                            (isSelected
                              ? "bg-red-50 border-l-4 border-l-red-700"
                              : "hover:bg-slate-50")
                          }
                        >
                          <td className="p-3 text-center">
                            <FormCheck.Input
                              type="radio"
                              name="filerSelectionRadio"
                              className="cursor-pointer w-4 h-4"
                              style={{ accentColor: "#9b1b30" }}
                              checked={isSelected}
                              onChange={() => setSelectedFilerId(String(filer.id))}
                            />
                          </td>
                          <td className="p-3">{filer.id}</td>
                          <td className="p-3 font-medium">{filer.name}</td>
                          <td className="p-3">{filer.cik}</td>
                          <td className="p-3">
                            {filer.link ? (
                              <a
                                href={finalUrl}
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  window.open(finalUrl, "_blank", "noopener,noreferrer");
                                }}
                              >
                                View Page
                                <Lucide
                                  icon="ExternalLink"
                                  className="w-3 h-3 ml-1"
                                />
                              </a>
                            ) : (
                              "N/A"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        No matches found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Dialog.Description>

          <Dialog.Footer className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => setShowFilerModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={confirmFilerSelection}
            >
              Confirm Selection
            </Button>
          </Dialog.Footer>
        </Dialog.Panel>
      </Dialog>
    </>
  );
};