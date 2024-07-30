import "@/assets/css/vendors/simplebar.css";
import Lucide from "@/components/Base/Lucide";


import { useEffect, createRef, useMemo } from "react";
import SimpleBar from "simplebar";

import _ from "lodash";
import Button from "@/components/Base/Button";
import { useParams } from "react-router-dom";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { fetchSingleInvestersProfile } from "@/stores/investersProfileSlice";

import LoadingWrapper from "@/components/LoadingWrapper";

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const { singleInvesterProfile, loading } = useAppSelector(
    (state) => state.investersProfile
  );
  
  const params = useParams();
 

  useEffect(() => {
    dispatch(fetchSingleInvestersProfile(Number(params.id!)));
  }, [params.id]);

  const formatReferences = useMemo(() => {
    return singleInvesterProfile?.references
      .split(";")
      .filter((url) => url.trim())
      .map(
        (url) =>
          `<a  href="${url.trim()}" target="_blank" rel="noopener noreferrer">${url.trim()}</a>`
      )
      .join("<br />");
  }, [singleInvesterProfile, singleInvesterProfile?.references]);

  const formatVotingGuidelinesLink = useMemo(() => {
    return singleInvesterProfile?.voting_guidelines_link
      .split(";")
      .filter((url) => url.trim())
      .map(
        (url) =>
          `<a  href="${url.trim()}" target="_blank" rel="noopener noreferrer">${url.trim()}</a>`
      )
      .join("<br />");
  }, [singleInvesterProfile, singleInvesterProfile?.voting_guidelines_link]);

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="flex flex-col mt-4 md:mt-0 md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="text-base font-medium group-[.mode--light]:text-white">
            Investers Detail
          </div>
        </div>
        <div className="mt-3.5 flex flex-col lg:flex-row gap-y-10 gap-x-6">
          <div className="w-full lg:w-[23rem] flex-none">
            <div className="flex flex-col gap-y-7">
              <div className="flex flex-col py-4  px-2   box box--stacked">
                <h3 className="text-2xl text-center  font-medium leading-none text-primary">
                  Key Contacts
                </h3>
              </div>
              <div className=" overflow-y-auto no-scrollbar">
                {loading ? (
                  <LoadingWrapper height={200} />
                ) : (
                  <>
                    {singleInvesterProfile?.key_contacts?.map((contacts) => (
                      <div className="flex my-6 flex-col px-4 box box--stacked">
                        <div className="flex my-6 flex-col items-center">
                          <div>
                            <div className="w-28 h-28 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                              <img
                                alt="Tailwise - Admin Dashboard Template"
                                src={contacts?.image}
                              />
                            </div>
                          </div>
                          <div className="text-xl mt-3 font-mono font-bold text-center text-gray-800">
                            {contacts?.name}
                          </div>
                          <div
                            className="text-slate-500 mt-0.5 font-bold text-center"
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
                            <Lucide
                              icon="Linkedin"
                              className="w-4 h-4 stroke-[1.3] mr-2"
                            />
                            Linked In
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col w-full gap-y-7">
            <div className="flex flex-col p-4 box box--stacked">
              <h3 className="text-2xl text-left  font-medium leading-none text-primary">
                Engagement Priorities
              </h3>
            </div>
            {loading ? (
              <LoadingWrapper height={300} />
            ) : (
              <div className="flex my-6 flex-col px-4 box box--stacked">
                <div
                  className="text-slate-500 mt-0.5 my-3 text-left"
                  dangerouslySetInnerHTML={{
                    __html: singleInvesterProfile?.engagement_priorities
                      ?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      ?.replace(/\n/g, "<br />")!,
                  }}
                />
              </div>
            )}
            <div className="flex flex-col p-5 box box--stacked">
              <h3 className="text-2xl text-left  font-medium leading-none text-primary">
                Reporting Expectations
              </h3>
            </div>
            {loading ? (
              <LoadingWrapper height={300} />
            ) : (
              <div className="flex my-6 flex-col px-4 box box--stacked">
                <div
                  className="text-slate-500 mt-0.5 my-3 text-left"
                  dangerouslySetInnerHTML={{
                    __html: singleInvesterProfile?.reporting_expectations
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      ?.replace(/\n/g, "<br />")!,
                  }}
                />
              </div>
            )}
            <div className="flex flex-col p-5 box box--stacked">
              <h3 className="text-2xl text-left  font-medium leading-none text-primary">
                ESG Integration Process
              </h3>
            </div>
            {loading ? (
              <LoadingWrapper height={300} />
            ) : (
              <div className="flex my-6 flex-col px-4 box box--stacked">
                <div
                  className="text-slate-500 mt-0.5 my-3 text-left"
                  dangerouslySetInnerHTML={{
                    __html: singleInvesterProfile?.esg_integration_process
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      ?.replace(/\n/g, "<br />")!,
                  }}
                />
              </div>
            )}
            <div className="flex flex-col p-5 box box--stacked">
              <h3 className="text-2xl text-left  font-medium leading-none text-primary">
                Voting Guidelines Link
              </h3>
            </div>
            {loading ? (
              <LoadingWrapper height={200} />
            ) : (
              <div className="flex my-6 flex-col px-4 box box--stacked">
                <div
                  className="text-slate-500 mt-0.5 pt-2 my-3 text-left"
                  dangerouslySetInnerHTML={{
                    __html: formatVotingGuidelinesLink || "",
                  }}
                />
              </div>
            )}
            <div className="flex flex-col p-5 box box--stacked">
              <h3 className="text-2xl text-left  font-medium leading-none text-primary">
                Voting Guidelines Summary
              </h3>
            </div>
            {loading ? (
              <LoadingWrapper height={300} />
            ) : (
              <div className="flex my-6 flex-col px-4 box box--stacked">
                <div
                  className="text-slate-500 mt-0.5 my-3 text-left"
                  dangerouslySetInnerHTML={{
                    __html: singleInvesterProfile?.voting_guidelines_summary
                      ?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      ?.replace(/\n/g, "<br />")!,
                  }}
                />
              </div>
            )}
            <div className="flex flex-col p-5 box box--stacked">
              <h3 className="text-2xl text-left  font-medium leading-none text-primary">
                References
              </h3>
            </div>
            {loading ? (
              <LoadingWrapper height={300} />
            ) : (
              <div className="flex my-6 flex-col px-4 pt-2  box box--stacked">
                <div
                  className="text-slate-500 mt-0.5 my-3 text-left "
                  dangerouslySetInnerHTML={{ __html: formatReferences || "" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
