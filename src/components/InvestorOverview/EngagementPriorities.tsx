import React, { useState, useEffect } from 'react';
import { Target, List, ChevronDown, ChevronUp, CheckCircle2, RefreshCw } from 'lucide-react';
import parse, { domToReact, Element, HTMLReactParserOptions } from 'html-react-parser';
import { AI_CHATBOT_API_BASE } from "../../pages/AIChatbot/api";

interface EngagementPrioritiesProps {
  companyTicker?: string;
}

type SubTab = 'takeaways' | 'breakdown';

const EngagementPriorities: React.FC<EngagementPrioritiesProps> = ({ companyTicker = "" }) => {
  // Application State
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isCreatingEngagement, setIsCreatingEngagement] = useState(false);
  const [engagementData, setEngagementData] = useState<any>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Tab & Accordion States
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('takeaways');
  const [expandedInvestors, setExpandedInvestors] = useState<Record<number, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  // 1. GET ENDPOINT INTEGRATION: Fetch from S3 on component load
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!companyTicker) return;
      
      setIsInitialLoading(true);
      try {
        const response = await fetch(`${AI_CHATBOT_API_BASE}/api/company-engagement/${companyTicker}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        
        if (!response.ok) throw new Error('Failed to check existing data');
        
        const result = await response.json();
        
        if (result.exists && result.data) {
          console.log("✅ Data found! Loading existing engagement data.");
          setEngagementData(result.data);
          setActiveSubTab('takeaways');
          if (result.data.raw_data && result.data.raw_data.length > 0) {
            setExpandedInvestors({ 0: true });
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
      setSaveSuccess(true);
      
      setActiveSubTab('takeaways'); 
      if (data.raw_data && data.raw_data.length > 0) {
        setExpandedInvestors({ 0: true });
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error creating engagement:", err);
    } finally {
      setIsCreatingEngagement(false);
    }
  };

  const toggleInvestorRow = (idx: number) => {
    setExpandedInvestors(prev => ({ ...prev, [idx]: !prev[idx] }));
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
      {/* Header and Action Buttons */}
      <div className="flex items-center justify-between mb-4">
        
        {/* <button
          onClick={handleCreateEngagement}
          disabled={isCreatingEngagement || isInitialLoading}
          className="px-6 py-2.5 bg-[#0096c7] hover:bg-[#0077b6] text-white text-[14px] font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isCreatingEngagement ? (
            'Generating...' 
          ) : engagementData ? (
            <> <RefreshCw className="w-4 h-4" /> Regenerate Insight </>
          ) : (
            'Create Insight'
          )}
        </button> */}
      </div>

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

          {/* Sub-Tabs Navigation */}
          <div className="bg-white pt-3 pb-3 flex items-center gap-8 border-b border-slate-200">
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
                const isExpanded = expandedInvestors[idx] === true;

                return (
                  <div 
                    key={idx} 
                    className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                      isExpanded 
                        ? 'border-slate-300 shadow-md bg-white' 
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <button
                      onClick={() => toggleInvestorRow(idx)}
                      className="w-full flex items-center justify-between p-5 text-left transition-colors focus:outline-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isExpanded ? 'bg-[#981b1e]' : 'bg-slate-300'}`}></div>
                        <h5 className={`font-bold text-[16px] transition-colors ${isExpanded ? 'text-slate-900' : 'text-slate-700'}`}>
                          {item.investor}
                        </h5>
                      </div>
                      <div className={`border rounded-full p-1.5 shadow-sm transition-all duration-300 ${isExpanded ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                        <div className="px-6 pb-6 pt-2">
                          <div className="text-slate-700 leading-relaxed px-2 py-1">
                            {item.priorities ? renderPriorities(item.priorities) : "No priorities data provided."}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

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