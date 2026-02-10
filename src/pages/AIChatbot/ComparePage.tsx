import { useState, useEffect, useRef, useMemo } from "react";
    import { 
    Send, Bot, User, Layers, FileSearch, X, Tag, Maximize2, ChevronDown, Check, Calendar, 
    AlertCircle, GitCompare, Sparkles, ListFilter, Grid, Settings, Eye, EyeOff, Info, Trash2
    } from "lucide-react";
    import { AI_CHATBOT_API_BASE, fetchDocuments, fetchInvestors, fetchInvestorFilters } from "./api"; 
    import ReactMarkdown from "react-markdown";

    // ─────────────────────────────────────────────────────────
    // TYPES
    // ─────────────────────────────────────────────────────────
    type AnswerData = {
    rank: number;
    pdf_id: string;
    pdf_name: string;
    investor_name?: string; 
    file_url?: string;
    pages_used: (number | string)[];
    best_page?: number | string; 
    answer: string;
    };

    type Message = {
    id: string; 
    role: "user" | "assistant";
    content?: string;
    answers?: AnswerData[];
    comparison?: string;
    error?: boolean;
    };

    type DocItem = {
        pdf_id: string;
        name: string;
        investor_id: string;
        investor_name?: string;
        category?: string;
        year?: string | number;
        is_emea: boolean; 
    };

    type InvestorItem = {
        id: string;
        name: string;
    };

    // ─────────────────────────────────────────────────────────
    // HELPER: PDF Link Builder
    // ─────────────────────────────────────────────────────────
    const getPdfLink = (url: string | undefined, page: string | number, filename: string) => {
        if (!url) return "#";
        return `/pdf-viewer?url=${encodeURIComponent(url)}&page=${page}&filename=${encodeURIComponent(filename)}`;
    };

    export default function ComparePage() {
    // ─────────────────────────────────────────────────────────
    // STATE: Mode & Data
    // ─────────────────────────────────────────────────────────
    const [mode, setMode] = useState<"auto" | "specific">("auto");
    const [allInvestors, setAllInvestors] = useState<InvestorItem[]>([]);
    const [allDocs, setAllDocs] = useState<DocItem[]>([]);
    const [yearList, setYearList] = useState<string[]>([]); 
    
    // ─────────────────────────────────────────────────────────
    // STATE: Filters
    // ─────────────────────────────────────────────────────────
    const [investor1, setInvestor1] = useState<string>("");
    const [investor2, setInvestor2] = useState<string>("");
    
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]); 
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    
    const [selectedYears, setSelectedYears] = useState<string[]>([]);
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
    const [includeEmea, setIncludeEmea] = useState(false);
    
    // LLM Settings
    const [llmStrength, setLlmStrength] = useState(5);
    const [detailLevel, setDetailLevel] = useState(1); 

    const [manualSelectedPdfIds, setManualSelectedPdfIds] = useState<string[]>([]);
    
    // ─────────────────────────────────────────────────────────
    // STATE: Chat & Interaction
    // ─────────────────────────────────────────────────────────
    const [question, setQuestion] = useState("");
    const [history, setHistory] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
    const [pendingCategory, setPendingCategory] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [countdown, setCountdown] = useState(3);

    const [selectedAnswer, setSelectedAnswer] = useState<AnswerData | null>(null);
    const [isDocsCollapsed, setIsDocsCollapsed] = useState(false);
    const [showFilters, setShowFilters] = useState(true);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const yearDropdownRef = useRef<HTMLDivElement>(null);

    // ─────────────────────────────────────────────────────────
    // 1. INITIAL INVESTOR LOAD
    // ─────────────────────────────────────────────────────────
        useEffect(() => {
            const loadInvestors = async () => {
                try {
                    const invData = await fetchInvestors();
                    const investors = invData.investors || [];
                    setAllInvestors(investors);

                    if (investors.length > 0) {
                        setInvestor1(investors[0].id);
                        if (investors[1]) setInvestor2(investors[1].id);
                    }
                } catch (err) {
                    console.error("Failed to load investors", err);
                }
            };
            loadInvestors();
        }, []);

    // ─────────────────────────────────────────────────────────
    // 2. REFRESH DOCUMENTS ON INVESTOR CHANGE
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
        const refreshDocs = async () => {
        if (!investor1 && !investor2) return;
    
        try {
            const investorsToFetch = [investor1, investor2].filter(Boolean);
    
            const results = await Promise.all(
            investorsToFetch.map(invId => fetchInvestorFilters(invId))
            );
    
            const mergedDocs: DocItem[] = results.flatMap((data, idx) => {
            const invId = investorsToFetch[idx];
            const invName = allInvestors.find(i => i.id === invId)?.name;
    
            return data.all_docs.map((doc: any) => ({
                pdf_id: doc.id,
                name: doc.name,
                investor_id: invId,
                investor_name: invName,
                category: doc.category || "General",
                year: doc.year || "",
                is_emea: doc.is_emea
            }));
            });
    
            setAllDocs(mergedDocs);
    
            const years = Array.from(
            new Set(results.flatMap(r => (r.years || []).map(String)))
            );
            setYearList(years);
    
            setSelectedCategories([]);
            setSelectedYears([]);
            setManualSelectedPdfIds([]);
        } catch (e) {
            console.error("Failed to refresh investor documents", e);
        }
        };
    
        refreshDocs();
    }, [investor1, investor2, allInvestors]);
    

    // ─────────────────────────────────────────────────────────
    // 3. AUTO-SELECT TIMER LOGIC
    // ─────────────────────────────────────────────────────────
        useEffect(() => {
            let timer: ReturnType<typeof setTimeout>;
            if (isVerifying && countdown > 0) {
                timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            } else if (isVerifying && countdown === 0) {
                if (pendingQuestion && pendingCategory) {
                    executeCompare(pendingQuestion, [pendingCategory]);
                }
            }
            return () => clearTimeout(timer);
        }, [isVerifying, countdown, pendingQuestion, pendingCategory]);

    // ─────────────────────────────────────────────────────────
    // 4. SCROLL TO BOTTOM (MIRRORING QA PAGE LOGIC)
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
        const container = messagesEndRef.current?.parentElement;
        if (container) container.scrollTop = 0;
    }, [history, loading]);


    // ─────────────────────────────────────────────────────────
    // 5. FILTER LOGIC
    // ─────────────────────────────────────────────────────────
    const { availableYears, availableCategories, filteredDocs, docsFoundForInv1, docsFoundForInv2 } = useMemo(() => {
        let docs = allDocs;
        
        if (!includeEmea) {
            docs = docs.filter(d => !d.is_emea); 
        }

        const years = Array.from(new Set(docs.map(d => String(d.year || "")).filter(Boolean))).sort().reverse();
        const cats = new Set<string>();
        docs.forEach(d => {
            if (d.category) {
                d.category.split(',').forEach(c => cats.add(c.trim()));
            }
        });
        const categories = Array.from(cats).sort();

        let processedDocs = docs;

        if (selectedYears.length > 0) {
            processedDocs = processedDocs.filter(d => selectedYears.includes(String(d.year)));
        }

        if (selectedCategories.length > 0) {
            processedDocs = processedDocs.filter(d => {
                const docCats = (d.category || "").split(',').map(c => c.trim());
                return selectedCategories.some(cat => docCats.includes(cat));
            });
        }

        const docsFoundForInv1 = investor1 ? processedDocs.some(d => d.investor_id === investor1) : false;
        const docsFoundForInv2 = investor2 ? processedDocs.some(d => d.investor_id === investor2) : false;

        const gridDocs = processedDocs.filter(d => [investor1, investor2].includes(d.investor_id));

        return { 
            availableYears: years, 
            availableCategories: categories, 
            filteredDocs: gridDocs,
            docsFoundForInv1,
            docsFoundForInv2
        };
    }, [allDocs, investor1, investor2, includeEmea, selectedYears, selectedCategories]);

    // CLICK OUTSIDE HANDLERS
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
        if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
            setIsYearDropdownOpen(false);
        }
        if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
            setIsCategoryDropdownOpen(false);
        }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ─────────────────────────────────────────────────────────
    // HANDLERS
    // ─────────────────────────────────────────────────────────
    const getStrengthLabel = (val: number) => {
        switch(val) {
            case 0: return "Factual";
            case 4: return "Balanced";
            case 8: return "Creative";
            default: return "Balanced";
        }
    };
    
    const getStrengthDescription = (strength: number): string => {
        if (strength <= 2) {
          return 'Focused, factual responses';
        } else if (strength > 2 && strength <= 6) {
          return 'Mix of accuracy and creativity';
        } else {
          return 'Imaginative, diverse outputs';
        }
      };


    const getDetailLabel = (val: number) => {
        switch(val) {
            case 0: return "Brief";
            case 1: return "Balanced";
            case 2: return "Detailed";
            default: return "Balanced";
        }
    };

    const getDetailDescription = (val: number): string => {
        switch(val) {
            case 0: return 'Quick, high-level overview';
            case 1: return 'Moderate detail level';
            case 2: return 'In-depth analysis';
            default: return '';
        }
    };

    const togglePdf = (id: string) => {
        setManualSelectedPdfIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            
            // Allow up to 2 documents, one from each investor
            if (prev.length >= 2) return prev;
            
            // Check if we already have a document from this investor
            const clickedDoc = allDocs.find(d => d.pdf_id === id);
            if (!clickedDoc) return prev;
            
            const alreadySelectedFromSameInvestor = prev.some(pdfId => {
                const doc = allDocs.find(d => d.pdf_id === pdfId);
                return doc && doc.investor_id === clickedDoc.investor_id;
            });
            
            if (alreadySelectedFromSameInvestor) {
                // Replace the existing selection from this investor
                return prev.map(pdfId => {
                    const doc = allDocs.find(d => d.pdf_id === pdfId);
                    if (doc && doc.investor_id === clickedDoc.investor_id) {
                        return id;
                    }
                    return pdfId;
                });
            }
            
            return [...prev, id];
        });
    };

    const toggleYearSelection = (year: string) => {
        setSelectedYears(prev => 
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        );
    };

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    // ─────────────────────────────────────────────────────────
    // EXECUTE COMPARISON
    // ─────────────────────────────────────────────────────────
    const executeCompare = async (q: string, cats: string[] | null) => {
        setIsVerifying(false);
        setCountdown(3); 
        setPendingQuestion(null);
        setPendingCategory(null);
        
        const activeCategories = cats || selectedCategories;

        setLoading(true);
        
        // Add user question to history (bottom)
        setHistory(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: q }]);
        // Question stays in input box - user can manually clear with Trash button

        const payload: any = {
            question: q,
            llm_strength: llmStrength,
            detail_level: getDetailLabel(detailLevel),
            mode: mode,
            category: (activeCategories && activeCategories.length > 0) ? activeCategories : null,
            years: selectedYears.length > 0 ? selectedYears.map(Number) : null,
            include_emea: includeEmea
        };

        if (mode === "auto") {
            payload.investor_ids = [investor1, investor2].filter(Boolean);
        } else {
            payload.pdf_ids = manualSelectedPdfIds;
        }

        try {
            const response = await fetch(`${AI_CHATBOT_API_BASE}/compare-pdfs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            const data = await response.json();
            const rawResults = data.results || [];
            
            const answers: AnswerData[] = rawResults.map((item: any, idx: number) => {
                const originalDoc = allDocs.find(d => d.pdf_id === item.pdf_id);
                let invName = "Unknown";
                if (item.investor_id) {
                invName = allInvestors.find(i => i.id === item.investor_id)?.name || "Unknown";
                } else if (originalDoc?.investor_name) {
                invName = originalDoc.investor_name;
                }

                return {
                    rank: idx + 1,
                    pdf_id: item.pdf_id,
                    pdf_name: item.pdf_name,
                    investor_name: invName,
                    file_url: item.file_url,
                    best_page: item.best_page,
                    pages_used: item.best_page ? [item.best_page] : (item.pages_used || []),
                    answer: item.answer,
                };
            });

            if (answers.length === 0) {
                setHistory(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", error: true, content: data.message || "No relevant documents found." }]);
            } else {
                setHistory(prev => [...prev, { 
                    id: crypto.randomUUID(),
                    role: "assistant", 
                    answers, 
                    comparison: data.comparison 
                }]);
            }
        } catch (error) {
            console.error("Comparison failed", error);
            setHistory(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", error: true }]);
        } finally {
            setLoading(false);
            setSelectedCategories([]); 
        }
    };

    // ─────────────────────────────────────────────────────────
    // HANDLE ASK
    // ─────────────────────────────────────────────────────────
    const handleAsk = async () => {
        const q = question.trim();
        if (!q) return;

        if (mode === "auto") {
            if (!investor1 || !investor2) return alert("Please select both investors.");
            if (!docsFoundForInv1 || !docsFoundForInv2) return alert("Adjust filters - documents missing for selected scope.");
        } else {
            if (manualSelectedPdfIds.length !== 2) return alert("Please select exactly 2 documents.");
            
            // Validate one document from each investor
            const selectedDocs = allDocs.filter(doc => manualSelectedPdfIds.includes(doc.pdf_id));
            const investorIds = new Set(selectedDocs.map(doc => doc.investor_id));
            
            if (investorIds.size !== 2) {
                return alert("Please select one document from each investor.");
            }
        }

        if (selectedCategories.length > 0) {
            executeCompare(q, selectedCategories);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${AI_CHATBOT_API_BASE}/predict-category`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q, investor_id: investor1 }),
            });
            const data = await res.json();
            setLoading(false);

            if (data.detected_category) {
                setPendingQuestion(q);
                setPendingCategory(data.detected_category);
                setCountdown(3);
                setIsVerifying(true);
            } else {
                executeCompare(q, null);
            }
        } catch (e) {
            setLoading(false);
            executeCompare(q, null);
        }
    };

    const isReady = useMemo(() => {
        if (loading) return false;
        if (mode === "specific") {
            if (manualSelectedPdfIds.length !== 2) return false;
            
            // Check that we have one document from each investor
            const selectedDocs = allDocs.filter(doc => manualSelectedPdfIds.includes(doc.pdf_id));
            const investorIds = new Set(selectedDocs.map(doc => doc.investor_id));
            
            return investorIds.size === 2;
        }
        return investor1 && investor2 && docsFoundForInv1 && docsFoundForInv2;
    }, [loading, mode, manualSelectedPdfIds, investor1, investor2, docsFoundForInv1, docsFoundForInv2, allDocs]);

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] relative">
        
        {/* 1. CATEGORY VERIFICATION MODAL */}
        {isVerifying && pendingCategory && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] animate-in zoom-in-95 fade-in duration-200">
                <div className="bg-white border border-[#931638]/50 shadow-2xl rounded-2xl p-6 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#931638]/10 blur-3xl rounded-full pointer-events-none" />
                    <div className="flex items-start gap-4">
                        <div className="bg-[#931638]/20 p-3 rounded-full shrink-0 border border-[#931638]/20">
                            <Tag className="text-[#931638]" size={24} />
                        </div>
                        <div>
                            <h3 className="text-black font-semibold text-lg">Category Detected</h3>
                            <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                                It looks like your question is about <span className="text-[#931638] font-bold bg-[#931638]/30 px-1.5 py-0.5 rounded">{pendingCategory}</span>.<br/>
                                Filter results by this category?
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6 justify-end">
                        <button 
                            onClick={() => { setIsVerifying(false); setCountdown(3); setIsCategoryDropdownOpen(true); }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-200 transition-colors"
                        >
                            No, let me pick
                        </button>
                        <button 
                            onClick={() => {
                                if (pendingQuestion && pendingCategory) {
                                    executeCompare(pendingQuestion, [pendingCategory]);
                                }
                            }}
                            className="relative px-4 py-2 rounded-lg text-sm font-medium bg-[#931638] hover:bg-[#931638]/90 text-black shadow-lg transition-all flex items-center gap-2 overflow-hidden"
                        >
                            <div 
                            className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-1000 ease-linear"
                            style={{ width: `${(countdown / 3) * 100}%` }}
                            />
                            <Check size={16} /> 
                            <span>Yes, Compare ({countdown}s)</span>
                        </button>
                    </div>
                </div>
                <div className="fixed inset-0 bg-white/60 backdrop-blur-sm -z-10" onClick={() => { setIsVerifying(false); setCountdown(3); }}/>
            </div>
        )}

        {/* 2. ANSWER DETAIL MODAL */}
        {selectedAnswer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white border border-[#931638]/50 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    
                    <div className="px-6 py-4 border-b border-[#931638]/50 flex justify-between items-start bg-gray-50">
                        <div className="flex flex-col gap-1.5">
                            <a 
                                href={getPdfLink(selectedAnswer.file_url, selectedAnswer.best_page || 1, selectedAnswer.pdf_name)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-lg font-semibold text-[#931638] hover:text-[#931638]/70 hover:underline flex items-center gap-2 transition-colors"
                                title="Open Original PDF"
                            >
                                {selectedAnswer.pdf_name}
                                <Maximize2 size={14} className="opacity-50" />
                            </a>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="text-[#931638] font-medium">{selectedAnswer.investor_name}</span>
                            </div>
                        </div>
                        <button onClick={() => setSelectedAnswer(null)} className="text-gray-500 hover:text-black p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{selectedAnswer.answer}</ReactMarkdown>
                        </div>

                        {selectedAnswer.pages_used && selectedAnswer.pages_used.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="text-xs text-gray-500 font-medium">Pages Referenced:</span>
                                {selectedAnswer.pages_used.map((pg, i) => (
                                    <a 
                                        key={i} 
                                        href={getPdfLink(selectedAnswer.file_url, pg, selectedAnswer.pdf_name)} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs text-gray-700 hover:text-black transition-colors"
                                    >
                                        {pg}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* 3. CONTROLS SECTION */}
        <div className={`space-y-4 relative z-20 ${showFilters ? 'mb-4' : 'mb-6'}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                    {/* Eye/EyeOff Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="p-2 bg-white border-2 border-[#931638]/50 rounded-lg hover:bg-gray-50 transition-all shrink-0"
                        title={showFilters ? "Hide filter controls" : "Show filter controls"}
                    >
                        {showFilters ? (
                            <Eye size={16} className="text-[#931638]" />
                        ) : (
                            <EyeOff size={16} className="text-gray-400" />
                        )}
                    </button>

                    {showFilters && (
                    <>
                    {/* Mode Tabs */}
                    <div className="bg-gray-50 border border-[#931638]/50 rounded-lg p-1 flex gap-1">
                        <button 
                            onClick={() => setMode("auto")} 
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${mode === "auto" ? "bg-[#931638] text-white shadow-lg" : "text-gray-500 hover:text-black hover:bg-white"}`}
                        >
                            <Sparkles size={12} /> Auto
                        </button>
                        <button 
                            onClick={() => setMode("specific")} 
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${mode === "specific" ? "bg-[#931638] text-white shadow-lg" : "text-gray-500 hover:text-black hover:bg-white"}`}
                        >
                            <ListFilter size={12} /> Specific
                        </button>
                    </div>

                    {/* Investor Selection */}
                    <select 
                        value={investor1} 
                        onChange={(e) => setInvestor1(e.target.value)} 
                        className="h-[34px] bg-gray-50 border border-[#931638]/50 rounded-lg px-2 text-xs text-black cursor-pointer focus:border-[#931638] focus:outline-none w-[250px]"
                    >
                        <option value="">Investor 1</option>
                        {allInvestors.map(inv => (
                            <option key={inv.id} value={inv.id} disabled={inv.id === investor2}>
                                {inv.name}
                            </option>
                        ))}
                    </select>

                    <span className="text-gray-400 text-xs font-bold">VS</span>

                    <select 
                        value={investor2} 
                        onChange={(e) => setInvestor2(e.target.value)} 
                        className="h-[34px] bg-gray-50 border border-[#931638]/50 rounded-lg px-2 text-xs text-black cursor-pointer focus:border-[#931638] focus:outline-none w-[250px]"
                    >
                        <option value="">Investor 2</option>
                        {allInvestors.map(inv => (
                            <option key={inv.id} value={inv.id} disabled={inv.id === investor1}>
                                {inv.name}
                            </option>
                        ))}
                    </select>

                    {/* Category Multi-Select Dropdown */}
                    <div className="relative" ref={categoryDropdownRef}>
                        <button 
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} 
                            className="relative flex items-center justify-between h-[34px] pl-7 pr-2 bg-gray-50 border border-[#931638]/50 rounded-lg text-xs transition-all w-[100px]"
                        >
                            <span className="truncate">
                                {selectedCategories.length === 0 ? "Category" : `${selectedCategories.length} Selected`}
                            </span>
                            <ChevronDown size={10} className={`ml-1 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <Layers size={10} className="absolute left-2 top-3 text-gray-500" />

                        {isCategoryDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 max-h-60 overflow-y-auto custom-scrollbar bg-white border border-[#931638]/50 rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95">
                                {availableCategories.length === 0 ? (
                                    <div className="p-3 text-xs text-gray-500 italic">No categories available</div>
                                ) : availableCategories.map((cat) => {
                                    const isSelected = selectedCategories.includes(cat);
                                    return (
                                        <div 
                                            key={cat} 
                                            onClick={() => toggleCategory(cat)} 
                                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-[#931638]/10' : 'hover:bg-gray-100'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#931638] border-[#931638]' : 'border-gray-400'}`}>
                                                {isSelected && <Check size={10} className="text-white" />}
                                            </div>
                                            <span className={`text-xs ${isSelected ? 'text-[#931638] font-medium' : 'text-gray-700'}`}>{cat}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Year Multi-Select Dropdown */}
                    <div className="relative">
                        <div className="relative" ref={yearDropdownRef}>
                            <button 
                                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} 
                                className="relative flex items-center justify-between h-[34px] pl-7 pr-2 bg-gray-50 border border-[#931638]/50 rounded-lg text-xs hover:border-[#931638] transition-all w-[90px]"
                            >
                                <span className="truncate max-w-[70px] text-black">
                                    {selectedYears.length === 0 ? "Year" : `${selectedYears.length} Selected`}
                                </span>
                                <ChevronDown size={10} className={`ml-1 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <Calendar size={10} className="absolute left-2 top-3 text-gray-500" />

                            {isYearDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-48 max-h-60 overflow-y-auto custom-scrollbar bg-white border border-[#931638]/50 rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95">
                                    {availableYears.length === 0 ? (
                                        <div className="p-3 text-xs text-gray-500 italic">No years available</div>
                                    ) : availableYears.map((y) => {
                                        const isSelected = selectedYears.includes(y);
                                        return (
                                            <div 
                                                key={y} 
                                                onClick={() => toggleYearSelection(y)} 
                                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-[#931638]/10 hover:bg-[#931638]/20' : 'hover:bg-gray-100'}`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#931638] border-[#931638]' : 'border-gray-400'}`}>
                                                    {isSelected && <Check size={10} className="text-white" />}
                                                </div>
                                                <span className={`text-xs ${isSelected ? 'text-[#931638] font-medium' : 'text-gray-700'}`}>{y}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* EMEA Toggle */}
                    <button 
                        onClick={() => setIncludeEmea(!includeEmea)}
                        className="flex items-center gap-1.5 h-[34px] px-2 bg-gray-100 border border-[#931638]/50 rounded-lg cursor-pointer group hover:border-[#931638] transition-all"
                    >
                        <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${includeEmea ? "bg-[#931638]" : "bg-gray-400"}`}>
                            <div className={`w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${includeEmea ? "translate-x-3.5" : "translate-x-0"}`} />
                        </div>
                        <span className={`text-[10px] font-medium transition-colors ${includeEmea ? "text-[#931638]" : "text-gray-600"}`}>EMEA</span>
                    </button>
                    </>
                    )}

                    {/* INPUT AREA - Shows next to Eye button when filters are hidden */}
                    {!showFilters && (
                        <div className="flex-1 bg-white border-2 border-[#931638] rounded-xl flex items-center p-2 shadow-xl">
                            <input 
                                value={question} 
                                onChange={(e) => setQuestion(e.target.value)} 
                                onKeyDown={(e) => e.key === "Enter" && handleAsk()} 
                                placeholder={isReady ? "Ask to compare..." : "Select investors/filters..."} 
                                className="flex-1 bg-transparent border-none outline-none text-black px-2 text-sm" 
                            />
                            <button 
                                onClick={() => setQuestion("")} 
                                className="text-gray-400 hover:text-[#931638] p-2 rounded-lg hover:bg-gray-100 transition-colors mr-1"
                                title="Clear question"
                            >
                                <Trash2 size={16}/>
                            </button>
                            <button 
                                onClick={handleAsk} 
                                disabled={!isReady} 
                                className="bg-[#931638] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#931638]/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <span className="animate-spin">⏳</span> : <Send size={14}/>} 
                                {loading ? "Thinking..." : "Compare"}
                            </button>
                        </div>
                    )}
                </div>


            </div>
            {/* Compare + Answer row */}
            {showFilters && (
  <div className="flex items-center justify-between w-full pt-1">

    {/* LEFT — Compare type */}
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium">Compare type:</span>
        <div className="relative group flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" 
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
            className="text-gray-400 group-hover:text-gray-700 cursor-help transition-colors"
          >
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          
          {/* Instant Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-75 z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl border border-white/10">
              {getDetailDescription(detailLevel)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      </div>
      <span className="text-[10px] uppercase font-bold text-gray-600 w-16 text-center">
        {getDetailLabel(detailLevel)}
      </span>
      <input
        type="range" min="0" max="2" step="1"
        value={detailLevel}
        onChange={(e) => setDetailLevel(Number(e.target.value))}
        className="w-24 h-1.5 bg-gray-300 rounded-full appearance-none cursor-pointer accent-[#931638] hover:opacity-80 transition-opacity"
      />
    </div>

    {/* RIGHT — Answer type */}
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium">Answer type:</span>
        <div className="relative group flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" 
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
            className="text-gray-400 group-hover:text-gray-700 cursor-help transition-colors"
          >
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>

          {/* Instant Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-75 z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl border border-white/10">
              {getStrengthDescription(llmStrength)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      </div>
      <span className="text-[10px] uppercase font-bold text-gray-600 w-16 text-center">
        {getStrengthLabel(llmStrength)}
      </span>
      <input
        type="range" min="0" max="8" step="4"
        value={llmStrength}
        onChange={(e) => setLlmStrength(Number(e.target.value))}
        className="w-24 h-1.5 bg-gray-300 rounded-full appearance-none cursor-pointer accent-[#931638] hover:opacity-80 transition-opacity"
      />
    </div>
  </div>
)}


            {/* --- SELECTED FILTERS TAGS --- */}
            {showFilters && (selectedCategories.length > 0 || selectedYears.length > 0) && (
                <div className="flex flex-wrap gap-2 -mt-2">
                    {selectedCategories.map(cat => (
                        <div key={cat} className="flex items-center gap-1 bg-[#931638]/10 text-[#931638] border border-[#931638]/60 px-2 py-0.5 rounded text-[10px] animate-in fade-in">
                            <span>{cat}</span>
                            <button onClick={() => toggleCategory(cat)} className="hover:text-[#931638]"><X size={10} /></button>
                        </div>
                    ))}
                    {selectedYears.map(y => (
                        <div key={y} className="flex items-center gap-1 bg-gray-200 text-gray-700 border border-gray-400 px-2 py-0.5 rounded text-[10px] animate-in fade-in">
                            <span>{y}</span>
                            <button onClick={() => toggleYearSelection(y)} className="hover:text-black"><X size={10} /></button>
                        </div>
                    ))}
                </div>
            )}

            {/* Manual Document Selection Grid */}
            {showFilters && mode === "specific" && (
                <div className="animate-in slide-in-from-top-2 duration-300 bg-gray-50 p-3 rounded-lg border-2 border-[#931638]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                            <Grid size={14} /> Available Docs ({filteredDocs.length})
                        </h3>
                        <button 
                            onClick={() => setIsDocsCollapsed(!isDocsCollapsed)}
                            className="text-[#931638] hover:bg-[#931638]/10 p-1.5 rounded-lg transition-colors"
                            title={isDocsCollapsed ? "Expand" : "Collapse"}
                        >
                            <ChevronDown 
                                size={16} 
                                className={`transition-transform duration-200 ${isDocsCollapsed ? '-rotate-90' : ''}`}
                            />
                        </button>
                    </div>
                    {!isDocsCollapsed && (
                        <div className="flex gap-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {(() => {
                            // Group documents by investor
                            const grouped: { [investorId: string]: { name: string; docs: typeof filteredDocs } } = {};
                            filteredDocs.forEach(doc => {
                                if (!grouped[doc.investor_id]) {
                                    grouped[doc.investor_id] = { name: doc.investor_name || "Unknown", docs: [] };
                                }
                                grouped[doc.investor_id].docs.push(doc);
                            });
                            
                            return Object.entries(grouped).map(([investorId, group], idx) => (
                                <div key={investorId} className="flex gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-[#931638] mb-2">{group.name}</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {group.docs.map(doc => {
                                                const isSelected = manualSelectedPdfIds.includes(doc.pdf_id);
                                                return (
                                                    <div 
                                                        key={doc.pdf_id} 
                                                        onClick={() => togglePdf(doc.pdf_id)} 
                                                        className={`group p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${isSelected ? 'bg-[#931638]/10 border-[#931638]' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
                                                    >
                                                        <div className="flex justify-between items-start gap-2">
                                                            <span className={`text-xs font-medium line-clamp-2 ${isSelected ? 'text-[#931638]' : 'text-gray-700'}`}>
                                                                {doc.name}
                                                            </span>
                                                            <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${isSelected ? 'bg-[#931638] border-[#931638]' : 'border-gray-400'}`}>
                                                                {isSelected && <Check size={10} className="text-white" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {idx < Object.keys(grouped).length - 1 && (
                                        <div className="w-px bg-[#931638]"></div>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>
                    )}
                </div>
            )}
        </div>

        {/* 4. INPUT AREA - Shows below controls when filters are visible */}
        {showFilters && (
        <div className="bg-white border-2 border-[#931638] rounded-xl flex items-center p-2 shadow-xl mb-6 z-10 relative">
            <input 
                value={question} 
                onChange={(e) => setQuestion(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && handleAsk()} 
                placeholder={isReady ? "Ask to compare..." : "Select investors/filters..."} 
                className="flex-1 bg-transparent border-none outline-none text-black px-2 text-sm" 
            />
            <button 
                onClick={() => setQuestion("")} 
                className="text-gray-400 hover:text-[#931638] p-2 rounded-lg hover:bg-gray-100 transition-colors mr-1"
                title="Clear question"
            >
                <Trash2 size={16}/>
            </button>
            <button 
                onClick={handleAsk} 
                disabled={!isReady} 
                className="bg-[#931638] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#931638]/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <span className="animate-spin">⏳</span> : <Send size={14}/>} 
                {loading ? "Thinking..." : "Compare"}
            </button>
        </div>
        )}

        {/* 5. RESULTS HISTORY - LATEST Q&A PAIR ON TOP (Q3-A3, Q2-A2, Q1-A1) */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-4 pb-4 custom-scrollbar">
            {history.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                    <Bot size={48} strokeWidth={1} />
                    <p className="text-sm font-light">Select two investors and ask a question to compare.</p>
                </div>
            )}

            {(() => {
            // Group messages into Q&A pairs
            const pairs: Array<{question: Message, answer?: Message}> = [];
            for (let i = 0; i < history.length; i++) {
                if (history[i].role === "user") {
                pairs.push({
                    question: history[i],
                    answer: history[i + 1]?.role === "assistant" ? history[i + 1] : undefined
                });
                }
            }
            
            // Reverse to show newest first (Q3-A3, Q2-A2, Q1-A1)
            return pairs.reverse().map((pair, pairIdx) => (
                <div key={pair.question.id} className="space-y-3">
                    
                    {/* QUESTION */}
                    <div className="flex gap-4 flex-row-reverse animate-in slide-in-from-right-2">
                        <div className="w-8 h-8 rounded-full bg-[#931638] flex items-center justify-center shrink-0">
                            <User size={14} className="text-white" />
                        </div>
                        <div className="bg-[#931638] text-white p-3 rounded-2xl rounded-tr-sm text-sm max-w-[90%] shadow-lg">
                            {pair.question.content}
                        </div>
                    </div>
                    
                    {/* LOADING INDICATOR - Show only for the newest question without an answer */}
                    {!pair.answer && pairIdx === 0 && loading && !isVerifying && (
                        <div className="flex gap-4 items-center ml-1">
                            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex items-center justify-center shrink-0">
                                <Bot size={14} className="text-gray-400" />
                            </div>
                            <div className="text-xs text-gray-500 animate-pulse">Analyzing and Comparing...</div>
                        </div>
                    )}
                    
                    {/* ANSWER */}
                    {pair.answer && (
                        <div className="flex gap-4 animate-in slide-in-from-left-2">
                            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center shrink-0">
                                <Bot size={14} className="text-white" />
                            </div>

                            <div className="flex flex-col gap-3 max-w-[90%] w-full">
                                {pair.answer.error && (
                                    <div className="text-[#931638]/80 text-sm flex items-center gap-2 bg-[#931638]/10 p-3 rounded-lg border border-[#931638]/20">
                                        <AlertCircle size={16} />
                                        {pair.answer.content || "Something went wrong."}
                                    </div>
                                )}

                                {!pair.answer.error && pair.answer.answers && (
                                    <>
                                        {/* Answer Cards in Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {pair.answer.answers.map((ans, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setSelectedAnswer(ans)}
                                                    className="group bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl overflow-hidden cursor-pointer transition-all"
                                                >
                                                    <div className="p-4">
                                                        <div className="flex items-start justify-between gap-3 mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-[#931638]">#{ans.rank}</span>
                                                                <h4 className="text-sm font-semibold text-black">{ans.investor_name}</h4>
                                                            </div>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 mb-2 truncate">{ans.pdf_name}</p>
                                                        <div className="text-xs text-gray-700 line-clamp-4 prose prose-sm">
                                                            <ReactMarkdown>{ans.answer}</ReactMarkdown>
                                                        </div>
                                                        {ans.pages_used && ans.pages_used.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {ans.pages_used.slice(0, 3).map((pg, i) => (
                                                                    <span key={i} className="bg-[#931638] text-white px-1.5 py-0.5 rounded text-[10px]">
                                                                        p.{pg}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Comparison Summary - Always Visible */}
                                        {pair.answer.comparison && (
                                            <div className="relative group mt-3">
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#931638]/20 to-[#931638]/20 rounded-2xl blur opacity-75"></div>
                                                <div className="relative bg-white border border-[#931638]/20 rounded-xl p-5 shadow-2xl">
                                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-300">
                                                        <GitCompare size={16} className="text-[#931638]" />
                                                        <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                                                            AI Comparison Summary
                                                        </h3>
                                                    </div>
                                                    <div className="text-sm text-gray-700 leading-relaxed prose max-w-none">
                                                        <ReactMarkdown>{pair.answer.comparison}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ));
            })()}
            <div ref={messagesEndRef} className="h-4" />
        </div>
        </div>
    );
    }