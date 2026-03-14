import Lucide from "@/components/Base/Lucide";
import { Popover, Dialog } from "@/components/Base/Headless";
import { FormCheck, FormInput, FormSwitch } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { useEffect, useMemo, useState, useCallback } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { convertToTitleCase, countValidFilters, createDynamicURL, downloadFileFromAPI, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "@/components/Base/Tippy";
import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import Table from "@/components/Base/Table";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import {
    fetchCaseStudies,
    setFilters,
    setPage,
    resetFilters,
    setAllFilters,
    selectUnSelectAllCompany,
    resetPage,
} from "@/stores/caseStudySlice";
import { useNavigate, useSearchParams } from "react-router-dom";

import { commonService } from "@/services/common";
import { axiosInstance } from "@/services";
import { caseStudiesService } from "@/services/caseStudies";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { toast } from "react-toastify";
import CompanySelect from "@/components/ReactSelectAsync";
import { modifyRoute } from "@/stores/themeSlice";
import { setInstitution } from "@/stores/dashboardSlice";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import useCaseStudyDropdowns from "@/hooks/useGetCaseStudiesDropdownValues";
import clsx from "clsx";
import FilterChips from "@/components/FilterChips";
import StandardizedFilterPills from "@/components/StandardizedFilterPills";
import StandardizedTable from "@/components/StandardizedTable";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import CreatableInputSelect from "@/components/Base/CreatableInputSelect";
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaLayerGroup, FaTags, FaUserTie, FaHandshake, FaListUl } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import AddNewCaseStudies from "../CaseStudies/Components/AddEditCaseStudies";

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
    const [keywordDropdownOptions, setKeywordDropdownOptions] = useState<string[]>([]);
    const [keywordLoading, setKeywordLoading] = useState(false);
    const [aiSearchTerm, setAiSearchTerm] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState<any>(null);
    const [aiFiltersData, setAiFiltersData] = useState<any>(null);
    const [isAiFiltersLoading, setIsAiFiltersLoading] = useState<boolean>(false);

    // --- AI Flow States ---
    const [selectedAiInstitutionIds, setSelectedAiInstitutionIds] = useState<number[]>([]);
    const [selectedAiThemes, setSelectedAiThemes] = useState<string[]>([]);
    const [selectedAiYears, setSelectedAiYears] = useState<number[]>([]);

    const [aiTopics, setAiTopics] = useState<string[]>([]);
    const [isAiTopicsLoading, setIsAiTopicsLoading] = useState(false);

    // AI related case studies state
    const [aiCaseStudies, setAiCaseStudies] = useState<any[]>([]);
    const [isAiCaseStudiesLoading, setIsAiCaseStudiesLoading] = useState(false);
    const [aiPage, setAiPage] = useState(1);
    const [aiTotalPages, setAiTotalPages] = useState(1);
    const [aiCaseStudiesCount, setAiCaseStudiesCount] = useState(0);
    // -----------------------

    const handleAiAnalysis = async (term: string) => {
        const query = term || aiSearchTerm;
        if (!query) return;

        setIsAiLoading(true);
        setAiResponse(null);

        try {
            const payload: any = { query };
            if (selectedAiInstitutionIds.length > 0) payload.institution_ids = selectedAiInstitutionIds;
            if (selectedAiThemes.length > 0) payload.themes = selectedAiThemes;
            if (selectedAiYears.length > 0) payload.years = selectedAiYears;

            const response = await caseStudiesService.getCaseStudiesAISummary(payload);
            setAiResponse(response.summary);
            
            // Also trigger fetching related case studies and reset its page
            setAiPage(1);
            fetchRelatedCaseStudies(query, 1);
        } catch (error) {
            console.error("Error fetching AI summary:", error);
            setAiResponse({
                title: `Analysis Error`,
                total_cases: 0,
                voted_against: 0,
                voted_for: 0,
                key_alert: `Error retrieving summary`,
                main_summary: `We encountered an issue fetching the AI summary. Please try again.`,
                key_observations: []
            });
        } finally {
            setIsAiLoading(false);
        }
    };

    const fetchRelatedCaseStudies = async (query: string, pageNum: number) => {
        setIsAiCaseStudiesLoading(true);
        try {
            const params: any = { query, page: pageNum, page_size: 10 };
            if (selectedAiInstitutionIds.length > 0) params.institution_ids = selectedAiInstitutionIds.join(',');
            if (selectedAiThemes.length > 0) params.themes = selectedAiThemes.join(',');
            if (selectedAiYears.length > 0) params.years = selectedAiYears.join(',');

            const response = await caseStudiesService.getRelatedCaseStudiesAI(params);
            setAiCaseStudies(response.results);
            setAiCaseStudiesCount(response.count);
            setAiTotalPages(Math.ceil(response.count / 10));
        } catch (error) {
            console.error("Error fetching related case studies:", error);
            setAiCaseStudies([]);
            setAiTotalPages(1);
            setAiCaseStudiesCount(0);
        } finally {
            setIsAiCaseStudiesLoading(false);
        }
    };

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

    const resetFormValues = () => {
        setValue("themes", []);
        setValue("keyword", []);
        setValue("market", []);
        setValue("sector", []);
        setValue("year", []);
        setValue("global_search", []);
        setValue("proposal_type", []);
        setValue("vote", []);
        setValue("approval_status", "");
        setValue("caspio_company_name", "");
        setValue("index", []);
    };

    // Debounced keyword search function using Lodash (same as global search)
    const debouncedFetchKeywordSuggestions = useCallback(
        _.debounce(async (searchTerm: string) => {
            if (searchTerm.length < 2) {
                setKeywordDropdownOptions([]);
                setKeywordLoading(false);
                return;
            }

            setKeywordLoading(true);

            try {
                const dynamicURL = createDynamicURL(
                    '/get_case_studies_dropdown_values/',
                    null,
                    { keyword: searchTerm },
                    null
                );

                const response = await axiosInstance.get(dynamicURL);

                // Extract synonyms from the response
                const synonyms = response.data.synonyms || [];
                console.log('Received synonyms:', synonyms); // Debug log
                setKeywordDropdownOptions(synonyms); // Set strings directly, not objects
            } catch (error) {
                console.error('Error fetching keyword suggestions:', error);
                setKeywordDropdownOptions([]);
            } finally {
                setKeywordLoading(false);
            }
        }, 500), // 500ms debounce like global search
        []
    );

    const fetchKeywordSuggestions = (searchTerm: string) => {
        debouncedFetchKeywordSuggestions(searchTerm);
    };

    useEffect(() => {
        const fetchAIFilters = async () => {
            try {
                setIsAiFiltersLoading(true);
                const response = await caseStudiesService.getCaseStudiesAIFilters();
                console.log("AI Filters Data:", response);
                setAiFiltersData(response);
            } catch (error) {
                console.error("Error fetching AI filters:", error);
            } finally {
                setIsAiFiltersLoading(false);
            }
        };

        fetchAIFilters();
    }, []);

    const fetchAITopics = async () => {
        setIsAiTopicsLoading(true);
        try {
            const payload: any = {};
            if (selectedAiInstitutionIds.length > 0) payload.institution_ids = selectedAiInstitutionIds;
            if (selectedAiThemes.length > 0) payload.themes = selectedAiThemes;
            if (selectedAiYears.length > 0) payload.years = selectedAiYears;

            const response = await caseStudiesService.generateCaseStudiesAITopics(payload);
            setAiTopics(response.topics || []);
        } catch (error) {
            console.error("Error generating AI topics:", error);
            setAiTopics([]);
        } finally {
            setIsAiTopicsLoading(false);
        }
    };

    useEffect(() => {
        fetchAITopics();
    }, [selectedAiInstitutionIds, selectedAiThemes, selectedAiYears]);

    const toggleAiFilter = (type: 'investor' | 'theme' | 'year', value: any) => {
        if (type === 'investor') {
            setSelectedAiInstitutionIds(prev =>
                prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
            );
        } else if (type === 'theme') {
            setSelectedAiThemes(prev =>
                prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
            );
        } else if (type === 'year') {
            setSelectedAiYears(prev =>
                prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
            );
        }
    };

    const isAiFilterSelected = (type: 'investor' | 'theme' | 'year', value: any) => {
        if (type === 'investor') return selectedAiInstitutionIds.includes(value);
        if (type === 'theme') return selectedAiThemes.includes(value);
        if (type === 'year') return selectedAiYears.includes(value);
        return false;
    };

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

    const handleAiNextPage = () => {
        if (aiPage < aiTotalPages) {
            setAiPage(aiPage + 1);
            fetchRelatedCaseStudies(aiSearchTerm, aiPage + 1);
        }
    };

    const handleAiPreviousPage = () => {
        if (aiPage > 1) {
            setAiPage(aiPage - 1);
            fetchRelatedCaseStudies(aiSearchTerm, aiPage - 1);
        }
    };

    const handleAiPageChange = (newPage: number) => {
        setAiPage(newPage);
        fetchRelatedCaseStudies(aiSearchTerm, newPage);
    };

    const onFilterClear = () => {
        resetFormValues();
        dispatch(resetFilters());
        dispatch(resetPage());
        dispatch(
            setFilters({ key: "global_search", value: [companyGlobalSearchName] })
        );
    };

    const handleClearAllFilter = () => {
        setSearchTerms([]);
        // resetFormValues();
        // dispatch(resetFilters());
        dispatch(resetPage());
        dispatch(
            setFilters({ key: "global_search", value: [companyGlobalSearchName] })
        );
        dispatch(setInstitution(""));
    };

    const handleSearch = (searchTerms: string[]) => {
        dispatch(setFilters({ key: "institution_name", value: searchTerms }));

        dispatch(setInstitution(searchTerms[0]));
    };

    const handleCollapseFilter = (event: React.MouseEvent) => {
        event.preventDefault();
        setIsFilterCollapse(!isFilterCollapse);
    };

    const onSubmit = async (caseStudyFilters: CaseStudyFilter) => {
        const filtersToApply = { ...caseStudyFilters };

        // Remove index if empty or blank
        if (!filtersToApply.index || filtersToApply.index === " " || filtersToApply.index === "" ||
            (Array.isArray(filtersToApply.index) && filtersToApply.index.length === 0)) {
            delete filtersToApply.index;
        }

        dispatch(
            setAllFilters({
                ...filtersToApply,
                institution_name: searchTerms,
                global_search: isAllCompanySelected
                    ? Array.isArray(caseStudyFilters?.global_search) &&
                        caseStudyFilters?.global_search.length > 0
                        ? caseStudyFilters?.global_search.map((item: any) => item.label)
                        : []
                    : [companyGlobalSearchName],
            })
        );
        setIsFilterCollapse(!isFilterCollapse);
        dispatch(resetPage());
    };

    const getSavedSearches = () => {
        if (user?.saved_search["Case Studies"]) {
            const savedSearch = user.saved_search["Case Studies"];

            setSearchTerms([...savedSearch?.institution]);
            setValue("keyword", savedSearch?.keyword || []);
            setValue("market", savedSearch?.market || []);
            setValue("sector", savedSearch?.sector || []);
            setValue("year", savedSearch?.year || []);
            setValue("themes", savedSearch.themes || []);
            setValue("approval_status", savedSearch.approval_status || "");
            setValue("caspio_company_name", savedSearch?.caspio_company_name || "");
            setValue("proposal_type", savedSearch?.proposal_type || []);
            setValue("vote", savedSearch?.vote || []);
            setValue("index", user?.saved_search?.index || []);
            dispatch(
                setAllFilters({
                    keyword: savedSearch?.keyword || [],
                    market: savedSearch?.market || [],
                    sector: savedSearch?.sector || [],
                    year: savedSearch?.year || [],
                    themes: savedSearch?.themes || [],
                    approval_status: savedSearch?.approval_status || "",
                    caspio_company_name: savedSearch?.caspio_company_name || "",
                    proposal_type: savedSearch?.proposal_type || [],
                    vote: savedSearch?.vote || [],
                    global_search: savedSearch?.global_search,
                    index: user?.saved_search?.index,

                })
            );
            setIsFilterCollapse(true);
        }
    };

    const saveSearch = async () => {
        const res = await commonService.saveSearches({
            module: "Case Studies",
            institution: searchTerms,
            market: filters.market || [],
            sector: filters.sector || [],
            themes: filters.themes || [],
            approval_status: filters.approval_status || "",
            caspio_company_name: filters.caspio_company_name || "",
            proposal_type: filters.proposal_type || [],
            vote: filters.vote || [],
            year: filters.year || [],
            keyword: filters.keyword || [],
            global_search: [companyGlobalSearchName],
            index: filters.index || "",

        });
        if (res?.user_id) {
            dispatch(
                setSavedSearch({
                    key: "Case Studies",
                    value: {
                        institution: searchTerms,
                        market: filters.market || [],
                        sector: filters.sector || [],
                        themes: filters.themes || [],
                        approval_status: filters.approval_status || "",
                        caspio_company_name: filters.caspio_company_name || "",
                        proposal_type: filters.proposal_type || [],
                        vote: filters.vote || [],
                        year: filters.year || [],
                        keyword: filters.keyword || [],
                        index: filters.index || "",
                        global_search: [companyGlobalSearchName],
                    },
                })
            );
            // toast.success("Searched saved successfully");
        }
    };

    const onEditCaseStudiesClickHandler = (caseStudy: any) => {
        setSelectedCaseStudies(caseStudy);
        setAddNewCaseStudyModalVisible(true);
    };

    const multSearchUrl = useMemo(() => {
        const baseUrl = `/get_case_studies_dropdown_values/`;
        const params = new URLSearchParams();

        // Add global_search parameter if not all companies selected
        if (!isAllCompanySelected) {
            const globalSearch = companyGlobalSearchName || filters?.global_search?.[0];
            if (globalSearch) {
                params.append('global_search', globalSearch);
            }
        }

        // Add current filters to the search URL
        if (filters.year && filters.year.length > 0) {
            params.append('year', JSON.stringify(filters.year));
        }

        if (filters.market && filters.market.length > 0) {
            params.append('market', JSON.stringify(filters.market));
        }

        if (filters.sector && filters.sector.length > 0) {
            params.append('sector', JSON.stringify(filters.sector));
        }

        if (filters.themes && filters.themes.length > 0) {
            params.append('themes', JSON.stringify(filters.themes));
        }

        if (filters.proposal_type && filters.proposal_type.length > 0) {
            params.append('proposal_type', JSON.stringify(filters.proposal_type));
        }

        if (filters.vote && filters.vote.length > 0) {
            params.append('vote', JSON.stringify(filters.vote));
        }

        if (filters.approval_status) {
            params.append('approval_status', filters.approval_status);
        }

        if (filters.caspio_company_name) {
            params.append('caspio_company_name', filters.caspio_company_name);
        }

        if (filters.keyword) {
            params.append('keyword', filters.keyword);
        }

        if (filters.index && filters.index.length > 0) {
            params.append('index', JSON.stringify(filters.index));
        }

        const queryString = params.toString();
        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }, [isAllCompanySelected, companyGlobalSearchName, filters]);

    const handleViewAllChange = async (event: any) => {
        if (event?.target?.checked) {
            const currentYear = new Date().getFullYear();
            const defaultYears = [(currentYear - 1).toString(), currentYear.toString()];
            setValue("year", defaultYears);
            setValue("market", ["USA"]);
            dispatch(
                setAllFilters({
                    year: defaultYears,
                    market: ["USA"],
                })
            );
        }
        else {
            setValue("year", []);
            setValue("market", []);
            dispatch(
                setAllFilters({
                    market: [],
                    year: [],
                    global_search: [],
                })
            );
        }
        try {
            dispatch(selectUnSelectAllCompany(!isAllCompanySelected));
        } catch (error) { }
    }

    const handleRemoveChip = (removeKey: any, removeValue: any) => {
        const updatedFilters = { ...filters };

        if (Array.isArray(updatedFilters[removeKey])) {
            updatedFilters[removeKey] = updatedFilters[removeKey].filter(
                (item) => item !== removeValue
            );
            setValue(removeKey, updatedFilters[removeKey]);
        } else if (updatedFilters[removeKey] === removeValue) {
            if (removeKey === "index") {
                // Remove index completely if empty or blank
                delete updatedFilters[removeKey];
                setValue(removeKey, undefined);
            } else {
                updatedFilters[removeKey] = "";
                setValue(removeKey, "");
            }
        } else {
            setValue(removeKey, updatedFilters[removeKey]);
        }

        dispatch(setAllFilters(updatedFilters));
    }

    const handleFieldChange = (event, field) => {
        // let updatedFilters = { ...filters };
        // updatedFilters[field.name] = event?.target?.value;
        // dispatch(setAllFilters(updatedFilters));
        return field.onChange(event);
    }
    const handleDownload = async () => {
        // For "View For All Companies", keep global_search only when companies are selected
        const hasSelectedCompanies =
            Array.isArray(filters?.global_search) && filters.global_search.length > 0;
        const apiFilters =
            isAllCompanySelected && !hasSelectedCompanies
                ? { ...filters, global_search: undefined }
                : filters;

        downloadFileFromAPI({
            url: createDynamicURL(
                `${baseURL}/case_studies/`,
                apiFilters,
                undefined,
                page
            ),
            fileName: "case_studies.xlsx",
            setLoading: setLoadingDownload,
            serviceMethod: shareHolderProposalService.getAllShareholderAPIFile
        });
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
                            <div className="flex flex-col px-5 pt-5 sm:flex-row gap-y-2 items-center">
                                <div className="flex">
                                    <MultiSearchBar
                                        onSearch={handleSearch}
                                        onSearchSelect={() => {
                                            dispatch(resetPage());
                                        }}
                                        searchTerms={searchTerms}
                                        setSearchTerms={setSearchTerms}
                                        url={multSearchUrl}
                                        getOptionKey="institution_name"
                                        placeHolder="Search Institution"
                                        onSearchChange={resetPage}
                                        isSingle={true}
                                        showPills={false}
                                    />

                                    {/* Hiding clear filter for now */}
                                    {/* <div className="hover:bg-slate-50">
                    <Button onClick={handleClearAllFilter}>
                      <Tippy
                        content="Clear Filters"
                        options={{ theme: "light" }}
                      >
                        <FilterX
                          size={17}
                          strokeWidth={1}
                          className="text-slate-500 cursor-pointer	"
                        />
                      </Tippy>
                      <span className="text-slate-500">Clear Filters</span>
                    </Button>
                  </div> */}

                                    {/* Hiding save searches filter for now */}
                                    {/* <div className="hover:bg-slate-50 ml-2">
                    <Button onClick={saveSearch}>
                      <Tippy
                        content="Save Searches"
                        options={{ theme: "light" }}
                      >
                        <SaveAll
                          size={17}
                          strokeWidth={1}
                          className="text-slate-500 cursor-pointer"
                        />
                      </Tippy>
                    </Button>
                  </div> */}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto mb-7">
                                    {user?.saved_search?.["Case Studies"] !== undefined && (
                                        <div className="hover:bg-slate-50 ">
                                            <Button onClick={getSavedSearches}>
                                                Previous Search
                                            </Button>
                                        </div>
                                    )}

                                    {/* Clear and Apply buttons outside filter */}
                                    <Popover className="inline-block">

                                        <>
                                            <Popover.Button
                                                as={Button}
                                                variant="outline-secondary"
                                                className="w-full sm:w-auto"
                                                onClick={handleCollapseFilter}
                                            >
                                                <Lucide
                                                    icon="ArrowDownWideNarrow"
                                                    className="stroke-[1.3] w-4 h-4 mr-2"
                                                />
                                                Filters
                                                <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
                                                    {filtersLength}
                                                </div>
                                            </Popover.Button>
                                        </>
                                    </Popover>
                                </div>
                            </div>

                            {selectedChipFilters?.length > 0 && (
                                <StandardizedFilterPills
                                    filters={selectedChipFilters.map(chip => ({
                                        key: chip.key,
                                        value: chip.value,
                                        label: chip.label
                                    }))}
                                    onRemove={handleRemoveChip}
                                />
                            )}


                            {isFilterCollapse && (
                                <form onSubmit={handleSubmit(onSubmit)}>
                                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
                                        {/* Filter Content */}
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-semibold text-slate-700" style={{ fontSize: '14px' }}>Filters</h3>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline-secondary"
                                                    onClick={() => {
                                                        onFilterClear();
                                                    }}
                                                    className="w-full sm:w-auto flex items-center gap-2"
                                                    type="button"
                                                >
                                                    <MdOutlineClear className="text-lg mr-1" /> Clear
                                                </Button>

                                                <Button
                                                    variant="primary"
                                                    onClick={handleSubmit(onSubmit)}
                                                    className="w-full sm:w-auto flex items-center gap-2"
                                                >
                                                    <FaSearch className="text-lg" /> Apply
                                                </Button>
                                            </div>
                                        </div>
                                        <div
                                            className={`grid grid-cols-1 xs:grid-cols-1 gap-4 mb-3 ${isAllCompanySelected
                                                ? "md:grid-cols-3"
                                                : " md:grid-cols-2"
                                                }`}
                                        >
                                            <div className="mx-2">
                                                <div className="text-left text-slate-500 flex justify-between mb-1">
                                                    <span className="flex items-center gap-2 text-slate-600 font-semibold" style={{ fontSize: '14px' }}>
                                                        <FaCalendarAlt className="text-gray-400" /> Year
                                                    </span>

                                                    {apiDropdownOptions.year.length > 0 && (
                                                        <FormCheck className="mr-2">
                                                            <FormCheck.Label>Select All</FormCheck.Label>
                                                            <FormCheck.Input
                                                                className="ml-1"
                                                                id="year"
                                                                checked={
                                                                    apiDropdownOptions.year.length ===
                                                                    watch("year")?.length
                                                                }
                                                                type="checkbox"
                                                                onChange={(e) =>
                                                                    e.target.checked
                                                                        ? setValue("year", apiDropdownOptions.year.map(String))
                                                                        : setValue("year", [])
                                                                }
                                                            />
                                                        </FormCheck>
                                                    )}
                                                </div>
                                                <Controller
                                                    name="year"
                                                    control={control}
                                                    defaultValue={[]}
                                                    render={({ field }) => (
                                                        <MultiSelectDropdown
                                                            data={apiDropdownOptions?.year?.map(String) || []}
                                                            placeholder="Select Year"
                                                            loading={apiDropdownOptions?.year?.length === 0}
                                                            onChange={(selectedOptions) => {
                                                                // Always convert to string
                                                                const selectedValues = selectedOptions.map((option) => String(option.value));
                                                                field.onChange(selectedValues);
                                                                handleFieldChange(selectedValues, field);
                                                            }}
                                                            selectedOption={field.value || []}
                                                        />
                                                    )}
                                                />
                                            </div>

                                            <div className="mx-2">
                                                <div className="text-left text-slate-500 flex justify-between mb-1">
                                                    <span className="flex items-center gap-2 text-slate-600 font-semibold" style={{ fontSize: '14px' }}>
                                                        <FaLayerGroup className="text-gray-400" /> Index
                                                    </span>
                                                </div>
                                                <Controller
                                                    name="index"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <MultiSelectDropdown
                                                            data={apiDropdownOptions?.index?.map((item: any) => item)}
                                                            placeholder="Select Index"
                                                            loading={false}
                                                            onChange={(selectedOptions) => {
                                                                const selectedValues = selectedOptions.map((option) => option.value);
                                                                field.onChange(selectedValues);
                                                            }}
                                                            selectedOption={field.value || []}
                                                        />
                                                    )}
                                                />
                                            </div>

                                            {isAllCompanySelected === true && (
                                                <div className="w-full mx-2">
                                                    <div className="w-full">
                                                        <div className="text-left text-slate-500 ">
                                                            <span className="flex items-center gap-2 text-slate-600 font-semibold" style={{ fontSize: '14px' }}>
                                                                <FaBuilding className="text-gray-400" /> Select Companies
                                                            </span>
                                                        </div>
                                                        <div className=" mt-1">
                                                            <Controller
                                                                name="global_search"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <CompanySelect
                                                                        value={field.value}
                                                                        onChange={(value) => {
                                                                            field.onChange(value);
                                                                        }}
                                                                        isMulti={true}
                                                                        currentFilters={{
                                                                            year: watch("year") || [],
                                                                            market: watch("market") || [],
                                                                            sector: watch("sector") || [],
                                                                            themes: watch("themes") || [],
                                                                            proposal_type: watch("proposal_type") || [],
                                                                            vote: watch("vote") || [],
                                                                            approval_status: watch("approval_status") || "",
                                                                            caspio_company_name: watch("caspio_company_name") || "",
                                                                            index: watch("index") || [],
                                                                            // institution_name: searchTerms || [],
                                                                        }}
                                                                    />
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {isAllCompanySelected && (
                                                <div className="mx-2">
                                                    <div className="text-left text-slate-500 flex justify-between mb-1">
                                                        <span className="font-semibold" style={{ fontSize: '14px' }}>Country</span>
                                                        {apiDropdownOptions.market.length > 0 && (
                                                            <FormCheck className="mr-2">
                                                                <FormCheck.Label>Select All</FormCheck.Label>
                                                                <FormCheck.Input
                                                                    className="ml-1"
                                                                    id="market"
                                                                    checked={
                                                                        apiDropdownOptions.market.length ===
                                                                        watch("market")?.length
                                                                    }
                                                                    type="checkbox"
                                                                    onChange={(e) =>
                                                                        e.target.checked
                                                                            ? setValue(
                                                                                "market",
                                                                                apiDropdownOptions.market
                                                                            )
                                                                            : setValue("market", [])
                                                                    }
                                                                />
                                                            </FormCheck>
                                                        )}
                                                    </div>
                                                    <Controller
                                                        name="market"
                                                        control={control}
                                                        defaultValue={[]}
                                                        render={({ field }) => (
                                                            <MultiSelectDropdown
                                                                data={apiDropdownOptions.market}
                                                                placeholder="Select Country"
                                                                loading={getDropdownLoader}
                                                                onChange={(selectedOptions) => {
                                                                    const selectedValues = selectedOptions.map((option) => option.value);
                                                                    field.onChange(selectedValues);
                                                                    handleFieldChange(selectedValues, field)


                                                                }}
                                                                selectedOption={field.value || []}

                                                            />
                                                            // <TomSelect
                                                            //   value={field.value || []}
                                                            //   // onChange={(value) => field.onChange(value)}
                                                            //   onChange={(value) => handleFieldChange(value, field)}
                                                            //   options={{ placeholder: "Select Country" }}
                                                            //   className="w-full"
                                                            //   multiple
                                                            // >
                                                            //   {getDropdownLoader ? (
                                                            //     <option value="--" disabled>
                                                            //       Loading...
                                                            //     </option>
                                                            //   ) : (
                                                            //     apiDropdownOptions.market.map((market) => (
                                                            //       <option key={market} value={market}>
                                                            //         {market}
                                                            //       </option>
                                                            //     ))
                                                            //   )}
                                                            // </TomSelect>
                                                        )}
                                                    />
                                                </div>
                                            )}

                                            {isAllCompanySelected === true && (
                                                <div className="mx-2">
                                                    <div className="text-left text-slate-500 flex justify-between mb-1">
                                                        <span className="flex items-center gap-2 text-slate-600 font-semibold" style={{ fontSize: '14px' }}>
                                                            <FaBuilding className="text-gray-400" /> Sector
                                                        </span>
                                                        {apiDropdownOptions.sector.length > 0 && (
                                                            <FormCheck className="mr-2">
                                                                <FormCheck.Label>Select All</FormCheck.Label>
                                                                <FormCheck.Input
                                                                    className="ml-1"
                                                                    id="sector"
                                                                    checked={
                                                                        apiDropdownOptions.sector.length ===
                                                                        watch("sector")?.length
                                                                    }
                                                                    type="checkbox"
                                                                    onChange={(e) =>
                                                                        e.target.checked
                                                                            ? setValue(
                                                                                "sector",
                                                                                apiDropdownOptions.sector
                                                                            )
                                                                            : setValue("sector", [])
                                                                    }
                                                                />
                                                            </FormCheck>
                                                        )}
                                                    </div>
                                                    <Controller
                                                        name="sector"
                                                        control={control}
                                                        defaultValue={[]}
                                                        render={({ field }) => (
                                                            <MultiSelectDropdown
                                                                data={apiDropdownOptions.sector}
                                                                placeholder="Select Sector"
                                                                loading={getDropdownLoader}
                                                                onChange={(selectedOptions) => {
                                                                    const selectedValues = selectedOptions.map((option) => option.value);
                                                                    field.onChange(selectedValues);
                                                                    handleFieldChange(selectedValues, field)


                                                                }}
                                                                selectedOption={field.value || []}

                                                            />
                                                            // <TomSelect
                                                            //   value={field.value || []}
                                                            //   // onChange={(value) => field.onChange(value)}
                                                            //   onChange={(value) => handleFieldChange(value, field)}
                                                            //   options={{ placeholder: "Select Sector" }}
                                                            //   className="w-full"
                                                            //   multiple
                                                            // >
                                                            //   {getDropdownLoader ? (
                                                            //     <option value="--" disabled>
                                                            //       Loading...
                                                            //     </option>
                                                            //   ) : (
                                                            //     apiDropdownOptions.sector.map((sector) => (
                                                            //       <option key={sector} value={sector}>
                                                            //         {sector}
                                                            //       </option>
                                                            //     ))
                                                            //   )}
                                                            // </TomSelect>
                                                        )}
                                                    />
                                                </div>
                                            )}

                                            <div className="mx-2">
                                                <div className="text-left text-slate-500 flex justify-between mb-1">
                                                    <span className="flex items-center gap-2 text-slate-600 font-semibold" style={{ fontSize: '14px' }}>
                                                        <FaTags className="text-gray-400" /> Themes
                                                    </span>
                                                    {apiDropdownOptions.themes.length > 0 && (
                                                        <FormCheck className="mr-2">
                                                            <FormCheck.Label>Select All</FormCheck.Label>
                                                            <FormCheck.Input
                                                                className="ml-1"
                                                                id="themes"
                                                                checked={
                                                                    apiDropdownOptions.themes.length ===
                                                                    watch("themes")?.length
                                                                }
                                                                type="checkbox"
                                                                onChange={(e) =>
                                                                    e.target.checked
                                                                        ? setValue(
                                                                            "themes",
                                                                            apiDropdownOptions.themes
                                                                        )
                                                                        : setValue("themes", [])
                                                                }
                                                            />
                                                        </FormCheck>
                                                    )}
                                                </div>
                                                <Controller
                                                    name="themes"
                                                    control={control}
                                                    defaultValue={[]}
                                                    render={({ field }) => (
                                                        <MultiSelectDropdown
                                                            data={apiDropdownOptions.themes}
                                                            placeholder="Select Themes"
                                                            loading={getDropdownLoader}
                                                            onChange={(selectedOptions) => {
                                                                const selectedValues = selectedOptions.map((option) => option.value);
                                                                field.onChange(selectedValues);
                                                                handleFieldChange(selectedValues, field)


                                                            }}
                                                            selectedOption={field.value || []}

                                                        />
                                                        // <TomSelect
                                                        //   value={field.value || []}
                                                        //   // onChange={(value) => field.onChange(value)}
                                                        //   onChange={(value) => handleFieldChange(value, field)}
                                                        //   options={{ placeholder: "Select Themes" }}
                                                        //   className="w-full"
                                                        //   multiple
                                                        // >
                                                        //   {getDropdownLoader ? (
                                                        //     <option value="--" disabled>
                                                        //       Loading...
                                                        //     </option>
                                                        //   ) : (
                                                        //     apiDropdownOptions.themes.map((theme) => (
                                                        //       <option key={theme} value={theme}>
                                                        //         {theme}
                                                        //       </option>
                                                        //     ))
                                                        //   )}
                                                        // </TomSelect>
                                                    )}
                                                />
                                            </div>

                                            {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                                <div className="mx-2">
                                                    <div className="w-full">
                                                        <div className="text-left text-slate-500 ">
                                                            <span className="font-semibold" style={{ fontSize: '14px' }}>Alternate Companies</span>
                                                        </div>
                                                        <div className=" mt-1">
                                                            <Controller
                                                                name="caspio_company_name"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <FormInput
                                                                        placeholder="Enter Alternate Company Name"
                                                                        {...field}
                                                                    />
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {user.user_type === "Analyst" && (
                                                <>
                                                    <div className="mx-2">
                                                        <div className="flex-1 w-full text-slate-500">
                                                            <span className="font-semibold" style={{ fontSize: '14px' }}>Approval Status</span>
                                                            <div className="mt-2 flex flex-col sm:flex-row">
                                                                <Controller
                                                                    name="approval_status"
                                                                    control={control}
                                                                    render={({ field }) => (
                                                                        <>
                                                                            <FormCheck className="flex items-center mr-2">
                                                                                <FormCheck.Input
                                                                                    id="radio-switch-4"
                                                                                    type="radio"
                                                                                    {...field}
                                                                                    value="Approved"
                                                                                    checked={field.value === "Approved"}
                                                                                    onChange={(e) =>
                                                                                        field.onChange("Approved")
                                                                                    }
                                                                                />
                                                                                <FormCheck.Label
                                                                                    htmlFor="radio-switch-4"
                                                                                    className="ml-2"
                                                                                >
                                                                                    Approved
                                                                                </FormCheck.Label>
                                                                            </FormCheck>
                                                                            <FormCheck className="flex items-center mt-2 sm:mt-0 mr-2">
                                                                                <FormCheck.Input
                                                                                    id="radio-switch-5"
                                                                                    type="radio"
                                                                                    {...field}
                                                                                    value="Pending"
                                                                                    checked={field.value === "Pending"}
                                                                                    onChange={(e) =>
                                                                                        field.onChange("Pending")
                                                                                    }
                                                                                />
                                                                                <FormCheck.Label
                                                                                    htmlFor="radio-switch-5"
                                                                                    className="ml-2"
                                                                                >
                                                                                    Pending
                                                                                </FormCheck.Label>
                                                                            </FormCheck>
                                                                            <FormCheck className="flex items-center mt-2 sm:mt-0">
                                                                                <FormCheck.Input
                                                                                    id="radio-switch-5"
                                                                                    type="radio"
                                                                                    {...field}
                                                                                    value="Return To Analyst"
                                                                                    checked={
                                                                                        field.value === "Return To Analyst"
                                                                                    }
                                                                                    onChange={(e) =>
                                                                                        field.onChange("Return To Analyst")
                                                                                    }
                                                                                />
                                                                                <FormCheck.Label
                                                                                    htmlFor="radio-switch-5"
                                                                                    className="ml-2"
                                                                                >
                                                                                    Returned to Analyst
                                                                                </FormCheck.Label>
                                                                            </FormCheck>
                                                                        </>
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            <div className="mx-2">
                                                <div className="text-left text-slate-500 mb-1 flex justify-between items-center">
                                                    <span className="flex items-center gap-2 text-slate-600 font-semibold" style={{ fontSize: '14px' }}>
                                                        <FaSearch className="text-gray-400" /> Keyword Search
                                                    </span>
                                                    {keywordDropdownOptions.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const currentField = control._getWatch("keyword") || [];
                                                                const allKeywords = [...new Set([...currentField, ...keywordDropdownOptions])];
                                                                control._formState.defaultValues = {
                                                                    ...control._formState.defaultValues,
                                                                    keyword: allKeywords
                                                                };
                                                                control._reset(control._formState.defaultValues);
                                                            }}
                                                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                                                        >
                                                            Select All
                                                        </button>
                                                    )}
                                                </div>
                                                <Controller
                                                    name="keyword"
                                                    control={control}
                                                    defaultValue={[]}
                                                    render={({ field }) => (
                                                        <CreatableInputSelect
                                                            placeholder="Type and press Enter to add keywords"
                                                            value={field.value || []}
                                                            onChange={(values: string[]) => {
                                                                field.onChange(values);
                                                            }}
                                                            onInputChange={(inputValue: string) => {
                                                                fetchKeywordSuggestions(inputValue);
                                                            }}
                                                            options={keywordDropdownOptions}
                                                            loading={keywordLoading}
                                                        />
                                                    )}
                                                />
                                            </div>


                                        </div>
                                    </div>
                                </form>
                            )}


                            {/* 2-COLUMN LAYOUT: AI Filters (Sidebar) + Main Content (AI Analyzer & Cards) */}
                            <div className="grid grid-cols-12 md:gap-6 mt-6 pb-6 border-t pt-8">

                                {/* SIDEBAR: AI Filters */}
                                <div className="col-span-12 md:col-span-4 xl:col-span-3 mb-6 md:mb-0">
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky" style={{ top: '6.5rem' }}>
                                        <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                            <Lucide icon="Filter" className="w-5 h-5 text-primary" />
                                            AI Filters
                                        </h3>

                                        {isAiFiltersLoading ? (
                                            <div className="flex justify-center items-center h-40">
                                                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            </div>
                                        ) : aiFiltersData ? (
                                            <div className="space-y-6">

                                                {/* INVESTORS / INSTITUTIONS */}
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">
                                                        Investors / Institutions
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {/* All Investors */}
                                                        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                                <span className="text-sm font-semibold text-primary">
                                                                    {aiFiltersData?.investors?.all_investors?.label || "All Investors"}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs bg-white text-slate-600 font-mono px-2 py-0.5 rounded-full border border-slate-200">
                                                                {aiFiltersData?.investors?.all_investors?.count || 0}
                                                            </span>
                                                        </div>

                                                        {/* Top 5 Investors */}
                                                        {aiFiltersData?.investors?.top_5?.map((inv: any, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                onClick={() => toggleAiFilter('investor', inv.id)}
                                                                className={clsx(
                                                                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group border",
                                                                    isAiFilterSelected('investor', inv.id)
                                                                        ? "bg-primary/10 border-primary/30"
                                                                        : "hover:bg-slate-50 border-transparent"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={clsx("w-2 h-2 rounded-full", isAiFilterSelected('investor', inv.id) ? "bg-primary" : idx % 3 === 0 ? "bg-green-500" : idx % 3 === 1 ? "bg-blue-500" : "bg-purple-500")}></div>
                                                                    <span className={clsx(
                                                                        "text-sm font-medium line-clamp-1",
                                                                        isAiFilterSelected('investor', inv.id) ? "text-primary font-bold" : "text-slate-600 group-hover:text-slate-800"
                                                                    )}>
                                                                        {inv.name}
                                                                    </span>
                                                                </div>
                                                                <span className={clsx(
                                                                    "text-xs font-mono px-2 py-0.5 rounded-full border",
                                                                    isAiFilterSelected('investor', inv.id)
                                                                        ? "bg-white text-primary border-primary/20"
                                                                        : "bg-slate-100 text-slate-500 border-transparent"
                                                                )}>
                                                                    {inv.count}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* THEMES */}
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 border-t border-slate-100 pt-4">
                                                        Themes
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {/* All Themes */}
                                                        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                                <span className="text-sm font-semibold text-primary">
                                                                    {aiFiltersData?.themes?.all_themes?.label || "All Themes"}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs bg-white text-slate-600 font-mono px-2 py-0.5 rounded-full border border-slate-200">
                                                                {aiFiltersData?.themes?.all_themes?.count || 0}
                                                            </span>
                                                        </div>

                                                        {/* Theme Breakdown */}
                                                        {aiFiltersData?.themes?.breakdown?.map((theme: any, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                onClick={() => toggleAiFilter('theme', theme.name)}
                                                                className={clsx(
                                                                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group border",
                                                                    isAiFilterSelected('theme', theme.name)
                                                                        ? "bg-primary/10 border-primary/30"
                                                                        : "hover:bg-slate-50 border-transparent"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={clsx("w-2 h-2 rounded-full", isAiFilterSelected('theme', theme.name) ? "bg-primary" : idx % 4 === 0 ? "bg-green-500" : idx % 4 === 1 ? "bg-blue-500" : idx % 4 === 2 ? "bg-purple-500" : "bg-orange-500")}></div>
                                                                    <span className={clsx(
                                                                        "text-sm font-medium line-clamp-1",
                                                                        isAiFilterSelected('theme', theme.name) ? "text-primary font-bold" : "text-slate-600 group-hover:text-slate-800"
                                                                    )}>
                                                                        {theme.name}
                                                                    </span>
                                                                </div>
                                                                <span className={clsx(
                                                                    "text-xs font-mono px-2 py-0.5 rounded-full border",
                                                                    isAiFilterSelected('theme', theme.name)
                                                                        ? "bg-white text-primary border-primary/20"
                                                                        : "bg-slate-100 text-slate-500 border-transparent"
                                                                )}>
                                                                    {theme.count}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* YEARS */}
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 border-t border-slate-100 pt-4">
                                                        Year
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {/* All Years */}
                                                        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                                <span className="text-sm font-semibold text-primary">
                                                                    {aiFiltersData?.years?.all_years?.label || "All Years"}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs bg-white text-slate-600 font-mono px-2 py-0.5 rounded-full border border-slate-200">
                                                                {aiFiltersData?.years?.all_years?.count || 0}
                                                            </span>
                                                        </div>

                                                        {/* Individual Years */}
                                                        {aiFiltersData?.years?.individual?.map((yearData: any, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                onClick={() => toggleAiFilter('year', yearData.year)}
                                                                className={clsx(
                                                                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group border",
                                                                    isAiFilterSelected('year', yearData.year)
                                                                        ? "bg-primary/10 border-primary/30"
                                                                        : "hover:bg-slate-50 border-transparent"
                                                                )}
                                                            >
                                                                <span className={clsx(
                                                                    "text-sm font-medium pl-5",
                                                                    isAiFilterSelected('year', yearData.year) ? "text-primary font-bold" : "text-slate-600 group-hover:text-slate-800"
                                                                )}>
                                                                    {yearData.year}
                                                                </span>
                                                                <span className={clsx(
                                                                    "text-xs font-mono px-2 py-0.5 rounded-full border",
                                                                    isAiFilterSelected('year', yearData.year)
                                                                        ? "bg-white text-primary border-primary/20"
                                                                        : "bg-slate-100 text-slate-500 border-transparent"
                                                                )}>
                                                                    {yearData.count}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                {/* MAIN CONTENT: Analyzer + Case Studies */}
                                <div className="col-span-12 md:col-span-8 xl:col-span-9">

                                    {/* AI Investor Stance Analyzer Section */}
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm mb-8">
                                        {/* Subtle Background Pattern */}
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                                                <Lucide icon="Zap" className="fill-current" />
                                            </div>
                                            <h2 className="text-2xl font-bold text-slate-800">AI Investor Stance Analyzer</h2>
                                        </div>

                                        <p className="text-md text-slate-500 mb-6 pl-11">
                                            Ask how an investor has engaged or voted on any ESG topic — across all case studies
                                        </p>

                                        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center mb-6 pl-0 md:pl-11">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={aiSearchTerm}
                                                    onChange={(e) => setAiSearchTerm(e.target.value)}
                                                    placeholder="e.g. How does BlackRock approach climate disclosure?"
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-700"
                                                />
                                            </div>
                                            <Button
                                                variant="primary"
                                                className="px-8 py-3 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap"
                                                onClick={() => handleAiAnalysis(aiSearchTerm)}
                                            >
                                                Analyze <Lucide icon="ArrowRight" />
                                            </Button>
                                        </div>

                                        <div className="pl-0 md:pl-11 mt-4">
                                            <h4 className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                                Topics in this dataset
                                                {isAiTopicsLoading && <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>}
                                            </h4>
                                            
                                            {aiTopics.length === 0 && !isAiTopicsLoading && (
                                                <span className="text-sm text-slate-400 italic">No topics found for current selections.</span>
                                            )}

                                            <div className="flex flex-wrap gap-2">
                                                {aiTopics.map((topic) => (
                                                    <button
                                                        key={topic}
                                                        onClick={() => {
                                                            setAiSearchTerm(topic);
                                                            handleAiAnalysis(topic);
                                                        }}
                                                        className={clsx(
                                                            "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                            aiSearchTerm === topic
                                                                ? "bg-primary text-white border-primary"
                                                                : "bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:text-primary"
                                                        )}
                                                    >
                                                        {topic}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Loading State */}
                                    {isAiLoading && (
                                        <div className="mt-4 p-6 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 animate-pulse shadow-sm">
                                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            <div className="text-lg font-medium text-slate-600">
                                                Analyzing case studies for investor stance on <span className="text-primary">"{aiSearchTerm}"</span>...
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Response Section */}
                                    {aiResponse && !isAiLoading && (
                                        <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
                                            <div className="bg-slate-50/50 border-b p-5 flex items-center justify-between">
                                                <h3 className="text-xl font-bold text-slate-800">{aiResponse?.title}</h3>
                                                <span className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">AI Summary</span>
                                            </div>

                                            <div className="p-6 md:p-8">
                                                {/* Stats Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center shadow-sm">
                                                        <div className="text-4xl font-mono font-bold text-primary mb-1">{aiResponse?.total_cases || 0}</div>
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Cases</div>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center shadow-sm">
                                                        <div className="text-4xl font-mono font-bold text-danger mb-1">{aiResponse?.voted_against || 0}</div>
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Voted Against</div>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center shadow-sm">
                                                        <div className="text-4xl font-mono font-bold text-success mb-1">{aiResponse?.voted_for || 0}</div>
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Voted For</div>
                                                    </div>
                                                </div>

                                                {/* Verdict Badge */}
                                                {aiResponse?.key_alert && (
                                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6 border bg-amber-50 text-amber-700 border-amber-100">
                                                        <span dangerouslySetInnerHTML={{ __html: aiResponse.key_alert.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                                    </div>
                                                )}

                                                {/* Summary Text (Increased Font) */}
                                                <div
                                                    className="text-lg leading-relaxed text-slate-700 mb-8"
                                                    dangerouslySetInnerHTML={{ __html: aiResponse?.main_summary || "" }}
                                                />

                                                {/* Key Points (Increased Font) */}
                                                <div className="bg-slate-50 border-l-4 border-primary rounded-r-xl p-6 md:p-8 mb-8">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Key Observations from Case Studies</h4>
                                                    <ul className="space-y-4">
                                                        {aiResponse?.key_observations?.map((point: string, idx: number) => (
                                                            <li key={idx} className="flex gap-3 text-md text-slate-600 leading-relaxed">
                                                                <span className="text-primary font-bold">→</span>
                                                                <span dangerouslySetInnerHTML={{ __html: point.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Scroll Button */}
                                                <Button
                                                    variant="secondary"
                                                    className="flex items-center gap-2 text-md font-bold px-6 py-3"
                                                    onClick={() => {
                                                        const grid = document.getElementById('case-studies-grid');
                                                        grid?.scrollIntoView({ behavior: 'smooth' });
                                                    }}
                                                >
                                                    View underlying case studies <Lucide icon="ArrowDown" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {displayCount > 0 && (
                                        <h2 className="flex items-end font-semibold justify-end my-2 md:ml-auto mb-1" style={{ fontSize: '14px' }}>
                                            Count: {displayCount.toLocaleString()}
                                        </h2>
                                    )}

                                    {/* New Card View for AI specific case studies */}
                                    {!displayLoading && displayData?.length > 0 && (
                                        <div id="case-studies-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
                                            {displayData.map((item: any) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => {
                                                        setSelectedCaseStudy(item);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="bg-white border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-lg flex flex-col h-full"
                                                >
                                                    <div className="p-4 border-b flex justify-between items-start gap-3">
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-lg text-slate-800 line-clamp-1">
                                                                {item?.company_name || item?.caspio_company_name}
                                                            </h3>
                                                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                                                                {item?.institution_name}
                                                            </p>
                                                        </div>
                                                        <span className="shrink-0 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                                                            {item?.esg_themes?.split(',')?.[0] || 'Uncategorized'}
                                                        </span>
                                                    </div>

                                                    <div className="p-4 flex-1">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className="text-primary"><FaListUl size={12} /></span>
                                                            <span className="text-md font-semibold text-slate-700 line-clamp-1">
                                                                {item?.resolution_engagement_topic || 'No Topic'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                                                            {item?.voting_details || 'No engagement details available.'}
                                                        </p>
                                                    </div>

                                                    <div className="p-3 bg-slate-50/50 flex items-center justify-between border-t mt-auto">
                                                        <div className={clsx(
                                                            "px-2.5 py-1 rounded-full text-[11px] font-bold",
                                                            item?.vote?.toLowerCase()?.includes('for') ? "bg-success/10 text-success" :
                                                                item?.vote?.toLowerCase()?.includes('against') ? "bg-danger/10 text-danger" :
                                                                    "bg-warning/10 text-warning"
                                                        )}>
                                                            {item?.vote || 'Pending'}
                                                        </div>
                                                        <span className="text-xs font-mono text-slate-600">
                                                            {item?.year}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
        </>
    );
}

export default CaseStudiesAI;
