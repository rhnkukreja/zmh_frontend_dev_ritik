import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { Dialog } from "@/components/Base/Headless";
import Tippy from "@/components/Base/Tippy";
import StandardizedTable from "@/components/StandardizedTable";
import Table from "@/components/Base/Table";
import downloadIcon from "../../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../../assets/images/zmh-images/new-tab-icon.png";
import { ChevronLeft, Grid3X3, MegaphoneOff } from "lucide-react";
import clsx from "clsx";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import AddNewShareholder from "./AddNewShareholder";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import { toast } from "react-toastify";
import { useAppDispatch } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { setPage, setTabs } from "@/stores/shareholderProposalSlice";

type ProposalDetailsTableViewProps = {
    loading: boolean;
    loadingDownload: boolean;
    shareHolderProposal: any[];
    isAllCompanySelected: boolean;
    user: any;
    companyGlobalSearchName?: string;
    handleDownload: () => void;
    onVisibleDetail: (proposal: any) => void;
    onEditProposalClickHandler: (proposal: any, actionType: "edit" | "duplicate") => void;
    setProposalToDelete: (proposal: any) => void;
    setIsDeleteModalOpen: (value: boolean) => void;
    tableOnlyView?: boolean;
};

function ProposalDetailsTableView({
    loading,
    loadingDownload,
    shareHolderProposal,
    isAllCompanySelected,
    user,
    companyGlobalSearchName,
    handleDownload,
    onVisibleDetail,
    onEditProposalClickHandler,
    setProposalToDelete,
    setIsDeleteModalOpen,
    tableOnlyView = false,
}: ProposalDetailsTableViewProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const url = searchParams.get("url");
    const pageParam = searchParams.get("page");
    const selectedTab = url?.includes("withdrawn")
        ? "withdrawn"
        : url?.includes("def14a")
            ? "proposal"
            : url?.includes("no_action")
                ? "no-action"
                : "proposal";
    const dispatch: AppDispatch = useAppDispatch();
    const [isAddNewShareholderModalVisible, setIsAddNewShareholderModalVisible] = useState(false);
    const [selectedShareholderProposal, setSelectedShareholderProposal] = useState<any | null>(null);
    const [actionType, setActionType] = useState<"edit" | "duplicate">("edit");
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [proposalToDelete, setProposalPendingDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleOpenInNewTab = () => {
        try {
            const params = new URLSearchParams();
            params.set("url", "shareholder_proposal/def14a");
            if (companyGlobalSearchName) {
                params.set("global_search", JSON.stringify([companyGlobalSearchName]));
            }
            params.set("view", "table-only");
            window.open(`/shareholder-proposal?${params.toString()}`, "_blank");
        } catch (error) {
            window.open("/shareholder-proposal", "_blank");
        }
    };

    const backToPreviousPage = () => {
        navigate("/shareholder-proposal", {
            state: { isBackToShareholderPage: true },
        });
        window.location.reload();
    };

    return (
        <div className={clsx([tableOnlyView ? "p-5" : ""])}>
            <div>
                {tableOnlyView && <Button
                    onClick={backToPreviousPage}
                    variant="primary"
                    className="bg-theme-2 border-bg-theme-2 mb-4"
                >
                    <ChevronLeft
                        className="group-[.mode--light]:text-white text-white"
                        size={18}
                        strokeWidth={1.5}
                    />
                    Back
                </Button>}
            </div>
            <div className="flex justify-between items-center mb-4" id="data-listing">
                <h3 className="text-lg font-semibold mb-4">Proposal Details</h3>
                <div className="flex gap-2">
                    <Tippy content="Download Excel" options={{ theme: "light" }}>
                        <div
                            className="box p-[5px] cursor-pointer"
                            onClick={() => !loadingDownload && handleDownload()}
                        >
                            {loadingDownload ? (
                                <Lucide icon="Loader" className="w-6 h-7 stroke-[1.3] animate-spin" />
                            ) : (
                                <img alt="download-icon" src={downloadIcon} />
                            )}
                        </div>
                    </Tippy>
                    {!tableOnlyView && (
                        <Tippy content="Open in New Tab" options={{ theme: "light" }}>
                            <div className="box p-2 cursor-pointer" onClick={handleOpenInNewTab}>
                                <img alt="open-tab-icon" src={tabIcon} />
                            </div>
                        </Tippy>
                    )}
                </div>
            </div>

            <StandardizedTable
                isLoading={loading}
                maxHeight={tableOnlyView ? "800px" : "400px"}
                skeletonCols={isAllCompanySelected ? 10 : 9}
                skeletonRows={10}
            >
                <StandardizedTable.Header>
                    <StandardizedTable.Cell isHeader width="8%">
                        Proxy Year
                    </StandardizedTable.Cell>
                    {isAllCompanySelected && (
                        <StandardizedTable.Cell isHeader width="12%">
                            Company
                        </StandardizedTable.Cell>
                    )}
                    <StandardizedTable.Cell isHeader width="15%">
                        Proponent
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="20%">
                        Proposal
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="12%">
                        Category
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="10%" className="text-center cursor-pointer">
                        % Support*
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="10%" className="text-center">
                        Vote Details
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="8%" className="text-center">
                        No Action Letters
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="8%" className="text-center">
                        Details
                    </StandardizedTable.Cell>
                    {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                        <StandardizedTable.Cell isHeader width="8%" className="text-center">
                            Actions
                        </StandardizedTable.Cell>
                    )}
                </StandardizedTable.Header>

                <Table.Tbody>
                    {shareHolderProposal?.length > 0 &&
                        shareHolderProposal.map((proposal: any, index: number) => (
                            <StandardizedTable.Row key={proposal?.id} index={index}>
                                <StandardizedTable.Cell>
                                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                        {proposal?.proxy_season}
                                    </span>
                                </StandardizedTable.Cell>
                                {isAllCompanySelected && (
                                    <StandardizedTable.Cell>
                                        <span className="font-medium">{proposal?.company_name}</span>
                                    </StandardizedTable.Cell>
                                )}
                                <StandardizedTable.Cell>
                                    <span className="font-medium">
                                        {proposal?.proponent === "Not Disclosed" &&
                                            (!proposal?.proponent_name || proposal?.proponent_name.trim() === "")
                                            ? proposal?.proponent
                                            : proposal?.proponent === "Not Disclosed"
                                                ? proposal?.proponent_name
                                                : proposal?.proponent}
                                    </span>
                                </StandardizedTable.Cell>
                                <StandardizedTable.Cell>
                                    <span className="font-medium text-sm">{proposal?.proposal_name || "-"}</span>
                                </StandardizedTable.Cell>
                                <StandardizedTable.Cell>
                                    <span className="font-medium text-sm">{proposal?.category || "-"}</span>
                                </StandardizedTable.Cell>
                                <StandardizedTable.Cell className="text-center">
                                    <span
                                        className={clsx([
                                            `py-2 border-dashed dark:bg-darkmode-600 text-wrap font-medium ${proposal?.color_name} text-center`,
                                        ])}
                                    >
                                        {proposal?.outcome_percentage}
                                    </span>
                                </StandardizedTable.Cell>
                                <StandardizedTable.Cell className="text-center">
                                    {proposal?.vote_details?.length > 0 && (
                                        <div className="flex items-center justify-center cursor-pointer hover:opacity-80 transition duration-150">
                                            <Grid3X3 strokeWidth={1.25} onClick={() => onVisibleDetail(proposal)} />
                                        </div>
                                    )}

                                    {!proposal?.vote_details && proposal?.year?.toString() === "2025" && (
                                        <div className="whitespace-nowrap flex items-center justify-center">
                                            <div className="flex items-center justify-center w-full h-full text-primary">
                                                <Tippy content="Not Disclose" options={{ theme: "light" }}>
                                                    <MegaphoneOff size={22} strokeWidth={1.2} absoluteStrokeWidth />
                                                </Tippy>
                                            </div>
                                        </div>
                                    )}
                                </StandardizedTable.Cell>
                                <StandardizedTable.Cell
                                    className={clsx([
                                        "cursor-pointer text-center",
                                        proposal?.nl_exist && "text-blue-600 underline",
                                    ])}
                                >
                                    {proposal?.nl_exist === true && (
                                        <span
                                            className="font-medium"
                                            onClick={() => {
                                                const id =
                                                    proposal?.nl_exist === true
                                                        ? proposal?.no_action_link?.split("/").filter(Boolean).pop()
                                                        : 0;
                                                proposal?.nl_exist === true &&
                                                    navigate(`/shareholder-proposal/${id}?url=shareholder_proposal/no_action`);
                                            }}
                                        >
                                            Yes
                                        </span>
                                    )}
                                </StandardizedTable.Cell>

                                <StandardizedTable.Cell className="text-center">
                                    <div className="flex gap-3 justify-center">
                                        {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                            <Tippy content="Duplicate" options={{ theme: "light" }}>
                                                <Lucide
                                                    onClick={() => {
                                                        setSelectedShareholderProposal(proposal);
                                                        setActionType("duplicate");
                                                        setIsAddNewShareholderModalVisible(true);
                                                    }}
                                                    icon="Copy"
                                                    className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                                />
                                            </Tippy>
                                        )}

                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                                            <Lucide
                                                onClick={() =>
                                                    navigate(`/shareholder-proposal/${proposal?.id}?url=shareholder_proposal/def14a`)
                                                }
                                                icon="Eye"
                                            />
                                        </div>
                                    </div>
                                </StandardizedTable.Cell>

                                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                    <StandardizedTable.Cell className="text-center">
                                        <div className="flex gap-3 justify-center">
                                            <Tippy content="Edit" options={{ theme: "light" }}>
                                                <Lucide
                                                    onClick={() => {
                                                        setSelectedShareholderProposal(proposal);
                                                        setActionType("edit");
                                                        setIsAddNewShareholderModalVisible(true);
                                                    }}
                                                    icon="PenLine"
                                                    className="w-4 h-4 stroke-[1.3] text-primary cursor-pointer"
                                                />
                                            </Tippy>
                                            <Tippy content="Delete" options={{ theme: "light" }}>
                                                <Lucide
                                                    onClick={() => {
                                                        setProposalPendingDelete(proposal);
                                                        setDeleteModalOpen(true);
                                                    }}
                                                    icon="Trash2"
                                                    className="w-4 h-4 stroke-[1.3] text-danger cursor-pointer"
                                                />
                                            </Tippy>
                                        </div>
                                    </StandardizedTable.Cell>
                                )}
                            </StandardizedTable.Row>
                        ))}
                </Table.Tbody>

                {shareHolderProposal?.length === 0 && (
                    <Table.Tbody>
                        <Table.Tr>
                            <Table.Td colSpan={12} className="text-center py-12">
                                <div className="flex flex-col items-center justify-center">
                                    <Lucide icon="FileSearch" className="w-12 h-12 text-gray-300 mb-2" />
                                    <div className="text-lg font-medium">No data found</div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        Try adjusting your filters or search criteria
                                    </div>
                                </div>
                            </Table.Td>
                        </Table.Tr>
                    </Table.Tbody>
                )}
            </StandardizedTable>

            {isAddNewShareholderModalVisible && (
                <AddNewShareholder
                    addNewShareholderModalVisible={isAddNewShareholderModalVisible}
                    setAddNewShareholderModalVisible={setIsAddNewShareholderModalVisible}
                    selectedShareholderProposal={selectedShareholderProposal}
                    type={actionType}
                />
            )}

            {isDeleteModalOpen && (
                <Dialog
                    size="md"
                    open={isDeleteModalOpen}
                    onClose={() => {
                        setDeleteModalOpen(false);
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
                                Do you really want to delete this proposal? <br />
                                This action cannot be undone.
                            </div>
                        </div>
                        <div className="px-5 pb-8 text-center">
                            <Button
                                variant="outline-secondary"
                                type="button"
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                }}
                                className="w-24 mr-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                type="button"
                                className="w-24"
                                onClick={async () => {
                                    if (!proposalToDelete) return;

                                    try {
                                        setIsDeleting(true);
                                        await shareHolderProposalService.deleteShareHolderProposal(proposalToDelete.id);
                                        toast.success("Proposal deleted successfully");
                                        setDeleteModalOpen(false);
                                        setProposalPendingDelete(null);
                                        window.location.reload();
                                    } catch (error) {
                                        // keep the modal open so the user can retry or cancel
                                    } finally {
                                        setIsDeleting(false);
                                    }
                                }}
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

export default ProposalDetailsTableView;
