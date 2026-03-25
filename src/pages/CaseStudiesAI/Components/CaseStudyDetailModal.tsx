import React from "react";
import { Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { FaTimes, FaLayerGroup, FaBuilding, FaHandshake, FaCheckCircle } from "react-icons/fa";
import clsx from "clsx";

interface CaseStudyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCaseStudy: any;
}

const CaseStudyDetailModal: React.FC<CaseStudyDetailModalProps> = ({
    isOpen,
    onClose,
    selectedCaseStudy,
}) => {
    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            size="lg"
        >
            <Dialog.Panel>
                <Dialog.Title className="flex justify-between items-center bg-primary p-6 !text-white rounded-t-lg">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold">
                            {selectedCaseStudy?.company_name || selectedCaseStudy?.caspio_company_name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 opacity-90 text-sm">
                            <span>{selectedCaseStudy?.institution_name}</span>
                            <span>•</span>
                            <span>{selectedCaseStudy?.esg_themes}</span>
                            <span>•</span>
                            <span>{selectedCaseStudy?.year}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </Dialog.Title>
                <Dialog.Description className="p-8 overflow-y-auto max-h-[70vh]">
                    <div className="space-y-8">
                        <div>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                                <FaLayerGroup size={12} /> Resolution / Engagement Topic
                            </h4>
                            <div className="text-lg font-semibold text-slate-800">
                                {selectedCaseStudy?.resolution_engagement_topic || 'Not Specified'}
                            </div>
                        </div>

                        <div>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                                <FaBuilding size={12} /> Background & Details
                            </h4>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                {selectedCaseStudy?.engagement_details || 'No details available.'}
                            </p>
                        </div>

                        <div>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                                <FaHandshake size={12} /> Engagement/Voting Summary
                            </h4>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                {selectedCaseStudy?.voting_details || 'No voting details available.'}
                            </p>
                        </div>

                        <div>
                            <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                                <FaCheckCircle size={12} /> Outcome & Voting Decision
                            </h4>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <span className={clsx(
                                        "px-4 py-1.5 rounded-full font-bold text-sm",
                                        selectedCaseStudy?.vote?.toLowerCase()?.includes('for') ? "bg-success/10 text-success border border-success/20" :
                                            selectedCaseStudy?.vote?.toLowerCase()?.includes('against') ? "bg-danger/10 text-danger border border-danger/20" :
                                                "bg-warning/10 text-warning border border-warning/20"
                                    )}>
                                        Vote: {selectedCaseStudy?.vote || 'Pending'}
                                    </span>
                                </div>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100 italic">
                                    {selectedCaseStudy?.voting_rationale || 'No rationale provided.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Dialog.Description>
                <div className="p-6 border-t bg-slate-50 flex justify-end">
                    <Button
                        variant="primary"
                        onClick={onClose}
                        className="px-8"
                    >
                        Close
                    </Button>
                </div>
            </Dialog.Panel>
        </Dialog>
    );
};

export default CaseStudyDetailModal;
