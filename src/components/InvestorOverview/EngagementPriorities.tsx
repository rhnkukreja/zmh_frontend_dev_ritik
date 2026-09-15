import React, { useState, useEffect } from 'react';
import { Target, List, ChevronDown, ChevronUp, CheckCircle2, RefreshCw } from 'lucide-react';
import parse, { domToReact, Element, HTMLReactParserOptions } from 'html-react-parser';
import { AI_CHATBOT_API_BASE } from "../../pages/AIChatbot/api";

interface EngagementPrioritiesProps {
  companyTicker?: string;
}

type SubTab = 'takeaways' | 'breakdown';

// The GET response's third key, alongside `exists` and `data`. Every field is
// optional: the key is absent on any deployment where the backend hasn't
// shipped it yet, and absent must read as "not stale" rather than breaking the
// page or claiming staleness it can't support.
type StaleInfo = {
  is_stale?: boolean;
  reason?: string | null;
  investors?: string[];
};

// One row of an investor's `documents` array. Optional throughout — most
// investors carry no documents at all, and the ones that do may be missing any
// individual field.
type SourceDocument = {
  id?: number;
  name?: string;
  year?: number | string;
  link?: string;
};

const EngagementPriorities: React.FC<EngagementPrioritiesProps> = ({ companyTicker = "" }) => {
  // Application State
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isCreatingEngagement, setIsCreatingEngagement] = useState(false);
  const [engagementData, setEngagementData] = useState<any>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [staleInfo, setStaleInfo] = useState<StaleInfo | null>(null);
  const [showStaleInvestors, setShowStaleInvestors] = useState(false);
  
  // Tab & Accordion States
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('takeaways');
  // Keyed by a string path, not the raw index: "3" is the fourth investor, "3.1"
  // its first sub-investor. The two forms can't collide, so a child's open/closed
  // state never bleeds into a parent's -- which a numeric offset scheme would
  // only avoid by assuming a maximum child count.
  const [expandedInvestors, setExpandedInvestors] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  // 1. GET ENDPOINT INTEGRATION: Fetch from S3 on component load
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!companyTicker) return;
      
      setIsInitialLoading(true);
      // Dropped up front so a previous company's staleness can't sit over the
      // next one's data if this request fails partway.
      setStaleInfo(null);
      setShowStaleInvestors(false);
      try {
        const response = await fetch(`${AI_CHATBOT_API_BASE}/api/company-engagement/${companyTicker}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        
        if (!response.ok) throw new Error('Failed to check existing data');
        
        const result = await response.json();
        
        if (result.exists && result.data) {
          console.log("✅ Data found! Loading existing engagement data.");
          setEngagementData(result.data);
          // Optional third key. `?? null` keeps a response that predates it
          // (or omits it) as plainly not-stale instead of undefined.
          setStaleInfo(result.stale ?? null);
          setActiveSubTab('takeaways');
          if (result.data.raw_data && result.data.raw_data.length > 0) {
            setExpandedInvestors({ "0": true });
          }
        } else {
          console.log("⚙️ No data found. Generating new engagement data...");
          // No existing data — auto-generate on first load
          await handleCreateEngagement();
        }
      } catch (err) {
        console.error("Error fetching existing engagement data:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchExistingData();
  }, [companyTicker]);

  // 2. POST ENDPOINT: Generate new insights & save to S3
  const handleCreateEngagement = async () => {
    if (!companyTicker) {
      console.warn("No company ticker was provided.");
      return;
    }

    setIsCreatingEngagement(true);
    setSaveSuccess(false);
    
    try {
      const payload = { ticker: companyTicker };

      const response = await fetch(`${AI_CHATBOT_API_BASE}/api/company-engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to generate new engagement data');

      const data = await response.json();
      setEngagementData(data);
      // Just rebuilt from current sources, so whatever made it stale no longer
      // applies — the badge goes without waiting for a reload. The POST
      // response carries no `stale` key of its own to read back.
      setStaleInfo(null);
      setShowStaleInvestors(false);
      setSaveSuccess(true);
      
      setActiveSubTab('takeaways'); 
      if (data.raw_data && data.raw_data.length > 0) {
        setExpandedInvestors({ "0": true });
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error creating engagement:", err);
    } finally {
      setIsCreatingEngagement(false);
    }
  };

  const toggleInvestorRow = (key: string) => {
    setExpandedInvestors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCard = (idx: number) => {
    setExpandedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const renderPriorities = (html: string) => {
    const options: HTMLReactParserOptions = {
      replace(domNode) {
        if (!(domNode instanceof Element)) return;

        if (domNode.name === 'p') {
          const getRawText = (node: any): string => {
            if (node.type === 'text') return node.data || '';
            if (node.children) return node.children.map(getRawText).join('');
            return '';
          };
          const rawText = getRawText(domNode);
          
          // UPDATED REGEX: Catches numbers (1, 1., 1), 1-), hyphens (-), and bullets (•, *)
          const prefixRegex = /^\s*(?:\d+[\.\)\-]*|-|•|\*)\s*/;
          
          const isSection = prefixRegex.test(rawText);

          if (isSection) {
            // Strip the leading number/symbol and remove any trailing colons
            const cleanText = rawText
              .replace(prefixRegex, '') 
              .replace(/:\s*$/, '')     
              .trim();

            return (
              <div className="mt-6 first:mt-0 mb-3 pb-2 border-b border-slate-200 flex items-center gap-2.5">
                <div className="w-1 h-5 bg-[#981b1e] rounded-full flex-shrink-0" />
                <p className="font-bold text-[14.5px] text-slate-900 tracking-tight">
                  {cleanText}
                </p>
              </div>
            );
          }

          return (
            <p className="text-[13.5px] text-slate-600 leading-relaxed mb-2 pl-3">
              {domToReact(domNode.children as any, options)}
            </p>
          );
        }

        if (domNode.name === 'strong') {
          return (
            <strong className="font-semibold text-slate-800">
              {domToReact(domNode.children as any, options)}
            </strong>
          );
        }
      }
    };
    return parse(html, options);
  };

  // Only an explicit true counts. A missing `stale` key, a missing is_stale,
  // or anything non-boolean all mean not stale.
  const isStale = staleInfo?.is_stale === true;
  const staleReason = typeof staleInfo?.reason === 'string' ? staleInfo.reason.trim() : '';
  const staleInvestors = Array.isArray(staleInfo?.investors)
    ? staleInfo.investors.filter((name) => typeof name === 'string' && name.trim().length > 0)
    : [];

  // Rendered once, below whichever tab's content is on screen: staleness is a
  // property of the page, not of one view. A footnote rather than a banner —
  // same idiom as the Ownership tab's "¹Source: Whalewisdom…" line (small,
  // muted, separated by a light rule) rather than a new treatment. It sat in
  // the header row before, where a full sentence of explanation squeezed the
  // tab labels onto three lines.
  const staleFootnote = isStale ? (
    <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
      <p className="m-0">
        {/* The backend owns the wording; the asterisk is the only thing added
            to it. The fallback covers a response that flags staleness without
            saying why, so the footnote still means something. */}
        <span className="mr-1">*</span>
        {staleReason || 'This insight may be out of date.'}
      </p>

      {staleInvestors.length > 0 && (
        <>
          {/* The affected investors stay reachable, just folded away — a full
              list of names would drown the footnote it belongs to. */}
          <button
            onClick={() => setShowStaleInvestors((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            {showStaleInvestors ? 'Hide' : 'Show'} affected investors ({staleInvestors.length})
            {showStaleInvestors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showStaleInvestors && (
            <div className="mt-2 flex flex-wrap gap-1.5 animate-in fade-in duration-200">
              {staleInvestors.map((investor, invIdx) => (
                <span
                  key={invIdx}
                  className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600"
                >
                  {investor}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  // The "Sources" block under an investor's priorities. Returns null — no
  // heading, no placeholder — whenever there's nothing worth linking to: most
  // investors have no documents at all, and a heading over an empty list on
  // nearly every row would read as broken.
  const renderSources = (documents: any) => {
    const docs: SourceDocument[] = (Array.isArray(documents) ? documents : [])
      .filter((doc: any) => doc && typeof doc === 'object')
      // An entry with neither a name nor a link has nothing to show, so it's
      // dropped rather than rendered as an untitled non-link.
      .filter((doc: SourceDocument) => {
        const hasName = typeof doc.name === 'string' && doc.name.trim().length > 0;
        const hasLink = typeof doc.link === 'string' && doc.link.trim().length > 0;
        return hasName || hasLink;
      });

    if (docs.length === 0) return null;

    return (
      <div className="mt-5 pt-4 border-t border-slate-100 border-dashed">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
          Sources
        </p>
        <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
          {docs.map((doc, docIdx) => {
            const name = typeof doc.name === 'string' ? doc.name.trim() : '';
            const link = typeof doc.link === 'string' ? doc.link.trim() : '';
            // Falls back to the URL itself, so a nameless document is still
            // identifiable without inventing a label for it.
            const label = name || link;
            // Omitted entirely when absent, rather than rendering "()".
            const year =
              doc.year === null || doc.year === undefined || String(doc.year).trim() === ''
                ? ''
                : String(doc.year).trim();

            return (
              <li key={doc.id ?? docIdx} className="text-[13px] flex items-baseline gap-2">
                <span className="text-slate-300 flex-shrink-0">▸</span>
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#981b1e] font-medium hover:underline break-all"
                  >
                    {label}
                  </a>
                ) : (
                  // No link — plain text, never an anchor that goes nowhere.
                  <span className="text-slate-700 font-medium break-all">{label}</span>
                )}
                {year && <span className="text-slate-400 flex-shrink-0">({year})</span>}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  // Sub-investors under a raw_data entry (e.g. an asset manager's separately
  // run stewardship teams). Optional: the key is absent for almost every
  // investor, and the backend may deploy after this does. Anything that isn't a
  // usable array of named entries yields [], which renders the parent exactly
  // as it rendered before children existed. A child with no name is dropped
  // rather than shown as a card with a blank heading.
  const getInvestorChildren = (item: any): any[] =>
    Array.isArray(item?.children)
      ? item.children.filter(
          (child: any) =>
            child && typeof child === 'object' && typeof child.investor === 'string' && child.investor.trim().length > 0
        )
      : [];

  // One card, used for a top-level investor and for each sub-investor alike, so
  // the priorities/Sources rendering exists once. `nested` only lightens the
  // chrome. With nested=false every class string below is character-for-
  // character what this card used before sub-investors existed, which is what
  // keeps a page with no children looking unchanged.
  const renderInvestorCard = (item: any, key: string, nested: boolean = false) => {
    const isExpanded = expandedInvestors[key] === true;

    return (
      <div
        key={key}
        className={`border rounded-xl transition-all duration-300 overflow-hidden ${
          isExpanded
            ? (nested ? 'border-slate-300 shadow-sm bg-white' : 'border-slate-300 shadow-md bg-white')
            : (nested ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm')
        }`}
      >
        <button
          onClick={() => toggleInvestorRow(key)}
          className={`w-full flex items-center justify-between ${nested ? 'px-4 py-3' : 'p-5'} text-left transition-colors focus:outline-none`}
        >
          <div className={`flex items-center ${nested ? 'gap-3' : 'gap-4'}`}>
            <div className={`${nested ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full transition-colors ${isExpanded ? 'bg-[#981b1e]' : 'bg-slate-300'}`}></div>
            <h5 className={`${nested ? 'font-semibold text-[14.5px]' : 'font-bold text-[16px]'} transition-colors ${isExpanded ? 'text-slate-900' : 'text-slate-700'}`}>
              {item.investor}
            </h5>
          </div>
          <div className={`border rounded-full ${nested ? 'p-1' : 'p-1.5'} shadow-sm transition-all duration-300 ${isExpanded ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className={nested ? 'px-5 pb-5 pt-1' : 'px-6 pb-6 pt-2'}>
              <div className="text-slate-700 leading-relaxed px-2 py-1">
                {item.priorities ? renderPriorities(item.priorities) : "No priorities data provided."}
                {renderSources(item.documents)}
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // --- DATA PROCESSING: SORT GOVERNANCE FIRST, CLIMATE LAST ---
  let processedTakeaways: any[] = [];
  if (engagementData?.summary_data?.key_takeaways) {
    processedTakeaways = [...engagementData.summary_data.key_takeaways];

    processedTakeaways.sort((a, b) => {
      const aTitle = (a.theme || a.title || "").toLowerCase();
      const bTitle = (b.theme || b.title || "").toLowerCase();
      
      const aIsGov = aTitle.includes("governance") || aTitle.includes("board");
      const bIsGov = bTitle.includes("governance") || bTitle.includes("board");
      
      const aIsClimate = aTitle.includes("climate") || aTitle.includes("environmental");
      const bIsClimate = bTitle.includes("climate") || bTitle.includes("environmental");

      if (aIsGov && !bIsGov) return -1; 
      if (!aIsGov && bIsGov) return 1;

      if (aIsClimate && !bIsClimate) return 1; 
      if (!aIsClimate && bIsClimate) return -1;

      return 0;
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 min-h-[400px] shadow-sm">
      

      {/* Main Content Area */}
      {(isInitialLoading || isCreatingEngagement) ? (
        /* SKELETON LOADER */
        <div className="mt-4 animate-pulse">
          <div className="flex items-center gap-8 mb-8 border-b border-slate-200 pb-4">
            <div className="h-6 bg-slate-200 rounded-md w-32"></div>
            <div className="h-6 bg-slate-200 rounded-md w-56"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 h-36 flex flex-col gap-3">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      ) : engagementData ? (
        <div>

          {/* Sub-Tabs Navigation & Action Button */}
          <div className="bg-white pt-3 pb-3 flex items-center justify-between border-b border-slate-200">
            
            {/* Left Side: Tabs */}
            <div className="flex items-center gap-8">
              {/* Key Themes */}
              <button
                onClick={() => setActiveSubTab('takeaways')}
                className={`relative pb-4 text-[15px] font-bold transition-all duration-200 flex items-center gap-2 ${
                  activeSubTab === 'takeaways'
                    ? 'text-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {activeSubTab === 'takeaways' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#f26522]" fill="#fff1eb" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-slate-400" />
                )}
                <span>Key Themes</span>

                {activeSubTab === 'takeaways' && (
                  <span className="absolute left-0 bottom-0 h-[2px] w-[calc(100%+20px)] bg-[#981b1e] rounded-full"></span>
                )}
              </button>

              {/* Investor-Level Details */}
              <button
                onClick={() => setActiveSubTab('breakdown')}
                className={`relative pb-4 text-[15px] font-bold transition-all duration-200 flex items-center gap-2 ${
                  activeSubTab === 'breakdown'
                    ? 'text-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <List
                  className={`w-5 h-5 ${
                    activeSubTab === 'breakdown' ? 'text-[#981b1e]' : 'text-slate-400'
                  }`}
                />
                <span>Investor-Level Details</span>

                {activeSubTab === 'breakdown' && (
                  <span className="absolute left-0 bottom-0 h-[2px] w-full bg-[#981b1e] rounded-full"></span>
                )}
              </button>
            </div>

            {/* Right Side: Regenerate Button. Nothing sits between this and the
                tabs -- the staleness notice used to, and squeezed the tab
                labels onto three lines. It's a footnote under the content now
                (staleFootnote below); this button is the action, not the
                explanation, so it stays exactly where it was. */}
            <button
              onClick={handleCreateEngagement}
              disabled={isCreatingEngagement || isInitialLoading}
              className="ml-auto px-5 py-2 bg-white text-[#981b1e] border border-[#981b1e] hover:bg-[#981b1e] hover:text-white text-[13px] font-semibold rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#981b1e] flex items-center gap-2"
            >
              {isCreatingEngagement ? (
                'Generating...'
              ) : engagementData ? (
                <> <RefreshCw className="w-4 h-4" /> Regenerate Insight </>
              ) : (
                'Create Insight'
              )}
            </button>
          </div>

          {/* TAB 1: KEY TAKEAWAYS GRID */}
          {activeSubTab === 'takeaways' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 mt-6">
              {processedTakeaways.map((takeaway: any, index: number) => {
                const title = takeaway.theme || takeaway.title || "Key Takeaway";
                const description = takeaway.description || takeaway.summary || "";
                
                // Safely extract the list of investors
                const investorsList = Array.isArray(takeaway.investors) 
                  ? takeaway.investors 
                  : (typeof takeaway.investors === 'string' ? takeaway.investors.split(',').map((s: string) => s.trim()) : []);
                
                const colorPalettes = [
                  { bg: 'bg-[#f26522]', text: 'text-[#f26522]', light: 'bg-orange-50' }, 
                  { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50' },
                  { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' },
                  { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
                  { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
                  { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50' },
                ];
                const palette = colorPalettes[index % colorPalettes.length];
                const isCardExpanded = expandedCards[index] === true;

                return (
                  <div 
                    key={index} 
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group relative overflow-hidden"
                  >
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3 gap-4">
                        <h4 className="font-bold text-slate-800 text-[16px] leading-snug">
                          {title}
                        </h4>
                      </div>
                      <div className={`w-full h-1 ${palette.bg} opacity-80 mb-4 rounded-full`}></div>
                      
                      <p className="text-[14px] text-slate-600 leading-relaxed">
                        {description}
                      </p>

                      {/* --- INVESTOR ACCORDION --- */}
                      {investorsList.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-slate-100 border-dashed">
                          <button
                            onClick={() => toggleCard(index)}
                            className="w-full flex items-center justify-between text-left focus:outline-none group/btn"
                          >
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider group-hover/btn:text-slate-600 transition-colors">
                              INVESTORS
                            </p>
                            <div className="text-slate-400 group-hover/btn:text-slate-600 transition-colors">
                              {isCardExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>
                          
                          <div className={`grid transition-all duration-300 ease-in-out ${isCardExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                              <div className="flex flex-col gap-2">
                                {investorsList.map((investor: string, invIdx: number) => (
                                  <span 
                                    key={invIdx} 
                                    className={`text-[12px] px-3 py-1.5 rounded-md font-medium ${palette.light} text-slate-800`}
                                  >
                                    {investor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: INVESTOR PRIORITIES BREAKDOWN */}
          {activeSubTab === 'breakdown' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-500 mt-6">
              {engagementData.raw_data?.map((item: any, idx: number) => {
                const parentKey = String(idx);
                const children = getInvestorChildren(item);

                // No sub-investors (the normal case): the card alone, as a
                // direct child of this list -- no wrapper, so the markup and
                // the gap-4 spacing are exactly what they were.
                if (children.length === 0) return renderInvestorCard(item, parentKey);

                // With sub-investors: parent and children grouped so the split
                // reads at a glance, like the Ownership tab's 1.1 / 1.2 rows.
                // The children sit OUTSIDE the parent's collapsible body, so
                // they stay visible whether or not the parent is expanded; each
                // is its own expandable card, keyed "3.1", "3.2", ... so its
                // state can't collide with a parent's "3". Sub-investors are
                // only ever shown here -- Key Themes is built from summary_data,
                // not raw_data, so they don't enter the theme lists.
                return (
                  <div key={parentKey} className="flex flex-col gap-2">
                    {renderInvestorCard(item, parentKey)}
                    <div className="ml-6 pl-4 border-l-2 border-slate-200 flex flex-col gap-2">
                      {children.map((child: any, childIdx: number) =>
                        renderInvestorCard(child, `${parentKey}.${childIdx + 1}`, true)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* After the last tile on Key Themes, after the last investor row on
              Investor-Level Details. One placement rather than one per tab, so
              the two can't drift apart. */}
          {staleFootnote}

        </div>
      ) : (
        /* Empty State */
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center text-slate-500 mt-4 shadow-sm">
          <Target className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="mb-2 font-semibold text-slate-700 text-lg">No engagement priorities found.</p>
          <p className="text-sm">Click the button above to generate AI insights for {companyTicker || "this company"}.</p>
        </div>
      )}
    </div>
  );
};

export default EngagementPriorities;