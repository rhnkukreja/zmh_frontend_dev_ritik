import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { fetchInstitutionDocuments, getSingleInstitution } from "@/stores/institutionSlice";
import { AppDispatch } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft, FileText, Plus, PenLine, Trash2, RotateCcw, Loader2 } from "lucide-react";
import Table from "@/components/Base/Table";
import TableWrapper from "@/components/TableWrapper";
import Tippy from "@/components/Base/Tippy";
import { FormCheck } from "@/components/Base/Form";
import { InstitutionDocument } from "@/types/institutions";
import AddDocumentModal from "./AddDocumentModal";
import EditDocumentModal from "./EditDocumentModal";
import { institutionService } from "@/services/institution";
import { toast } from "react-toastify";
import axios from "axios";
import DraftReviewModal, { RegenerateTarget } from "./DraftReviewModal";

import { AI_CHATBOT_API_BASE } from "../../AIChatbot/api";


type ProfileSection = "summary" | "engagement_priorities" | "reporting_expectation" | "esg_integration" | "voting_guidelines";
type ProfileMode = "create" | "update" | null;

const SECTIONS: ProfileSection[] = ["summary", "engagement_priorities", "reporting_expectation", "esg_integration", "voting_guidelines"];
const SECTION_COLS: { key: ProfileSection; label: string }[] = [
  { key: "summary", label: "Sum" },
  { key: "engagement_priorities", label: "Eng" },
  { key: "reporting_expectation", label: "Rep" },
  { key: "esg_integration", label: "ESG" },
  { key: "voting_guidelines", label: "Vote" },
];

const sectionToField: Record<ProfileSection, keyof InstitutionDocument> = {
  summary: "linked_to_summary",
  engagement_priorities: "linked_to_engagement_priorities",
  reporting_expectation: "linked_to_reporting_expectation",
  esg_integration: "linked_to_esg_integration",
  voting_guidelines: "linked_to_voting_guidelines",
};

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<p>/gi, "").replace(/<\/p>/gi, "\n\n").replace(/<ul>/gi, "").replace(/<\/ul>/gi, "\n").replace(/<li>/gi, "- ").replace(/<\/li>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/&nbsp;/gi, " ").replace(/<[^>]+>/g, "").trim();
};

