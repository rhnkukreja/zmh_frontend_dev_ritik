import { useState, useEffect, useRef, useMemo } from "react";
import { 
    Send, Bot, Users, FileText, X, ChevronDown, Check,
    Eye, EyeOff, Search, Trash2, Maximize2, ArrowRight, FileSearch 
} from "lucide-react";
import { fetchInvestors, AI_CHATBOT_API_BASE } from "./api"; 
import { useChat } from "./ChatContext.tsx";
// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
type InvestorItem = {
    id: string;
    name: string;
    disabled?: boolean; // Optional, used for the separator
};

type HistoryItem = {
    id: string;
    question: string;
    results?: GuidelineResult[];
    loading?: boolean;
    error?: boolean;
    message?: string;
};

type GuidelineResult = {
    investor_id: string;
    pdf_name: string;
    summary: string;
    answer_segments?: { page: number | null; text: string; page_url: string }[];
    pages: (string | number)[];
    year: number | null;
    quarter: string | null;
    relevance_score: number | null;
    file_url?: string;
};

export default function VotingGuidelinesPage() {
    // ─────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────
    const [allInvestors, setAllInvestors] = useState<InvestorItem[]>([]);
    
    const { 
        guidelineResults: history, 
        setGuidelineResults: setHistory,
        guidelineFilters,
        setGuidelineFilters
    } = useChat();

    // ─── Derive filter values from context ───
    const selectedInvestors = guidelineFilters.selectedInvestors;
    const includeEmea = guidelineFilters.includeEmea;
    const question = guidelineFilters.question;

    // ─── Setters that write back to context ───
    const setSelectedInvestors = (v: string[]) => setGuidelineFilters(f => ({ ...f, selectedInvestors: v }));
    const setIncludeEmea = (v: boolean) => setGuidelineFilters(f => ({ ...f, includeEmea: v }));
    const setQuestion = (v: string) => setGuidelineFilters(f => ({ ...f, question: v }));
    
    const availableYears = ["2026", "2025", "2024"];
    
    const [selectedYears, setSelectedYears] = useState<string[]>(() => {
        const latest = Math.max(...availableYears.map(Number));
        const defaultYear = latest === 2026 ? "2025" : latest.toString();
        return [defaultYear];
    });
    const [llmStrength, setLlmStrength] = useState(0);
    
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    
    const [selectedResult, setSelectedResult] = useState<GuidelineResult | null>(null);
    
    const [isInvestorDropdownOpen, setIsInvestorDropdownOpen] = useState(false);
    const [investorSearchQuery, setInvestorSearchQuery] = useState("");
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

    const investorDropdownRef = useRef<HTMLDivElement>(null);
    const yearDropdownRef = useRef<HTMLDivElement>(null);
    const resultsEndRef = useRef<HTMLDivElement>(null);

    // ─────────────────────────────────────────────────────────
    // EFFECTS
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await fetchInvestors();
                
                const allInvestorsData: InvestorItem[] = data.investors || [];

                const priorityOrder = [
                    "c4a5a2c7-c493-414b-854f-1c99c9aef7ed",
                    "2b622a0e-1a72-43fd-add2-d4b863f0731c",
                    "347446c8-649d-4b5a-be03-9c178c82ff2a",
                    "21881b9b-7970-414e-baae-c84635d03d45",
                    "4f383fdd-b46d-4952-b128-624c9603c411"
                ];
                
                const priorityInvestors = priorityOrder
                    .map(id => allInvestorsData.find(inv => inv.id === id))
                    .filter((inv): inv is InvestorItem => !!inv);

                const otherInvestors = allInvestorsData
                    .filter(inv => !priorityOrder.includes(inv.id))
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                const separator: InvestorItem = { id: "separator", name: "──────────", disabled: true };
                
                const sortedInvestors = [...priorityInvestors, separator, ...otherInvestors];
                setAllInvestors(sortedInvestors);
            } catch (err) {
                console.error("Failed to load investors", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();

        const handleClickOutside = (event: MouseEvent) => {
            if (investorDropdownRef.current && !investorDropdownRef.current.contains(event.target as Node)) {
                setIsInvestorDropdownOpen(false);
            }
            if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
                setIsYearDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (history.length > 0 || analyzing) {
            resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history, analyzing]);

    // ─────────────────────────────────────────────────────────
    // HANDLERS
    // ─────────────────────────────────────────────────────────
    const toggleInvestor = (id: string) => {
        setSelectedInvestors((() => {
            if (selectedInvestors.includes(id)) return selectedInvestors.filter(item => item !== id);
            if (selectedInvestors.length >= 5) {
                alert("Maximum 5 investors allowed for comparison.");
                return selectedInvestors;
            }
            return [...selectedInvestors, id];
        })());
    };

    const toggleYearSelection = (year: string) => {
        setSelectedYears(prev => 
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        );
    };

    const clearChat = () => {
        setHistory([]);
    };

    const filteredInvestors = useMemo(() => {
        return allInvestors.filter(inv =>
            inv.name.toLowerCase().includes(investorSearchQuery.toLowerCase())
        );
    }, [allInvestors, investorSearchQuery]);

    const getStrengthLabel = (val: number) => {
        switch(val) {
            case 0: return "Factual";
            case 4: return "Balanced";
            case 8: return "Creative";
            default: return "Balanced";
        }
    };

    const getStrengthDescription = (strength: number): string => {
        if (strength <= 2) return 'Focused, factual responses';
        if (strength > 2 && strength <= 6) return 'Mix of accuracy and creativity';
        return 'Imaginative, diverse outputs';
    };

    // ─────────────────────────────────────────────────────────
    // DYNAMIC WIDTH HELPER
    // ─────────────────────────────────────────────────────────
    const getColumnWidthClass = (count: number) => {
        if (count >= 5) return "w-1/5 min-w-[180px]"; 
        if (count === 4) return "w-1/4 min-w-[220px]";
        if (count === 3) return "w-1/3 min-w-[250px]";
        return "flex-1 min-w-[280px]";
    };

    const isReady = selectedInvestors.length > 0 && question.trim().length > 0 && !analyzing;

    const handleAnalyze = async () => {
        if (!isReady || !question.trim()) return;
        
        setAnalyzing(true);
        
        const finalQuestion = question.trim();

        const itemId = crypto.randomUUID();

        setHistory(prev => [
            ...prev,
            {
                id: itemId,
                question: finalQuestion,
                loading: true,
            },
        ]);

        try {
            const response = await fetch(`${AI_CHATBOT_API_BASE}/api/voting-guidelines-table`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "auto", 
                    investor_ids: selectedInvestors,
                    question: finalQuestion,
                    category: ["Voting Guidelines"], 
                    years: [],
                    include_emea: includeEmea,
                    llm_strength: llmStrength
                }),
            });

            if (!response.ok) throw new Error("Analysis failed");

            const data = await response.json();
            const results = data.results || [];

            setHistory(prev =>
                prev.map(item =>
                    item.id === itemId
                        ? { ...item, results, loading: false }
                        : item
                )
            );
        } catch (error) {
            console.error("Error fetching guidelines:", error);
            setHistory(prev =>
                prev.map(item =>
                    item.id === itemId
                        ? { ...item, loading: false, error: true, message: "Failed to analyze guidelines. Please try again." }
                        : item
                )
            );
            alert("Failed to analyze guidelines. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#931638]"></div>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] relative animate-in fade-in duration-500">
            
            {/* FULL TEXT MODAL */}
            {selectedResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white border border-[#931638]/50 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-[#931638]/50 flex justify-between items-start bg-gray-50">
                            <div className="flex flex-col gap-1.5">
                                <div className="text-lg font-bold text-[#931638] flex items-center gap-2">
                                    <Users size={18} />
                                    {allInvestors.find(i => i.id === selectedResult.investor_id)?.name || selectedResult.investor_id}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded border border-gray-200">
                                        <FileText size={14} className="text-[#931638]"/>
                                        {selectedResult.pdf_name}
                                    </div>
                                    {selectedResult.file_url && (
                                        <a
                                            href={selectedResult.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 bg-[#931638] text-white px-2 py-1 rounded text-xs font-medium hover:bg-[#931638]/90 transition-colors"
                                            title="Open PDF"
                                        >
                                            <FileSearch size={14} />
                                            Open PDF
                                        </a>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setSelectedResult(null)} className="text-gray-500 hover:text-black p-2 hover:bg-gray-200 rounded-lg transition-colors bg-gray-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar bg-white">
                            <div className="prose prose-sm max-w-none text-gray-800 text-sm leading-relaxed space-y-4">
                                {(() => {
                                    const segments = selectedResult.answer_segments ?? [];
                                    const uniquePages = new Set(segments.map(s => s.page));
                                    const isMultiPage = uniquePages.size > 1;

                                    const renderLines = (text: string) =>
                                        text
                                            .split(/\n/)
                                            .map(line => line.trim())
                                            .filter(line => line.length > 0)
                                            .map((line, i) => (
                                                <p key={i} className="mb-3 text-sm text-gray-800 leading-relaxed">{line}</p>
                                            ));

                                    if (!isMultiPage) {
                                        const rawText = segments.length > 0
                                            ? segments.map(s => s.text).join("\n")
                                            : selectedResult.summary;
                                        const singlePage = segments[0]?.page;
                                        const singlePageUrl = segments[0]?.page_url;
                                        return (
                                            <div>
                                                {renderLines(rawText)}
                                                {singlePage !== null && singlePage !== undefined && (
                                                    <a
                                                        href={singlePageUrl ?? (selectedResult.file_url ? `${selectedResult.file_url}#page=${singlePage}` : "#")}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-block mt-2 bg-[#931638] hover:bg-[#931638]/90 px-2 py-0.5 rounded text-xs text-white transition-colors"
                                                    >
                                                        p.{singlePage}
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    }

                                    return segments.map((seg, i) => (
                                        <div key={i}>
                                            {renderLines(seg.text)}
                                            {seg.page !== null && (
                                                <a
                                                    href={seg.page_url ?? (selectedResult.file_url ? `${selectedResult.file_url}#page=${seg.page}` : "#")}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block mt-1 mb-4 bg-[#931638] hover:bg-[#931638]/90 px-2 py-0.5 rounded text-xs text-white transition-colors"
                                                >
                                                    p.{seg.page}
                                                </a>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTROLS SECTION */}
            <div className={`space-y-4 relative z-20 ${showFilters ? 'mb-4' : 'mb-6'}`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">

                        {showFilters && (
                        <>
                            <div className="relative w-[280px]" ref={investorDropdownRef}>
                                <button
                                    onClick={() => setIsInvestorDropdownOpen(!isInvestorDropdownOpen)}
                                    className="w-full flex items-center justify-between h-[34px] px-3 bg-gray-50 border border-[#931638]/50 rounded-lg text-xs transition-all hover:border-[#931638]"
                                >
                                    <span className="truncate text-black font-medium flex items-center gap-2">
                                        <Users size={12} className="text-gray-500" />
                                        {selectedInvestors.length === 0 ? "Select Investors (Max 5)" : `${selectedInvestors.length} Investors Selected`}
                                    </span>
                                    <ChevronDown size={12} className={`text-gray-500 transition-transform ${isInvestorDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isInvestorDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-[320px] bg-white border border-[#931638]/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                                        <div className="p-2 border-b border-gray-100 bg-gray-50">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                <input
                                                    type="text"
                                                    value={investorSearchQuery}
                                                    onChange={(e) => setInvestorSearchQuery(e.target.value)}
                                                    placeholder="Search..."
                                                    className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-[#931638] focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            {filteredInvestors.map((inv) => {
                                                if (inv.disabled) {
                                                    return (
                                                        <div key={inv.id} className="px-4 py-1 text-center text-gray-300 text-xs pointer-events-none">
                                                            {inv.name}
                                                        </div>
                                                    );
                                                }
                                                
                                                const isSelected = selectedInvestors.includes(inv.id);
                                                return (
                                                    <div key={inv.id} onClick={() => toggleInvestor(inv.id)} className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${isSelected ? 'bg-[#931638]/5' : 'hover:bg-gray-50'}`}>
                                                        <span className={`text-xs ${isSelected ? "text-[#931638] font-bold" : "text-gray-700"}`}>{inv.name}</span>
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#931638] border-[#931638]' : 'border-gray-300 bg-white'}`}>
                                                            {isSelected && <Check size={10} className="text-white" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setIncludeEmea(!includeEmea)} className="flex items-center gap-1.5 h-[34px] px-2 bg-gray-100 border border-[#931638]/50 rounded-lg cursor-pointer group hover:border-[#931638] transition-all">
                                <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${includeEmea ? "bg-[#931638]" : "bg-gray-400"}`}>
                                    <div className={`w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${includeEmea ? "translate-x-3.5" : "translate-x-0"}`} />
                                </div>
                                <span className={`text-[10px] font-medium transition-colors ${includeEmea ? "text-[#931638]" : "text-gray-600"}`}>Add EMEA</span>
                            </button>
                        </>
                        )}

                        {!showFilters && (
                            <div className="flex-1 bg-white border-2 border-[#931638] rounded-xl flex items-center p-2 shadow-xl">
                                <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAnalyze()} placeholder={isReady ? "Ask about voting guidelines..." : "Select investors first..."} className="flex-1 bg-transparent border-none outline-none text-black px-2 text-sm" />
                                <button onClick={() => setQuestion("")} className="text-gray-400 hover:text-[#931638] p-2 rounded-lg hover:bg-gray-100 transition-colors mr-1"><Trash2 size={16}/></button>
                                <button onClick={handleAnalyze} disabled={!isReady} className="bg-[#931638] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#931638]/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {analyzing ? <span className="animate-spin">⏳</span> : <Send size={14}/>} 
                                    {analyzing ? "Analyzing..." : "Analyze"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {showFilters && (
                    <div className="flex items-center justify-between w-full pt-1">
                        <div className="flex flex-wrap gap-2 flex-1 mr-4">
                            {selectedInvestors.map(id => (
                                <div key={id} className="flex items-center gap-1 bg-[#931638]/10 text-[#931638] border border-[#931638]/60 px-2 py-0.5 rounded text-[10px] animate-in fade-in">
                                    <span>{allInvestors.find(i => i.id === id)?.name || id}</span>
                                    <button onClick={() => toggleInvestor(id)} className="hover:text-[#931638]"><X size={10} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 font-medium">Answer type:</span>
                                <div className="relative group flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-gray-700 cursor-help transition-colors">
                                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                                    </svg>
                                    <div className="absolute bottom-full mb-2 right-0 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-75 z-50 pointer-events-none">
                                        <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl border border-white/10">{getStrengthDescription(llmStrength)}</div>
                                    </div>
                                </div>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-gray-600 w-16 text-center">{getStrengthLabel(llmStrength)}</span>
                            <input type="range" min="0" max="8" step="4" value={llmStrength} onChange={(e) => setLlmStrength(Number(e.target.value))} className="w-24 h-1.5 bg-gray-300 rounded-full appearance-none cursor-pointer accent-[#931638] hover:opacity-80 transition-opacity" />
                        </div>
                    </div>
                )}
            </div>

            {showFilters && (
                <div className="bg-white border-2 border-[#931638] rounded-xl flex items-center p-2 shadow-xl mb-6 z-10 relative shrink-0">
                    <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAnalyze()} placeholder={isReady ? "Ask about voting guidelines..." : "Select investors to begin..."} className="flex-1 bg-transparent border-none outline-none text-black px-2 text-sm" />
                    {question && (
                        <button 
                            onClick={() => setQuestion("")} 
                            className="text-gray-400 hover:text-[#931638] p-2 rounded-lg hover:bg-gray-100 transition-colors mr-1"
                            title="Clear question"
                        >
                            <Trash2 size={16}/>
                        </button>
                    )}
                    <button onClick={handleAnalyze} disabled={!isReady} className="bg-[#931638] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#931638]/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                        {analyzing ? <span className="animate-spin">⏳</span> : <Send size={14}/>} {analyzing ? "Analyzing..." : "Analyze"}
                    </button>
                </div>
            )}

            {showFilters && (
                <div className="flex justify-start mb-2">
                </div>
            )}

            {/* RESULTS / CHAT HISTORY SECTION */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-4 pb-4 custom-scrollbar">
                {!analyzing && history.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 pt-10">
                        <Bot size={48} strokeWidth={1} />
                        <p className="text-sm font-light">Select investors and ask a question to analyze their guidelines.</p>
                    </div>
                )}

                {history.length > 0 && (
                    <div className="flex justify-start mt-4">
                        <button onClick={clearChat} className="flex items-center gap-2 bg-gray-100 hover:bg-[#931638]/10 border border-gray-300 hover:border-[#931638] text-gray-600 hover:text-[#931638] px-3 py-1.5 rounded-lg text-xs font-medium transition-all" title="Clear all messages">
                            <Trash2 size={14} />
                            Clear Chat
                        </button>
                    </div>
                )}

                {history.map((item) => (
                    <div key={item.id} className="space-y-3">
                        {/* Question bubble */}
                        <div className="flex justify-end">
                            <div className="bg-[#931638] text-white p-3 rounded-2xl rounded-tr-sm text-sm shadow-lg inline-block">
                                {item.question}
                            </div>
                        </div>

                        {/* Loading state */}
                        {item.loading && (
                            <div className="flex gap-4 items-center animate-in slide-in-from-left-2 ml-1">
                                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex items-center justify-center shrink-0"><Bot size={14} className="text-[#931638]" /></div>
                                <div className="text-sm text-gray-500 animate-pulse font-medium bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">Extracting and analyzing guidelines...</div>
                            </div>
                        )}

                        {/* Error state */}
                        {item.error && !item.loading && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                                <div>
                                    <p className="text-sm font-medium text-red-900 mb-1">Error</p>
                                    <p className="text-xs text-red-700">{item.message || "Something went wrong. Please try again."}</p>
                                </div>
                            </div>
                        )}

                        {/* Results table */}
                        {!item.loading && !item.error && item.results && item.results.length > 0 && (
                            <div className="animate-in slide-in-from-bottom-4 duration-500 pb-4">
                                <div className="border border-[#931638]/20 rounded-lg shadow-md bg-white overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-[#931638] to-[#931638]/90">
                                                <th className="text-left px-2 py-1 text-white font-bold text-xs w-[120px]">Investor</th>
                                                <th className="text-left px-2 py-1 text-white font-bold text-xs">Answer</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {item.results.map((res: GuidelineResult, idx: number) => {
                                                const investorName = allInvestors.find(i => i.id === res.investor_id)?.name || res.investor_id;
                                                return (
                                                    <tr
                                                        key={idx}
                                                        onClick={() => setSelectedResult(res)}
                                                        className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors group"
                                                    >
                                                        {/* Investor Name Column */}
                                                        <td className="p-2 align-top bg-gray-50 border-r border-gray-200">
                                                            <div className="font-bold text-[#931638] text-xs">
                                                                {investorName}
                                                            </div>
                                                        </td>

                                                        {/* Answer Column */}
                                                        <td className="p-2">
                                                            <div className="space-y-1.5">
                                                                {/* PDF Name Header */}
                                                                <div className="flex items-center justify-between gap-2 pb-1 border-b border-gray-200">
                                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                        <FileText size={11} className="text-[#931638] shrink-0"/>
                                                                        <span className="text-[10px] font-bold text-[#931638] truncate" title={res.pdf_name}>
                                                                            {res.pdf_name}
                                                                        </span>
                                                                        {res.year && (
                                                                            <span className="text-[9px] text-gray-500 font-medium shrink-0">
                                                                                ({res.year})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {res.file_url && (
                                                                        <a
                                                                            href={res.file_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="flex items-center gap-1 bg-[#931638] text-white px-1.5 py-0.5 rounded text-[9px] font-bold hover:bg-[#931638]/90 transition-colors shrink-0"
                                                                            title="Open PDF"
                                                                        >
                                                                            <FileSearch size={10} />
                                                                            PDF
                                                                        </a>
                                                                    )}
                                                                </div>

                                                                {/* Answer Preview - 2 lines only */}
                                                                <div className="line-clamp-2 text-gray-700 text-[10px] leading-relaxed">
                                                                    {res.answer_segments?.[0]?.text ?? res.summary}
                                                                </div>

                                                                <div className="flex items-center justify-end pt-1"></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {!item.loading && !item.error && item.results && item.results.length === 0 && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                                <div>
                                    <p className="text-sm font-medium text-amber-900 mb-1">No Results Found</p>
                                    <p className="text-xs text-amber-700">No relevant information found for your question.</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={resultsEndRef} className="h-4" />
            </div>
        </div>
    );
}