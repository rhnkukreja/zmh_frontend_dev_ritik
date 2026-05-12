import { useState, useEffect, useCallback, useRef } from 'react';
import { caseStudiesService } from '@/services/caseStudies';
import { toast } from 'react-toastify';

type ActiveAiFilterItem = {
    type: 'investor' | 'theme' | 'year' | 'market';
    value: number | string;
};

const aiFilterTypeToApiKey: Record<ActiveAiFilterItem['type'], string> = {
    investor: 'institution_ids',
    theme: 'themes',
    year: 'years',
    market: 'markets',
};

export const useAiCaseStudies = () => {
    // === AI Related States ===
    const [aiFiltersData, setAiFiltersData] = useState<any>(null);
    const [isAiFiltersLoading, setIsAiFiltersLoading] = useState(false);
    
    // Selection states
    const [selectedAiInstitutionIds, setSelectedAiInstitutionIds] = useState<number[]>([]); // Single selection for institutions
    const [selectedAiThemes, setSelectedAiThemes] = useState<string[]>([]);
    const [selectedAiYears, setSelectedAiYears] = useState<number[]>([2025]); // Default to 2025
    const [selectedAiCompanyIds, setSelectedAiCompanyIds] = useState<number[]>([]);
    const [selectedAiMarkets, setSelectedAiMarkets] = useState<string[]>(["USA"]); // Default to USA
    
    // "All" row toggle states
    const [isAllInvestorsSelected, setIsAllInvestorsSelected] = useState(true);
    const [isAllThemesSelected, setIsAllThemesSelected] = useState(true);
    const [isAllYearsSelected, setIsAllYearsSelected] = useState(false); // Not selected by default since 2025 is pre-selected
    const [isAllMarketsSelected, setIsAllMarketsSelected] = useState(false); // Not selected by default since USA is pre-selected

    // AI Search/Topics states
    const [aiSearchTerm, setAiSearchTerm] = useState("");
    const [aiTopics, setAiTopics] = useState<string[]>([]);
    const [isAiTopicsLoading, setIsAiTopicsLoading] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState<any>(null);
    
    // AI related case studies state
    const [aiCaseStudies, setAiCaseStudies] = useState<any[]>([]);
    const [isAiCaseStudiesLoading, setIsAiCaseStudiesLoading] = useState(false);
    const [aiPage, setAiPage] = useState(1);
    const [aiTotalPages, setAiTotalPages] = useState(1);
    const [aiCaseStudiesCount, setAiCaseStudiesCount] = useState(0);
    const [activeAiFilterOrder, setActiveAiFilterOrder] = useState<ActiveAiFilterItem[]>([]);
    const lastAutoAnalysisKeyRef = useRef<string | null>(null);
    const lastTopicsRequestKeyRef = useRef<string | null>(null);

    // Investor modal state
    const [isInvestorModalOpen, setIsInvestorModalOpen] = useState(false);
    const [investorSearch, setInvestorSearch] = useState("");
    
    // Market modal state
    const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
    const [marketSearch, setMarketSearch] = useState("");

    // === Methods ===

    const fetchAiFilters = useCallback(async () => {
        setIsAiFiltersLoading(true);
        try {
            // Build query params with current selections for dynamic counts
            const params: any = {};
            if (selectedAiInstitutionIds.length > 0) {
                params.institution_ids = selectedAiInstitutionIds.join(',');
            }
            if (selectedAiThemes.length > 0) {
                params.themes = selectedAiThemes.join(',');
            }
            if (selectedAiYears.length > 0) {
                params.years = selectedAiYears.join(',');
            }
            if (selectedAiCompanyIds.length > 0) {
                params.company_ids = selectedAiCompanyIds.join(',');
            }
            if (selectedAiMarkets.length > 0) {
                params.markets = selectedAiMarkets.join(',');
            }

            const selectionOrder = activeAiFilterOrder
                .map((item) => aiFilterTypeToApiKey[item.type])
                .filter((value, index, arr) => arr.indexOf(value) === index);

            if (selectionOrder.length > 0) {
                params.selection_order = selectionOrder.join(',');
            }
            
            const data = await caseStudiesService.getCaseStudiesAIFilters(params);
            setAiFiltersData(data);
        } catch (error) {
            console.error("Error fetching AI filters:", error);
        } finally {
            setIsAiFiltersLoading(false);
        }
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds, selectedAiMarkets, activeAiFilterOrder]);

    const toggleAiFilter = (type: 'investor' | 'theme' | 'year' | 'company' | 'market', value: any) => {
        if (type === 'investor') {
            // Single selection for institutions - replace instead of toggle
            setSelectedAiInstitutionIds(prev => 
                prev.includes(value) ? [] : [value]
            );
            setIsAllInvestorsSelected(false);
        } else if (type === 'theme') {
            // Single selection for themes - replace instead of toggle
            setSelectedAiThemes(prev => 
                prev.includes(value) ? [] : [value]
            );
            setIsAllThemesSelected(false);
        } else if (type === 'year') {
            // Single selection for years - replace instead of toggle
            setSelectedAiYears(prev => 
                prev.includes(value) ? [] : [value]
            );
            setIsAllYearsSelected(false);
        } else if (type === 'company') {
            // Single selection for companies - replace instead of toggle
            setSelectedAiCompanyIds(prev => 
                prev.includes(value) ? [] : [value]
            );
        } else if (type === 'market') {
            // Single selection for markets - replace instead of toggle
            setSelectedAiMarkets(prev => 
                prev.includes(value) ? [] : [value]
            );
            setIsAllMarketsSelected(false);
        }
    };
    
    const toggleAllInvestors = () => {
        setSelectedAiInstitutionIds([]);
        setIsAllInvestorsSelected(true);
    };
    
    const toggleAllThemes = () => {
        setSelectedAiThemes([]);
        setIsAllThemesSelected(true);
    };
    
    const toggleAllYears = () => {
        setSelectedAiYears([]);
        setIsAllYearsSelected(true);
    };
    
    const toggleAllMarkets = () => {
        setSelectedAiMarkets([]);
        setIsAllMarketsSelected(true);
    };

    const isAiFilterSelected = (type: 'investor' | 'theme' | 'year' | 'company' | 'market', value: any) => {
        if (type === 'investor') return selectedAiInstitutionIds.includes(value);
        if (type === 'theme') return selectedAiThemes.includes(value);
        if (type === 'year') return selectedAiYears.includes(value);
        if (type === 'company') return selectedAiCompanyIds.includes(value);
        if (type === 'market') return selectedAiMarkets.includes(value);
        return false;
    };

    const fetchAiTopics = useCallback(async () => {
        setIsAiTopicsLoading(true);
        try {
            const payload = {
                institution_ids: selectedAiInstitutionIds,
                themes: selectedAiThemes,
                years: selectedAiYears,
                company_ids: selectedAiCompanyIds,
                markets: selectedAiMarkets
            };
            
            const data = await caseStudiesService.generateCaseStudiesAITopics(payload);
            setAiTopics(data?.topics || []);
        } catch (error) {
            console.error("Error fetching AI topics:", error);
        } finally {
            setIsAiTopicsLoading(false);
        }
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds, selectedAiMarkets]);

    const handleAiAnalysis = async (term?: string) => {
        const query = term !== undefined ? term : aiSearchTerm;
        
        setIsAiLoading(true);
        // setAiResponse(null); // Optional: clear previous response
        
        try {
            const payload = {
                query: query,
                institution_ids: selectedAiInstitutionIds,
                themes: selectedAiThemes,
                years: selectedAiYears,
                company_ids: selectedAiCompanyIds,
                markets: selectedAiMarkets
            };
            
            const data = await caseStudiesService.getCaseStudiesAISummary(payload);
            setAiResponse(data.summary);
            
            // Also fetch the underlying case studies and reset page
            setAiPage(1);
            fetchRelatedCaseStudies(query, 1);
            
        } catch (error) {
            console.error("Error during AI analysis:", error);
            toast.error("AI analysis failed.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const fetchRelatedCaseStudies = useCallback(async (query: string, pageNum: number) => {
        setIsAiCaseStudiesLoading(true);
        try {
            const params = {
                query: query,
                institution_ids: selectedAiInstitutionIds.join(','),
                themes: selectedAiThemes.join(','),
                years: selectedAiYears.join(','),
                company_ids: selectedAiCompanyIds.join(','),
                markets: selectedAiMarkets.join(','),
                page: pageNum,
                page_size: 9
            };
            
            const data = await caseStudiesService.getRelatedCaseStudiesAI(params);
            setAiCaseStudies(data.results || []);
            setAiCaseStudiesCount(data.count || 0);
            setAiTotalPages(Math.ceil((data.count || 0) / 9));
        } catch (error) {
            console.error("Error fetching related case studies:", error);
        } finally {
            setIsAiCaseStudiesLoading(false);
        }
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds, selectedAiMarkets]);

    // Pagination handlers
    const handleAiPageChange = (newPage: number) => {
        setAiPage(newPage);
        fetchRelatedCaseStudies(aiSearchTerm, newPage);
    };

    const handleAiNextPage = () => {
        if (aiPage < aiTotalPages) handleAiPageChange(aiPage + 1);
    };

    const handleAiPreviousPage = () => {
        if (aiPage > 1) handleAiPageChange(aiPage - 1);
    };

    const handleClearAnalysis = () => {
        setAiSearchTerm("");
        setAiResponse(null);
        setAiPage(1);
        // Trigger auto-analysis with empty query to show filter-based case studies
        handleAiAnalysis("");
    };

    // === Effects ===

    useEffect(() => {
        fetchAiFilters();
    }, [fetchAiFilters]);

    useEffect(() => {
        if (!aiFiltersData) {
            return;
        }

        const topicsRequestKey = JSON.stringify({
            institution_ids: selectedAiInstitutionIds,
            themes: selectedAiThemes,
            years: selectedAiYears,
            company_ids: selectedAiCompanyIds,
            markets: selectedAiMarkets,
        });

        if (lastTopicsRequestKeyRef.current === topicsRequestKey) {
            return;
        }

        lastTopicsRequestKeyRef.current = topicsRequestKey;
        fetchAiTopics();
    }, [aiFiltersData, selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds, selectedAiMarkets, fetchAiTopics]);

    useEffect(() => {
        const selectedFilters: ActiveAiFilterItem[] = [
            ...selectedAiMarkets.map((market) => ({ type: 'market' as const, value: market })),
            ...selectedAiYears.map((year) => ({ type: 'year' as const, value: year })),
            ...selectedAiInstitutionIds.map((id) => ({ type: 'investor' as const, value: id })),
            ...selectedAiThemes.map((theme) => ({ type: 'theme' as const, value: theme })),
        ];

        setActiveAiFilterOrder((prev) => {
            const preserved = prev.filter((prevItem) =>
                selectedFilters.some(
                    (item) => item.type === prevItem.type && item.value === prevItem.value
                )
            );

            const appended = selectedFilters.filter(
                (item) =>
                    !preserved.some(
                        (prevItem) => prevItem.type === item.type && prevItem.value === prevItem.value
                    )
            );

            const combined = [...preserved, ...appended];
            
            // Sort to ensure markets are always first, then maintain relative order for others
            const next = combined.sort((a, b) => {
                if (a.type === 'market' && b.type !== 'market') return -1;
                if (a.type !== 'market' && b.type === 'market') return 1;
                return 0;
            });
            
            const hasChanged =
                next.length !== prev.length ||
                next.some(
                    (item, index) =>
                        item.type !== prev[index]?.type || item.value !== prev[index]?.value
                );

            return hasChanged ? next : prev;
        });
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiMarkets]);

    useEffect(() => {
        setAiSearchTerm("");
        setAiResponse(null);
        setAiCaseStudies([]);
        setAiPage(1);
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds, selectedAiMarkets]);

    useEffect(() => {
        if (!aiFiltersData) {
            return;
        }

        const autoAnalysisKey = JSON.stringify({
            institution_ids: selectedAiInstitutionIds,
            themes: selectedAiThemes,
            years: selectedAiYears,
            company_ids: selectedAiCompanyIds,
            markets: selectedAiMarkets,
        });

        if (lastAutoAnalysisKeyRef.current === autoAnalysisKey) {
            return;
        }

        lastAutoAnalysisKeyRef.current = autoAnalysisKey;
        handleAiAnalysis("");
    }, [aiFiltersData, selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds, selectedAiMarkets]);

    return {
        // States
        aiFiltersData,
        isAiFiltersLoading,
        selectedAiInstitutionIds,
        setSelectedAiInstitutionIds,
        selectedAiThemes,
        setSelectedAiThemes,
        selectedAiYears,
        setSelectedAiYears,
        selectedAiCompanyIds,
        setSelectedAiCompanyIds,
        selectedAiMarkets,
        setSelectedAiMarkets,
        isAllInvestorsSelected,
        setIsAllInvestorsSelected,
        isAllThemesSelected,
        setIsAllThemesSelected,
        isAllYearsSelected,
        setIsAllYearsSelected,
        isAllMarketsSelected,
        setIsAllMarketsSelected,
        aiSearchTerm,
        setAiSearchTerm,
        aiTopics,
        isAiTopicsLoading,
        isAiLoading,
        aiResponse,
        aiCaseStudies,
        isAiCaseStudiesLoading,
        aiPage,
        aiTotalPages,
        aiCaseStudiesCount,
        activeAiFilterOrder,
        // Modal
        isInvestorModalOpen,
        setIsInvestorModalOpen,
        investorSearch,
        setInvestorSearch,
        isMarketModalOpen,
        setIsMarketModalOpen,
        marketSearch,
        setMarketSearch,
        // Methods
        toggleAiFilter,
        isAiFilterSelected,
        toggleAllInvestors,
        toggleAllThemes,
        toggleAllYears,
        toggleAllMarkets,
        handleAiAnalysis,
        handleClearAnalysis,
        handleAiPageChange,
        handleAiNextPage,
        handleAiPreviousPage
    };
};
