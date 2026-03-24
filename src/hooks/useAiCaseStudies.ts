import { useState, useEffect, useCallback, useRef } from 'react';
import { caseStudiesService } from '@/services/caseStudies';
import { toast } from 'react-toastify';

type ActiveAiFilterItem = {
    type: 'investor' | 'theme' | 'year';
    value: number | string;
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
    
    // "All" row toggle states
    const [isAllInvestorsSelected, setIsAllInvestorsSelected] = useState(true);
    const [isAllThemesSelected, setIsAllThemesSelected] = useState(true);
    const [isAllYearsSelected, setIsAllYearsSelected] = useState(false); // Not selected by default since 2025 is pre-selected

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

    // Investor modal state
    const [isInvestorModalOpen, setIsInvestorModalOpen] = useState(false);
    const [investorSearch, setInvestorSearch] = useState("");

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
            
            const data = await caseStudiesService.getCaseStudiesAIFilters(params);
            setAiFiltersData(data);
        } catch (error) {
            console.error("Error fetching AI filters:", error);
        } finally {
            setIsAiFiltersLoading(false);
        }
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds]);

    const toggleAiFilter = (type: 'investor' | 'theme' | 'year' | 'company', value: any) => {
        if (type === 'investor') {
            // Single selection for institutions - replace instead of toggle
            setSelectedAiInstitutionIds(prev => 
                prev.includes(value) ? [] : [value]
            );
            setIsAllInvestorsSelected(false);
        } else if (type === 'theme') {
            setSelectedAiThemes(prev => 
                prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
            );
            setIsAllThemesSelected(false);
        } else if (type === 'year') {
            setSelectedAiYears(prev => 
                prev.includes(value) ? prev.filter(y => y !== value) : [...prev, value]
            );
            setIsAllYearsSelected(false);
        } else if (type === 'company') {
            setSelectedAiCompanyIds(prev => 
                prev.includes(value) ? prev.filter(id => id !== value) : [...prev, value]
            );
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

    const isAiFilterSelected = (type: 'investor' | 'theme' | 'year' | 'company', value: any) => {
        if (type === 'investor') return selectedAiInstitutionIds.includes(value);
        if (type === 'theme') return selectedAiThemes.includes(value);
        if (type === 'year') return selectedAiYears.includes(value);
        if (type === 'company') return selectedAiCompanyIds.includes(value);
        return false;
    };

    const fetchAiTopics = useCallback(async () => {
        setIsAiTopicsLoading(true);
        try {
            const payload = {
                institution_ids: selectedAiInstitutionIds,
                themes: selectedAiThemes,
                years: selectedAiYears,
                company_ids: selectedAiCompanyIds
            };
            
            const data = await caseStudiesService.generateCaseStudiesAITopics(payload);
            setAiTopics(data?.topics || []);
        } catch (error) {
            console.error("Error fetching AI topics:", error);
        } finally {
            setIsAiTopicsLoading(false);
        }
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds]);

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
                company_ids: selectedAiCompanyIds
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
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds]);

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

    // === Effects ===

    useEffect(() => {
        fetchAiFilters();
    }, [fetchAiFilters]);

    useEffect(() => {
        if (aiFiltersData) {
            fetchAiTopics();
        }
    }, [aiFiltersData, fetchAiTopics]);

    useEffect(() => {
        const selectedFilters: ActiveAiFilterItem[] = [
            ...selectedAiInstitutionIds.map((id) => ({ type: 'investor' as const, value: id })),
            ...selectedAiThemes.map((theme) => ({ type: 'theme' as const, value: theme })),
            ...selectedAiYears.map((year) => ({ type: 'year' as const, value: year })),
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

            const next = [...preserved, ...appended];
            const hasChanged =
                next.length !== prev.length ||
                next.some(
                    (item, index) =>
                        item.type !== prev[index]?.type || item.value !== prev[index]?.value
                );

            return hasChanged ? next : prev;
        });
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears]);

    useEffect(() => {
        setAiSearchTerm("");
        setAiResponse(null);
        setAiCaseStudies([]);
        setAiPage(1);
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds]);

    useEffect(() => {
        if (!aiFiltersData) {
            return;
        }

        const autoAnalysisKey = JSON.stringify({
            institution_ids: selectedAiInstitutionIds,
            themes: selectedAiThemes,
            years: selectedAiYears,
            company_ids: selectedAiCompanyIds,
        });

        if (lastAutoAnalysisKeyRef.current === autoAnalysisKey) {
            return;
        }

        lastAutoAnalysisKeyRef.current = autoAnalysisKey;
        handleAiAnalysis("");
    }, [aiFiltersData, selectedAiInstitutionIds, selectedAiThemes, selectedAiYears, selectedAiCompanyIds]);

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
        isAllInvestorsSelected,
        setIsAllInvestorsSelected,
        isAllThemesSelected,
        setIsAllThemesSelected,
        isAllYearsSelected,
        setIsAllYearsSelected,
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
        // Methods
        toggleAiFilter,
        isAiFilterSelected,
        toggleAllInvestors,
        toggleAllThemes,
        toggleAllYears,
        handleAiAnalysis,
        handleAiPageChange,
        handleAiNextPage,
        handleAiPreviousPage
    };
};
