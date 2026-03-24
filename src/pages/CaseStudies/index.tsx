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
import { setSavedSearch } from "@/stores/authenticationSlice";
import { toast } from "react-toastify";
import CompanySelect from "@/components/ReactSelectAsync";
import { modifyRoute } from "@/stores/themeSlice";
import AddNewCaseStudies from "./Components/AddEditCaseStudies";
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
import { caseStudiesService } from "@/services/caseStudies";

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
function CaseStudies() {
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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [keywordDropdownOptions, setKeywordDropdownOptions] = useState<string[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);
  

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

  const onEditCaseStudiesClickHandler = (caseStudies: any) => {
    setSelectedCaseStudies(caseStudies);
    setAddNewCaseStudyModalVisible(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      await caseStudiesService.deleteCaseStudy(itemToDelete.id);

      toast.success("Case Study deleted successfully");
      setIsDeleteModalOpen(false);
      setItemToDelete(null);

      // Refresh data
      const dynamicURL = createDynamicURL(
        `${baseURL}/case_studies/`,
        filters,
        undefined,
        page
      );
      dispatch(fetchCaseStudies(dynamicURL));
      // Optionally refresh dropdowns if needed
      // useCaseStudyDropdowns().refresh(); // If refresh is available
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error?.response?.data?.message || "Something went wrong!");
    } finally {
      setIsDeleting(false);
    }
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

  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          {/* Sticky Header OUTSIDE scrollable content */}
          <div className="w-full sticky z-30 header-card transition-[margin,width,opacity] duration-1000 ease-in-out bg-white" style={{ top: '4rem', minHeight: '64px' }}>
            <div className="bg-white px-4 mb-4 flex flex-col md:flex-row items-center justify-between shadow">
              {isAllCompanySelected === true ? (
                <h1 className="text-lg font-bold flex items-center gap-2">
                  All Case Studies
                </h1>
              ) : (
                <div className="font-semibold text-xl">Case Studies</div>
              )}
              <div className="flex gap-3 px-4 py-4 dark:bg-darkmode-800">
                <button
                  className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${isAllCompanySelected === false
                    ? "bg-primary text-white shadow"
                    : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                    }`}
                  onClick={async (e) => {
                    if (isAllCompanySelected) {
                      handleViewAllChange({ target: { checked: false } });
                    }
                  }}
                >
                  {companyGlobalSearchName || "Company"}
                </button>
                <button
                  className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${isAllCompanySelected === true
                    ? "bg-primary text-white shadow"
                    : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                    }`}
                  onClick={async (e) => {
                    if (!isAllCompanySelected) {
                      handleViewAllChange({ target: { checked: true } });
                    }
                  }}
                >
                  View For All Companies
                </button>
              </div>
            </div>
          </div>
          {/* Scrollable Content BELOW sticky header */}
          <div className="mt-3.5 relative">
            <div className="flex flex-col box box--stacked bg-white p-5">
              {/* Hidden Add New Case Studies btn until needed */}
              {/* <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row mb-4">
                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setSelectedCaseStudies(null);
                        setAddNewCaseStudyModalVisible(true);
                      }}
                      variant="primary"
                      className="bg-theme-2 border-bg-theme-2"
                    >
                      <Lucide
                        icon="PenLine"
                        className="stroke-[1.3] w-4 h-4 mr-2"
                      />
                      Add New Case Studies
                    </Button>
                  </div>
                )}
              </div> */}
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



              {count > 0 && (
                <h2 className="flex items-end font-semibold justify-end my-2 md:ml-auto mx-5 mb-1" style={{ fontSize: '14px' }}>
                  Count: {count.toLocaleString()}
                </h2>
              )}
             

              {/* No Data State */}
              {!loading && caseStudies?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Lucide
                    icon="FileSearch"
                    className="w-16 h-16 text-slate-200 mb-4"
                  />
                  <div className="text-xl font-bold text-slate-700">No Case Studies Found</div>
                  <div className="text-slate-500 mt-2">
                    Try adjusting your filters or keyword search
                  </div>
                </div>
              )}


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
                        {selectedCaseStudies?.company_name || selectedCaseStudies?.caspio_company_name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 opacity-90 text-sm">
                        <span>{selectedCaseStudies?.institution_name}</span>
                        <span>•</span>
                        <span>{selectedCaseStudies?.esg_themes}</span>
                        <span>•</span>
                        <span>{selectedCaseStudies?.year}</span>
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
                          {selectedCaseStudies?.resolution_engagement_topic || 'Not Specified'}
                    </div>
                  </div>

                      <div>
                        <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                          <FaBuilding size={12} /> Background & Details
                        </h4>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                          {selectedCaseStudies?.engagement_details || 'No details available.'}
                      </p>
                      </div>

                      <div>
                        <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b">
                          <FaHandshake size={12} /> Engagement/Voting Summary
                        </h4>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                          {selectedCaseStudies?.voting_details || 'No voting details available.'}
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
                              selectedCaseStudies?.vote?.toLowerCase()?.includes('for') ? "bg-success/10 text-success border border-success/20" :
                                selectedCaseStudies?.vote?.toLowerCase()?.includes('against') ? "bg-danger/10 text-danger border border-danger/20" :
                                  "bg-warning/10 text-warning border border-warning/20"
                            )}>
                              Vote: {selectedCaseStudies?.vote || 'Pending'}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100 italic">
                            {selectedCaseStudies?.voting_rationale || 'No rationale provided.'}
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

              <div className=" px-5">
                <StandardizedTable isLoading={loading} maxHeight="400px">
                  <StandardizedTable.Header>
                    <StandardizedTable.Cell isHeader>
                      Year
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader>
                      Institution
                    </StandardizedTable.Cell>
                    {isAllCompanySelected && (
                      <StandardizedTable.Cell isHeader>
                        Company
                      </StandardizedTable.Cell>
                    )}
                    <StandardizedTable.Cell isHeader>
                      Theme
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader>
                      Industry
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader>
                      Details
                    </StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader>
                      Actions
                    </StandardizedTable.Cell>
                  </StandardizedTable.Header>

                  <Table.Tbody>
                    {caseStudies?.length > 0 &&
                      caseStudies?.map((item: any, index: number) => {
                        return (
                          <StandardizedTable.Row
                            key={item?.id}
                            index={index}
                          >
                            <StandardizedTable.Cell>
                              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                {item?.year}
                              </span>
                            </StandardizedTable.Cell>
                            <StandardizedTable.Cell>
                              <div className="w-full flex flex-row justify-start items-center py-2 text-nowrap">
                                <p className="font-medium whitespace-normal line-clamp-2 text-wrap w-30">
                                  {item?.institution_name}
                                </p>
                              </div>
                            </StandardizedTable.Cell>
                            {isAllCompanySelected && (
                              <StandardizedTable.Cell>
                                <span className="inline-block px-2 py-1 font-medium">
                                  {item?.company_name || item?.caspio_company_name}
                                </span>
                              </StandardizedTable.Cell>
                            )}
                            <StandardizedTable.Cell>
                              <span className="inline-block px-2 py-1 font-medium">
                                {item?.esg_themes}
                              </span>
                            </StandardizedTable.Cell>
                            <StandardizedTable.Cell>
                              <span className="inline-block px-2 py-1 font-medium">
                                {item?.company_sector}
                              </span>
                            </StandardizedTable.Cell>
                            <StandardizedTable.Cell>
                              <div className="flex gap-3 justify-center">
                                <Tippy
                                  content="See Details"
                                  options={{ theme: "light" }}
                                >
                                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                                    <Lucide
                                      onClick={() => {
                                        navigate(`/case-studies/${item?.id}`);
                                      }}
                                      icon="Eye"
                                    />
                                  </div>
                                </Tippy>
                              </div>
                            </StandardizedTable.Cell>

                            <StandardizedTable.Cell>
                              <div className="flex gap-3 justify-center">
                                {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
                                  <>
                                    <Tippy
                                      content="Edit"
                                      options={{ theme: "light" }}
                                    >
                                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                                        <Lucide
                                          onClick={() =>
                                            onEditCaseStudiesClickHandler(item)
                                          }
                                          icon="PenLine"
                                          className="text-primary"
                                        />
                                      </div>
                                    </Tippy>
                                    <Tippy
                                      content="Delete"
                                      options={{ theme: "light" }}
                                    >
                                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                                        <Lucide
                                          onClick={() => {
                                            setItemToDelete(item);
                                            setIsDeleteModalOpen(true);
                                          }}
                                          icon="Trash2"
                                          className="text-danger"
                                        />
                                      </div>
                                    </Tippy>
                                  </>
                                )}
                              </div>
                            </StandardizedTable.Cell>
                          </StandardizedTable.Row>
                        );
                      })}
                  </Table.Tbody>
                  {caseStudies?.length === 0 && (
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td colSpan={isAllCompanySelected ? 6 : 5} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <Lucide
                              icon="FileSearch"
                              className="w-12 h-12 text-gray-300 mb-2"
                            />
                            <div className="text-lg font-medium">No data found</div>
                            <div className="text-sm text-gray-500 mt-1">
                              Try adjusting your filters or search criteria
                            </div>
                          </div>
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  )}
                </StandardizedTable>
              </div>

              <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row border-t mt-4">
                <CPagination
                  page={page}
                  totalPages={totalPages}
                  handleNextPage={handleNextPage}
                  handlePageChange={handlePageChange}
                  handlePreviousPage={handlePreviousPage}
                />

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

          {isDeleteModalOpen && (
            <Dialog
              size="md"
              open={isDeleteModalOpen}
              onClose={() => {
                setIsDeleteModalOpen(false);
              }}
            >
              <Dialog.Panel className="p-0 text-center">
                <div className="p-5 text-center">
                  <Lucide
                    icon="XCircle"
                    className="w-16 h-16 mx-auto mt-3 text-danger"
                  />
                  <div className="mt-5 text-3xl">Are you sure?</div>
                  <div className="mt-2 text-slate-500">
                    Do you really want to delete this case study? <br />
                    This action cannot be undone.
                  </div>
                </div>
                <div className="px-5 pb-8 text-center">
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                    }}
                    className="w-24 mr-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="w-24"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </Dialog.Panel>
            </Dialog>
          )}
        </div>
      </div>
    </>
  );
}

export default CaseStudies;
