import "@/assets/css/vendors/simplebar.css";
import Lucide from "@/components/Base/Lucide";

import { useEffect, createRef, useMemo, useState, useRef } from "react";
import SimpleBar from "simplebar";

import _ from "lodash";
import Button from "@/components/Base/Button";
import { useParams } from "react-router-dom";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { fetchSingleInvestersProfile } from "@/stores/investersProfileSlice";

import LoadingWrapper from "@/components/LoadingWrapper";

import EditableSection from "./components/EditableSections";
import dayjs from "dayjs";
import Tippy from "@/components/Base/Tippy";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import { baseURL } from "@/constant";
import { toast } from "react-toastify";
import { KeyContact } from "@/types/investerProfiles";
import ParceHtml from "@/components/ParseHtml";
import clsx from "clsx";

function Main() {
  const dropzoneSingleRef = useRef<DropzoneElement>(null);
  const dispatch: AppDispatch = useAppDispatch();
  const { singleInvesterProfile, loading } = useAppSelector(
    (state) => state.investersProfile
  );
  const { user } = useAppSelector((state) => state.authentiction);
  const params = useParams();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const getSingleInvesterProfile = (id: string) => {
    dispatch(fetchSingleInvestersProfile(Number(id)));
  };

  useEffect(() => {
    getSingleInvesterProfile(params.id!);
  }, [params.id]);

  const formatReferences = useMemo(() => {
    return singleInvesterProfile?.references
      .split(";")
      .filter((url: string) => url.trim())
      .map(
        (url: string) =>
          `<a  href="${url.trim()}" target="_blank" rel="noopener noreferrer">${url.trim()}</a>`
      )
      .join("<br />");
  }, [singleInvesterProfile, singleInvesterProfile?.references]);

  useEffect(() => {
    const elDropzoneSingleRef = dropzoneSingleRef.current;

    if (elDropzoneSingleRef) {
      const dropzoneInstance = elDropzoneSingleRef.dropzone;

      const handleComplete = (file: any) => {
        if (file?.status === "success") {
          toast.success("Uploaded Successfully!");
          setIsExpanded(false);
          getSingleInvesterProfile(params.id!);
        }
        if (file?.status === "error") {
          const fileType = file?.name?.split(".")?.pop();

          if (fileType && !["xlsx"].includes(fileType)) {
            toast.error("Only excel file are allowed!");
          } else {
            toast.error("Something went wrong!");
          }
        }
        setIsExpanded(false);
        dropzoneInstance.removeFile(file);
      };

      dropzoneInstance.on("complete", handleComplete);

      return () => {
        dropzoneInstance.off("complete", handleComplete);
      };
    }
  }, [dropzoneSingleRef.current, isExpanded]);

  const formatVotingGuidelinesLink = useMemo(() => {
    return singleInvesterProfile?.voting_guidelines_link
      .split(";")
      .filter((url) => url.trim())
      .map(
        (url) =>
          `<a  href="${url.trim()}" target="_blank" rel="noopener noreferrer">${url.trim()}</a>`
      )
      .join("<br /><br /><br />");
  }, [singleInvesterProfile, singleInvesterProfile?.voting_guidelines_link]);

  const votingGuidelinesText = useMemo(() => {
    return (
      singleInvesterProfile?.voting_guidelines_summary
        ?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        ?.replace(/\n/g, "<br />") || ""
    );
  }, [singleInvesterProfile, singleInvesterProfile?.voting_guidelines_summary]);

  console.log({ singleInvesterProfile, votingGuidelinesText });

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex flex-col mt-4 md:mt-0 md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="text-base font-medium group-[.mode--light]:text-white">
            Investers Detail
          </div>
        </div>
        <div className="flex justify-between mt-4 py-4 px-2 gap-y-3 items-center flex-row bg-white box">
          <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
            <Tippy
              content={singleInvesterProfile?.institution_name || ""}
              options={{
                theme: "light",
              }}
            >
              <h2 className="sm:text-[1.3rem] text-sm font-semibold  text-gray-600 dark:text-gray-100 tracking-wide">
                {singleInvesterProfile?.institution_name || ""}
              </h2>
            </Tippy>
          </div>

          <div className="flex flex-row justify-center items-center sm:gap-4 ">
            <h2 className="hidden sm:text-[1.1rem] sm:inline sm:text-xl text-sm font-semibold  text-gray-600 dark:text-gray-100 tracking-wide">
              Last Update:
            </h2>
            <p className="flex items-center justify-center text-sm sm:text-[16px] font-medium rounded-md text-primary bg-primary/10 border  px-1.5 py-1 ">
              {dayjs(singleInvesterProfile?.date_updated).format(
                "MMMM D, YYYY"
              )}
            </p>
          </div>
        </div>
        <div className="mt-3.5 flex flex-col lg:flex-row  gap-x-6">
          <div className="w-full lg:w-[18rem] flex-none">
            <div className="flex flex-col ">
              <div
                className={clsx(
                  "relative flex flex-col px-4 py-3 sm:px-2 items-center box transition-all duration-300 ease-in-out overflow-hidden",
                  isExpanded ? "h-[270px] sm:h-[270px]" : "h-[52px]",
                  user?.user_type?.toLowerCase() === "admin"
                    ? "h-[62px]"
                    : "h-[52px]"
                )}
              >
                <div className="flex items-center justify-between  w-full h-full">
                  <h4 className="text-[18px] font-bold leading-none text-primary">
                    Key Contacts
                  </h4>
                  {user?.user_type === "Admin" && (
                    <div
                      className="ml-4 cursor-pointer flex items-center justify-center bg-transparent rounded-md text-primary px-4 py-2 transition-colors duration-200 hover:bg-primary hover:text-white"
                      onClick={toggleExpand}
                    >
                      <Lucide
                        icon="FileText"
                        className="stroke-[1.3] w-4 h-4 mr-1.5"
                      />
                      Upload
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="w-full mt-3 max-h-[180px]">
                    <Dropzone
                      ref={dropzoneSingleRef}
                      options={{
                        url: `${baseURL}/investor_profile/`,
                        method: "put",
                        thumbnailWidth: 100,
                        maxFilesize: 5000,
                        maxFiles: 1,
                        paramName: "excel",
                        acceptedFiles: ".xlsx",
                      }}
                      className="dropzone w-full flex flex-col justify-center items-center h-full "
                    >
                      <div className="text-sm font-semibold text-gray-800 mb-2">
                        Drop files here or click to upload.
                      </div>
                      <div className="p-4 bg-gray-100 rounded-lg shadow-md">
                        <div className="text-[0.8rem] leading-4 text-gray-600 mb-1">
                          Only <span className="font-medium">xlsx</span> files
                          are allowed.
                        </div>
                        <div className="text-[0.8rem] leading-4 text-gray-600">
                          File should contain only 4 columns: <br />
                          <span className="font-medium text-gray-800">
                            Name
                          </span>
                          ,
                          <span className="font-medium text-gray-800">
                            {" "}
                            Designation
                          </span>
                          ,
                          <span className="font-medium text-gray-800">
                            {" "}
                            LinkedIn
                          </span>
                          ,
                          <span className="font-medium text-gray-800">
                            {" "}
                            Image
                          </span>
                          .
                        </div>
                      </div>
                    </Dropzone>
                  </div>
                )}
              </div>
              <div className=" overflow-y-auto no-scrollbar">
                {loading ? (
                  <div className="mt-[-20px]">
                    {" "}
                    <LoadingWrapper height={200} />
                  </div>
                ) : (
                  <>
                    {singleInvesterProfile?.key_contacts?.map(
                      (contacts: KeyContact) => (
                        <div className="flex mb-6  flex-col px-4 box ">
                          <div className="flex my-6 flex-col items-center">
                            <div>
                              <div className="w-28 h-28 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                <img
                                  alt="Tailwise - Admin Dashboard Template"
                                  src={contacts?.image}
                                />
                              </div>
                            </div>
                            <div className="text-xl mt-3  font-bold text-center text-gray-800">
                              {contacts?.name}
                            </div>
                            <div
                              className="text-slate-500 mt-0.5 font-semibold text-center"
                              dangerouslySetInnerHTML={{
                                __html: contacts?.designation,
                              }}
                            />

                            <Button
                              rounded
                              type="button"
                              variant="primary"
                              className="w-full mt-5"
                              onClick={() => {
                                window.open(contacts?.linkedin, "_blank");
                              }}
                            >
                              LinkedIn
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col w-full gap-y-4">
            <EditableSection
              fetchloading={loading}
              id={Number(params.id)}
              title="Engagement Priorities"
              renderHtml={
                singleInvesterProfile?.engagement_priorities
                  ?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  ?.replace(/\n/g, "<br />") || ""
              }
              field="engagement_priorities"
            />
            <EditableSection
              fetchloading={loading}
              id={Number(params.id)}
              title="Reporting Expectations"
              renderHtml={
                singleInvesterProfile?.reporting_expectations
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  ?.replace(/\n/g, "<br />") || ""
              }
              field="reporting_expectations"
            />
            <EditableSection
              fetchloading={loading}
              id={Number(params.id)}
              title="ESG Integration Process"
              renderHtml={
                singleInvesterProfile?.esg_integration_process
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  ?.replace(/\n/g, "<br />") || ""
              }
              field="esg_integration_process"
            />
            <EditableSection
              fetchloading={loading}
              id={Number(params.id)}
              title="Voting Guidelines"
              renderHtml={votingGuidelinesText + formatVotingGuidelinesLink}
              field="voting_guidelines_link"
            />
            {/* <EditableSection
              fetchloading={loading}
              id={Number(params.id)}
              title="Voting Guidelines Summary"
              renderHtml={
                singleInvesterProfile?.voting_guidelines_summary
                  
              }
              field="voting_guidelines_summary"
            /> */}
            <EditableSection
              fetchloading={loading}
              id={Number(params.id)}
              title="References"
              renderHtml={formatReferences || ""}
              field="references"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
