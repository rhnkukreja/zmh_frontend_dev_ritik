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
import { ChevronLeft, FileText, ExternalLink, Plus, PenLine, Trash2, RotateCcw, Loader2 } from "lucide-react";
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
import { axiosInstance } from "@/services";
import axios from "axios";
import DraftReviewModal from "./DraftReviewModal";

type ProfileSection = "summary" | "engagement_priorities" | "reporting_expectation" | "esg_integration" | "voting_guidelines";
type ProfileMode = "create" | "update" | null;

const SECTIONS: ProfileSection[] = [
  "summary",
  "engagement_priorities",
  "reporting_expectation",
  "esg_integration",
  "voting_guidelines",
];

const sectionToField: Record<ProfileSection, keyof InstitutionDocument> = {
  summary: "linked_to_summary",
  engagement_priorities: "linked_to_engagement_priorities",
  reporting_expectation: "linked_to_reporting_expectation",
  esg_integration: "linked_to_esg_integration",
  voting_guidelines: "linked_to_voting_guidelines",
};

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
  const [pendingLinkOps, setPendingLinkOps] = useState<Array<{ document_id: number; section: ProfileSection; action: "link" | "unlink" }>>([]);
  const [pendingDocumentId, setPendingDocumentId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'delete'|'restore'|'bulk-delete'; document?: InstitutionDocument; ids?: number[] }>({ open: false, type: 'delete' });
  const [linkConfirmOpen, setLinkConfirmOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Profile mode state
  const [profileMode, setProfileMode] = useState<ProfileMode>(null);
  const [modeSwitchConfirmOpen, setModeSwitchConfirmOpen] = useState(false);
  const [pendingModeSwitch, setPendingModeSwitch] = useState<ProfileMode>(null);

  const filteredDocuments = institutionDocuments?.filter((doc) => !doc.is_deleted) || [];
  const documentsToDisplay = showTrash ? trashedDocuments : institutionDocuments;

  const [processingStatuses, setProcessingStatuses] = useState<{[key: number]: {status: string, message: string}}>({});
  const [pendingDrafts, setPendingDrafts] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [isSyncingSummary, setIsSyncingSummary] = useState(false);

  const [loadingText, setLoadingText] = useState("Processing...");

  useEffect(() => {
    if (linkingInProgress.bulk) {
      const isCreate = profileMode === 'create';
      const texts = isCreate
        ? ["Creating Investor Profile...", "Loading Documents...", "Analyzing Content...", "Please Wait..."]
        : ["Updating Investor Profile...", "Loading Documents...", "Analyzing Changes...", "Please Wait..."];
      let i = 0;
      setLoadingText(texts[0]);
      const interval = setInterval(() => {
        i = (i + 1) % texts.length;
        setLoadingText(texts[i]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [linkingInProgress.bulk]);

  // ---- Checkbox state helpers ----

  /** Returns current effective checked state for a doc+section, accounting for pending ops. */
  const isCheckedForSection = (doc: InstitutionDocument, section: ProfileSection): boolean => {
    const op = pendingLinkOps.find(o => o.document_id === doc.id && o.section === section);
    if (op) return op.action === "link";
    return Boolean(doc[sectionToField[section]]);
  };

  /**
   * Red = newly checked in the current session (pendingLinkOps with action "link").
   * Same in both modes — only the backend submission scope differs.
   */
  const isRedCheckbox = (doc: InstitutionDocument, section: ProfileSection): boolean => {
    if (!profileMode) return false;
    const op = pendingLinkOps.find(o => o.document_id === doc.id && o.section === section);
    return Boolean(op && op.action === "link");
  };

  // ---- End helpers ----

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
    setBulkActionLoading(true);
    try {
      await institutionService.bulkDeleteInstitutionDocuments(confirmModal.ids);
      toast.success('Selected documents moved to trash');
      setSelectedRows([]);
      handleDocumentSuccess();
    } catch {
      // Error toast is already handled by axios interceptor
    } finally {
      setBulkActionLoading(false);
      setConfirmModal({ open: false, type: 'bulk-delete' });
    }
  };

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
      // Error toast is already handled by axios interceptor
    } finally {
      setConfirmModal({ open: false, type: 'delete' });
    }
  };

  const handleRestoreDocument = (document: InstitutionDocument) => {
    setConfirmModal({ open: true, type: 'restore', document });
  };

  const confirmRestoreDocument = async () => {
    if (!confirmModal.document) return;
    try {
      await institutionService.restoreInstitutionDocument(confirmModal.document.id);
      toast.success("Document restored successfully");
      setTrashedDocuments((prev) => prev.filter(doc => doc.id !== confirmModal.document?.id));
      handleDocumentSuccess();
    } catch {
      // Error toast is already handled by axios interceptor
    } finally {
      setConfirmModal({ open: false, type: 'restore' });
    }
  };

  const { user } = useAppSelector((state) => state.authentiction);

  const isAnalystOrAdmin = user?.user_type === "Analyst" || user?.user_type === "Admin";

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

  const handleDocumentSuccess = (drafts?: any[], profile?: any) => {
    if (params.id) {
      dispatch(fetchInstitutionDocuments(Number(params.id)));
    }

    if (drafts && drafts.length > 0) {
      setPendingDrafts(drafts);
      setCurrentProfile(profile);
    }
  };

  const handleApproveAll = async (updatedDrafts: any[]) => {
    const updatedProfile = { ...currentProfile };

    updatedDrafts.forEach(draft => {
      if (draft.proposed_content !== undefined) {
        updatedProfile.sections[draft.section] = draft.proposed_content;
      }
    });

    setCurrentProfile(updatedProfile);
    setPendingDrafts([]);
    setIsSyncingSummary(true);

    setTimeout(() => {
      setIsSyncingSummary(false);
      toast.success("Investor Profile updated successfully!");

      navigate(`/final-summary/${params.id}`, {
        state: {
          profile: updatedProfile,
          oldProfile: currentProfile,
          investorName: singleInstitution?.institution
        }
      });
    }, 3500);
  };

  const handleRejectAll = () => {
    setPendingDrafts([]);
    toast.info("All updates discarded.");
  };

  // ---- Mode management ----

  const handleActivateMode = (mode: ProfileMode) => {
    if (profileMode === mode) return;

    // If already in a different mode with pending changes, confirm before switching
    if (profileMode !== null && pendingLinkOps.length > 0) {
      setPendingModeSwitch(mode);
      setModeSwitchConfirmOpen(true);
      return;
    }

    setProfileMode(mode);
    setPendingLinkOps([]);
    setPendingDocumentId(null);
  };

  const confirmModeSwitch = () => {
    setProfileMode(pendingModeSwitch);
    setPendingLinkOps([]);
    setPendingDocumentId(null);
    setModeSwitchConfirmOpen(false);
    setPendingModeSwitch(null);
  };

  // ---- Checkbox interaction ----

  const handleLinkToProfile = (
    document: InstitutionDocument,
    section: ProfileSection,
    isCurrentlyLinked: boolean
  ) => {
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

  // ---- Backend submission ----

  /** True when there is at least one item that would be sent to the backend. */
  const hasSubmittableOps =
    profileMode === 'create'
      ? filteredDocuments.some(doc => SECTIONS.some(section => isCheckedForSection(doc, section)))
      : pendingLinkOps.some(op => op.action === "link");

  const handleBulkLinkToProfile = async () => {
    if (!params.id) return;

    setLinkingInProgress((prev) => ({ ...prev, bulk: true }));

    let docsToSubmit: InstitutionDocument[];

    if (profileMode === 'create') {
      // All documents that have at least one section checked (red)
      docsToSubmit = filteredDocuments.filter(doc =>
        SECTIONS.some(section => isCheckedForSection(doc, section))
      );
    } else {
      // Update mode: only docs that have a new red (link) operation
      const redDocIds = new Set(
        pendingLinkOps.filter(op => op.action === "link").map(op => op.document_id)
      );
      docsToSubmit = filteredDocuments.filter(doc => redDocIds.has(doc.id));
    }

    // Build payload for Python AI backend
    const payload = docsToSubmit.map((doc) => ({
      name: doc.name ?? "",
      year: doc.year ? String(doc.year) : null,
      priority: doc.priority ?? "Low",
      sum: isCheckedForSection(doc, "summary"),
      eng: isCheckedForSection(doc, "engagement_priorities"),
      rep: isCheckedForSection(doc, "reporting_expectation"),
      esg: isCheckedForSection(doc, "esg_integration"),
      vote: isCheckedForSection(doc, "voting_guidelines"),
    }));

    // Build operations for Django API
    const grouped: { [docId: number]: { sections: ProfileSection[]; action: "link" | "unlink" } } = {};

    if (profileMode === 'update') {
      pendingLinkOps.forEach(op => {
        if (!grouped[op.document_id]) {
          grouped[op.document_id] = { sections: [], action: op.action };
        }
        grouped[op.document_id].sections.push(op.section);
        grouped[op.document_id].action = op.action;
      });
    } else if (profileMode === 'create') {
      docsToSubmit.forEach(doc => {
        SECTIONS.forEach(section => {
          if (isCheckedForSection(doc, section)) {
            if (!grouped[doc.id]) grouped[doc.id] = { sections: [], action: "link" };
            grouped[doc.id].sections.push(section);
          }
        });
      });
    }

    const operations = Object.entries(grouped).map(([document_id, { sections, action }]) => ({
      document_id: Number(document_id),
      sections,
      action,
    }));

    try {
      if (operations.length > 0) {
        try {
          await institutionService.bulkLinkDocumentsToProfile(Number(params.id), operations);
        } catch (originalApiError) {
          console.error("Original API failed, but continuing to Python API...", originalApiError);
        }
      }

      // ========================================
      // CHANGE THIS URL TO YOUR LOCALHOST FOR TESTING
      // ========================================
      const response = await axios.post(
        "https://ai-chatbot-zmh.onrender.com/api/compare-updates",
        // "http://localhost:8000/api/compare-updates",
        {
          investor_name: singleInstitution?.institution || "Unknown Institution",
          institution_id: Number(params.id),
          documents: payload,
          mode: profileMode,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 120000, // 2 minute timeout
        }
      );

      dispatch(fetchInstitutionDocuments(Number(params.id)));

      const comparisons = response.data?.comparisons || {};

      const stripHtml = (html: string) => {
        if (!html) return "";
        return html
          .replace(/<p>/gi, "")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<ul>/gi, "")
          .replace(/<\/ul>/gi, "\n")
          .replace(/<li>/gi, "- ")
          .replace(/<\/li>/gi, "\n")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/&nbsp;/gi, " ")
          .replace(/<[^>]+>/g, "")
          .trim();
      };

      const realDrafts: any[] = [];
      const realProfileSections: Record<string, string> = {};

      Object.keys(comparisons).forEach((sectionKey) => {
        const item = comparisons[sectionKey];
        const cleanOld = stripHtml(item.old_content);
        const cleanNew = stripHtml(item.new_content);
        realProfileSections[sectionKey] = cleanOld;
        realDrafts.push({
          section: sectionKey,
          status: "draft_ready",
          proposed_content: cleanNew,
        });
      });

      const realProfile = {
        investor_id: String(params.id),
        sections: realProfileSections,
      };

      if (realDrafts.length > 0) {
        handleDocumentSuccess(realDrafts, realProfile);
      } else {
        toast.info("No material changes found in the selected documents.");
      }

    } catch (error: any) {
      console.error("Python API Error:", error);

      if (error.response) {
        const errorDetail = error.response.data?.detail || error.response.statusText;
        toast.error(`Action Failed: ${errorDetail}`);
      } else if (error.request) {
        toast.error("Backend server not responding. Please check if the server is running.");
      } else {
        toast.error(`Failed to submit documents: ${error.message}`);
      }

    } finally {
      setLinkingInProgress((prev) => ({ ...prev, bulk: false }));
      setPendingLinkOps([]);
      setPendingDocumentId(null);
      setSelectedRows([]);
      setProfileMode(null);
    }
  };

  const handleCancelLinkOps = () => {
    setPendingLinkOps([]);
    setPendingDocumentId(null);
    setProfileMode(null);
  };

  const isLinkingInProgress = (documentId: number, section: string) => {
    return linkingInProgress[`${documentId}-${section}`] || false;
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "extremely high": return "bg-purple-100 text-purple-800";
      case "high":           return "bg-red-100 text-red-800";
      case "medium":         return "bg-yellow-100 text-yellow-800";
      case "low":            return "bg-gray-100 text-gray-800";
      default:               return "bg-gray-100 text-gray-800";
    }
  };

  const pendingDocIds = Array.from(new Set(pendingLinkOps.map((op) => op.document_id)));

  // ---- Reusable section checkbox renderer ----
  const renderSectionCheckbox = (document: InstitutionDocument, section: ProfileSection) => {
    const red = isRedCheckbox(document, section);
    const checked = isCheckedForSection(document, section);

    return (
      <div className={`flex justify-center ${red ? "rounded ring-2 ring-red-500 ring-offset-1" : ""}`}>
        <FormCheck className="flex justify-center">
          <FormCheck.Input
            type="checkbox"
            checked={checked}
            disabled={
              isLinkingInProgress(document.id, section) ||
              !isAnalystOrAdmin ||
              !profileMode  // no mode selected = non-interactive
            }
            onChange={() =>
              handleLinkToProfile(document, section, Boolean(document[sectionToField[section]]))
            }
          />
        </FormCheck>
      </div>
    );
  };

  return (
    <>
      {/* Animated Loading Overlay */}
      {linkingInProgress.bulk && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-10 flex flex-col items-center max-w-md text-center transform scale-100 animate-in zoom-in-95">
            <Loader2 className="w-14 h-14 text-[#901639] animate-spin mb-6" />
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{loadingText}</h2>
            <p className="text-gray-500 text-sm mt-1">Please do not close or refresh this page.</p>
          </div>
        </div>
      )}

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
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                {loading ? "Loading..." : singleInstitution?.institution}
              </h1>
            </div>

            <div className="flex flex-col gap-2 items-end">
              {/* Top row: count + document controls */}
              <div className="flex items-center gap-4">
                <span className="text-base font-semibold text-slate-700">
                  {documentsCount > 0 && `Total Documents: ${documentsCount}`}
                </span>
                {isAnalystOrAdmin && (
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

              {/* Profile mode buttons — only when viewing active documents */}
              {isAnalystOrAdmin && !showTrash && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={profileMode === 'update' ? "primary" : "outline-secondary"}
                    className={
                      profileMode === 'update'
                        ? "bg-theme-2 border-bg-theme-2"
                        : "border-theme-2 text-theme-2"
                    }
                    onClick={() => handleActivateMode('update')}
                    disabled={linkingInProgress.bulk}
                  >
                    Update Existing Profile
                  </Button>
                  <Button
                    variant={profileMode === 'create' ? "primary" : "outline-secondary"}
                    className={
                      profileMode === 'create'
                        ? "bg-theme-2 border-bg-theme-2"
                        : "border-theme-2 text-theme-2"
                    }
                    onClick={() => handleActivateMode('create')}
                    disabled={linkingInProgress.bulk}
                  >
                    Create New Profile
                  </Button>
                </div>
              )}

              {/* Submit / Cancel — only when a mode is active */}
              {profileMode && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="primary"
                    className="bg-theme-2 border-bg-theme-2"
                    onClick={() => setLinkConfirmOpen(true)}
                    disabled={linkingInProgress.bulk || !hasSubmittableOps}
                  >
                    Submit
                  </Button>
                  <Button
                    variant="outline-secondary"
                    className="border-theme-2 text-theme-2"
                    onClick={handleCancelLinkOps}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Legend — visible when a mode is active */}
          {isAnalystOrAdmin && !showTrash && profileMode && (
            <div className="mb-4 flex flex-wrap items-center gap-5 bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Legend:</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-[3px] ring-2 ring-red-500 ring-offset-1 flex-shrink-0" />
                <span>Red ring = Newly selected in this session</span>
              </span>
              <span className="text-slate-400 italic">
                {profileMode === 'create'
                  ? "All checked documents (existing + newly selected) will be sent to the backend."
                  : "Only newly selected (red) documents will be sent to the backend."}
              </span>
            </div>
          )}

          {/* Hint when no mode is selected */}
          {isAnalystOrAdmin && !showTrash && !profileMode && (
            <div className="mb-4 text-xs text-slate-500 italic">
              Select <strong>Update Existing Profile</strong> or <strong>Create New Profile</strong> above to start editing profile links.
            </div>
          )}

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
                          {document.date_created
                            ? new Date(document.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                            : "-"}
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          {renderSectionCheckbox(document, "summary")}
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          {renderSectionCheckbox(document, "engagement_priorities")}
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          {renderSectionCheckbox(document, "reporting_expectation")}
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          {renderSectionCheckbox(document, "esg_integration")}
                        </Table.Td>
                        <Table.Td className="py-2 bg-white border-slate-200/80 text-center">
                          {renderSectionCheckbox(document, "voting_guidelines")}
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityBadgeClass(document.priority)}`}
                          >
                            {document.priority || "-"}
                          </span>
                        </Table.Td>
                        <Table.Td className="py-1.5 bg-white border-slate-200/80">
                          <div className="flex gap-2 items-center">
                            {!showTrash && !document.is_deleted && isAnalystOrAdmin && (
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
                            {showTrash && isAnalystOrAdmin && (
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
              </Table>

              {/* ---- Modals ---- */}

              {/* Delete / Restore confirm */}
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

              {/* Link submit confirm */}
              {linkConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                  <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
                    <div className="mb-4 text-lg font-semibold">
                      {profileMode === 'create'
                        ? "Create a new investor profile using the selected documents?"
                        : `Update investor profile with changes from ${pendingDocIds.length === 1 ? "this document" : `${pendingDocIds.length} documents`}?`}
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

              {/* Mode switch confirm */}
              {modeSwitchConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                  <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
                    <div className="mb-4 text-lg font-semibold">
                      Switching modes will reset your changes. Continue?
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline-secondary"
                        onClick={() => {
                          setModeSwitchConfirmOpen(false);
                          setPendingModeSwitch(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        className="bg-theme-2 border-bg-theme-2"
                        onClick={confirmModeSwitch}
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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
          onSuccess={() => {
            dispatch(fetchInstitutionDocuments(Number(params.id)));
          }}
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

      {(pendingDrafts.length > 0 || isSyncingSummary) && (
        <DraftReviewModal
          investorName={singleInstitution?.institution || "Institution"}
          drafts={pendingDrafts}
          profile={currentProfile}
          onApproveAll={handleApproveAll}
          onRejectAll={handleRejectAll}
          isSyncingSummary={isSyncingSummary}
        />
      )}
    </>
  );
};

export default InstitutionDocuments;
