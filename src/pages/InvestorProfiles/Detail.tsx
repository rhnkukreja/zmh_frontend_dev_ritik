import "@/assets/css/vendors/simplebar.css";
import Lucide from "@/components/Base/Lucide";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { useEffect, useMemo, useState, useRef } from "react";

import _ from "lodash";
import Button from "@/components/Base/Button";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchSingleInvestersProfile,
  updateInvestersProfile,
} from "@/stores/investersProfileSlice";

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
import {  setPage } from "@/stores/investersProfileSlice";

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const navigate = useNavigate();
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

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

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;

    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = async (file: any) => {
        if (file?.status === "added") {
          const fileType = file?.name?.split(".")?.pop();
          if (fileType && !["xlsx"].includes(fileType)) {
            toast.error("Only excel file are allowed!");
          } else {
            await handleApiCall(
              { file },
              () => "Uploaded Successfully!",
              () => setIsExpanded(false)
            );
          }
          dropzoneInstance.removeFile(file);
        }
        if (file?.status === "error") {
          const fileType = file?.name?.split(".")?.pop();

          if (fileType && !["xlsx"].includes(fileType)) {
            toast.error("Only excel file are allowed!");
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
  }, [dropzoneSingleRef.current, isExpanded]);

  // const formatVotingGuidelinesLink = useMemo(() => {
  //   return singleInvesterProfile?.voting_guidelines_link
  //     .split(";")
  //     .filter((url: any) => url.trim())
  //     .map(
  //       (url: any) =>
  //         `<a   href="${url.trim()}" target="_blank" rel="noopener noreferrer">${url.trim()}</a><br>`
  //     );
  // }, [singleInvesterProfile, singleInvesterProfile?.voting_guidelines_link]);

  // const votingGuidelinesText = useMemo(() => {
  //   return (
  //     singleInvesterProfile?.voting_guidelines_summary
  //       ?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  //       ?.replace(/\n/g, "<br />") || ""
  //   );
  // }, [singleInvesterProfile, singleInvesterProfile?.voting_guidelines]);

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

  const backToPreviousPage = () => {
    dispatch(setPage(currentPage));
    navigate(`/investor-profile`);
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
      <div className="col-span-12">
        <div className="flex flex-col justify-between	md:mt-0 md:h-10 md:items-center md:flex-row">
          {/* <div className="text-base font-medium group-[.mode--light]:text-white">
            Investers Detail
          </div> */}

          <Button
            type="button"
            variant="outline-secondary"
            className=" border-none sm:w-fit"
            onClick={backToPreviousPage}
          >
            <ChevronLeft
              className="roup-[.mode--light]:text-white text-white"
              size={18}
              strokeWidth={1.5}
            />
            <div className=" group-[.mode--light]:text-white">Back</div>
          </Button>

          <Button
            type="button"
            variant="outline-secondary"
            className=" border-none sm:w-fit"
            onClick={handleExportToPDF}
          >
            {isGeneratingPDF ? (
              <Lucide
                icon="Loader"
                className={`w-4 h-4 mr-1.5 stroke-[1.3] group-[.mode--light]:text-white ${
                  isGeneratingPDF ? "animate-spin" : ""
                }`}
              />
            ) : (
              <Lucide
                icon="Download"
                className="w-4 h-4 mr-1.5 stroke-[1.3] group-[.mode--light]:text-white "
              />
            )}

            <div className=" group-[.mode--light]:text-white">Download PDF</div>
          </Button>
        </div>

        <div ref={contentRef}>
          <div className="flex justify-between   px-2 gap-y-3 items-center flex-row bg-white box py-2">
            <div>
              <div className=" text-[18px]  font-semibold text-left py-1 leading-none  md:max-w-[350px] sm:max-w-[200px]  overflow-hidden text-ellipsis whitespace-nowrap ">
                {params?.type! === "investor"
                  ? singleInvesterProfile?.institution_name
                  : singleInvesterProfile?.equity_firm_name}
              </div>

              <div className="flex flex-row   items-center sm:gap-4 ">
                <div className="text-[12px] text-slate-500">
                  <span className="font-bold mr-2">Last updated:</span>
                  {dayjs(singleInvesterProfile?.date_updated).format(
                    "MMMM , YYYY"
                  )}
                </div>
              </div>
            </div>

            {user?.user_type === "Admin" && (
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
              className={`flex flex-col w-full ${
                params?.type! === "investor" ? "lg:w-[60%] 2xl:w-[75rem]" : ""
              } gap-y-2`}
            >
              {params?.type === "investor" &&
                Object.keys(investorProfileEditableSectionsInvestors).map(
                  (key, index) => {
                    const typedKey =
                      key as keyof typeof investorProfileEditableSectionsInvestors;
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
                        // renderHtml={singleInvesterProfile?.[key]}
                        renderHtml={
                          singleInvesterProfile?.[key]
                            // ?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            // ?.replace(/\n/g, "<br />") || ""
                        }
                        field={key as keyof InvestersProfile}
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
                            ?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            ?.replace(/\n/g, "<br />")
                            .replace(/\r\n/g, "<br />")
                            ?.replace(/- (.*?)\:/g, "<li><strong>$1:</strong>")
                            ?.replace(
                              /EQT Absolutes:<br \/>/g,
                              "<h3>EQT Absolutes:</h3>"
                            )
                            ?.replace(
                              /Core KPIs:<br \/>/g,
                              "<h3>Core KPIs:</h3>"
                            )
                            ?.replace(
                              /Portfolio-Specific KPIs:<br \/>/g,
                              "<h3>Portfolio-Specific KPIs:</h3>"
                            )
                            ?.concat("</li>") || ""
                        }
                        field={key as keyof InvestersProfile}
                      />
                    );
                  }
                )}
            </div>

            {params?.type! === "investor" && (
              <div className="w-full lg:w-[39%] 2xl:w-[25rem] flex-none lg:mt-0 md:mt-0 sm:mt-2">
                <div className="flex flex-col box">
                  <div
                    className={clsx(
                      "relative flex border-b-2 border-gray-100 flex-col px-4  sm:px-2 items-center  transition-all duration-300 ease-in-out overflow-hidden",
                      isExpanded ? "h-[270px] sm:h-[270px]" : "h-[52px]",
                      user?.user_type?.toLowerCase() === "admin"
                        ? "h-[62px]"
                        : "h-[52px]"
                    )}
                  >
                    <div className="flex items-center justify-between  w-full h-full ">
                      <h4 className="text-[18px]  font-semibold text-left ml-2 leading-none ">
                        Key Contacts
                      </h4>
                      {user?.user_type === "Admin" && (
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
                        <Dropzone
                          ref={dropzoneSingleRef}
                          options={{
                            url: "/",
                            autoProcessQueue: false,
                            clickable: true,
                            thumbnailWidth: 100,
                            maxFiles: 1,

                            acceptedFiles: ".xlsx",
                          }}
                          className="dropzone w-full flex flex-col justify-center items-center h-full "
                        >
                          <div className="text-sm font-semibold text-gray-800 mb-2">
                            Drop files here or click to upload.
                          </div>
                          <div className="p-4 bg-gray-100 rounded-lg shadow-md">
                            <div className="text-[0.8rem] leading-4 text-gray-600 mb-1">
                              Only <span className="font-medium">xlsx</span>{" "}
                              files are allowed.
                            </div>
                            <div className="text-[0.8rem] leading-4 text-gray-600">
                              File should contain only 4 columns: <br />
                              <span className="font-medium text-gray-800">
                                Name
                              </span>
                              ,
                              <span className="font-medium text-gray-800">
                                Designation
                              </span>
                              ,
                              <span className="font-medium text-gray-800">
                                LinkedIn
                              </span>
                              ,
                              <span className="font-medium text-gray-800">
                                Image
                              </span>
                              .
                            </div>
                          </div>
                        </Dropzone>
                      </div>
                    )}
                  </div>
                  <div className="max-h-auto">
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
                              className="flex py-2  flex-col px-4  border-b-2 border-gray-100 "
                            >
                              <div className="flex  items-center   border-b border-dashed last:pb-0 last:mb-0 last:border-0">
                                <div>
                                  <div className="w-12 h-12 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                    {
                                      //  contacts?.image ?
                                      <img
                                        alt="Tailwise - Admin Dashboard Template"
                                        src={
                                          validImages[contacts.name] ||
                                          userLinkedinImage
                                        }
                                      />
                                      //  :
                                      // <img
                                      //   alt="Tailwise - Admin Dashboard Template"
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
    </div>
  );
}

export default Main;
