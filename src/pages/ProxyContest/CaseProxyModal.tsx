
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { getSingleSingleCaseStudy } from "@/stores/caseStudySlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import React, { useEffect } from "react";

interface CaseProxyModalProps {
    caseProxyModalVisible: boolean;
    setCaseProxyModalVisible: (visible: boolean) => void;
    caseProxyModalData: any;
}

const CaseProxyModal: React.FC<CaseProxyModalProps> = ({
    caseProxyModalVisible,
    setCaseProxyModalVisible,
    caseProxyModalData
}) => {

    const dispatch: AppDispatch = useAppDispatch();
    
      const { singleCaseStudy, loading } = useAppSelector(
        (state) => state.caseStudies
      );
    
      useEffect(() => {
        dispatch(getSingleSingleCaseStudy(Number(caseProxyModalData?.id!)));
      }, [caseProxyModalData?.id!]);


    return (
        <Dialog
            size="xl"
            open={caseProxyModalVisible}
            onClose={() => {
                setCaseProxyModalVisible(false);
            }}
        >
            <Dialog.Panel className="text-center">
                <Dialog.Title>
                    <h2 className="mr-auto text-xl font-semibold">
                        View Case Study Information
                    </h2>
                    <div
                        onClick={() => {
                            setCaseProxyModalVisible(false);
                        }}
                        className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
                    >
                        <Lucide icon="X" className="w-8 h-8 text-slate-400" />
                    </div>
                </Dialog.Title>
                <Dialog.Description className="px-6 py-4 space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {singleCaseStudy?.institution_name && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">
                                        Institution Name
                                    </h3>
                                    <p>{singleCaseStudy.institution_name}</p>
                                </div>
                            )}
                            {singleCaseStudy?.esg_themes && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">Theme</h3>
                                    <p>{singleCaseStudy.esg_themes}</p>
                                </div>
                            )}
                            {singleCaseStudy?.industry && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">Industry</h3>
                                    <p>{singleCaseStudy.industry}</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {singleCaseStudy?.company_name && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">Company</h3>
                                    <p>{singleCaseStudy.company_name}</p>
                                </div>
                            )}
                            {singleCaseStudy?.company_ticker && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">
                                        Company Ticker
                                    </h3>
                                    <p>{singleCaseStudy.company_ticker}</p>
                                </div>
                            )}
                            {singleCaseStudy?.company_sector && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">
                                        Company Sector
                                    </h3>
                                    <p>{singleCaseStudy.company_sector}</p>
                                </div>
                            )}
                            {singleCaseStudy?.year && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">Year</h3>
                                    <p>{singleCaseStudy.year}</p>
                                </div>
                            )}
                            {singleCaseStudy?.market && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">Market</h3>
                                    <p>{singleCaseStudy.market}</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {singleCaseStudy?.proposal_type && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">
                                        Proponent
                                    </h3>
                                    <p>{singleCaseStudy.proposal_type}</p>
                                </div>
                            )}
                            {singleCaseStudy?.resolution_engagement_topic && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">
                                        Resolution
                                    </h3>
                                    <p>{singleCaseStudy.resolution_engagement_topic}</p>
                                </div>
                            )}
                            {singleCaseStudy?.vote && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">Vote</h3>
                                    <p className="text-destructive">{singleCaseStudy.vote}</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1  gap-4">
                            {singleCaseStudy?.engagement_details && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px]  mb-2">
                                        Engagement/Voting Details
                                    </h3>
                                    <p>{singleCaseStudy.engagement_details}</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1  gap-4">
                            {singleCaseStudy?.voting_rationale && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">
                                        Rationale
                                    </h3>
                                    <p>{singleCaseStudy.voting_rationale}</p>
                                </div>
                            )}
                            {singleCaseStudy?.voting_details && (
                                <div>
                                    <h3 className="font-semibold min-w-[150px] mb-2">Details</h3>
                                    <p>{singleCaseStudy.voting_details}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                                {singleCaseStudy?.urls_def14 && (
                                    <div>
                                        <h3 className="font-semibold">Proxy Statement</h3>
                                        <p className="mb-4">
                                            <a
                                                href={singleCaseStudy.urls_def14}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 underline"
                                            >
                                                {singleCaseStudy.urls_def14}
                                            </a>
                                        </p>
                                    </div>
                                )}
                                {singleCaseStudy?.urls_8k && (
                                    <div>
                                        <h3 className="font-semibold">Vote Report</h3>
                                        <p className="mb-4">
                                            <a
                                                href={singleCaseStudy.urls_8k}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 underline"
                                            >
                                                {singleCaseStudy.urls_8k}
                                            </a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Dialog.Description>

                <Dialog.Footer className="flex justify-end">
                </Dialog.Footer>
            </Dialog.Panel>
        </Dialog>
    );
};

export default CaseProxyModal;
