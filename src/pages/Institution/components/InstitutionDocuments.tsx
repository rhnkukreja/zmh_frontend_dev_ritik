import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingWrapper from "@/components/LoadingWrapper";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchInstitutionDocuments,
  getSingleInstitution,
} from "@/stores/institutionSlice";
import { AppDispatch } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft, FileText, ExternalLink, Plus, PenLine, Trash2, RotateCcw } from "lucide-react";
import Table from "@/components/Base/Table";
import TableWrapper from "@/components/TableWrapper";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import { FormCheck } from "@/components/Base/Form";
import { InstitutionDocument } from "@/types/institutions";
import AddDocumentModal from "./AddDocumentModal";
import EditDocumentModal from "./EditDocumentModal";
import { institutionService } from "@/services/institution";
import { toast } from "react-toastify";
import investorIcon from "../../../assets/images/zmh-images/investor-icon.png";

type ProfileSection = "summary" | "engagement_priorities" | "reporting_expectation" | "esg_integration" | "voting_guidelines";

const InstitutionDocuments = () => {
  const params = useParams();
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const [showTrash, setShowTrash] = useState(false);
  const [trashedDocuments, setTrashedDocuments] = useState<InstitutionDocument[]>([]);

  // Fetch trashed documents when showTrash is true
  useEffect(() => {
    const fetchTrash = async () => {
      if (showTrash && params.id) {
        try {
          const response = await institutionService.getTrashedDocuments(Number(params.id));
          setTrashedDocuments(response.results || []);
        } catch {
          toast.error('Failed to fetch trashed documents');
        }
      }
    };
    fetchTrash();
  }, [showTrash, params.id]);

  const {
    singleInstitution,
    institutionDocuments,
    documentsLoading,
    documentsCount,
    loading,
  } = useAppSelector((state) => state.institutions);



  const [addDocumentVisible, setAddDocumentVisible] = useState(false);
  const [editDocumentVisible, setEditDocumentVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<InstitutionDocument | null>(null);
  const [linkingInProgress, setLinkingInProgress] = useState<{[key: string]: boolean}>({});
  // Store pending link/unlink operations before API call
  const [pendingLinkOps, setPendingLinkOps] = useState<Array<{ document_id: number; section: ProfileSection; action: "link" | "unlink" }>>([]);
  const [pendingDocumentId, setPendingDocumentId] = useState<number | null>(null); // For UI focus
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'delete'|'restore'|'bulk-delete'; document?: InstitutionDocument; ids?: number[] }>({ open: false, type: 'delete' });
  const [linkConfirmOpen, setLinkConfirmOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Only show active documents for bulk selection
  const filteredDocuments = institutionDocuments?.filter((doc) => !doc.is_deleted) || [];
  const documentsToDisplay = showTrash ? trashedDocuments : institutionDocuments;

  const handleSelectRow = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAllRows = () => {
    if (selectedRows.length === filteredDocuments.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredDocuments.map((doc) => doc.id));
    }
  };

  const handleBulkDelete = () => {
    setConfirmModal({ open: true, type: 'bulk-delete', ids: selectedRows });
  };

  const confirmBulkDelete = async () => {
    if (!confirmModal.ids || !Array.isArray(confirmModal.ids) || confirmModal.ids.length === 0) {
      toast.error('No documents selected for bulk delete');
      return;
    }
    console.log('Bulk delete payload:', { document_ids: confirmModal.ids });
    setBulkActionLoading(true);
    try {
      await institutionService.bulkDeleteInstitutionDocuments(confirmModal.ids);
      toast.success('Selected documents moved to trash');
      setSelectedRows([]);
      handleDocumentSuccess();
    } catch {
      toast.error('Bulk delete failed');
    } finally {
      setBulkActionLoading(false);
      setConfirmModal({ open: false, type: 'bulk-delete' });
    }
  };
  // Soft delete (move to trash)
  const handleDeleteDocument = (document: InstitutionDocument) => {
    setConfirmModal({ open: true, type: 'delete', document });
  };

  const confirmDeleteDocument = async () => {
    if (!confirmModal.document) return;
    try {
      await institutionService.deleteInstitutionDocument(confirmModal.document.id);
      toast.success("Document moved to trash successfully");
      handleDocumentSuccess();
    } catch {
      toast.error("Failed to move document to trash");
    } finally {
      setConfirmModal({ open: false, type: 'delete' });
    }
  };

  // Restore from trash
  const handleRestoreDocument = (document: InstitutionDocument) => {
    setConfirmModal({ open: true, type: 'restore', document });
  };

  const confirmRestoreDocument = async () => {
    if (!confirmModal.document) return;
    try {
      await institutionService.restoreInstitutionDocument(confirmModal.document.id);
      toast.success("Document restored successfully");
      // Remove restored document from trash view immediately
      setTrashedDocuments((prev) => prev.filter(doc => doc.id !== confirmModal.document?.id));
      handleDocumentSuccess();
    } catch {
      toast.error("Failed to restore document");
    } finally {
      setConfirmModal({ open: false, type: 'restore' });
    }
  };


  const { user } = useAppSelector((state) => state.authentiction);

  useEffect(() => {
    if (params.id) {
      dispatch(getSingleInstitution(Number(params.id)));
      dispatch(fetchInstitutionDocuments(Number(params.id)));
    }
  }, [params.id, dispatch]);

  const backToPreviousPage = () => {
    navigate(`/institution`);
  };

  const handleViewDocument = (link: string) => {
    window.open(link, "_blank");
  };

  const handleEditDocument = (document: InstitutionDocument) => {
    setSelectedDocument(document);
    setEditDocumentVisible(true);
  };

  const handleDocumentSuccess = () => {
    if (params.id) {
      dispatch(fetchInstitutionDocuments(Number(params.id)));
    }
  };

  const handleLinkToProfile = async (
    document: InstitutionDocument,
    section: ProfileSection,
    isCurrentlyLinked: boolean
  ) => {
    // Instead of calling API, store or remove the intended operation
    setPendingLinkOps((prev) => {
      const hasExisting = prev.some(
        (op) => op.document_id === document.id && op.section === section
      );

      if (hasExisting) {
        const next = prev.filter(
          (op) => !(op.document_id === document.id && op.section === section)
        );
        if (pendingDocumentId === document.id && !next.some((op) => op.document_id === document.id)) {
          setPendingDocumentId(null);
        }
        return next;
      }

      setPendingDocumentId(document.id);
      const filtered = prev.filter(
        (op) => !(op.document_id === document.id && op.section === section)
      );
      return [
        ...filtered,
        {
          document_id: document.id,
          section,
          action: isCurrentlyLinked ? "unlink" : "link",
        },
      ];
    });
  };
  // Bulk link/unlink handler
  const handleBulkLinkToProfile = async () => {
    if (!params.id || pendingLinkOps.length === 0) return;
    setLinkingInProgress((prev) => ({ ...prev, bulk: true }));
    // Group operations by document for API
    const grouped: { [docId: number]: { sections: ProfileSection[]; action: "link" | "unlink" } } = {};
    pendingLinkOps.forEach(op => {
      if (!grouped[op.document_id]) {
        grouped[op.document_id] = { sections: [], action: op.action };
      }
      grouped[op.document_id].sections.push(op.section);
      grouped[op.document_id].action = op.action; // last op wins
    });
    const operations = Object.entries(grouped).map(([document_id, { sections, action }]) => ({
      document_id: Number(document_id),
      sections,
      action
    }));
    try {
      await institutionService.bulkLinkDocumentsToProfile(Number(params.id), operations);
      dispatch(fetchInstitutionDocuments(Number(params.id)));
      toast.success("Profile link(s) updated");
      setPendingLinkOps([]);
      setPendingDocumentId(null);
    } catch (error) {
      toast.error("Failed to update document link(s)");
    } finally {
      setLinkingInProgress((prev) => ({ ...prev, bulk: false }));
    }
  };

  // Cancel pending link ops
  const handleCancelLinkOps = () => {
    setPendingLinkOps([]);
    setPendingDocumentId(null);
  };

  const isLinkingInProgress = (documentId: number, section: string) => {
    return linkingInProgress[`${documentId}-${section}`] || false;
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "extremely high":
        return "bg-purple-100 text-purple-800";
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const pendingDocIds = Array.from(
    new Set(pendingLinkOps.map((op) => op.document_id))
  );

  return (
    <>
      <Button
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
      </Button>

      <div className="box box--stacked">
        <div className="p-5 border-b border-slate-200/80">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                {loading ? "Loading..." : (
                  <>
                    {singleInstitution?.institution}
                    {/* Document Tab btn is disabled for now */}
                    {/* {(singleInstitution?.investor_profile_id || institutionDocuments?.[0]?.investor_profile_id) && (
                      <button
                        className="cursor-pointer ml-2 px-3 py-1 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors text-sm font-medium"
                        title="Document Tab"
                        onClick={() => {
                          const id = singleInstitution?.investor_profile_id || institutionDocuments?.[0]?.investor_profile_id;
                          window.open(`/investor-company-details/${id}`, '_blank');
                        }}
                      >
                        Document Tab
                      </button>
                    )} */}
                  </>
                )}
              </h1>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <span className="text-base font-semibold text-slate-700">
                  {documentsCount > 0 && `Total Documents: ${documentsCount}`}
                </span>
                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                  <>
                    <Button
                      onClick={() => setAddDocumentVisible(true)}
                      variant="primary"
                      className="bg-theme-2 border-bg-theme-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Document
                    </Button>
                    <Button
                      variant={showTrash ? "secondary" : "outline-secondary"}
                      onClick={() => setShowTrash((v) => !v)}
                      className="ml-2"
                    >
                      {showTrash ? "View Active" : "View Trash"}
                    </Button>
                  </>
                )}
              </div>
              {pendingLinkOps.length > 0 && (
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="primary"
                    className="bg-theme-2 border-bg-theme-2"
                    onClick={() => setLinkConfirmOpen(true)}
                    disabled={linkingInProgress.bulk}
                  >
                    Submit
                  </Button>
                  <Button variant="outline-secondary" className="border-theme-2 text-theme-2" onClick={handleCancelLinkOps}>Cancel</Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Bulk Delete Button */}
          {selectedRows.length > 0 && (
            <div className="mb-3 flex justify-end">
              <Button variant="danger" onClick={handleBulkDelete} disabled={bulkActionLoading}>
                Move Selected to Trash ({selectedRows.length})
              </Button>
            </div>
          )}
          <TableWrapper isLoading={documentsLoading}>
            <div>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[40px]">
                      <FormCheck className="flex justify-center">
                        <FormCheck.Input
                          type="checkbox"
                          checked={selectedRows.length === filteredDocuments.length && filteredDocuments.length > 0}
                          // indeterminate prop removed, not supported by FormCheck.Input
                          onChange={handleSelectAllRows}
                        />
                      </FormCheck>
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] border-header text-[#000000B2] text-xs w-[180px]">
                      Name
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[120px]">
                      Type
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[60px]">
                      Year
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[100px]">
                      Created By
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[90px]">
                      Created
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">Sum</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">Eng</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">Rep</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">ESG</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">Vote</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[80px]">
                      Priority
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header last:rounded-tr-[0.6rem] border-header text-[#000000B2] text-xs w-[90px]">
                      Actions
                    </Table.Td>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {documentsToDisplay?.length > 0 ? (
                    documentsToDisplay.map((document: InstitutionDocument) => (
                      <Table.Tr key={document.id}>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs w-[40px]">
                          {!showTrash && !document.is_deleted && (
                            <FormCheck className="flex justify-center">
                              <FormCheck.Input
                                type="checkbox"
                                checked={selectedRows.includes(document.id)}
                                onChange={() => handleSelectRow(document.id)}
                              />
                            </FormCheck>
                          )}
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white text-slate-700 border-slate-200/80 text-xs w-[220px] max-w-[220px] align-top">
                          <div className="flex items-start">
                            <FileText className="w-3.5 h-3.5 min-w-3.5 min-h-3.5 text-slate-400 mr-1.5 mt-0.5" />
                            <button
                              onClick={() => handleViewDocument(document.link)}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left break-words whitespace-pre-line w-full"
                              style={{ wordBreak: 'break-word', whiteSpace: 'pre-line' }}
                            >
                              {document.name}
                            </button>
                          </div>
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs">
                          {document.document_type || "-"}
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs">
                          {document.year || "-"}
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs truncate">
                          {document.created_by_name || "-"}
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs">
                          {document.date_created ? new Date(document.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : "-"}
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={
                                pendingLinkOps.some(op => op.document_id === document.id && op.section === "summary")
                                  ? pendingLinkOps.find(op => op.document_id === document.id && op.section === "summary")?.action === "link"
                                  : document.linked_to_summary
                              }
                              disabled={
                                isLinkingInProgress(document.id, "summary") ||
                                !(user?.user_type === "Analyst" || user?.user_type === "Admin")
                              }
                              onChange={() =>
                                handleLinkToProfile(document, "summary", document.linked_to_summary)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={
                                pendingLinkOps.some(op => op.document_id === document.id && op.section === "engagement_priorities")
                                  ? pendingLinkOps.find(op => op.document_id === document.id && op.section === "engagement_priorities")?.action === "link"
                                  : document.linked_to_engagement_priorities
                              }
                              disabled={
                                isLinkingInProgress(document.id, "engagement_priorities") ||
                                !(user?.user_type === "Analyst" || user?.user_type === "Admin")
                              }
                              onChange={() =>
                                handleLinkToProfile(document, "engagement_priorities", document.linked_to_engagement_priorities)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={
                                pendingLinkOps.some(op => op.document_id === document.id && op.section === "reporting_expectation")
                                  ? pendingLinkOps.find(op => op.document_id === document.id && op.section === "reporting_expectation")?.action === "link"
                                  : document.linked_to_reporting_expectation
                              }
                              disabled={
                                isLinkingInProgress(document.id, "reporting_expectation") ||
                                !(user?.user_type === "Analyst" || user?.user_type === "Admin")
                              }
                              onChange={() =>
                                handleLinkToProfile(document, "reporting_expectation", document.linked_to_reporting_expectation)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={
                                pendingLinkOps.some(op => op.document_id === document.id && op.section === "esg_integration")
                                  ? pendingLinkOps.find(op => op.document_id === document.id && op.section === "esg_integration")?.action === "link"
                                  : document.linked_to_esg_integration
                              }
                              disabled={
                                isLinkingInProgress(document.id, "esg_integration") ||
                                !(user?.user_type === "Analyst" || user?.user_type === "Admin")
                              }
                              onChange={() =>
                                handleLinkToProfile(document, "esg_integration", document.linked_to_esg_integration)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          <FormCheck className="flex justify-center">
                            <FormCheck.Input
                              type="checkbox"
                              checked={
                                pendingLinkOps.some(op => op.document_id === document.id && op.section === "voting_guidelines")
                                  ? pendingLinkOps.find(op => op.document_id === document.id && op.section === "voting_guidelines")?.action === "link"
                                  : document.linked_to_voting_guidelines
                              }
                              disabled={
                                isLinkingInProgress(document.id, "voting_guidelines") ||
                                !(user?.user_type === "Analyst" || user?.user_type === "Admin")
                              }
                              onChange={() =>
                                handleLinkToProfile(document, "voting_guidelines", document.linked_to_voting_guidelines)
                              }
                            />
                          </FormCheck>
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityBadgeClass(document.priority)}`}
                          >
                            {document.priority || "-"}
                          </span>
                        </Table.Td>
                        {/* Actions column */}
                        <Table.Td className="py-1.5 bg-white border-slate-200/80">
                          <div className="flex gap-2 items-center">
                            {/* Show Edit/Delete for active, Restore for trashed */}
                            {!showTrash && !document.is_deleted && (user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                              <>
                                <Tippy content="Edit" options={{ theme: "light" }}>
                                  <button
                                    onClick={() => handleEditDocument(document)}
                                    className="p-0.5 hover:bg-slate-100 rounded"
                                  >
                                    <PenLine className="w-3.5 h-3.5 text-slate-600" />
                                  </button>
                                </Tippy>
                                <Tippy content="Move to Trash" options={{ theme: "light" }}>
                                  <button
                                    onClick={() => handleDeleteDocument(document)}
                                    className="p-0.5 hover:bg-red-100 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                  </button>
                                </Tippy>
                              </>
                            )}
                            {showTrash && (user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                              <Tippy content="Restore" options={{ theme: "light" }}>
                                <button
                                  onClick={() => handleRestoreDocument(document)}
                                  className="p-0.5 hover:bg-green-100 rounded"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-green-600" />
                                </button>
                              </Tippy>
                            )}
                          </div>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td
                        colSpan={13}
                        className="py-10 text-center text-slate-500"
                      >
                        No documents found for this institution.
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
                    {/* Confirm Modals */}
                    {confirmModal.open && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
                          <div className="mb-4 text-lg font-semibold">
                            {confirmModal.type === 'delete' && 'Move this document to trash?'}
                            {confirmModal.type === 'restore' && 'Restore this document?'}
                            {confirmModal.type === 'bulk-delete' && `Move ${confirmModal.ids?.length || 0} selected documents to trash?`}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline-secondary" onClick={() => setConfirmModal({ open: false, type: confirmModal.type })}>Cancel</Button>
                            {confirmModal.type === 'delete' && (
                              <Button variant="danger" onClick={confirmDeleteDocument}>Move to Trash</Button>
                            )}
                            {confirmModal.type === 'restore' && (
                              <Button variant="success" onClick={confirmRestoreDocument}>Restore</Button>
                            )}
                            {confirmModal.type === 'bulk-delete' && (
                              <Button variant="danger" onClick={confirmBulkDelete} disabled={bulkActionLoading}>Move to Trash</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {linkConfirmOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
                          <div className="mb-4 text-lg font-semibold">
                            {pendingDocIds.length === 1
                              ? "Confirm changes for this document?"
                              : `Confirm changes for ${pendingDocIds.length} documents?`}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline-secondary"
                              onClick={() => setLinkConfirmOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              className="bg-theme-2 border-bg-theme-2"
                              onClick={() => {
                                setLinkConfirmOpen(false);
                                handleBulkLinkToProfile();
                              }}
                              disabled={linkingInProgress.bulk}
                            >
                              Confirm
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
              </Table>
            </div>
          </TableWrapper>
        </div>
      </div>

      {addDocumentVisible && params.id && (
        <AddDocumentModal
          visible={addDocumentVisible}
          setVisible={setAddDocumentVisible}
          institutionId={params.id}
          institutionName={singleInstitution?.institution}
          onSuccess={handleDocumentSuccess}
        />
      )}

      {editDocumentVisible && selectedDocument && (
        <EditDocumentModal
          visible={editDocumentVisible}
          setVisible={setEditDocumentVisible}
          document={selectedDocument}
          onSuccess={handleDocumentSuccess}
        />
      )}
    </>
  );
};

export default InstitutionDocuments;
