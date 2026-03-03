import { useState, useEffect, useRef, useMemo } from "react";
    import { 
    Send, Layers, FileSearch, X, Tag, Maximize2, ChevronDown, Check, Calendar, 
    AlertCircle, GitCompare, Sparkles, ListFilter, Grid, Settings, Eye, EyeOff, Info, Trash2
    } from "lucide-react";
    import { AI_CHATBOT_API_BASE , fetchDocuments, fetchInvestors, fetchInvestorFilters } from "./api"; 
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
    answer_segments: { page: number | null; text: string; page_url: string }[];
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
    const [llmStrength, setLlmStrength] = useState(0);
    const [detailLevel, setDetailLevel] = useState(0); 

    const [manualSelectedPdfIds, setManualSelectedPdfIds] = useState<string[]>([]);
    const [selectionError, setSelectionError] = useState<string>("");
    
    // ─────────────────────────────────────────────────────────
    // STATE: Chat & Interaction
    // ─────────────────────────────────────────────────────────
    const [question, setQuestion] = useState("");
    const [history, setHistory] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
    const [pendingCategory, setPendingCategory] = useState<string | null>(null);
    const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
    const [activeLoadingCategory, setActiveLoadingCategory] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [countdown, setCountdown] = useState(5);

    const [selectedAnswer, setSelectedAnswer] = useState<AnswerData | null>(null);
    const [isDocsCollapsed, setIsDocsCollapsed] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    const [isDocPanelCollapsed, setIsDocPanelCollapsed] = useState(false);

    // Investor Search State
    const [investor1Search, setInvestor1Search] = useState("");
    const [investor2Search, setInvestor2Search] = useState("");
    const [isInvestor1DropdownOpen, setIsInvestor1DropdownOpen] = useState(false);
    const [isInvestor2DropdownOpen, setIsInvestor2DropdownOpen] = useState(false);

    // Document Dropdown State
    const [isDoc1DropdownOpen, setIsDoc1DropdownOpen] = useState(false);
    const [isDoc2DropdownOpen, setIsDoc2DropdownOpen] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const yearDropdownRef = useRef<HTMLDivElement>(null);
    const investor1DropdownRef = useRef<HTMLDivElement>(null);
    const investor2DropdownRef = useRef<HTMLDivElement>(null);
    const doc1DropdownRef = useRef<HTMLDivElement>(null);
    const doc2DropdownRef = useRef<HTMLDivElement>(null);

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
            
            // Auto-select the latest year — DISABLED
            // if (years.length > 0) {
            //     const latestYear = Math.max(...years.map(Number));
            //     setSelectedYears([latestYear.toString()]);
            // } else {
            //     setSelectedYears([]);
            // }
            
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
        
        // Get categories based on selected investors
        let categories: string[];
        if (investor1 && investor2) {
            // Both investors selected - show only common categories
            const inv1Docs = docs.filter(d => d.investor_id === investor1);
            const inv2Docs = docs.filter(d => d.investor_id === investor2);
            
            const inv1Cats = new Set<string>();
            inv1Docs.forEach(d => {
                if (d.category) {
                    d.category.split(',').forEach(c => inv1Cats.add(c.trim()));
                }
            });
            
            const inv2Cats = new Set<string>();
            inv2Docs.forEach(d => {
                if (d.category) {
                    d.category.split(',').forEach(c => inv2Cats.add(c.trim()));
                }
            });
            
            // Only keep categories that exist in both investors' documents
            categories = Array.from(inv1Cats).filter(cat => inv2Cats.has(cat)).sort();
        } else {
            // One or no investor selected - show all categories
            const cats = new Set<string>();
            docs.forEach(d => {
                if (d.category) {
                    d.category.split(',').forEach(c => cats.add(c.trim()));
                }
            });
            categories = Array.from(cats).sort();
        }

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

        const gridDocs = processedDocs
            .filter(d => [investor1, investor2].includes(d.investor_id))
            // Sort by year (most recent first)
            .sort((a, b) => {
                const yearA = Number(a.year) || 0;
                const yearB = Number(b.year) || 0;
                return yearB - yearA; // Descending order (newest first)
            });

        return { 
            availableYears: years, 
            availableCategories: categories, 
            filteredDocs: gridDocs,
            docsFoundForInv1,
            docsFoundForInv2
        };
    }, [allDocs, investor1, investor2, includeEmea, selectedYears, selectedCategories]);

    // Filtered investors for search
    const filteredInvestors1 = useMemo(() => {
        if (!investor1Search.trim()) return allInvestors;
        return allInvestors.filter(inv => 
            inv.name.toLowerCase().includes(investor1Search.toLowerCase())
        );
    }, [allInvestors, investor1Search]);

    const filteredInvestors2 = useMemo(() => {
        if (!investor2Search.trim()) return allInvestors;
        return allInvestors.filter(inv => 
            inv.name.toLowerCase().includes(investor2Search.toLowerCase())
        );
    }, [allInvestors, investor2Search]);

    // Clear selected categories that are no longer available when investors change
    useEffect(() => {
        if (selectedCategories.length > 0) {
            const validCategories = selectedCategories.filter(cat => 
                availableCategories.includes(cat)
            );
            if (validCategories.length !== selectedCategories.length) {
                setSelectedCategories(validCategories);
            }
        }
    }, [availableCategories]);

    // CLICK OUTSIDE HANDLERS
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
        if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
            setIsYearDropdownOpen(false);
        }
        if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
            setIsCategoryDropdownOpen(false);
        }
        if (investor1DropdownRef.current && !investor1DropdownRef.current.contains(event.target as Node)) {
            setIsInvestor1DropdownOpen(false);
        }
        if (investor2DropdownRef.current && !investor2DropdownRef.current.contains(event.target as Node)) {
            setIsInvestor2DropdownOpen(false);
        }
        if (doc1DropdownRef.current && !doc1DropdownRef.current.contains(event.target as Node)) {
            setIsDoc1DropdownOpen(false);
        }
        if (doc2DropdownRef.current && !doc2DropdownRef.current.contains(event.target as Node)) {
            setIsDoc2DropdownOpen(false);
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
            if (prev.includes(id)) {
                // Deselecting - always allowed, clear any error
                setSelectionError("");
                return prev.filter(x => x !== id);
            }
            
            // Selecting - check limits
            
            // Check total document limit (max 3)
            if (prev.length >= 3) {
                setSelectionError("Only 3 documents can be selected");
                setTimeout(() => setSelectionError(""), 3000); // Clear after 3 seconds
                return prev;
            }
            
            // Check per-investor limit (max 2 from same investor)
            const selectedDoc = allDocs.find(doc => doc.pdf_id === id);
            if (selectedDoc) {
                const sameInvestorCount = prev.filter(pdfId => {
                    const doc = allDocs.find(d => d.pdf_id === pdfId);
                    return doc && doc.investor_id === selectedDoc.investor_id;
                }).length;
                
                if (sameInvestorCount >= 2) {
                    setSelectionError(`Only 2 documents allowed per investor (${selectedDoc.investor_name || 'this investor'})`);
                    setTimeout(() => setSelectionError(""), 3000); // Clear after 3 seconds
                    return prev;
                }
            }
            
            // Clear error on successful selection
            setSelectionError("");
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
        setCountdown(5); 
        setPendingQuestion(null);
        setPendingCategory(null);
        
        const activeCategories = cats || selectedCategories;
        const catUsed = (activeCategories && activeCategories.length > 0) ? activeCategories[0] : null;
        setActiveLoadingCategory(catUsed);

        setLoading(true);
        
        // Add user question to history when request actually fires
        setHistory(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: q }]);

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
            const response = await fetch(`${AI_CHATBOT_API_BASE }/compare-pdfs`, {
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
                    answer_segments: item.answer_segments || [],
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
            setLoadingQuestion(null);
            setActiveLoadingCategory(null);
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
            // Specific mode: Allow 2-3 documents
            if (manualSelectedPdfIds.length < 2 || manualSelectedPdfIds.length > 3) {
                return alert("Please select 2-3 documents.");
            }
            
            // Validate documents are from at least 2 different investors
            const selectedDocs = allDocs.filter(doc => manualSelectedPdfIds.includes(doc.pdf_id));
            const investorIds = new Set(selectedDocs.map(doc => doc.investor_id));
            
            if (investorIds.size < 2) {
                return alert("Please select documents from at least 2 different investors.");
            }
        }

        if (selectedCategories.length > 0) {
            setIsDocPanelCollapsed(true);
            setLoadingQuestion(q);
            executeCompare(q, selectedCategories);
            return;
        }

        setIsDocPanelCollapsed(true);
        setLoadingQuestion(q);
        setLoading(true);
        try {
            const res = await fetch(`${AI_CHATBOT_API_BASE }/predict-category`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q, investor_id: investor1 }),
            });
            const data = await res.json();
            setLoading(false);

            if (data.detected_category) {
                setPendingQuestion(q);
                setPendingCategory(data.detected_category);
                setCountdown(5);
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
            // Need 2-3 documents
            if (manualSelectedPdfIds.length < 2 || manualSelectedPdfIds.length > 3) return false;
            
            // Check that we have documents from at least 2 different investors
            const selectedDocs = allDocs.filter(doc => manualSelectedPdfIds.includes(doc.pdf_id));
            const investorIds = new Set(selectedDocs.map(doc => doc.investor_id));
            
            return investorIds.size >= 2;
        }
        return investor1 && investor2 && docsFoundForInv1 && docsFoundForInv2;
    }, [loading, mode, manualSelectedPdfIds, investor1, investor2, docsFoundForInv1, docsFoundForInv2, allDocs]);

    return (
        // <div className="flex flex-col h-[calc(100vh-140px)] relative border rounded-md bg-white p-8">
        <div className="flex flex-col h-[calc(100vh-140px)] relative bg-white p-8">
        
        {/* 1. CATEGORY VERIFICATION MODAL — removed, now shown inline */}

        {/* 2. ANSWER DETAIL MODAL */}
        {selectedAnswer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white border border-[#931638]/50 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    
                    <div className="px-6 py-4 border-b border-[#931638]/50 flex justify-between items-start bg-gray-50">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <a 
                                    href={selectedAnswer.file_url}
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-lg font-semibold text-[#931638] hover:text-[#931638]/80 hover:underline transition-colors"
                                    title="Open PDF"
                                >
                                    {selectedAnswer.pdf_name}
                                </a>
                                {selectedAnswer.file_url && (
                                    <a
                                        href={selectedAnswer.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 bg-[#931638] text-white px-2 py-1 rounded text-[10px] font-medium hover:bg-[#931638]/90 transition-colors"
                                        title="Open PDF"
                                    >
                                        <FileSearch size={12} />
                                        PDF
                                    </a>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="text-[#931638] font-medium">{selectedAnswer.investor_name}</span>
                            </div>
                        </div>
                        <button onClick={() => setSelectedAnswer(null)} className="text-gray-500 hover:text-black p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                        <div className="prose prose-sm max-w-none space-y-4 [&_p]:mb-4 [&_p]:leading-relaxed">
                            {(() => {
                                const segments = selectedAnswer.answer_segments ?? [];
                                const uniquePages = new Set(segments.map(s => s.page));
                                const isMultiPage = uniquePages.size > 1;

                                if (!isMultiPage) {
                                    // Single page — combine all segments into one block
                                    const rawText = segments.map(s => s.text).join("\n\n");
                                    const combinedText = rawText
                                        .split(/\n/)
                                        .map(line => line.trim())
                                        .filter(line => line.length > 0)
                                        .join("\n\n");
                                    const singlePage = segments[0]?.page;
                                    const singlePageUrl = segments[0]?.page_url;
                                    return (
                                        <div>
                                            <ReactMarkdown>{combinedText}</ReactMarkdown>
                                            {singlePage !== null && singlePage !== undefined && (
                                                <a
                                                    href={singlePageUrl}
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

                                // Multiple pages — one paragraph per segment with its own page link
                                return segments.map((seg, i) => (
                                    <div key={i}>
                                        <ReactMarkdown>{seg.text}</ReactMarkdown>
                                        {seg.page !== null && (
                                            <a
                                                href={seg.page_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block mt-1 bg-[#931638] hover:bg-[#931638]/90 px-2 py-0.5 rounded text-xs text-white transition-colors"
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

        {/* 3. CONTROLS SECTION */}
        <div className={`space-y-4 relative z-20 ${showFilters ? 'mb-4' : 'mb-6'}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                    {/* Eye/EyeOff Toggle */}
                    {/* <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="p-2 bg-white border-2 border-[#931638]/50 rounded-lg hover:bg-gray-50 transition-all shrink-0"
                        title={showFilters ? "Hide filter controls" : "Show filter controls"}
                    >
                        {showFilters ? (
                            <Eye size={16} className="text-[#931638]" />
                        ) : (
                            <EyeOff size={16} className="text-gray-400" />
                        )}
                    </button> */}

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

                    {/* Investor 1 Selection with Search */}
                    <div className="relative" ref={investor1DropdownRef}>
                        <input
                            type="text"
                            value={investor1Search}
                            onChange={(e) => {
                                setInvestor1Search(e.target.value);
                                setIsInvestor1DropdownOpen(true);
                            }}
                            onFocus={() => setIsInvestor1DropdownOpen(true)}
                            placeholder={allInvestors.find(inv => inv.id === investor1)?.name || "Investor 1"}
                            className="w-[250px] h-[34px] bg-gray-50 border border-[#931638]/50 rounded-lg pl-3 pr-7 text-xs text-black placeholder:text-black focus:border-[#931638] focus:outline-none"
                        />
                        <ChevronDown
                            size={14}
                            onClick={() => setIsInvestor1DropdownOpen(!isInvestor1DropdownOpen)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer transition-transform duration-200 ${isInvestor1DropdownOpen ? 'rotate-180' : ''}`}
                        />
                        
                        {isInvestor1DropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto bg-white border-2 border-[#931638] rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95">
                                {filteredInvestors1.length === 0 ? (
                                    <div className="p-3 text-xs text-gray-500 italic">No investors found</div>
                                ) : (
                                    filteredInvestors1.map((inv) => {
                                        const isSelected = inv.id === investor1;
                                        const isDisabled = inv.id === investor2;
                                        return (
                                            <div
                                                key={inv.id}
                                                onClick={() => {
                                                    if (!isDisabled) {
                                                        setInvestor1(inv.id);
                                                        setInvestor1Search("");
                                                        setIsInvestor1DropdownOpen(false);
                                                    }
                                                }}
                                                className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                                                    isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-100' :
                                                    isSelected ? 'bg-[#931638]/10 text-[#931638] font-medium' : 
                                                    'hover:bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                {inv.name}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    <span className="text-gray-400 text-xs font-bold">VS</span>

                    {/* Investor 2 Selection with Search */}
                    <div className="relative" ref={investor2DropdownRef}>
                        <input
                            type="text"
                            value={investor2Search}
                            onChange={(e) => {
                                setInvestor2Search(e.target.value);
                                setIsInvestor2DropdownOpen(true);
                            }}
                            onFocus={() => setIsInvestor2DropdownOpen(true)}
                            placeholder={allInvestors.find(inv => inv.id === investor2)?.name || "Investor 2"}
                            className="w-[250px] h-[34px] bg-gray-50 border border-[#931638]/50 rounded-lg pl-3 pr-7 text-xs text-black placeholder:text-black focus:border-[#931638] focus:outline-none"
                        />
                        <ChevronDown
                            size={14}
                            onClick={() => setIsInvestor2DropdownOpen(!isInvestor2DropdownOpen)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer transition-transform duration-200 ${isInvestor2DropdownOpen ? 'rotate-180' : ''}`}
                        />
                        
                        {isInvestor2DropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto bg-white border-2 border-[#931638] rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95">
                                {filteredInvestors2.length === 0 ? (
                                    <div className="p-3 text-xs text-gray-500 italic">No investors found</div>
                                ) : (
                                    filteredInvestors2.map((inv) => {
                                        const isSelected = inv.id === investor2;
                                        const isDisabled = inv.id === investor1;
                                        return (
                                            <div
                                                key={inv.id}
                                                onClick={() => {
                                                    if (!isDisabled) {
                                                        setInvestor2(inv.id);
                                                        setInvestor2Search("");
                                                        setIsInvestor2DropdownOpen(false);
                                                    }
                                                }}
                                                className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                                                    isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-100' :
                                                    isSelected ? 'bg-[#931638]/10 text-[#931638] font-medium' : 
                                                    'hover:bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                {inv.name}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

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
                        <span className={`text-[10px] font-medium transition-colors ${includeEmea ? "text-[#931638]" : "text-gray-600"}`}>Add EMEA</span>
                    </button>
                    </>
                    )}

                    {/* INPUT AREA - Shows next to Eye button when filters are hidden */}
                    {!showFilters && (
                        <div className="flex-1 bg-white border-2 border-[#931638] rounded-xl flex items-center p-2">
                            <input 
                                value={question} 
                                onChange={(e) => setQuestion(e.target.value)} 
                                onKeyDown={(e) => e.key === "Enter" && handleAsk()} 
                                placeholder={isReady ? "Ask to compare..." : "Select investors/filters..."} 
                                className="flex-1 appearance-none bg-transparent border-none outline-none text-black px-2 text-sm focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-transparent" 
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
            {showFilters && !(mode === "specific" && isDocPanelCollapsed) && (
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

            {/* Manual Document Selection - Compact Dropdowns */}
            {showFilters && mode === "specific" && (
                <div className="animate-in slide-in-from-top-2 duration-300 bg-gray-50 rounded-lg border-2 border-[#931638]">
                    {/* Collapsible header row */}
                    <div
                        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                        onClick={() => setIsDocPanelCollapsed(!isDocPanelCollapsed)}
                    >
                        <span className="text-xs font-semibold text-[#931638] uppercase tracking-wide">
                            Document Selection
                            {isDocPanelCollapsed && manualSelectedPdfIds.length > 0 && (
                                <span className="ml-2 font-normal text-gray-500 normal-case tracking-normal">
                                    — {allDocs.filter(d => manualSelectedPdfIds.includes(d.pdf_id)).map(d => d.name).join(", ")}
                                </span>
                            )}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`text-[#931638] transition-transform duration-200 ${isDocPanelCollapsed ? '-rotate-90' : ''}`}
                        />
                    </div>
                    {/* Collapsible body */}
                    {!isDocPanelCollapsed && (
                    <div className="px-3 pb-3">
                    <div className="flex items-center gap-4">
                        {(() => {
                            // Group documents by investor
                            const grouped: { [investorId: string]: { name: string; docs: typeof filteredDocs } } = {};
                            filteredDocs.forEach(doc => {
                                if (!grouped[doc.investor_id]) {
                                    grouped[doc.investor_id] = { name: doc.investor_name || "Unknown", docs: [] };
                                }
                                grouped[doc.investor_id].docs.push(doc);
                            });
                            
                            // Always show investor1 first (left) and investor2 second (right)
                            const orderedEntries = [
                                ...(investor1 && grouped[investor1] ? [[investor1, grouped[investor1]] as [string, typeof grouped[string]]] : []),
                                ...(investor2 && grouped[investor2] ? [[investor2, grouped[investor2]] as [string, typeof grouped[string]]] : []),
                                // Any other investors not in inv1/inv2 (edge case)
                                ...Object.entries(grouped).filter(([id]) => id !== investor1 && id !== investor2),
                            ];
                            
                            return orderedEntries.map(([investorId, group], idx) => {
                                const isFirstInvestor = idx === 0;
                                const dropdownRef = isFirstInvestor ? doc1DropdownRef : doc2DropdownRef;
                                const isOpen = isFirstInvestor ? isDoc1DropdownOpen : isDoc2DropdownOpen;
                                const setIsOpen = isFirstInvestor ? setIsDoc1DropdownOpen : setIsDoc2DropdownOpen;
                                
                                // Find selected document for this investor
                                const selectedDoc = group.docs.find(doc => manualSelectedPdfIds.includes(doc.pdf_id));
                                
                                return (
                                    <div key={investorId} className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">
                                                {group.name} ({group.docs.filter(d => manualSelectedPdfIds.includes(d.pdf_id)).length}):
                                            </span>
                                            <div className="relative flex-1" ref={dropdownRef}>
                                                <button 
                                                    onClick={() => setIsOpen(!isOpen)} 
                                                    className="flex items-center justify-between gap-2 bg-white border border-[#931638]/50 rounded px-3 py-1.5 text-xs text-black hover:bg-gray-50 hover:border-[#931638] w-full"
                                                >
                                                    <span className="truncate max-w-[220px]">
                                                        {(() => {
                                                            const selectedCount = group.docs.filter(d => manualSelectedPdfIds.includes(d.pdf_id)).length;
                                                            if (selectedCount === 0) return "+ Add Document";
                                                            if (selectedCount === 1) {
                                                                const doc = group.docs.find(d => manualSelectedPdfIds.includes(d.pdf_id));
                                                                const name = doc?.name || "+ Add Document";
                                                                return name.replace(/\.pdf$/i, "").length > 40
                                                                    ? name.replace(/\.pdf$/i, "").slice(0, 40) + "…"
                                                                    : name;
                                                            }
                                                            return `${selectedCount} Selected`;
                                                        })()}
                                                    </span>
                                                    <ChevronDown 
                                                        size={14} 
                                                        className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                                                    />
                                                </button>
                                                {isOpen && (
                                                    <div className="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto bg-white border-2 border-[#931638] rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95">
                                                        {group.docs.length === 0 ? (
                                                            <div className="p-3 text-xs text-gray-500 italic">No documents available</div>
                                                        ) : (
                                                            group.docs.map((doc) => {
                                                                const isSelected = manualSelectedPdfIds.includes(doc.pdf_id);
                                                                return (
                                                                    <div 
                                                                        key={doc.pdf_id} 
                                                                        onClick={() => {
                                                                            togglePdf(doc.pdf_id);
                                                                            // Don't close dropdown - allow multi-select
                                                                        }} 
                                                                        className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-200 last:border-b-0 ${isSelected ? 'bg-[#931638]/10 hover:bg-[#931638]/20' : 'hover:bg-gray-100'}`}
                                                                    >
                                                                        <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#931638] border-[#931638]' : 'border-gray-400'}`}>
                                                                            {isSelected && <Check size={10} className="text-white" />}
                                                                        </div>
                                                                        <span className={`text-xs leading-normal break-words whitespace-normal ${isSelected ? 'text-[#931638] font-medium' : 'text-gray-700'}`}>
                                                                            {doc.name}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Show selected document tag below */}
                                        {selectedDoc && (
                                            <div className="mt-2 flex gap-1.5">
                                                <div className="flex items-center gap-1 bg-[#931638]/10 text-[#931638] border border-[#931638]/60 px-2 py-1 rounded text-xs animate-in fade-in zoom-in-95">
                                                    <span className="truncate max-w-[180px]">{selectedDoc.name.replace(/\.pdf$/i, "").length > 35 ? selectedDoc.name.replace(/\.pdf$/i, "").slice(0, 35) + "…" : selectedDoc.name}</span>
                                                    <button 
                                                        onClick={() => togglePdf(selectedDoc.pdf_id)} 
                                                        className="hover:text-[#931638] shrink-0"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                    
                    {/* Subtle Error Message */}
                    {selectionError && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-[#931638] bg-[#931638]/5 border border-[#931638]/20 rounded-lg px-3 py-2 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{selectionError}</span>
                        </div>
                    )}
                </div>
                    )}
                </div>
            )}
        </div>

        {/* 4. INPUT AREA - Shows below controls when filters are visible */}
        {showFilters && (
        <>
        <div className="bg-white border-2 border-[#931638] rounded-xl flex items-center p-2 shadow-lg mb-2 z-10 relative">
            <input 
                value={question} 
                onChange={(e) => setQuestion(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && handleAsk()} 
                placeholder={isReady ? "Ask to compare..." : "Select investors/filters..."} 
                className="flex-1 appearance-none bg-transparent border-none outline-none text-black px-2 text-sm focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-transparent" 
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
        </>
        )}

        {/* 5. RESULTS HISTORY - LATEST Q&A PAIR ON TOP (Q3-A3, Q2-A2, Q1-A1) */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-4 pb-4 custom-scrollbar">
            {history.length === 0 && !loading && !isVerifying && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                    <p className="text-sm font-light">Select two investors and ask a question to compare.</p>
                </div>
            )}

            {/* Clear Chat Button - Shows only when there are messages */}
            {history.length > 0 && (
                <div className="flex justify-start">
                    <button
                        onClick={() => setHistory([])}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-[#931638]/10 border border-gray-300 hover:border-[#931638] text-gray-600 hover:text-[#931638] px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        title="Clear all messages"
                    >
                        <Trash2 size={14} />
                        Clear Chat
                    </button>
                </div>
            )}

            {/* STANDALONE LOADING / VERIFYING INDICATOR */}
            {(loading || isVerifying) && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    {/* Question bubble ABOVE the analyzing row */}
                    {loadingQuestion && (
                        <div className="flex justify-end">
                            <div className="bg-[#931638] text-white p-3 rounded-2xl rounded-tr-sm text-sm max-w-[90%] shadow-lg">
                                {loadingQuestion}
                            </div>
                        </div>
                    )}
                    {/* Analyzing row — dots + text + category chip (all inline) */}
                    <div className="flex items-center gap-2 ml-1 flex-wrap">
                        <div className="flex gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#931638]/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#931638]/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#931638]/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-gray-400">Analyzing and comparing...</span>
                        {/* Category chip — shown during verifying (pendingCategory) and during loading (activeLoadingCategory) */}
                        {(isVerifying ? pendingCategory : activeLoadingCategory) && (
                            <>
                                <span className="text-[11px] text-gray-400">Filtering by</span>
                                <div className="flex items-center gap-1 bg-[#931638]/10 text-[#931638] border border-[#931638]/25 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                                    <Tag size={9} />
                                    {isVerifying ? pendingCategory : activeLoadingCategory}
                                </div>
                                {/* Change button — only during verifying countdown */}
                                {isVerifying && countdown > 0 && (
                                    <button
                                        onClick={() => {
                                            setIsVerifying(false);
                                            setCountdown(3);
                                            setLoading(false);
                                            setLoadingQuestion(null);
                                            setIsCategoryDropdownOpen(true);
                                        }}
                                        className="group relative flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-gray-400 border border-gray-200 bg-white hover:text-[#931638] hover:border-[#931638]/40 hover:bg-[#931638]/5 transition-all overflow-hidden"

                                    >
                                        <div
                                            className="absolute inset-0 bg-white origin-left transition-all duration-1000 ease-linear"
                                            style={{ transform: `scaleX(${countdown / 3})` }}
                                        />

                                        <span className="relative text-black">Change</span>
                                        <span className="relative tabular-nums text-[10px] text-black">{countdown}s</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
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
            
            // While loading/verifying, hide the latest unanswered pair — loading block above already shows it
            const visiblePairs = (loading || isVerifying)
                ? pairs.filter(p => p.answer !== undefined)
                : pairs;

            // Reverse to show newest first (Q3-A3, Q2-A2, Q1-A1)
            return visiblePairs.reverse().map((pair, pairIdx) => (
                <div key={pair.question.id} className="space-y-3">
                    
                    {/* QUESTION */}
                    <div className="flex justify-end animate-in slide-in-from-right-2">
                        <div className="bg-[#931638] text-white p-3 rounded-2xl rounded-tr-sm text-sm max-w-[90%] shadow-lg">
                            {pair.question.content}
                        </div>
                    </div>
                    
                    {/* ANSWER */}
                    {pair.answer && (
                        <div className="animate-in slide-in-from-left-2">
                            <div className="flex flex-col gap-3 max-w-[90%] w-full">
                                {pair.answer.error && (
                                    <div className="text-[#931638]/80 text-sm flex items-center gap-2 bg-[#931638]/10 p-3 rounded-lg border border-[#931638]/20">
                                        <AlertCircle size={16} />
                                        {pair.answer.content || "Something went wrong."}
                                    </div>
                                )}

                                {!pair.answer.error && pair.answer.answers && pair.answer.answers.length > 0 && (
                                    <>
                                        {/* Answer Cards in Grid - 3 columns for 3 answers, 2 columns otherwise */}
                                        <div className={`grid gap-3 ${pair.answer.answers.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                                            {[...pair.answer.answers].sort((a, b) => {
                                                // investor1's answer always goes first (left), investor2's second (right)
                                                const inv1Name = allInvestors.find(i => i.id === investor1)?.name;
                                                const inv2Name = allInvestors.find(i => i.id === investor2)?.name;
                                                const aIsInv1 = a.investor_name === inv1Name;
                                                const bIsInv1 = b.investor_name === inv1Name;
                                                if (aIsInv1 && !bIsInv1) return -1;
                                                if (!aIsInv1 && bIsInv1) return 1;
                                                return 0;
                                            }).map((ans, idx) => (
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
                                                            {ans.file_url && (
                                                                <a
                                                                    href={ans.file_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="flex items-center gap-1 bg-[#931638] text-white px-2 py-1 rounded text-[10px] font-medium hover:bg-[#931638]/90 transition-colors"
                                                                    title="Open PDF"
                                                                >
                                                                    <FileSearch size={12} />
                                                                    PDF
                                                                </a>
                                                            )}
                                                        </div>

                                                        <p className="text-md text-gray-500 mb-2 truncate">{ans.pdf_name}</p>
                                                        <div className="text-md text-gray-700 line-clamp-4 prose prose-sm">
                                                            <ReactMarkdown>{ans.answer_segments?.[0]?.text ?? ""}</ReactMarkdown>
                                                        </div>
                                                        {ans.answer_segments && ans.answer_segments.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {ans.answer_segments.map((seg, i) => (
                                                                    seg.page !== null && (
                                                                        <span key={i} className="bg-[#931638] text-white px-1.5 py-0.5 rounded text-[12px]">
                                                                            p.{seg.page}
                                                                        </span>
                                                                    )
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

                                {/* No Results Message */}
                                {!pair.answer.error && pair.answer.answers && pair.answer.answers.length === 0 && (
                                    <div className="text-gray-600 text-sm italic p-4 bg-gray-50 rounded-lg border border-gray-300">
                                        No relevant documents found for this comparison.
                                    </div>
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