import { Popover, Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { useEffect, useState, useCallback } from "react";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import CPagination from "@/components/Pagination";
import { countValidFilters, createDynamicURL, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import { useForm } from "react-hook-form";
import {
    fetchCaseStudies,
    setFilters,
    setPage,
} from "@/stores/caseStudySlice";
import { useNavigate, useSearchParams } from "react-router-dom";

import CompanySelect from "@/components/ReactSelectAsync";
import { modifyRoute } from "@/stores/themeSlice";
import useCaseStudyDropdowns from "@/hooks/useGetCaseStudiesDropdownValues";
import clsx from "clsx";
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaLayerGroup, FaTags, FaUserTie, FaHandshake, FaListUl } from "react-icons/fa";
import AddNewCaseStudies from "../CaseStudies/Components/AddEditCaseStudies";

import CaseStudyCard from "./Components/CaseStudyCard";
import InvestorModal from "./Components/InvestorModal";

// Hook
import { useAiCaseStudies } from "../../hooks/useAiCaseStudies";
import ActiveFilterChips from "./Components/ActiveFilterChips";
import AiFiltersSidebar from "./Components/AiFiltersSidebar";
import AiAnalyzerSection from "./Components/AiAnalyzerSection";
import AiResponseCard from "./Components/AiResponseCard";
import Lucide from "@/components/Base/Lucide";

interface CaseStudyFilter {
    keyword: string[];
    market: string[];
    sector: string[];
    year: string[];
    institution_name?: string[];
    global_search?: any[];
    themes: string[];
    proposal_type: string[];
    vote: string[];
    company_name?: string[];
    approval_status: string;
    caspio_company_name: string;
    [key: string]: any;
    index?: string | string[];
}
function CaseStudiesAI() {
    const dispatch: AppDispatch = useAppDispatch();
    const navigate = useNavigate();

    // CaseStudiesAI Hook
    const {
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
        isInvestorModalOpen,
        setIsInvestorModalOpen,
        investorSearch,
        setInvestorSearch,
        toggleAiFilter,
        isAiFilterSelected,
        handleAiAnalysis,
        handleAiPageChange,
        handleAiNextPage,
        handleAiPreviousPage
    } = useAiCaseStudies();

    const {
        loading,
        caseStudies,
        page,
        totalPages,
        filters,
        count,
        isAllCompanySelected,
    } = useAppSelector((state) => state.caseStudies);

    const { apiDropdownOptions, loading: getDropdownLoader } =
        useCaseStudyDropdowns();
    const [searchParams] = useSearchParams();

    const { user, companyGlobalSearchName } = useAppSelector(
        (state) => state.authentiction
    );

    const { instituteName: InstituteName } = useAppSelector(
        (state) => state.dashboard
    );

    const [searchTerms, setSearchTerms] = useState<string[]>(
        searchParams.get("institution_name")
            ? [searchParams.get("institution_name")]
            : filters.institution_name.length > 0
                ? filters.institution_name
                : []
    );

    const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
    const [selectedCaseStudies, setSelectedCaseStudies] = useState<any | null>(
        null
    );
    const [loadingDownload, setLoadingDownload] = useState(false);
    const [filtersLength, setFiltersLength] = useState<number>(0);
    const [addNewCaseStudyModalVisible, setAddNewCaseStudyModalVisible] =
        useState<boolean>(false);

    const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCaseStudy, setSelectedCaseStudy] = useState<any>(null);
    
    

    const {
        handleSubmit,
        control,

        setValue,
        watch,
        formState: { errors },
    } = useForm<CaseStudyFilter>({
        defaultValues: {
            themes: filters?.themes,
            keyword: filters?.keyword || [],
            market: filters?.market,
            sector: filters?.sector,
            // Ensure year is always an array of strings
            year: filters?.year ? filters.year.map(String) : [],
            institution_name: filters?.institution_name,
            global_search:
                filters?.global_search?.map((item: string) => ({
                    value: item,
                    label: item,
                })) || [],
            proposal_type: filters?.proposal_type,
            vote: filters?.vote,
            approval_status: filters?.approval_status,
            caspio_company_name: filters?.caspio_company_name,
            index: filters?.index || []
        },
    });


    useEffect(() => {
        dispatch(
            setFilters({
                key: "global_search",
                value: isAllCompanySelected ? [] : [companyGlobalSearchName],
            })
        );

        dispatch(
            modifyRoute({
                route: "case-studies",
                type: isAllCompanySelected === true ? true : false,
            })
        );
    }, [companyGlobalSearchName, isAllCompanySelected]);

    useEffect(() => {
        if (isAllCompanySelected === false && filters?.global_search.length === 0) {
            return;
        }

        // For "View For All Companies", keep global_search only when companies are selected
        const hasSelectedCompanies =
            Array.isArray(filters?.global_search) && filters.global_search.length > 0;
        const apiFilters =
            isAllCompanySelected && !hasSelectedCompanies
                ? { ...filters, global_search: undefined }
                : filters;

        const dynamicURL = createDynamicURL(
            `${baseURL}/case_studies/`,
            apiFilters,
            undefined,
            page
        );
        dispatch(fetchCaseStudies(dynamicURL));

        const { institution_name, global_search, ...restFilters } = filters;
        setFiltersLength(
            countValidFilters(
                isAllCompanySelected === false
                    ? restFilters
                    : { ...restFilters, global_search: filters.global_search }
            )
        );

        // Include institution/company filters in chips with proper formatting
        const filtersWithInstitution = {
            ...restFilters,
            ...(institution_name && institution_name.length > 0 && { institution_name }),
            ...(isAllCompanySelected && global_search && global_search.length > 0 && {
                global_search,
            }),
        };

        setSelectedChipFilters(generateFilterChips(filtersWithInstitution));

    }, [page, filters, InstituteName]);

    const handleNextPage = () => {
        if (page < totalPages) {
            dispatch(setPage(page + 1));
        }
    };

    const handlePreviousPage = () => {
        if (page > 1) {
            dispatch(setPage(page - 1));
        }
    };

    const handlePageChange = (newPage: number) => {
        dispatch(setPage(newPage));
    };


    
    const isAiFlowActive = aiResponse !== null || isAiCaseStudiesLoading || aiCaseStudies.length > 0;
    const displayCount = isAiFlowActive ? aiCaseStudiesCount : count;
    const displayLoading = isAiFlowActive ? isAiCaseStudiesLoading : loading;
    const displayData = isAiFlowActive ? aiCaseStudies : caseStudies;
    const displayPage = isAiFlowActive ? aiPage : page;
    const displayTotalPages = isAiFlowActive ? aiTotalPages : totalPages;
    const displayHandleNextPage = isAiFlowActive ? handleAiNextPage : handleNextPage;
    const displayHandlePreviousPage = isAiFlowActive ? handleAiPreviousPage : handlePreviousPage;
    const displayHandlePageChange = isAiFlowActive ? handleAiPageChange : handlePageChange;

    return (
        <>
            <div className="grid grid-cols-12 gap-y-10 gap-x-6">
                <div className="col-span-12">
                    {/* Sticky Header OUTSIDE scrollable content */}
                    <div className="w-full sticky z-30 header-card transition-[margin,width,opacity] duration-1000 ease-in-out bg-white" style={{ top: '4rem', minHeight: '64px' }}>
                        <div className="bg-white px-4 h-full min-h-[64px] flex flex-col md:flex-row items-center">
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                Case Studies AI
                            </h1>
                        </div>
                    </div>
                    {/* Scrollable Content BELOW sticky header */}
                    <div className="mt-3.5 relative">
                        <div className="flex flex-col box box--stacked bg-white p-5">
                            <ActiveFilterChips
                                selectedAiInstitutionIds={selectedAiInstitutionIds}
                                selectedAiThemes={selectedAiThemes}
                                selectedAiYears={selectedAiYears}
                                aiFiltersData={aiFiltersData}
                                toggleAiFilter={toggleAiFilter}
                                onClearAll={() => {
                                    setSelectedAiInstitutionIds([]);
                                    setSelectedAiThemes([]);
                                    setSelectedAiYears([]);
                                }}
                            />

                            {/* 2-COLUMN LAYOUT: AI Filters (Sidebar) + Main Content (AI Analyzer & Cards) */}
                            <div className="grid grid-cols-12 md:gap-6 pb-6 pt-8">

                                {/* SIDEBAR: AI Filters */}
                                <AiFiltersSidebar
                                    isAiFiltersLoading={isAiFiltersLoading}
                                    aiFiltersData={aiFiltersData}
                                    isAllInvestorsSelected={isAllInvestorsSelected}
                                    setIsAllInvestorsSelected={setIsAllInvestorsSelected}
                                    toggleAiFilter={toggleAiFilter}
                                    isAiFilterSelected={isAiFilterSelected}
                                    setInvestorSearch={setInvestorSearch}
                                    setIsInvestorModalOpen={setIsInvestorModalOpen}
                                    isAllThemesSelected={isAllThemesSelected}
                                    setIsAllThemesSelected={setIsAllThemesSelected}
                                    isAllYearsSelected={isAllYearsSelected}
                                    setIsAllYearsSelected={setIsAllYearsSelected}
                                />

                                {/* MAIN CONTENT: Analyzer + Case Studies */}
                                <div className="col-span-12 md:col-span-8 xl:col-span-9">

                                    {/* AI Investor Stance Analyzer Section */}
                                    <AiAnalyzerSection
                                        aiSearchTerm={aiSearchTerm}
                                        setAiSearchTerm={setAiSearchTerm}
                                        handleAiAnalysis={handleAiAnalysis}
                                        isAiTopicsLoading={isAiTopicsLoading}
                                        aiTopics={aiTopics}
                                        isAiLoading={isAiLoading}
                                    />

                                    {/* AI Response Section */}
                                    <AiResponseCard
                                        aiResponse={aiResponse}
                                        scrollToRelated={() => {
                                            const grid = document.getElementById('case-studies-grid');
                                            grid?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    />

                                    {/* New Card View for AI specific case studies */}
                                    {!displayLoading && displayData?.length > 0 && (
                                        <>
                                            <div className="flex flex-row-reverse items-center justify-between my-4">
                                                {displayCount > 0 && (
                                                    <h2 className="font-semibold" style={{ fontSize: '14px' }}>
                                                        Count: {displayCount.toLocaleString()}
                                                    </h2>
                                                )}
                                                <h4 className="text-xs font-bold uppercase tracking-widest">Related Case Studies</h4>
                                            </div>
                                            <div id="case-studies-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
                                                {displayData.map((item: any) => (
                                                    <CaseStudyCard
                                                        key={item.id}
                                                        item={item}
                                                        onClick={() => {
                                                            setSelectedCaseStudy(item);
                                                            setIsModalOpen(true);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* No Data State */}
                                    {!displayLoading && displayData?.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <Lucide
                                                icon="FileSearch"
                                                className="w-16 h-16 text-slate-200 mb-4"
                                            />
                                            <div className="text-xl font-bold text-slate-700">
                                                {isAiFlowActive ? "No Related Case Studies" : "No Case Studies Found"}
                                            </div>
                                            <div className="text-slate-500 mt-2">
                                                {isAiFlowActive
                                                    ? "Select AI filters and hit Analyze to see underlying cases"
                                                    : "Try adjusting your filters or keyword search"}
                                            </div>
                                        </div>
                                    )}

                                    {/* Loading State for Cards */}
                                    {displayLoading && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
                                            {[...Array(6)].map((_, i) => (
                                                <div key={i} className="animate-pulse bg-slate-50 border rounded-xl h-48"></div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Pagination properly aligned inside the main column */}
                                    <div className="flex flex-col-reverse flex-wrap items-center flex-reverse gap-y-2 sm:flex-row mt-10">
                                        <CPagination
                                            page={displayPage}
                                            totalPages={displayTotalPages}
                                            handleNextPage={displayHandleNextPage}
                                            handlePageChange={displayHandlePageChange}
                                            handlePreviousPage={displayHandlePreviousPage}
                                        />
                                    </div>

                                </div> {/* End of Main Content Column */}
                            </div> {/* End of 2-Column Grid */}

                            {/* Detailed Modal */}
                            <Dialog
                                open={isModalOpen}
                                onClose={() => setIsModalOpen(false)}
                                size="lg"
                            >
                                <Dialog.Panel>
                                    <Dialog.Title className="flex justify-between items-center bg-primary p-6 !text-white rounded-t-lg">
                                        <div className="flex-1">
                                            <h2 className="text-2xl font-bold">
                                                {selectedCaseStudy?.company_name || selectedCaseStudy?.caspio_company_name}
                                            </h2>
                                            <div className="flex items-center gap-2 mt-1 opacity-90 text-sm">
                                                <span>{selectedCaseStudy?.institution_name}</span>
                                                <span>•</span>
                                                <span>{selectedCaseStudy?.esg_themes}</span>
                                                <span>•</span>
                                                <span>{selectedCaseStudy?.year}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <FaTimes size={20} />
                                        </button>
                                    </Dialog.Title>
                                    <Dialog.Description className="p-8 overflow-y-auto max-h-[70vh]">
                                        <div className="space-y-8">
                                            <div>
                                                <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                                                    <FaLayerGroup size={12} /> Resolution / Engagement Topic
                                                </h4>
                                                <div className="text-lg font-semibold text-slate-800">
                                                    {selectedCaseStudy?.resolution_engagement_topic || 'Not Specified'}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                                                    <FaBuilding size={12} /> Background & Details
                                                </h4>
                                                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                                    {selectedCaseStudy?.engagement_details || 'No details available.'}
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                                                    <FaHandshake size={12} /> Engagement/Voting Summary
                                                </h4>
                                                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                                    {selectedCaseStudy?.voting_details || 'No voting details available.'}
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                                                    <FaCheckCircle size={12} /> Outcome & Voting Decision
                                                </h4>
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className={clsx(
                                                            "px-4 py-1.5 rounded-full font-bold text-sm",
                                                            selectedCaseStudy?.vote?.toLowerCase()?.includes('for') ? "bg-success/10 text-success border border-success/20" :
                                                                selectedCaseStudy?.vote?.toLowerCase()?.includes('against') ? "bg-danger/10 text-danger border border-danger/20" :
                                                                    "bg-warning/10 text-warning border border-warning/20"
                                                        )}>
                                                            Vote: {selectedCaseStudy?.vote || 'Pending'}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100 italic">
                                                        {selectedCaseStudy?.voting_rationale || 'No rationale provided.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Dialog.Description>
                                    <div className="p-6 border-t bg-slate-50 flex justify-end">
                                        <Button
                                            variant="primary"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-8"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </Dialog.Panel>
                            </Dialog>


                            {addNewCaseStudyModalVisible && (
                                <AddNewCaseStudies
                                    addNewCaseStudyModalVisible={addNewCaseStudyModalVisible}
                                    setAddNewCaseStudyModalVisible={
                                        setAddNewCaseStudyModalVisible
                                    }
                                    selectedCaseStudies={selectedCaseStudies}
                                />
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* ===== ALL INVESTORS MODAL ===== */}
            <InvestorModal
                isOpen={isInvestorModalOpen}
                onClose={() => setIsInvestorModalOpen(false)}
                investorSearch={investorSearch}
                setInvestorSearch={setInvestorSearch}
                selectedAiInstitutionIds={selectedAiInstitutionIds}
                setSelectedAiInstitutionIds={setSelectedAiInstitutionIds}
                aiFiltersData={aiFiltersData}
                toggleAiFilter={toggleAiFilter}
                isAiFilterSelected={isAiFilterSelected}
            />
        </>
    );
}

export default CaseStudiesAI;
