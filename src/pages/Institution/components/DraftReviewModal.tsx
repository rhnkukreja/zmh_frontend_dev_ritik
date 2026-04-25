import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Sparkles, Loader2, Edit3, Save, X, RefreshCw, ListPlus, Trash } from "lucide-react";
import { AI_CHATBOT_API_BASE } from "../../AIChatbot/api";
import axios from "axios";
export interface Draft {
  section: string;
  status: "draft_ready" | "no_change";
  proposed_content?: string | null;
}

export interface InvestorProfileData {
  investor_id: string;
  sections: Record<string, string>;
}

export interface RegenerateTarget {
  section: string;
  customPrompt: string;
  rejectedDraft: string;
}

interface DraftReviewModalProps {
  investorName: string;
  drafts: Draft[];
  profile: InvestorProfileData | null;
  fullProfile?: InvestorProfileData | null;
  onApproveAll: (updatedDrafts: Draft[]) => void;
  onRejectAll: () => void;
  isSyncingSummary: boolean;
  onRegenerate?: (targets: RegenerateTarget[]) => Promise<boolean>;
  regeneratingSections?: string[];
  documentLinks?: Record<string, string>;
  pendingOperations?: any[];
  profileMode?: "create" | "update" | null; // 🌟 NEW: Added to pass to Backend
}

