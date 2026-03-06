import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Sparkles, Loader2, Edit3, Save } from "lucide-react";

export interface Draft {
  section: string;
  status: "draft_ready" | "no_change";
  proposed_content?: string;
}

export interface InvestorProfileData {
  investor_id: string;
  sections: Record<string, string>;
}

interface DraftReviewModalProps {
  investorName: string;
  drafts: Draft[];
  profile: InvestorProfileData | null;
  onApproveAll: (updatedDrafts: Draft[]) => void;
  onRejectAll: () => void;
  isSyncingSummary: boolean;
}

const DraftReviewModal: React.FC<DraftReviewModalProps> = ({
  investorName,
  drafts,
  profile,
  onApproveAll,
  onRejectAll,
  isSyncingSummary,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localDrafts, setLocalDrafts] = useState<Draft[]>([]);

  // Sync initial drafts into local state so they can be edited safely
  useEffect(() => {
    setLocalDrafts(drafts);
  }, [drafts]);

  const handleTextChange = (idx: number, newText: string) => {
    const updated = [...localDrafts];
    updated[idx] = { ...updated[idx], proposed_content: newText };
    setLocalDrafts(updated);
  };
  const handleCancelEdits = () => {
    setLocalDrafts(drafts); // Reverts back to the original AI draft
    setIsEditing(false);    // Exits edit mode
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

  // Upgraded Helper to detect BOTH markdown links AND bold text (**text**)
  const renderTextWithLinks = (text: string) => {
    // 1. First, split the text by bold markdown
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    
    return boldParts.map((boldPart, bIdx) => {
      // Render bold text cleanly without asterisks
      if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
        return (
          <strong key={`bold-${bIdx}`} className="font-bold text-gray-900">
            {boldPart.slice(2, -2)}
          </strong>
        );
      }

      // 2. For non-bold text, parse the page links
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      const linkParts = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(boldPart)) !== null) {
        if (match.index > lastIndex) {
          linkParts.push(boldPart.substring(lastIndex, match.index));
        }
        linkParts.push(
          <a
            key={`link-${bIdx}-${match.index}`}
            href={match[2]} // This contains your URL + #page=X
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline ml-1 font-semibold"
          >
            {match[1]}
          </a>
        );
        lastIndex = linkRegex.lastIndex;
      }

      if (lastIndex < boldPart.length) {
        linkParts.push(boldPart.substring(lastIndex));
      }

      return linkParts.length > 0 ? linkParts : boldPart;
    });
  };

  // 🌟 SMARTER FORMATTING ENGINE (Highlights NEW points in green)
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

      // REMOVED replace(/\*\*/g, '') so the bold parser can catch it!
      let cleanLine = trimmed.replace(/^[-\*•]\s*/, '').replace(/^#+\s*/, '').trim();

      // 1. Corrected Header Block
      if (isNumberedHeader || isShortHeader || isHashHeader) {
        let classes = "font-bold mt-6 mb-3 text-[15px] ";
        if (isNewOrChanged) {
          classes += "bg-green-100 text-green-900 px-3 py-1.5 rounded-md shadow-sm border border-green-200 inline-block";
        } else {
          classes += isProposed ? "text-gray-900" : "text-gray-800";
        }
        return <div key={idx} className={classes}>{renderTextWithLinks(cleanLine)}</div>;
      }

      // 2. Bullet Block
      if (isBullet) {
        let classes = "ml-4 flex gap-3 text-[14px] mb-2.5 ";
        if (isNewOrChanged) {
           classes += "bg-green-50/80 border-l-[3px] border-green-500 pl-3 py-1 text-gray-900 rounded-r-md";
        } else {
           classes += isProposed ? "text-gray-700" : "text-gray-600";
        }
        return (
          <div key={idx} className={classes}>
            <span className="text-pink-500 mt-1.5 text-[10px] shrink-0">⚫</span>
            <p className="leading-relaxed">{renderTextWithLinks(cleanLine)}</p>
          </div>
        );
      }

      // 3. Default Paragraph Block
      let classes = "text-[14px] mb-4 leading-relaxed ";
      if (isNewOrChanged) {
        classes += "bg-green-50/80 border-l-[3px] border-green-500 pl-3 py-1.5 text-gray-900 rounded-r-md";
      } else {
        classes += isProposed ? "text-gray-800" : "text-gray-600";
      }
      return <div key={idx} className={classes}><p>{renderTextWithLinks(cleanLine)}</p></div>;
    });
  };

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#901639] px-6 py-5 flex items-center justify-between text-white border-b border-[#7a1230] shrink-0">
          <div className="flex items-center gap-4">
            <Sparkles className="w-6 h-6 text-red-100" />
            <div>
              <h3 className="text-xl font-bold">Review Proposed Updates</h3>
              <p className="text-sm text-red-100 mt-1">{investorName} • Full Profile Review</p>
            </div>
          </div>
        </div>

        {/* Content Area - Side by Side Grid */}
        <div className="flex-1 min-h-0 p-8 bg-gray-50 grid grid-cols-2 gap-8">
          
          {/* LEFT PANEL: Original Text */}
          <div className="flex flex-col min-h-0 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h4 className="shrink-0 text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-3 flex items-center justify-between">
              Current Version <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px]">Live Profile</span>
            </h4>
            <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
              {localDrafts.map((draft, idx) => {
                const sectionTitle = draft.section.replace(/_/g, " ").toUpperCase();
                const currentContent = profile?.sections[draft.section] || "";
                return (
                  <div key={`old-${idx}`} className="mb-10 pb-8 border-b border-gray-100 last:border-b-0">
                    <h5 className="text-[#901639] text-sm font-bold mb-4">{sectionTitle}</h5>
                    {currentContent.trim() ? (
                      <div className="whitespace-pre-wrap">{formatContent(currentContent, false)}</div>
                    ) : (
                      <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-lg border border-dashed border-gray-200 text-center">
                        This section is currently empty.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: Proposed / Editable Text */}
          <div className="flex flex-col min-h-0 bg-white border border-[#901639]/30 rounded-xl p-6 shadow-md relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#901639] rounded-l-xl"></div>
            <h4 className="shrink-0 text-xs font-extrabold text-[#901639] uppercase tracking-widest mb-4 border-b border-[#901639]/10 pb-3 flex items-center justify-between">
              Proposed Updates <span className="bg-red-50 text-[#901639] px-2 py-1 rounded text-[10px]">{isEditing ? 'Editing Mode' : 'AI Draft'}</span>
            </h4>
            <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
              {localDrafts.map((draft, idx) => {
                const sectionTitle = draft.section.replace(/_/g, " ").toUpperCase();
                const currentContent = profile?.sections[draft.section] || "";
                const proposedContent = draft.proposed_content || currentContent; 
                
                return (
                  <div key={`new-${idx}`} className="mb-10 pb-8 border-b border-red-50 last:border-b-0">
                    <h5 className="text-[#901639] text-sm font-bold mb-4">{sectionTitle}</h5>
                    
                    {/* The Toggle: Show Textarea if Editing, otherwise show formatted text */}
                    {isEditing ? (
                      <textarea
                        className="w-full min-h-[250px] p-4 text-sm border border-[#901639]/50 rounded-lg focus:ring-2 focus:ring-[#901639] outline-none custom-scrollbar leading-relaxed text-gray-800 bg-white shadow-inner"
                        value={proposedContent}
                        onChange={(e) => handleTextChange(idx, e.target.value)}
                        placeholder="Type your final edits here..."
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {proposedContent.trim() ? (
                          formatContent(proposedContent, true, currentContent)
                        ) : (
                          <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-lg border border-dashed border-gray-200 text-center">
                            This section remains empty.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-white border-t border-gray-200 flex justify-end gap-4 shadow-inner shrink-0">
          <button onClick={onRejectAll} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-bold text-sm transition-colors shadow-sm">
            <XCircle size={18} /> Discard All Changes
          </button>

          {/* NEW EDIT BUTTON LOGIC */}
          {isEditing ? (
            <>
              <button 
                onClick={handleCancelEdits} 
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-400 text-gray-600 rounded-lg hover:bg-gray-50 font-bold text-sm transition-colors shadow-sm"
              >
                <XCircle size={18} /> Cancel Edits
              </button>
              <button 
                onClick={() => setIsEditing(false)} 
                className="flex items-center gap-2 px-6 py-3 bg-white border border-[#901639] text-[#901639] rounded-lg hover:bg-red-50 font-bold text-sm transition-colors shadow-sm"
              >
                <Save size={18} /> Save Edits
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)} 
              className="flex items-center gap-2 px-6 py-3 bg-white border border-[#901639] text-[#901639] rounded-lg hover:bg-red-50 font-bold text-sm transition-colors shadow-sm"
            >
              <Edit3 size={18} /> Edit Changes
            </button>
          )}

          <button 
            onClick={() => onApproveAll(localDrafts)} 
            className="flex items-center gap-2 px-8 py-3 bg-[#901639] text-white rounded-lg hover:bg-[#7a1230] font-bold text-sm transition-colors shadow-md transform active:scale-95"
          >
            <CheckCircle2 size={18} /> Approve & Continue
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default DraftReviewModal;