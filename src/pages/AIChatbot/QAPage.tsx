import { useState, useEffect, useRef, useMemo } from "react";
import { Send, Layers, FileSearch, X, Tag, Maximize2, ChevronDown, Check, Calendar, AlertCircle, Trash2, Eye, EyeOff, Info} from "lucide-react";
import { AI_CHATBOT_API_BASE , fetchDocuments, fetchInvestors, fetchInvestorFilters } from "./api";
import ReactMarkdown from "react-markdown";

// --- Types ---
interface Investor {
  id: string;
  name: string;
  disabled?: boolean; // Optional, used for the separator
}

type AnswerData = {
  rank: number;
  pdf_id: string;
  pdf_name: string;
  file_url?: string;
  year?: number;
  quarter?: string;
  relevance_score: number;
  pages_used: (number | string)[];
  best_page?: number | string; 
  source_text?: string;
  answer_segments: { page: number | null; text: string; page_url: string }[];
};

type Message = {
  role: "user" | "assistant";
  content?: string;
  answers?: AnswerData[];
  error?: boolean;
  mode?: "specific" | "all";
  message?: string;
  status?: string;
};

type DocItem = {
    pdf_id: string;
    name: string;
    investor_id: string;
    category?: string;
    year?: string | number;
    is_emea: boolean;
};

type QAItem = {
    id: string;
    question: string;
    answers?: AnswerData[];
    loading?: boolean;
    error?: boolean;
    message?: string;
    status?: string;
};
  

// --- Helper: Link to YOUR React Canvas Viewer ---
const getPdfLink = (url: string | undefined, page: string | number, filename: string) => {
    if (!url) return "#";
    return `/pdf-viewer?url=${encodeURIComponent(url)}&page=${page}&filename=${encodeURIComponent(filename)}`;
};