const DraftReviewModal: React.FC<DraftReviewModalProps> = ({
  investorName,
  drafts,
  profile,
  fullProfile,
  onApproveAll,
  onRejectAll,
  isSyncingSummary,
  onRegenerate,
  regeneratingSections = [],
  documentLinks,
  pendingOperations,
  profileMode = "update",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localDrafts, setLocalDrafts] = useState<Draft[]>([]);

  // Queue State for Batch Regenerations
  const [queuedPrompts, setQueuedPrompts] = useState<Record<string, { prompt: string, draft: string }>>({});
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [targetRegenSection, setTargetRegenSection] = useState<string | null>(null);
  const [targetRegenDraft, setTargetRegenDraft] = useState<string>("");

  useEffect(() => {
    setLocalDrafts(drafts);
  }, [drafts]);

  const handleTextChange = (idx: number, newText: string) => {
    const updated = [...localDrafts];
    updated[idx] = { ...updated[idx], proposed_content: newText };
    setLocalDrafts(updated);
  };

  const handleCancelEdits = () => {
    setLocalDrafts(drafts);
    setIsEditing(false);
  };

  const sendDraftsToBackend = async (draftsToSend: Draft[]) => {
    try {
      const payload = {
        investor_id: profile?.investor_id,
        investor_name: investorName,
        drafts: draftsToSend.filter(d => d.status === "draft_ready" && d.proposed_content),
        document_links: documentLinks,
        operations: pendingOperations, // 🌟 NEW: Send checkmarks to FastAPI
        mode: profileMode // 🌟 NEW: Tell backend whether to Wipe (Create) or Merge (Update)
      };

      const response = await axios.post(`${AI_CHATBOT_API_BASE}/add-to-db`, payload, {
      // Included the ngrok header from your example just in case you are tunneling
        headers: { "ngrok-skip-browser-warning": "69420" } 
      });

      console.log("Drafts sent successfully:", response.data);
      
    } catch (err) {
      if (axios.isAxiosError(err)) {
      // Axios specific error handling gives you access to the response status and data
      console.error(
        "Failed to send drafts:", 
        err.response?.status, 
        err.response?.statusText,
        err.response?.data || err.message
      );
      } else {
        console.error("Unexpected error sending drafts to backend:", err);
      }
    }
  };

  const handleBatchRegenerate = async () => {
    const targets = Object.entries(queuedPrompts).map(([section, data]) => ({
      section,
      customPrompt: data.prompt,
      rejectedDraft: data.draft
    }));
    if (onRegenerate && targets.length > 0) {
      const success = await onRegenerate(targets);
      if (success) setQueuedPrompts({}); // Clear queue ONLY if API call succeeds
    }
  };

  if (isSyncingSummary) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-xl shadow-2xl p-10 flex flex-col items-center max-w-md text-center transform scale-100 animate-in zoom-in-95">
          <div className="relative flex items-center justify-center mb-4">
            <Loader2 className="w-14 h-14 text-[#901639] animate-spin" />
            <span className="absolute text-[9px] font-bold text-[#901639] uppercase tracking-wider">Saving</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Syncing Investor Profile</h2>
          <p className="text-gray-500 text-sm">We are analyzing your approved updates and generating the final profile.</p>
        </div>
      </div>
    );
  }

  if (!drafts || drafts.length === 0) return null;

  const renderTextWithLinks = (text: string) => {
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((boldPart, bIdx) => {
      if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
        return <strong key={`bold-${bIdx}`} className="font-bold text-gray-900">{boldPart.slice(2, -2)}</strong>;
      }
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      const linkParts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      while ((match = linkRegex.exec(boldPart)) !== null) {
        if (match.index > lastIndex) linkParts.push(boldPart.substring(lastIndex, match.index));
        linkParts.push(
          <a key={`link-${bIdx}-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline ml-1 font-semibold">
            {match[1]}
          </a>
        );
        lastIndex = linkRegex.lastIndex;
      }
      if (lastIndex < boldPart.length) linkParts.push(boldPart.substring(lastIndex));
      return linkParts.length > 0 ? linkParts : boldPart;
    });
  };

  const formatContent = (text: string, isProposed: boolean, compareText: string = "") => {
    const normalize = (str: string) => str.replace(/^[-\*•#\d\.\s]+/, '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const compareLines = compareText.split('\n').map(normalize).filter(l => l.length > 5);

    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      const normalizedLine = normalize(trimmed);
      const isNewOrChanged = isProposed && normalizedLine.length > 5 && !compareLines.some(oldLine => oldLine.includes(normalizedLine) || normalizedLine.includes(oldLine));
      const isBullet = /^[-\*•]\s+/.test(trimmed) || /^[-\*•]$/.test(trimmed);
      const isNumberedHeader = /^\d+\.\s/.test(trimmed);
      const isHashHeader = /^#+\s/.test(trimmed);
      const isShortHeader = trimmed.endsWith(":") && trimmed.length < 80 && !isBullet;

      let cleanLine = trimmed.replace(/^[-•]\s*/, '').replace(/^\*(?!\*)\s*/, '').replace(/^#+\s*/, '').trim();

      if (isNumberedHeader || isShortHeader || isHashHeader) {
        let classes = "font-bold mt-6 mb-3 text-[15px] ";
        classes += isNewOrChanged ? "bg-green-100 text-green-900 px-3 py-1.5 rounded-md shadow-sm border border-green-200 inline-block" : (isProposed ? "text-gray-900" : "text-gray-800");
        return <div key={idx} className={classes}>{renderTextWithLinks(cleanLine)}</div>;
      }

      if (isBullet) {
        let classes = "ml-4 flex gap-3 text-[14px] mb-2.5 ";
        classes += isNewOrChanged ? "bg-green-50/80 border-l-[3px] border-green-500 pl-3 py-1 text-gray-900 rounded-r-md" : (isProposed ? "text-gray-700" : "text-gray-600");
        return <div key={idx} className={classes}><span className="text-pink-500 mt-1.5 text-[10px] shrink-0">⚫</span><p className="leading-relaxed">{renderTextWithLinks(cleanLine)}</p></div>;
      }

      let classes = "text-[14px] mb-4 leading-relaxed ";
      classes += isNewOrChanged ? "bg-green-50/80 border-l-[3px] border-green-500 pl-3 py-1.5 text-gray-900 rounded-r-md" : (isProposed ? "text-gray-800" : "text-gray-600");
      return <div key={idx} className={classes}><p>{renderTextWithLinks(cleanLine)}</p></div>;
    });
  };

  const leftProfileSections = fullProfile?.sections || profile?.sections || {};
  const queuedCount = Object.keys(queuedPrompts).length;
  const isAnyRegenerating = regeneratingSections.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          <div className="bg-[#901639] px-6 py-5 flex items-center justify-between text-white border-b border-[#7a1230] shrink-0">
            <div className="flex items-center gap-4">
              <Sparkles className="w-6 h-6 text-red-100" />
              <div>
                <h3 className="text-xl font-bold">Review Proposed Updates</h3>
                <p className="text-sm text-red-100 mt-1">{investorName} • Full Profile Review</p>
              </div>
            </div>
            <button onClick={onRejectAll} className="p-1.5 rounded-full hover:bg-white/20 transition-colors" title="Close"><X className="w-5 h-5 text-white" /></button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-8 bg-gray-50">
            <div className="flex gap-8 h-full">

              {/* LEFT COLUMN */}
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
                  Current Version <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] normal-case font-semibold">Live Profile</span>
                </span>
                <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                  {Object.entries(leftProfileSections).map(([sectionKey, content]) => {
                    const sectionTitle = sectionKey.replace(/_/g, " ").toUpperCase();
                    return (
                      <div key={`left-${sectionKey}`} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h5 className="text-[#901639] text-sm font-bold mb-4">{sectionTitle}</h5>
                        {(content as string).trim() ? <div className="whitespace-pre-wrap">{formatContent(content as string, false)}</div> : <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-lg border border-dashed border-gray-200 text-center">This section is currently empty.</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-xs font-extrabold text-[#901639] uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
                  Proposed Updates <span className="bg-red-50 text-[#901639] px-2 py-1 rounded text-[10px] normal-case font-semibold">{isEditing ? 'Editing Mode' : 'AI Draft'}</span>
                </span>
                <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                  {localDrafts.map((draft, idx) => {
                    const sectionTitle = draft.section.replace(/_/g, " ").toUpperCase();
                    const currentContent = profile?.sections[draft.section] || "";
                    const isNotSelected = draft.proposed_content === null || draft.proposed_content === undefined || draft.status === "no_change";

                    if (isNotSelected) return null;

                    const proposedContent = draft.proposed_content || currentContent;
                    
                    const isRegenerating = regeneratingSections.includes(draft.section);
                    const isQueued = !!queuedPrompts[draft.section];

                    return (
                      // 🌟 Restored the opacity-50 and blur-[1px] for sections that are regenerating
                      <div key={`right-${idx}`} className={`bg-white border ${isQueued ? 'border-blue-400 shadow-blue-100 ring-2 ring-blue-50' : 'border-[#901639]/30'} rounded-xl p-6 shadow-md relative transition-all duration-300 ${isRegenerating ? 'opacity-80 blur-[0.5px] select-none pointer-events-none' : ''}`}>
                        <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-xl ${isQueued ? 'bg-blue-500' : 'bg-[#901639]'}`} />
                        
                        <div className="flex justify-between items-start mb-4">
                          <h5 className={`text-sm font-bold ${isQueued ? 'text-blue-700' : 'text-[#901639]'}`}>
                            {sectionTitle} {isQueued && "(Queued)"}
                          </h5>
                          {!isEditing && onRegenerate && (
                            <button
                              onClick={() => {
                                setTargetRegenSection(draft.section);
                                setTargetRegenDraft(proposedContent);
                                setPromptText(queuedPrompts[draft.section]?.prompt || ""); 
                                setPromptModalOpen(true);
                              }}
                              disabled={isRegenerating}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors
                                ${isRegenerating 
                                  ? 'text-amber-700 bg-amber-100 border border-amber-300 shadow-sm cursor-wait' 
                                  : isQueued 
                                    ? 'text-blue-700 bg-blue-50 hover:bg-blue-100' 
                                    : 'text-[#901639] bg-red-50 hover:bg-red-100'
                                }`}
                            >
                              {isRegenerating ? (
                                <><RefreshCw size={14} className="animate-spin" /> Regenerating...</>
                              ) : isQueued ? (
                                <><Edit3 size={14} /> Edit Prompt</>
                              ) : (
                                <><RefreshCw size={14} /> Regenerate</>
                              )}
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <textarea
                            className="w-full min-h-[250px] p-4 text-sm border border-[#901639]/50 rounded-lg focus:ring-2 focus:ring-[#901639] outline-none custom-scrollbar leading-relaxed text-gray-800 bg-white shadow-inner"
                            value={proposedContent}
                            onChange={(e) => handleTextChange(idx, e.target.value)}
                            placeholder="Type your final edits here..."
                          />
                        ) : (
                          <div className="whitespace-pre-wrap">
                            {proposedContent.trim() ? formatContent(proposedContent, true, currentContent) : <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-lg border border-dashed border-gray-200 text-center">This section remains empty.</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* 🌟 Footer - Swapped the sides so Discard/Edit is Left, and Queue/Approve is Right */}
          <div className="px-8 py-5 bg-white border-t border-gray-200 flex justify-between items-center shadow-inner shrink-0">
            
            {/* Left Side: Standard Actions (Discard & Edit) */}
            <div className="flex gap-4">
              <button onClick={onRejectAll} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-bold text-sm transition-colors shadow-sm"><XCircle size={18} /> Discard All</button>
              {isEditing ? (
                <>
                  <button onClick={handleCancelEdits} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-400 text-gray-600 rounded-lg hover:bg-gray-50 font-bold text-sm transition-colors shadow-sm"><XCircle size={18} /> Cancel Edits</button>
                  <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-6 py-3 bg-white border border-[#901639] text-[#901639] rounded-lg hover:bg-red-50 font-bold text-sm transition-colors shadow-sm"><Save size={18} /> Save Edits</button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-white border border-[#901639] text-[#901639] rounded-lg hover:bg-red-50 font-bold text-sm transition-colors shadow-sm"><Edit3 size={18} /> Edit Changes</button>
              )}
            </div>

            {/* Right Side: Queue Controls & Approve */}
            <div className="flex items-center gap-4">
              {queuedCount > 0 && !isEditing && (
                <button 
                  onClick={handleBatchRegenerate}
                  disabled={isAnyRegenerating}
                  className={`flex items-center gap-2 px-6 py-3 border font-bold text-sm rounded-lg transition-colors shadow-sm ${
                    isAnyRegenerating
                      ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <RefreshCw size={18} className={isAnyRegenerating ? "animate-spin" : ""} /> 
                  Regenerate Queued Group ({queuedCount})
                </button>
              )}
              <button onClick={async () => { await sendDraftsToBackend(localDrafts); onApproveAll(localDrafts); }} className="flex items-center gap-2 px-8 py-3 bg-[#901639] text-white rounded-lg hover:bg-[#7a1230] font-bold text-sm transition-colors shadow-md transform active:scale-95"><CheckCircle2 size={18} /> Approve & Continue</button>
            </div>
          </div>
        </div>
      </div>

      {/* PROMPT MODAL */}
      {promptModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg transform scale-100 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Regenerate {targetRegenSection?.replace(/_/g, " ").toUpperCase()}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Provide custom instructions for the AI to adjust this specific section.
            </p>
            <textarea
              className="w-full min-h-[120px] p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#901639] outline-none resize-none mb-6 custom-scrollbar"
              placeholder="e.g., Make it shorter, focus more on climate policies, use bold headers..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              autoFocus
            />
            
            <div className="flex justify-between items-center">
              <div>
                {targetRegenSection && queuedPrompts[targetRegenSection] ? (
                   <button 
                     onClick={() => {
                        setQueuedPrompts(prev => { const next = {...prev}; delete next[targetRegenSection]; return next; });
                        setPromptModalOpen(false);
                     }}
                     className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                   >
                     <Trash size={14} /> Remove from Group
                   </button>
                ) : (
                   <button onClick={() => setPromptModalOpen(false)} className="text-sm font-medium text-gray-500 hover:text-gray-800">
                     Cancel
                   </button>
                )}
              </div>

              {/* 🌟 Removed "Regenerate Now" and kept "Save to Group" as the main clear CTA */}
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (targetRegenSection) {
                      setQueuedPrompts(prev => ({
                        ...prev,
                        [targetRegenSection]: { prompt: promptText, draft: targetRegenDraft }
                      }));
                    }
                    setPromptModalOpen(false);
                  }} 
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  <ListPlus size={16} /> Regenerate
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default DraftReviewModal;