const InstitutionDocuments = () => {
  const params = useParams();
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();

  const [showTrash, setShowTrash] = useState(false);
  const [trashedDocuments, setTrashedDocuments] = useState<InstitutionDocument[]>([]);

  // Documents fetched from Redux
  const { singleInstitution, institutionDocuments, documentsLoading, documentsCount, loading } = useAppSelector((state) => state.institutions);
  const { user } = useAppSelector((state) => state.authentiction);
  const isAnalystOrAdmin = user?.user_type === "Analyst" || user?.user_type === "Admin";

  const [addDocumentVisible, setAddDocumentVisible] = useState(false);
  const [editDocumentVisible, setEditDocumentVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<InstitutionDocument | null>(null);
  const [linkingInProgress, setLinkingInProgress] = useState<{ bulk?: boolean }>({});
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // NO MORE LOCAL STORAGE. Checklists start empty every load.
  const [profileMode, setProfileMode] = useState<ProfileMode>(null);
  const [pendingLinkOps, setPendingLinkOps] = useState<Array<{ document_id: number; section: ProfileSection; action: "link" | "unlink" }>>([]);

  const [pendingModeSwitch, setPendingModeSwitch] = useState<ProfileMode>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: string; document?: InstitutionDocument; ids?: number[] }>({ open: false, type: '' });
  const [linkConfirmOpen, setLinkConfirmOpen] = useState(false);
  const [modeSwitchConfirmOpen, setModeSwitchConfirmOpen] = useState(false);

  const [pendingDrafts, setPendingDrafts] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [fullDbProfileState, setFullDbProfileState] = useState<any>(null);
  const [isSyncingSummary, setIsSyncingSummary] = useState(false);
  
  const [lastDocsToSubmit, setLastDocsToSubmit] = useState<any[]>([]);
  const [lastApiPayload, setLastApiPayload] = useState<any>(null);
  const [lastDocumentLinks, setLastDocumentLinks] = useState<Record<string, string>>({});
  const [lastOperations, setLastOperations] = useState<any[]>([]);
  
  // 🌟 NEW: Array of regenerating sections to handle batches
  const [regeneratingSections, setRegeneratingSections] = useState<string[]>([]);

  const [processingDocs, setProcessingDocs] = useState<{ document_name: string; institution_id: string }[]>([]);

  const [loadingText, setLoadingText] = useState("Processing...");

  // Local State for the new FastAPI Profile call
  const [fastApiProfile, setFastApiProfile] = useState<any>(null);

  const filteredDocuments = institutionDocuments?.filter((doc) => !doc.is_deleted) || [];
  const documentsToDisplay = showTrash ? trashedDocuments : institutionDocuments;

  // FastAPI call to replace the 404 Django call
  const fetchProfileData = async () => {
    if (!params.id) return;
    try {
      const res = await axios.get(`${AI_CHATBOT_API_BASE}/investor-profile/${params.id}`, {
        headers: { "ngrok-skip-browser-warning": "69420" }
      });
      if (res.data.status === "success" && res.data.sections) {
        setFastApiProfile(res.data.sections);
      }
    } catch (e) {
      console.error("Failed to load profile via FastAPI", e);
    }
  };

  useEffect(() => {
    if (showTrash && params.id) {
      institutionService.getTrashedDocuments(Number(params.id)).then(res => setTrashedDocuments(res.results || [])).catch(() => toast.error('Failed to fetch trashed documents'));
    }
  }, [showTrash, params.id]);

  useEffect(() => {
    if (params.id) {
      dispatch(getSingleInstitution(Number(params.id)));
      dispatch(fetchInstitutionDocuments(Number(params.id))); 
      fetchProfileData(); 
    }
  }, [params.id, dispatch]);

  useEffect(() => {
    if (linkingInProgress.bulk) {
      const texts = profileMode === 'create' 
        ? ["Creating Investor Profile...", "Loading Documents...", "Analyzing Content...", "Please Wait..."]
        : ["Updating Investor Profile...", "Loading Documents...", "Analyzing Changes...", "Please Wait..."];
      let i = 0; setLoadingText(texts[0]);
      const interval = setInterval(() => { i = (i + 1) % texts.length; setLoadingText(texts[i]); }, 2500);
      return () => clearInterval(interval);
    }
  }, [linkingInProgress.bulk, profileMode]);

  useEffect(() => {
    if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      const resolved = await Promise.all(
        processingDocs.map(async (doc) => {
          try {
            const res = await axios.get(`${AI_CHATBOT_API_BASE}/api/upload/status`, {
              params: { document_name: doc.document_name, institution_id: doc.institution_id },
              headers: { "ngrok-skip-browser-warning": "69420" },
            });
            return { doc, status: res.data.status };
          } catch {
            return { doc, status: "error" };
          }
        })
      );

      const stillProcessing = resolved
        .filter(({ status }) => status === "queued" || status === "processing")
        .map(({ doc }) => doc);

      const justFinished = resolved.filter(({ status }) => status === "done");
      if (justFinished.length > 0) dispatch(fetchInstitutionDocuments(Number(params.id)));

      setProcessingDocs(stillProcessing);
    }, 10000);

    return () => clearInterval(interval);
  }, [processingDocs]);

  // 🌟 SAFELY check if a URL is in the DB, applying decodeURI to prevent mismatch bugs
  const isCheckedForSection = (doc: InstitutionDocument, section: ProfileSection): boolean => {
    // 1. Check for unsaved changes pending in the UI
    const op = pendingLinkOps.find(o => o.document_id === doc.id && o.section === section);
    if (op) return op.action === "link";
    
    // 2. Check if the URL is saved securely in the database profile links!
    if (fastApiProfile && doc.link) {
       const linkField = section === "reporting_expectation" ? "reporting_expectation_link" : `${section}_link`;
       const savedLinks = fastApiProfile[linkField] || "";
       return decodeURIComponent(savedLinks).includes(decodeURIComponent(doc.link));
    }
    
    // Fallback to original logic if no FastAPI profile exists yet
    return Boolean(doc[sectionToField[section]]);
  };

  const isRedCheckbox = (doc: InstitutionDocument, section: ProfileSection): boolean => {
    return Boolean(profileMode && pendingLinkOps.find(o => o.document_id === doc.id && o.section === section && o.action === "link"));
  };

  const isGreenCheckbox = (doc: InstitutionDocument, section: ProfileSection): boolean => {
    return Boolean(profileMode && pendingLinkOps.find(o => o.document_id === doc.id && o.section === section && o.action === "unlink"));
  };

  const handleDocumentSuccess = (drafts?: any[], profile?: any, fullDb?: any) => {
    if (params.id) dispatch(fetchInstitutionDocuments(Number(params.id)));
    if (drafts && drafts.length > 0) {
      setPendingDrafts(drafts);
      setCurrentProfile(profile);
      if (fullDb) setFullDbProfileState(fullDb);
    }
  };

  const handleDocumentAction = async (action: 'delete' | 'restore' | 'bulk-delete') => {
    try {
      if (action === 'delete' && confirmModal.document) await institutionService.deleteInstitutionDocument(confirmModal.document.id);
      if (action === 'restore' && confirmModal.document) {
        await institutionService.restoreInstitutionDocument(confirmModal.document.id);
        setTrashedDocuments(prev => prev.filter(doc => doc.id !== confirmModal.document?.id));
      }
      if (action === 'bulk-delete') {
        setBulkActionLoading(true);
        await institutionService.bulkDeleteInstitutionDocuments(confirmModal.ids!);
        setSelectedRows([]);
      }
      toast.success(`Document(s) ${action === 'restore' ? 'restored' : 'moved to trash'} successfully`);
      handleDocumentSuccess();
    } catch {
    } finally {
      setBulkActionLoading(false);
      setConfirmModal({ open: false, type: '' });
    }
  };

  const handleApproveAll = async (updatedDrafts: any[]) => {
    const baseProfile = fullDbProfileState || currentProfile;
    const updatedProfile = { ...baseProfile, sections: { ...(baseProfile?.sections || {}) } };

    if (profileMode === 'create') {
      Object.keys(updatedProfile.sections).forEach(key => { updatedProfile.sections[key] = ""; });
    }

    updatedDrafts.forEach(draft => {
      if (draft.proposed_content !== undefined && draft.proposed_content !== null) {
        updatedProfile.sections[draft.section] = draft.proposed_content;
      }
    });

    setCurrentProfile(updatedProfile);
    setPendingDrafts([]);
    setIsSyncingSummary(true);

    const usedDocuments = lastDocsToSubmit.map(doc => ({
      name: doc.name, year: doc.year, sections: SECTIONS.filter(section => isCheckedForSection(doc, section)).map(s => s.replace(/_/g, " "))
    }));

    setProfileMode(null);
    setPendingLinkOps([]);

    setTimeout(() => {
      setIsSyncingSummary(false);
      toast.success("Investor Profile updated successfully!");
      if (params.id) dispatch(fetchInstitutionDocuments(Number(params.id)));
      navigate(`/investor-profile`, { state: { profile: updatedProfile, oldProfile: fullDbProfileState || currentProfile, investorName: singleInstitution?.institution, usedDocuments, profileMode }});
    }, 3500);
  };

  const handleActivateMode = (mode: ProfileMode) => {
    if (profileMode === mode) return;
    if (profileMode !== null && pendingLinkOps.length > 0) {
      setPendingModeSwitch(mode); setModeSwitchConfirmOpen(true); return;
    }
    setProfileMode(mode); setPendingLinkOps([]);
  };

  const handleLinkToProfile = (document: InstitutionDocument, section: ProfileSection, isCurrentlyLinked: boolean) => {
    setPendingLinkOps((prev) => {
      const filtered = prev.filter(op => !(op.document_id === document.id && op.section === section));
      if (prev.some(op => op.document_id === document.id && op.section === section)) return filtered;
      return [...filtered, { document_id: document.id, section, action: isCurrentlyLinked ? "unlink" : "link" }];
    });
  };

  const hasSubmittableOps = profileMode === 'create'
    ? filteredDocuments.some(doc => SECTIONS.some(s => isCheckedForSection(doc, s)))
    : pendingLinkOps.length > 0;

  const handleBulkLinkToProfile = async () => {
    if (!params.id) return;
    setLinkingInProgress({ bulk: true });

    const targetSections = profileMode === 'create'
      ? new Set(SECTIONS)
      : new Set(pendingLinkOps.map(op => op.section));

    const docsToSubmit = filteredDocuments.filter(doc =>
      Array.from(targetSections).some(s => isCheckedForSection(doc, s as ProfileSection))
    );
    setLastDocsToSubmit(docsToSubmit);

    const requestedBackendSections = new Set<string>();
    const docLinksAcc: Record<string, string[]> = {
      summary_link: [], engagement_priorities_link: [], reporting_expectation_link: [], esg_integration_link: [], voting_guidelines_link: []
    };

    const payload = docsToSubmit.map((doc) => {
      const activeSections = new Set(SECTIONS.filter(s => isCheckedForSection(doc, s) && targetSections.has(s)));
      
      activeSections.forEach(s => {
        const backendKey = s === "reporting_expectation" ? "reporting_expectations" : s === "esg_integration" ? "esg_integration_process" : s;
        requestedBackendSections.add(backendKey);
        
        if (doc.link) {
           const linkKey = s === "reporting_expectation" ? "reporting_expectation_link" : `${s}_link`;
           if (docLinksAcc[linkKey]) docLinksAcc[linkKey].push(doc.link);
        }
      });
      
      return {
        name: doc.name ?? "", year: doc.year ? String(doc.year) : null, priority: doc.priority ?? "Low",
        sum: activeSections.has("summary"), eng: activeSections.has("engagement_priorities"), rep: activeSections.has("reporting_expectation"), esg: activeSections.has("esg_integration"), vote: activeSections.has("voting_guidelines"),
      };
    });

    setLastApiPayload(payload);

    const finalLinks: Record<string, string> = {};
    Object.entries(docLinksAcc).forEach(([k, urls]) => {
       if (urls.length > 0) finalLinks[k] = urls.join(", ");
    });
    setLastDocumentLinks(finalLinks);

    const operations: any[] = [];
    if (profileMode === 'update') {
      const groupedOps: Record<string, { document_id: number, sections: ProfileSection[], action: "link" | "unlink" }> = {};
      pendingLinkOps.forEach(op => {
        const key = `${op.document_id}-${op.action}`;
        if (!groupedOps[key]) groupedOps[key] = { document_id: op.document_id, sections: [], action: op.action };
        groupedOps[key].sections.push(op.section);
      });
      operations.push(...Object.values(groupedOps));
    } else {
      const grouped: Record<number, { sections: ProfileSection[]; action: "link" }> = {};
      docsToSubmit.forEach(doc => { SECTIONS.forEach(sec => { if (isCheckedForSection(doc, sec)) { if (!grouped[doc.id]) grouped[doc.id] = { sections: [], action: "link" }; grouped[doc.id].sections.push(sec); }}); });
      operations.push(...Object.entries(grouped).map(([id, data]) => ({ document_id: Number(id), ...data })));
    }
    setLastOperations(operations);

    try {
      const response = await axios.post(`${AI_CHATBOT_API_BASE}/api/compare-updates`, 
        { investor_name: singleInstitution?.institution || "Unknown", institution_id: Number(params.id), documents: payload, mode: profileMode }, { headers: { "Content-Type": "application/json" }, timeout: 120000 }
      );

      const comparisons = response.data?.comparisons || {};
      const realDrafts: any[] = [];
      const realProfileSections: Record<string, string> = {};

      Object.keys(comparisons).forEach((sectionKey) => {
        const item = comparisons[sectionKey];
        realProfileSections[sectionKey] = stripHtml(item.old_content);
        if (requestedBackendSections.has(sectionKey) && (profileMode === 'create' || stripHtml(item.new_content) !== realProfileSections[sectionKey])) {
          realDrafts.push({ section: sectionKey, status: "draft_ready", proposed_content: stripHtml(item.new_content) });
        }
      });

      const fullDbSections: Record<string, string> = {};
      ["summary", "engagement_priorities", "reporting_expectations", "esg_integration_process", "voting_guidelines"].forEach(k => fullDbSections[k] = comparisons[k] ? stripHtml(comparisons[k].old_content || "") : "");

      if (realDrafts.length > 0) handleDocumentSuccess(realDrafts, { investor_id: String(params.id), sections: realProfileSections }, { investor_id: String(params.id), sections: fullDbSections });
      else toast.info("No material changes found in the selected documents.");

    } catch (error: any) {
      toast.error(error.response ? `Action Failed: ${error.response.data?.detail || error.response.statusText}` : "Failed to submit documents.");
    } finally {
      setLinkingInProgress({ bulk: false });
    }
  };

  // 🌟 NEW: Advanced Batch-Capable Regeneration Logic
  const handleRegenerateTargets = async (targets: RegenerateTarget[]): Promise<boolean> => {
    // 1. Log the attempt to ensure the button click registered
    console.log("🚀 Regenerate initiated with targets:", targets);

    // 2. Prevent Silent Failures - Alert the user if data is missing
    if (!params.id || !lastApiPayload || targets.length === 0) {
      console.error("🛑 Request aborted on Frontend. Missing Data:", { 
        id: params.id, 
        payload: lastApiPayload, 
        targets 
      });
      toast.error("Cannot regenerate: Missing institution ID or document payload.");
      return false;
    }
    
    const sectionsToUpdate = targets.map(t => t.section);
    setRegeneratingSections(sectionsToUpdate);

    const sectionToShortCode: Record<string, string> = {
      summary: "sum",
      engagement_priorities: "eng",
      reporting_expectation: "rep",
      esg_integration: "esg",
      voting_guidelines: "vote",
    };

    const regeneratePayload = {
      investor_name: singleInstitution?.institution || "Unknown",
      institution_id: Number(params.id),
      documents: lastApiPayload,
      mode: profileMode || "update",
      regenerate_targets: targets.map(t => ({
        category: sectionToShortCode[t.section] || t.section,
        custom_prompt: t.customPrompt,
        rejected_draft: t.rejectedDraft
      }))
    };

    try {
      const response = await axios.post(
        `${AI_CHATBOT_API_BASE}/api/regenerate-updates`, 
        regeneratePayload, 
        { 
          headers: { 
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true" // 🌟 CRITICAL: Bypasses Ngrok's HTML warning block
          }, 
          timeout: 120000 
        }
      );

      const comparisons = response.data?.comparisons || {};
      let updatedCount = 0;

      setPendingDrafts(prev => prev.map(draft => {
        if (!sectionsToUpdate.includes(draft.section)) return draft;
        
        const shortCategory = sectionToShortCode[draft.section] || draft.section;
        const item = comparisons[draft.section] || comparisons[shortCategory];

        if (item && item.new_content) {
          updatedCount++;
          return { ...draft, proposed_content: stripHtml(item.new_content) };
        }
        return draft;
      }));

      if (updatedCount > 0) toast.success(`${updatedCount} section(s) regenerated successfully!`);
      else toast.info("No changes generated for the selected sections.");
      
      return true; 
    } catch (error: any) {
      // 3. Expose the EXACT error coming from the server or Ngrok
      const errorMsg = error.response?.data?.detail || error.response?.statusText || error.message;
      console.error("❌ Regenerate API Error:", error.response?.data || error);
      toast.error(`Regeneration failed: ${errorMsg}`);
      return false; 
    } finally {
      setRegeneratingSections([]);
    }
  };

  // FAST-API PROFILE MAPPING
  const fullDbProfile = fastApiProfile ? { 
    investor_id: String(params.id), 
    sections: {
      summary: stripHtml(fastApiProfile.summary || ""), 
      engagement_priorities: stripHtml(fastApiProfile.engagement_priorities || ""), 
      reporting_expectations: stripHtml(fastApiProfile.reporting_expectations || ""), 
      esg_integration_process: stripHtml(fastApiProfile.esg_integration_process || ""), 
      voting_guidelines: stripHtml(fastApiProfile.voting_guidelines || ""),
    }
  } : null; 

  return (
    <>
      {linkingInProgress.bulk && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-10 flex flex-col items-center max-w-md text-center"><Loader2 className="w-14 h-14 text-[#901639] animate-spin mb-6" /><h2 className="text-2xl font-extrabold text-gray-900 mb-2">{loadingText}</h2><p className="text-gray-500 text-sm mt-1">Please do not close or refresh this page.</p></div>
        </div>
      )}

      <Button onClick={() => navigate(`/institution`)} variant="primary" className="bg-theme-2 border-bg-theme-2 mb-4"><ChevronLeft className="text-white" size={18} strokeWidth={1.5} /> Back</Button>

      <div className="box box--stacked">
        <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-700">{loading ? "Loading..." : singleInstitution?.institution}</h1>
          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-4">
              <span className="text-base font-semibold text-slate-700">{documentsCount > 0 && `Total Documents: ${documentsCount}`}</span>
              {isAnalystOrAdmin && (
                <><Button onClick={() => setAddDocumentVisible(true)} variant="primary" className="bg-theme-2 border-bg-theme-2"><Plus className="w-4 h-4 mr-2" /> Add Document</Button>
                <Button variant={showTrash ? "secondary" : "outline-secondary"} onClick={() => setShowTrash((v) => !v)} className="ml-2">{showTrash ? "View Active" : "View Trash"}</Button></>
              )}
            </div>
            {isAnalystOrAdmin && !showTrash && (
              <div className="flex items-center gap-2">
                <Button variant={profileMode === 'update' ? "primary" : "outline-secondary"} className={profileMode === 'update' ? "bg-theme-2 border-bg-theme-2" : "border-theme-2 text-theme-2"} onClick={() => handleActivateMode('update')} disabled={linkingInProgress.bulk}>Update Existing Profile</Button>
                <Button variant={profileMode === 'create' ? "primary" : "outline-secondary"} className={profileMode === 'create' ? "bg-theme-2 border-bg-theme-2" : "border-theme-2 text-theme-2"} onClick={() => handleActivateMode('create')} disabled={linkingInProgress.bulk}>Create New Profile</Button>
              </div>
            )}
            {profileMode && (
              <div className="flex justify-end gap-2">
                <Button variant="primary" className="bg-theme-2 border-bg-theme-2" onClick={() => setLinkConfirmOpen(true)} disabled={linkingInProgress.bulk || !hasSubmittableOps}>Submit</Button>
                <Button variant="outline-secondary" className="border-theme-2 text-theme-2" onClick={() => { setPendingLinkOps([]); setProfileMode(null); }}>Cancel</Button>
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          {isAnalystOrAdmin && !showTrash && profileMode && (
            <div className="mb-4 flex flex-wrap items-center gap-5 bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Legend:</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3.5 h-3.5 rounded-[3px] ring-2 ring-red-500 ring-offset-1" /><span>Red ring = Newly selected</span></span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3.5 h-3.5 rounded-[3px] ring-2 ring-green-500 ring-offset-1" /><span>Green ring = Unchecked</span></span>
              <span className="text-slate-400 italic ml-auto">{profileMode === 'create' ? "All checked documents sent to backend." : "Only red/green changes sent to backend."}</span>
            </div>
          )}
          
          {selectedRows.length > 0 && <div className="mb-3 flex justify-end"><Button variant="danger" onClick={() => setConfirmModal({ open: true, type: 'bulk-delete', ids: selectedRows })} disabled={bulkActionLoading}>Move Selected to Trash ({selectedRows.length})</Button></div>}

          <TableWrapper
            isLoading={documentsLoading}
            rows={8}
            columns={13}
          >
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[40px]"><FormCheck className="flex justify-center"><FormCheck.Input type="checkbox" checked={selectedRows.length === filteredDocuments.length && filteredDocuments.length > 0} onChange={() => setSelectedRows(selectedRows.length === filteredDocuments.length ? [] : filteredDocuments.map(d => d.id))} /></FormCheck></Table.Td>
                  <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[180px]">Name</Table.Td>
                  <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[120px]">Type</Table.Td>
                  <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[60px]">Year</Table.Td>
                  <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[100px]">Created By</Table.Td>
                  <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[90px]">Created</Table.Td>
                  {SECTION_COLS.map(c => <Table.Td key={c.key} className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs text-center w-[50px]">{c.label}</Table.Td>)}
                  <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[80px]">Priority</Table.Td>
                  <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] text-xs w-[90px]">Actions</Table.Td>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {documentsToDisplay?.length > 0 ? documentsToDisplay.map((doc: InstitutionDocument) => (
                  <Table.Tr key={doc.id}>
                    <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs w-[40px]">{!showTrash && !doc.is_deleted && <FormCheck className="flex justify-center"><FormCheck.Input type="checkbox" checked={selectedRows.includes(doc.id)} onChange={() => setSelectedRows(p => p.includes(doc.id) ? p.filter(id => id !== doc.id) : [...p, doc.id])} /></FormCheck>}</Table.Td>
                    <Table.Td className="py-1.5 bg-white text-slate-700 border-slate-200/80 text-xs align-top">{(() => { const isProcessing = processingDocs.some(p => p.document_name.toLowerCase() === doc.name?.toLowerCase()); return (<div className="flex items-start gap-1"><FileText className="w-3.5 h-3.5 text-slate-400 mr-1.5 mt-0.5" /><button onClick={() => window.open(doc.link, "_blank")} className={`font-medium text-left hover:underline ${isProcessing ? "text-slate-400 opacity-60" : "text-blue-600"}`}>{doc.name}</button>{isProcessing && <Loader2 className="w-3 h-3 text-slate-400 animate-spin mt-0.5 ml-1 shrink-0" />}</div>); })()}</Table.Td>
                    <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs">{doc.document_type || "-"}</Table.Td>
                    <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs">{doc.year || "-"}</Table.Td>
                    <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs truncate">{doc.created_by_name || "-"}</Table.Td>
                    <Table.Td className="py-1.5 bg-white border-slate-200/80 text-xs">{doc.date_created ? new Date(doc.date_created).toLocaleDateString() : "-"}</Table.Td> 
                    {SECTION_COLS.map(c => <Table.Td key={c.key} className="py-2 bg-white border-slate-200/80 text-center"><div className={`flex justify-center ${isRedCheckbox(doc, c.key) ? "rounded ring-2 ring-red-500 ring-offset-1" : isGreenCheckbox(doc, c.key) ? "rounded ring-2 ring-green-500 ring-offset-1" : ""}`}><FormCheck className="flex justify-center"><FormCheck.Input type="checkbox" checked={isCheckedForSection(doc, c.key)} disabled={linkingInProgress[`${doc.id}-${c.key}`] || !isAnalystOrAdmin || !profileMode || (profileMode === 'update' && isCheckedForSection(doc, c.key) && !isRedCheckbox(doc, c.key))} onChange={() => handleLinkToProfile(doc, c.key, isCheckedForSection(doc, c.key))} /></FormCheck></div></Table.Td>)}
                    <Table.Td className="py-1.5 bg-white border-slate-200/80"><span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800`}>{doc.priority || "-"}</span></Table.Td>
                    <Table.Td className="py-1.5 bg-white border-slate-200/80">
                      <div className="flex gap-2">
                        {!showTrash && !doc.is_deleted && isAnalystOrAdmin && (<><Tippy content="Edit"><button onClick={() => { setSelectedDocument(doc); setEditDocumentVisible(true); }} className="p-0.5 hover:bg-slate-100 rounded"><PenLine className="w-3.5 h-3.5 text-slate-600" /></button></Tippy><Tippy content="Trash"><button onClick={() => setConfirmModal({ open: true, type: 'delete', document: doc })} className="p-0.5 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5 text-red-600" /></button></Tippy></>)}
                        {showTrash && isAnalystOrAdmin && (<Tippy content="Restore"><button onClick={() => setConfirmModal({ open: true, type: 'restore', document: doc })} className="p-0.5 hover:bg-green-100 rounded"><RotateCcw className="w-3.5 h-3.5 text-green-600" /></button></Tippy>)}
                      </div>
                    </Table.Td>
                  </Table.Tr>
                )) : <Table.Tr><Table.Td colSpan={13} className="py-10 text-center text-slate-500">No documents found.</Table.Td></Table.Tr>}
              </Table.Tbody>
            </Table>
          </TableWrapper>
        </div>
      </div>

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
            <div className="mb-4 text-lg font-semibold">{confirmModal.type === 'delete' ? 'Move document to trash?' : confirmModal.type === 'restore' ? 'Restore document?' : `Move ${confirmModal.ids?.length} documents to trash?`}</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline-secondary" onClick={() => setConfirmModal({ open: false, type: '' })}>Cancel</Button>
              <Button variant={confirmModal.type === 'restore' ? 'success' : 'danger'} onClick={() => handleDocumentAction(confirmModal.type as any)} disabled={bulkActionLoading}>{confirmModal.type === 'restore' ? 'Restore' : 'Move to Trash'}</Button>
            </div>
          </div>
        </div>
      )}

      {linkConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
            <div className="mb-4 text-lg font-semibold">{profileMode === 'create' ? "Create new investor profile?" : "Update investor profile with selected changes?"}</div>
            <div className="flex justify-end gap-2"><Button variant="outline-secondary" onClick={() => setLinkConfirmOpen(false)}>Cancel</Button><Button variant="primary" className="bg-theme-2 border-bg-theme-2" onClick={() => { setLinkConfirmOpen(false); handleBulkLinkToProfile(); }}>Confirm</Button></div>
          </div>
        </div>
      )}

      {modeSwitchConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
            <div className="mb-4 text-lg font-semibold">Switching modes will reset your changes. Continue?</div>
            <div className="flex justify-end gap-2"><Button variant="outline-secondary" onClick={() => { setModeSwitchConfirmOpen(false); setPendingModeSwitch(null); }}>Cancel</Button><Button variant="primary" className="bg-theme-2 border-bg-theme-2" onClick={() => { setProfileMode(pendingModeSwitch); setPendingLinkOps([]); setModeSwitchConfirmOpen(false); }}>Continue</Button></div>
          </div>
        </div>
      )}

      {addDocumentVisible && params.id && <AddDocumentModal visible={addDocumentVisible} setVisible={setAddDocumentVisible} institutionId={params.id} institutionName={singleInstitution?.institution} onSuccess={(_drafts, _profile, queuedDoc) => { dispatch(fetchInstitutionDocuments(Number(params.id))); if (queuedDoc) setProcessingDocs(prev => [...prev, queuedDoc]); }} />}
      {editDocumentVisible && selectedDocument && <EditDocumentModal visible={editDocumentVisible} setVisible={setEditDocumentVisible} document={selectedDocument} onSuccess={handleDocumentSuccess} />}
      
      {(pendingDrafts.length > 0 || isSyncingSummary) && (
        <DraftReviewModal 
          investorName={singleInstitution?.institution || "Institution"} 
          drafts={pendingDrafts} 
          profile={currentProfile} 
          fullProfile={fullDbProfileState || fullDbProfile} 
          onApproveAll={handleApproveAll} 
          onRejectAll={() => setPendingDrafts([])} 
          isSyncingSummary={isSyncingSummary} 
          onRegenerate={handleRegenerateTargets}
          regeneratingSections={regeneratingSections}
          documentLinks={lastDocumentLinks} 
          pendingOperations={lastOperations} 
          profileMode={profileMode} 
        />
      )}
    </>
  );
};

export default InstitutionDocuments;