export default function QAPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAItem[]>([]);

  
  // Scopes - REMOVED "compare"
  const [scope, setScope] = useState<"specific" | "all">("specific");

  // Filters
  const [investorId, setInvestorId] = useState<string>("");
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [includeEmea, setIncludeEmea] = useState(false);
  
  // Data Lists
  const [investorList, setInvestorList] = useState<Investor[]>([]);
  const [allDocs, setAllDocs] = useState<DocItem[]>([]);
  const [yearList, setYearList] = useState<string[]>([]); 

  // Selection
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);
  const [isDocDropdownOpen, setIsDocDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  
  const [llmStrength, setLlmStrength] = useState(0);
  
  // --- Modal State ---
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerData | null>(null);

  // --- Verification & Tooltip State ---
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  const [showCategoryTooltip, setShowCategoryTooltip] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const [activeLoadingCategory, setActiveLoadingCategory] = useState<string | null>(null);

  // NEW: Show/Hide Filters State
  const [showFilters, setShowFilters] = useState(true);

  // NEW: Investor Search State
  const [investorSearch, setInvestorSearch] = useState("");
  const [isInvestorDropdownOpen, setIsInvestorDropdownOpen] = useState(false);

  // --- Sample Questions for all investors ---
  const SAMPLE_QUESTIONS_FOR_ALL = [
    { question: "What is the overboarding policy?", category: "Voting Guidelines", scope: "all" as const },
    { question: "What is the policy on shareholder proposals?", category: "Voting Guidelines", scope: "all" as const },
    { question: "What is the policy on executive compensation?", category: "Voting Guidelines", scope: "all" as const }
  ];
  
  // Create SAMPLE_QUESTIONS object with the same questions for all investors
  const SAMPLE_QUESTIONS: Record<string, Array<{question: string, category: string, year?: number, scope?: "specific" | "all"}>> = 
    investorList.reduce((acc, investor) => {
      // Skip the separator
      if (investor.id !== "separator") {
        acc[investor.id] = SAMPLE_QUESTIONS_FOR_ALL;
      }
      return acc;
    }, {} as Record<string, Array<{question: string, category: string, year?: number, scope?: "specific" | "all"}>>);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const investorDropdownRef = useRef<HTMLDivElement>(null);
  const docDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null); 
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initData = async () => {
        try {
            const invData = await fetchInvestors();
            
            // Explicitly type the fallback array
            const allInvestors: Investor[] = invData.investors || [];

            const priorityOrder = [
                "c4a5a2c7-c493-414b-854f-1c99c9aef7ed",
                "2b622a0e-1a72-43fd-add2-d4b863f0731c",
                "347446c8-649d-4b5a-be03-9c178c82ff2a",
                "21881b9b-7970-414e-baae-c84635d03d45",
                "4f383fdd-b46d-4952-b128-624c9603c411"
            ];
            
            // FIX: The Type Guard (inv is Investor) removes the red lines
            const priorityInvestors = priorityOrder
                .map(id => allInvestors.find(inv => inv.id === id))
                .filter((inv): inv is Investor => !!inv); 

            const otherInvestors = allInvestors
                .filter(inv => !priorityOrder.includes(inv.id))
                .sort((a, b) => a.name.localeCompare(b.name));
            
            // Type the separator as an Investor
            const separator: Investor = { id: "separator", name: "──────────", disabled: true };
            
            const sortedInvestors = [...priorityInvestors, separator, ...otherInvestors];
            setInvestorList(sortedInvestors);
            
            if (sortedInvestors.length > 0) {
                const firstInvestorId = sortedInvestors[0].id;
                setInvestorId(firstInvestorId);
                
                const data = await fetchInvestorFilters(firstInvestorId);
                const years = data.years ? data.years.map(String) : [];
                setYearList(years);

                if (years.length > 0) {
                    const latest = Math.max(...years.map(Number));
                    setSelectedYears([latest.toString()]);
                }
                
                // Extra safety: Fallback to empty array for docs
                const formatted: DocItem[] = (data.all_docs || []).map((doc: any) => ({
                    pdf_id: doc.id,
                    name: doc.name,
                    investor_id: firstInvestorId,
                    category: doc.category ? String(doc.category) : "General",
                    year: doc.year || "",
                    is_emea: doc.is_emea
                }));
                setAllDocs(formatted);
            }
        } catch (err) {
            console.error("Could not load initial data", err);
        }
    };
    initData();
}, []);
  
  // --- 2. Fetch Filters ---
    useEffect(() => {
        const loadFilters = async () => {
            if (!investorId) return;
    
            try {
                const data = await fetchInvestorFilters(investorId);
                const years = data.years ? data.years.map(String) : [];
                setYearList(years);
                
                const formatted: DocItem[] = data.all_docs.map((doc: any) => ({
                pdf_id: doc.id,
                name: doc.name,
                investor_id: investorId,
                category: doc.category ? String(doc.category) : "General",
                year: doc.year || "",
                is_emea: doc.is_emea 
                }));
                setAllDocs(formatted);
    
                setSelectedCategories([]); 
                
                // Auto-select latest year when investor changes
                if (years.length > 0) {
                  const latest = Math.max(...years.map(Number));
                  setSelectedYears([latest.toString()]);
                } else {
                  setSelectedYears([]); 
                }
                
                setSelectedPdfIds([]);
            } catch (error) {
                console.error("Failed to load investor filters", error);
            }
        };
        loadFilters();
    }, [investorId]);

  // --- 3. Dynamic Categories ---
  const availableCategories = useMemo(() => {
        if (!investorId) return [];

        let filtered = allDocs.filter(doc => doc.investor_id === investorId);

        if (!includeEmea) {
            filtered = filtered.filter(doc => !doc.is_emea); 
        }

        const uniqueCats = new Set<string>();
        filtered.forEach(doc => {
            if (doc.category) {
                const parts = doc.category.split(',').map(c => c.trim());
                parts.forEach(p => { if(p) uniqueCats.add(p); });
            }
        });

        return Array.from(uniqueCats).sort();
    }, [allDocs, investorId, includeEmea]);

  // --- 4. Auto-Reset Categories that no longer exist ---
  useEffect(() => {
      if (selectedCategories.length > 0 && availableCategories.length > 0) {
          const valid = selectedCategories.filter(c => availableCategories.includes(c));
          if (valid.length !== selectedCategories.length) {
              setSelectedCategories(valid);
          }
      }
  }, [availableCategories, selectedCategories]);

  // --- 5. Auto-Select Timer Logic ---
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isVerifying && countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isVerifying && countdown === 0) {
        if (pendingQuestion && pendingCategory) {
            fetchAnswers(pendingQuestion, [pendingCategory]);
        }
    }
    return () => clearTimeout(timer);
  }, [isVerifying, countdown, pendingQuestion, pendingCategory]);

  // Auto-scroll
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (container) container.scrollTop = 0;
  }, [history, loading]);

  // Click Outside for all dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (docDropdownRef.current && !docDropdownRef.current.contains(event.target as Node)) {
        setIsDocDropdownOpen(false);
      }
      if (investorDropdownRef.current && !investorDropdownRef.current.contains(event.target as Node)) {
        setIsInvestorDropdownOpen(false);
      }
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

  // --- Handlers ---
  const togglePdf = (id: string) => {
    if (selectedPdfIds.includes(id)) {
        setSelectedPdfIds(selectedPdfIds.filter(prevId => prevId !== id));
    } else {
        if (selectedPdfIds.length >= 3) {
            alert("You can only select up to 3 documents.");
            return;
        }
        setSelectedPdfIds([...selectedPdfIds, id]);
    }
  };

  const removePdf = (idToRemove: string) => {
    setSelectedPdfIds(selectedPdfIds.filter(id => id !== idToRemove));
  };

  const toggleYear = (y: string) => {
    if (selectedYears.includes(y)) {
        setSelectedYears(selectedYears.filter(prev => prev !== y));
    } else {
        setSelectedYears([...selectedYears, y]);
    }
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
        setSelectedCategories(selectedCategories.filter(prev => prev !== cat));
    } else {
        setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Handler for sample question clicks
  const handleSampleQuestionClick = async (sampleQuestion: string, sampleCategory: string, sampleScope: "specific" | "all") => {
    // Set the question in the input field
    setQuestion(sampleQuestion);
    
    // Set the category
    setSelectedCategories([sampleCategory]);
    
    // Set the scope
    setScope(sampleScope);
    
    // Immediately trigger the search with the sample question and pass the scope directly
    await fetchAnswers(sampleQuestion, [sampleCategory], sampleScope);
  };

  const handleUserRejection = () => {
    setIsVerifying(false);
    setCountdown(3);
    setLoadingQuestion(null);
    if (pendingQuestion) setQuestion(pendingQuestion);
    
    setShowCategoryTooltip(true);
    setIsCategoryDropdownOpen(true);

    setTimeout(() => setShowCategoryTooltip(false), 5000);
  };

  // ─────────────────────────────────────────────────────────
  // Step 2: ACTUAL Search Execution - COMPARE MODE REMOVED
  // ─────────────────────────────────────────────────────────
  const fetchAnswers = async (q: string, cats: string[] | null, overrideScope?: "specific" | "all") => {
      setIsVerifying(false);
      setCountdown(3);
      setPendingQuestion(null);
      setPendingCategory(null);
      setShowCategoryTooltip(false); 
      
      const catUsed = (cats && cats.length > 0) ? cats[0] : null;
      setActiveLoadingCategory(catUsed);
      setLoadingQuestion(q);
      setLoading(true);
      
      const qaId = crypto.randomUUID();

      setHistory(prev => [
        {
          id: qaId,
          question: q,
          loading: true,
        },
        ...prev,
      ]);

      try {
        // Use overrideScope if provided, otherwise use the state scope
        const currentScope = overrideScope !== undefined ? overrideScope : scope;
        
        // REMOVED: Compare mode logic - only one API call now
        const response = await fetch(`${AI_CHATBOT_API_BASE }/ask-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            pdf_ids: currentScope === "specific" ? selectedPdfIds : [],
            investor_id: investorId,
            search_scope: currentScope,
            category: (cats && cats.length > 0) ? cats : null, 
            years: selectedYears.length > 0 ? selectedYears.map(Number) : null,
            llm_strength: llmStrength,
            include_emea: includeEmea
          }),
        });

        const data = await response.json();
        
        // Check if response has an error status
        if (!response.ok) {
          // This is a system error from backend
          setHistory(prev =>
            prev.map(item =>
              item.id === qaId
                ? { 
                    ...item, 
                    error: true, 
                    loading: false,
                    message: data.detail || "Error in backend. Please contact support."
                  }
                : item
            )
          );
          return;
        }
        
        const standardizedAnswers = data.answers || [];
        
        setHistory(prev =>
            prev.map(item =>
              item.id === qaId
                ? { 
                    ...item, 
                    answers: standardizedAnswers, 
                    loading: false,
                    message: data.message,
                    status: data.status,
                    error: data.error || false
                  }
                : item
            )
          );
        
        setSelectedCategories([]);

    } catch (err) {
        console.error("API call failed:", err);
        setHistory(prev =>
            prev.map(item =>
              item.id === qaId
                ? { 
                    ...item, 
                    error: true, 
                    loading: false,
                    message: "Unable to connect to server. Please try again."
                  }
                : item
            )
          );
    } finally {
        setLoading(false);
        setLoadingQuestion(null);
        setActiveLoadingCategory(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Step 1: Handle Ask - COMPARE MODE REMOVED
  // ─────────────────────────────────────────────────────────
  const handleAsk = async () => {
    const currentQ = question.trim();
    if (!currentQ) return;
    
    // REMOVED: scope !== "compare" check
    if (!investorId) return alert("Please select an investor.");
    if (scope === "specific" && selectedPdfIds.length === 0) return alert("Please select at least one document.");

    if (selectedCategories.length > 0) {
        await fetchAnswers(currentQ, selectedCategories);
        return;
    }

    // REMOVED: Compare mode check

    setLoading(true);
    setLoadingQuestion(currentQ);
    try {
        const res = await fetch(`${AI_CHATBOT_API_BASE }/predict-category`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                question: currentQ, 
                investor_id: investorId 
            }),
        });
        const data = await res.json();
        setLoading(false);

        if (data.detected_category) {
            setPendingQuestion(currentQ);
            setPendingCategory(data.detected_category);
            setCountdown(3);
            setIsVerifying(true);
            return; 
        }

        await fetchAnswers(currentQ, null);

    } catch (e) {
        console.error("Prediction failed", e);
        setLoading(false);
        await fetchAnswers(currentQ, null);
    }
  };

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

  const filteredDocs = allDocs.filter(doc => {
    const matchInv = doc.investor_id === investorId;
    const matchEmea = includeEmea ? true : !doc.is_emea; 
    const matchYear = selectedYears.length > 0 ? selectedYears.includes(String(doc.year)) : true;
    const matchCat = selectedCategories.length > 0 
        ? (doc.category || "").split(',').some(c => selectedCategories.includes(c.trim())) 
        : true;

    return matchInv && matchEmea && matchYear && matchCat;
    }).sort((a, b) => Number(b.year) - Number(a.year)); // Keeps newest at the top

  // NEW: Filtered investor list based on search
  const filteredInvestors = investorList.filter(inv => {
    // Don't filter out the separator
    if (inv.disabled) return true;
    // Filter by search term - match from the START of the name
    if (!investorSearch.trim()) return true;
    return inv.name.toLowerCase().startsWith(investorSearch.toLowerCase());
  });


  return (
    <div className="flex flex-col h-[calc(100vh-140px)] relative">
      
      {/* Answer Detail Modal */}
      {selectedAnswer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white border-2 border-[#931638] rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                <div className="px-6 py-4 border-b-2 border-[#931638] flex justify-between items-start bg-gray-50">
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
                    <button onClick={() => setSelectedAnswer(null)} className="text-gray-500 hover:text-black p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="prose prose-sm max-w-none text-black space-y-4">
                        {(() => {
                            const segments = selectedAnswer.answer_segments ?? [];
                            const uniquePages = new Set(segments.map(s => s.page));
                            const isMultiPage = uniquePages.size > 1;

                            if (!isMultiPage) {
                                // Single page — combine all segments into one block
                                const combinedText = segments.map(s => s.text).join("\n\n");
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

{/* --- CONTROLS SECTION --- */}
<div className={`space-y-3 relative z-20 ${showFilters ? 'mb-2' : 'mb-3'}`}>
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-3 flex-1">
      
      {/* NEW: Eye/EyeOff Toggle */}
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
{/* 1. Investor Selection with Google-style Search */}
<div className="relative flex-1 max-w-[250px]" ref={investorDropdownRef}>
<div className="relative flex items-center">
  <input
    type="text"
    value={investorSearch}
    onChange={(e) => {
      setInvestorSearch(e.target.value);
      setIsInvestorDropdownOpen(true);
    }}
    onFocus={() => setIsInvestorDropdownOpen(true)}
    placeholder={
      investorList.find(inv => inv.id === investorId)?.name || "Search"
    }
    className="w-full h-[38px] bg-white border border-[#931638]/50 rounded-lg pl-3 pr-7 text-xs text-black placeholder:text-black focus:border-[#931638] focus:outline-none"
  />
  <ChevronDown size={14} className={`absolute right-2 text-gray-400 pointer-events-none transition-transform duration-200 ${isInvestorDropdownOpen ? 'rotate-180' : ''}`} />
</div>
  {/* Dropdown Results */}
  {isInvestorDropdownOpen && (
    <div className="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto bg-white border-2 border-[#931638] rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95">
      {filteredInvestors.length === 0 ? (
        <div className="p-3 text-xs text-gray-500 italic">
          No investors found
        </div>
      ) : (
        filteredInvestors.map((inv) => {
          const isSelected = investorId === inv.id;
          const isSeparator = inv.disabled;

          if (isSeparator) {
            return (
              <div
                key={inv.id}
                className="px-3 py-1 text-gray-400 text-xs border-t border-gray-300"
              >
                {inv.name}
              </div>
            );
          }

          return (
            <div
              key={inv.id}
              onClick={() => {
                setInvestorId(inv.id);
                setInvestorSearch("");
                setIsInvestorDropdownOpen(false);
              }}
              className={`px-3 py-2.5 cursor-pointer transition-colors text-xs ${
                isSelected
                  ? "bg-[#931638]/10 text-[#931638] font-medium"
                  : "hover:bg-gray-100 text-gray-800"
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
      {/* 2. Year Multi-Select (Defaults to Latest Year) */}
      <div className="relative" ref={yearDropdownRef}>
        <button 
          onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} 
          className="relative flex items-center justify-between h-[38px] pl-9 pr-3 bg-gray-100 border border-[#931638]/50 rounded-lg text-xs hover:border-[#931638] transition-all min-w-[100px]"
        >
      <span className="truncate max-w-[70px] text-black">
        {selectedYears.length > 0 
          ? (selectedYears.length === 1 ? selectedYears[0] : `${selectedYears.length} Selected`) 
          : "Year"}
      </span>
          <ChevronDown size={12} className={`ml-2 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        <Calendar size={12} className="absolute left-2.5 top-3.5 text-gray-600" />
        {isYearDropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 max-h-60 overflow-y-auto bg-white border-2 border-[#931638] rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95">
          {yearList.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 italic">No years available</div>
          ) : (
            yearList.map((y) => {
              const isSelected = selectedYears.includes(String(y)); 
              return (
                <div 
                  key={y} 
                  onClick={() => toggleYear(String(y))} 
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-[#931638]/10 hover:bg-[#931638]/20' : 'hover:bg-gray-100'}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#931638] border-[#931638]' : 'border-gray-400'}`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <span className={`text-xs ${isSelected ? 'text-[#931638] font-medium' : 'text-gray-700'}`}>{y}</span>
                </div>
              );
            })
          )}
        </div>
      )}
      </div>

      {/* 3. Mode Tabs (Specific / All) */}
      <div className="bg-gray-100 border border-[#931638]/50 rounded-lg p-1 flex gap-1">
        {(["specific", "all"] as const).map(mode => (
          <button 
            key={mode} 
            onClick={() => setScope(mode)} 
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all whitespace-nowrap ${scope === mode ? "bg-[#931638] text-white shadow-lg" : "text-gray-700 hover:text-black hover:bg-gray-200"}`}
          >
            {mode === "specific" ? "Specific" : "All Docs"}
          </button>
        ))}
      </div>

      {/* 4. Category Multi-Select */}
      <div className="relative" ref={categoryDropdownRef}>
        <button 
          onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} 
          className={`relative flex items-center justify-between h-[38px] pl-9 pr-3 bg-gray-100 border rounded-lg text-xs transition-all min-w-[120px] ${showCategoryTooltip ? 'border-[#931638] shadow-lg shadow-[#931638]/20 animate-pulse' : 'border-[#931638]/50'}`}
        >
          <span className="truncate max-w-[70px] text-black">{selectedCategories.length === 0 ? "Category" : `${selectedCategories.length} Selected`}</span>
          <ChevronDown size={12} className={`ml-2 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        <Layers size={12} className="absolute left-2.5 top-3.5 text-gray-600" />
        {isCategoryDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-56 max-h-60 overflow-y-auto bg-white border-2 border-[#931638] rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95">
            {availableCategories.map((cat) => (
              <div key={cat} onClick={() => toggleCategory(cat)} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${selectedCategories.includes(cat) ? 'bg-[#931638]/10' : 'hover:bg-gray-100'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedCategories.includes(cat) ? 'bg-[#931638] border-[#931638]' : 'border-gray-400'}`}>
                  {selectedCategories.includes(cat) && <Check size={10} className="text-white" />}
                </div>
                <span className={`text-xs ${selectedCategories.includes(cat) ? 'text-[#931638] font-medium' : 'text-gray-700'}`}>{cat}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Add EMEA Toggle */}
      <button 
        onClick={() => setIncludeEmea(!includeEmea)}
        className="flex items-center gap-2 h-[38px] px-3 bg-gray-100 border border-[#931638]/50 rounded-lg cursor-pointer group hover:border-[#931638] transition-all"
      >
        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${includeEmea ? "bg-[#931638]" : "bg-gray-400"}`}>
          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${includeEmea ? "translate-x-4" : "translate-x-0"}`} />
        </div>
        <span className={`text-xs font-medium transition-colors ${includeEmea ? "text-[#931638]" : "text-gray-600"}`}>Add EMEA</span>
      </button>
      </>
      )}

      {/* NEW: INPUT AREA - Shows next to Eye button when filters are hidden */}
      {!showFilters && (
        <div className="flex-1 bg-white border-2 border-[#931638] rounded-xl flex items-center p-2 shadow-xl">
          <input 
            value={question} 
            onChange={(e) => setQuestion(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && handleAsk()} 
            placeholder="Type a question..." 
            className="flex-1 bg-transparent border-none outline-none text-black px-2 text-sm" 
          />
          {question && (
            <button 
              onClick={() => setQuestion("")} 
              className="text-gray-400 hover:text-[#931638] p-2 rounded-lg transition-colors mr-1"
              title="Clear question"
            >
              <Trash2 size={16}/>
            </button>
          )}
          <button 
            onClick={handleAsk} 
            disabled={loading} 
            className="bg-[#931638] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#931638]/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <span className="animate-spin">⏳</span> : <Send size={14}/>} 
            {loading ? "Thinking..." : "Send"}
          </button>
        </div>
      )}
    </div>

      {/* 6. Balanced (LLM Strength) - Only show when filters visible */}
      {showFilters && (
  <div className="flex items-center gap-3">
    {/* Label */}
    <span className="text-xs text-gray-500 font-medium">Answer type:</span>
    <span className="text-[10px] uppercase font-bold text-gray-600 w-16 text-center transition-all">
      {getStrengthLabel(llmStrength)}
    </span>

    {/* Instant Tooltip Container */}
    <div className="relative group flex items-center">
      {/* Modern SVG Info Icon */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="14" height="14" 
        viewBox="0 0 24 24" fill="none" 
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
        className="text-gray-400 group-hover:text-gray-700 cursor-help transition-colors"
      >
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>

      {/* The "Fast" Tooltip: Appears instantly on hover via Tailwind 'group-hover' */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-100 z-50">
        <div className="bg-gray-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
          {getStrengthDescription(llmStrength)}
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      </div>
    </div>

    {/* Range Input */}
    <input 
      type="range" 
      min="0" 
      max="8" 
      step="4"
      value={llmStrength}
      onChange={(e) => setLlmStrength(Number(e.target.value))}
      className="w-24 h-1.5 bg-gray-300 rounded-full appearance-none cursor-pointer accent-[#931638] hover:opacity-80 transition-opacity"
    />
  </div>
)}
  </div>

        {/* --- SELECTED FILTERS TAGS --- */}
        {showFilters && (
        <div className="flex flex-wrap gap-2 -mt-1">
             {selectedCategories.map(cat => (
                <div key={cat} className="flex items-center gap-1 bg-[#931638]/10 text-[#931638] border border-[#931638]/60 px-2 py-0.5 rounded text-[10px] animate-in fade-in">
                    <span>{cat}</span>
                    <button onClick={() => toggleCategory(cat)} className="hover:text-[#931638]"><X size={10} /></button>
                </div>
             ))}
             {selectedYears.length > 1 && selectedYears.map(y => (
                <div key={y} className="flex items-center gap-1 bg-gray-200 text-gray-700 border border-gray-400 px-2 py-0.5 rounded text-[10px] animate-in fade-in">
                    <span>{y}</span>
                    <button onClick={() => toggleYear(y)} className="hover:text-black"><X size={10} /></button>
                </div>
             ))}
        </div>
        )}
</div>

      {/* INPUT BOX AND SELECT DOCUMENTS - Only show when filters visible */}
      {showFilters && (
      <div className={`flex gap-3 mb-3 transition-all duration-300 ${scope === "all" ? "flex-col" : "flex-row"}`}>
        {/* Input Box - Changes width based on scope */}
        <div className={`bg-white border-2 border-[#931638] rounded-xl flex items-center p-2 shadow-xl z-10 relative transition-all duration-300 ${
          scope === "all" ? "w-full" : "w-1/2"
        }`}>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAsk()} placeholder="Type a question..." className="flex-1 bg-transparent border-none outline-none text-black px-2 text-sm" />
          {question && (
            <button 
              onClick={() => setQuestion("")} 
              className="text-gray-400 hover:text-[#931638] p-2 rounded-lg transition-colors mr-1"
              title="Clear question"
            >
              <Trash2 size={16}/>
            </button>
          )}
          <button onClick={handleAsk} disabled={loading} className="bg-[#931638] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#931638]/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? <span className="animate-spin">⏳</span> : <Send size={14}/>} {loading ? "Thinking..." : "Send"}</button>
        </div>

        {/* Select Documents - Only shows in Specific mode, positioned to the right */}
        {scope === "specific" && (
          <div className="w-1/2 animate-in slide-in-from-right duration-300 bg-gray-50 px-3 py-3 rounded-lg border-2 border-[#931638]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-700 font-medium">Select Documents ({selectedPdfIds.length}/3):</span>
              <div className="relative" ref={docDropdownRef}>
                <button onClick={() => setIsDocDropdownOpen(!isDocDropdownOpen)} className="flex items-center justify-between gap-2 bg-white border border-[#931638]/50 rounded px-3 py-1.5 text-xs text-black hover:bg-gray-50 hover:border-[#931638] min-w-[200px]">
                  <span>{selectedPdfIds.length === 0 ? "+ Add Documents" : `${selectedPdfIds.length} Selected`}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isDocDropdownOpen ? 'rotate-180' : ''}`}/>
                </button>
                {isDocDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-[500px] max-h-60 overflow-y-auto bg-white border-2 border-[#931638] rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95">
                    {filteredDocs.length === 0 ? (
                      <div className="p-3 text-xs text-gray-500 italic">No documents match filters</div>
                    ) : (
                      filteredDocs.map((doc) => {
                        const isSelected = selectedPdfIds.includes(doc.pdf_id);
                        return (
                          <div 
                            key={doc.pdf_id} 
                            onClick={() => togglePdf(doc.pdf_id)} 
                            className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-[#931638]/10 hover:bg-[#931638]/20' : 'hover:bg-gray-100'}`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#931638] border-[#931638]' : 'border-gray-400'}`}>
                              {isSelected && <Check size={10} className="text-white" />}
                            </div>
                            <span className={`text-xs leading-normal break-words whitespace-normal ${isSelected ? 'text-[#931638] font-medium' : 'text-gray-700'}`}>
                              {doc.name}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            {selectedPdfIds.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto mt-2" style={{ scrollbarWidth: 'thin' }}>
                {selectedPdfIds.map(id => {
                  const doc = allDocs.find(d => d.pdf_id === id);
                  return (
                    <div key={id} className="flex items-center gap-1 bg-[#931638]/10 text-[#931638] border border-[#931638]/60 px-2 py-1 rounded text-xs animate-in fade-in zoom-in-95 shrink-0">
                      <span className="whitespace-nowrap">{doc?.name}</span>
                      <button onClick={() => removePdf(id)} className="hover:text-[#931638]"><X size={12} /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* SAMPLE QUESTIONS - Shows for all investors */}
      {showFilters && SAMPLE_QUESTIONS[investorId] && history.length === 0 && (
        
          <div className="space-y-1.5">
            {SAMPLE_QUESTIONS[investorId].map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleSampleQuestionClick(sample.question, sample.category, sample.scope|| "all")}
                className="w-full text-left bg-white hover:bg-[#931638]/5 border border-[#931638]/30 hover:border-[#931638]/60 rounded-lg p-2 transition-all group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[#931638] font-bold text-xs mt-0.5 shrink-0">{idx + 1}.</span>
                  <p className="text-xs text-gray-800 group-hover:text-[#931638] font-medium leading-relaxed">
                    {sample.question}
                  </p>
                </div>
              </button>
            ))}
          </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-4 pb-4">
      <div ref={messagesEndRef} />
        {history.length === 0 && !loadingQuestion && <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4"><p className="text-sm font-light">Ask a question to start.</p></div>}
        
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

        {/* STANDALONE VERIFYING INDICATOR — shown during predict-category call AND isVerifying phase */}
        {loadingQuestion && !history.some(qa => qa.loading) && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                {/* Question bubble */}
                <div className="flex justify-end">
                    <div className="bg-[#931638] text-white p-3 rounded-2xl rounded-tr-sm text-sm max-w-[90%] shadow-lg">
                        {loadingQuestion}
                    </div>
                </div>
                {/* Analyzing row */}
                <div className="flex items-center gap-2 ml-1 flex-wrap">
                    <div className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#931638]/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#931638]/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#931638]/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-gray-400">...Analyzing and comparing...</span>
                    {/* Category chip + Change button — only shown once category is detected */}
                    {pendingCategory && (
                        <>
                            <span className="text-[11px] text-gray-400">Filtering by</span>
                            <div className="flex items-center gap-1 bg-[#931638]/10 text-[#931638] border border-[#931638]/25 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                                <Tag size={9} />
                                {pendingCategory}
                            </div>
                            {isVerifying && countdown > 0 && (
                                <button
                                    onClick={handleUserRejection}
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

{history.map((qa) => (
  <div key={qa.id} className="space-y-3">
    
    {/* QUESTION */}
    <div className="flex justify-end">
      <div className="bg-[#931638] text-white p-3 rounded-2xl rounded-tr-sm text-sm max-w-[90%]">
        {qa.question}
      </div>
    </div>

    {/* ANSWER */}
    <div className="flex flex-col gap-3 max-w-[90%]">
      {qa.loading && (
        <div className="flex items-center gap-2 ml-1 flex-wrap">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#931638]/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#931638]/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#931638]/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-gray-400">...Analyzing and comparing...</span>
          {activeLoadingCategory && (
            <>
              <span className="text-[11px] text-gray-400">Filtering by</span>
              <div className="flex items-center gap-1 bg-[#931638]/10 text-[#931638] border border-[#931638]/25 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                <Tag size={9} />
                {activeLoadingCategory}
              </div>
            </>
          )}
        </div>
      )}

      {qa.answers?.map((ans, idx) => (
        <div
          key={idx}
          className="group bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl overflow-hidden transition-all"
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-black">{ans.pdf_name}</h4>
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
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {ans.year && <span>{ans.year}</span>}
              </div>
            </div>
            <p 
              className="text-xs text-gray-700 line-clamp-3 cursor-pointer"
              onClick={() => setSelectedAnswer(ans)}
            >
              {ans.answer_segments?.[0]?.text ?? ""}
            </p>
            {ans.answer_segments && ans.answer_segments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {ans.answer_segments.map((seg, i) => (
                  seg.page !== null && (
                    <span key={i} className="bg-[#931638] text-white px-1.5 py-0.5 rounded text-[10px]">p.{seg.page}</span>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {qa.answers?.length === 0 && !qa.loading && !qa.error && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
          <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900 mb-1">No Results Found</p>
            <p className="text-xs text-amber-700">
              {qa.message || "No relevant information found for your question."}
            </p>
          </div>
        </div>
      )}

      {qa.error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border-2 border-red-200">
          <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900 mb-1">Error</p>
            <p className="text-xs text-red-700">
              {qa.message || "Something went wrong. Please try again."}
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
))}

      </div>
    </div>
  );
}