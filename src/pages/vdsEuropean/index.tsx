import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";

import {
  convertToTitleCase,
  countValidFilters,
  createDynamicURL,
  generateFilterChips,
} from "@/utils/helper";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  baseURL,
  proponent_type,
  proposal_type,
  meeting_type,
} from "@/constant";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";
import { Controller, useForm } from "react-hook-form";
import { FormInput } from "@/components/Base/Form";
import TomSelect from "@/components/Base/TomSelect";
import CPagination from "@/components/Pagination";
import { toast } from "react-toastify";
import CompanySelect from "@/components/ReactSelectAsync";
import {
  fetchVdsEuropeans,
  resetPage,
  setPage,
} from "@/stores/vdsEuropeanSlice";
import { vdsEuropeanService } from "@/services/vdsEuropean";
import { setTempSearch } from "@/stores/dashboardSlice";
import { Tooltip } from "react-tooltip";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";
import LoadingIcon from "@/components/Base/LoadingIcon";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import { peerAnalysisService } from "@/services/peerAnalysis";
import CreatableInputSelect from "@/components/Base/CreatableInputSelect";
import Pill from "@/components/Pill";
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaLayerGroup, FaTags, FaUserTie, FaHandshake, FaListUl, FaGlobe } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import { getVdsEuropeanDropdownValues } from "@/services/vdsEuropeanDropdown";
import Litepicker from "@/components/Base/Litepicker";
import React, { useCallback } from "react";

const index = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const { VdsEuropeans, loading, page, totalPages, count } = useAppSelector(
    (state) => state.vdsEuropean
  );

  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const [searchParams] = useSearchParams();
  const searchTicker = searchParams.get("ticker");
  const [allApplyFilter, setallApplyFilter] = useState<any>({});
  const [allAnalyticsFilter, setAllAnalyticsFilter] = useState<any>({});
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [getFundNameDropdownLoader, setGetFundNameDropdownLoader] =
    useState<boolean>(false);
  const [apiInstitutionDropdown, setApiInstitutionDropdown] = useState<any>({
    institution: [],
  });
  const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
  const [vdsEuropeansAnalytics, setVdsEuropeansAnalytics] = useState<any>({});
  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [dropdownValues, setDropdownValues] = useState<any>({
    company_name: [],
    institution: [],
    index: [],
  });
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isViewAnalysis, setIsViewAnalysis] = useState<boolean>(true);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [analyticsPage, setAnalyticsPage] = useState<number>(1);
  const [getDynamicDropdownLoader, setGetDynamicDropdownLoader] =
    useState<boolean>(false);
  const [apiDependentDropdownOptions, setApiDependentDropdownOptions] =
    useState<any>({
      institution: [],
      vote: [],
      category: [],
      year: [],
      index: [],
      company_name: [],
    });
  const [voteOptions, setVoteOptions] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [institutionOptions, setInstitutionOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countryComponentKey, setCountryComponentKey] = useState<number>(0);
  const [isRestoringFromLocalStorage, setIsRestoringFromLocalStorage] = useState<boolean>(false);
  const [companyOptions, setCompanyOptions] = useState<any[]>([]);
  const [companySearchLoading, setCompanySearchLoading] = useState<boolean>(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const formatNumberWithCommas = (num: number): string => num.toLocaleString();
  
  // Helper function to check if proposal number has duplicates
  const hasDuplicateProposalNumber = (proposalNum: string, allProposals: any[]) => {
    if (!proposalNum || !allProposals) return false;
    
    const matchingProposals = allProposals.filter(proposal => 
      proposal?.proposal_num === proposalNum
    );
    
    return matchingProposals.length > 1;
  };

  // Helper function to get border styling for sequential duplicate proposals
  const getSequentialBorderStyle = (proposalNum: string, allProposals: any[], currentIndex: number) => {
    if (!proposalNum || !allProposals || !hasDuplicateProposalNumber(proposalNum, allProposals)) {
      return {};
    }

    // Find all indices with the same proposal number
    const matchingIndices = allProposals
      .map((proposal, index) => ({ proposal, index }))
      .filter(item => item.proposal?.proposal_num === proposalNum)
      .map(item => item.index);

    if (matchingIndices.length <= 1) return {};

    // Check if current index is part of a sequential group
    const isSequential = matchingIndices.some((startIndex, i) => {
      if (i === matchingIndices.length - 1) return false;
      const nextIndex = matchingIndices[i + 1];
      return nextIndex === startIndex + 1 && (currentIndex === startIndex || currentIndex === nextIndex);
    });

    if (!isSequential) return {};

    // Determine position in sequential group
    const isFirst = matchingIndices.some((index, i) => 
      index === currentIndex && 
      (i === 0 || matchingIndices[i - 1] !== index - 1)
    );
    
    const isLast = matchingIndices.some((index, i) => 
      index === currentIndex && 
      (i === matchingIndices.length - 1 || matchingIndices[i + 1] !== index + 1)
    );

    const isMiddle = !isFirst && !isLast && matchingIndices.includes(currentIndex);

    let borderStyle: React.CSSProperties = {
      backgroundColor: '#fef2f2',
      borderLeft: '1px solid #9f1239',
      borderRight: '1px solid #9f1239',
    };

    if (isFirst) {
      borderStyle = { ...borderStyle, borderTop: '1px solid #9f1239' };
    }
    
    if (isLast) {
      borderStyle = { ...borderStyle, borderBottom: '1px solid #9f1239' };
    }

    if (isFirst && isLast) {
      // Single row group (shouldn't happen with duplicates, but safety check)
      borderStyle = {
        backgroundColor: '#fef2f2',
        border: '1px solid #9f1239',
      };
    }

    return borderStyle;
  };
  const toggleExpand = (index: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };
  const toggleGroup = (company_name: string) => {
    setOpenGroups((prevState) => ({
      ...prevState,
      [company_name]: !prevState[company_name],
    }));
  };

  const expandAllGroups = () => {
    if (!vdsEuropeansAnalytics?.by_company) return;
    
    const allCompanyNames: string[] = [];
    vdsEuropeansAnalytics.by_company.forEach((yearEntry: any) => {
      if (Array.isArray(yearEntry.companies)) {
        yearEntry.companies.forEach((company: any) => {
          if (company.company_name) {
            allCompanyNames.push(company.company_name);
          }
        });
      }
    });

    const allExpanded = allCompanyNames.every(name => openGroups[name]);
    
    if (allExpanded) {
      // Collapse all
      setOpenGroups({});
    } else {
      // Expand all
      const newOpenGroups: { [key: string]: boolean } = {};
      allCompanyNames.forEach(name => {
        newOpenGroups[name] = true;
      });
      setOpenGroups(newOpenGroups);
    }
  };

  const areAllGroupsExpanded = () => {
    if (!vdsEuropeansAnalytics?.by_company) return false;
    
    const allCompanyNames: string[] = [];
    vdsEuropeansAnalytics.by_company.forEach((yearEntry: any) => {
      if (Array.isArray(yearEntry.companies)) {
        yearEntry.companies.forEach((company: any) => {
          if (company.company_name) {
            allCompanyNames.push(company.company_name);
          }
        });
      }
    });

    return allCompanyNames.length > 0 && allCompanyNames.every(name => openGroups[name]);
  };
  const hasAnyValidFilter = (filterObj: Record<string, any>): boolean => {
    return Object.values(filterObj || {}).some((val) => {
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "string") return val.trim() !== "";
      if (typeof val === "number") return !isNaN(val);
      return !!val;
    });
  };

  // Restore filters from localStorage on mount
  useEffect(() => {
    const restoreFilters = () => {
      setIsRestoringFromLocalStorage(true);
      
      // Check for analytics filters first since we start in analytics view
      const savedAnalyticsFilters = localStorage.getItem("vdsEuropeanAnalyticsFilters");
      const savedRegularFilters = localStorage.getItem("vdsEuropeanFilters");
      
      if (isViewAnalysis && savedAnalyticsFilters) {
        try {
          const parsed = JSON.parse(savedAnalyticsFilters);
          
          // Restore analytics filters
          setAllAnalyticsFilter(parsed);
          
          // Restore form values
          Object.entries(parsed).forEach(([key, value]) => {
            setValue(key, value);
          });
          
          // Generate filter chips from restored analytics data
          setSelectedChipFilters(generateFilterChips(parsed));
          setFiltersLength(countValidFilters(parsed));
          setSelectedCountries(parsed.country || ["USA"]);
          
          // Fetch vote and year options for restored institutions
          if (parsed.institution_name && parsed.institution_name.length > 0) {
            getInstitutionDependentOptions(parsed.institution_name);
          }
          
          setIsRestoringFromLocalStorage(false);
          return;
        } catch (e) {
          console.log("Error parsing saved analytics filters:", e);
        }
      }
      
      if (!isViewAnalysis && savedRegularFilters) {
        try {
          const parsed = JSON.parse(savedRegularFilters);
          
          // Restore regular filters
          setallApplyFilter(parsed);
          
          // Restore all saved values with proper field mapping
          const restoredValues = {
            institution_name: parsed.institution_name || [],
            vote: parsed.vote || [],
            category: parsed.category || [],
            year: parsed.year || "",
            analyticsYear: parsed.analyticsYear || [],
            company_name: parsed.company_name || [],
            date_range: parsed.date_range || "",
            country: parsed.country || ["USA"],
            index: parsed.index || [],
            meeting_type: parsed.meeting_type || [],
            proposal_type: parsed.proposal_type || [],
            proponent_type: parsed.proponent_type || [],
            proposal_keyword: parsed.proposal_keyword || [],
            keyword: parsed.keyword || "",
          };
          
          reset(restoredValues);
          
          // Generate filter chips from restored data
          setSelectedChipFilters(generateFilterChips(parsed));
          setFiltersLength(countValidFilters(parsed));
          setSelectedCountries(parsed.country || ["USA"]);
          
          setIsRestoringFromLocalStorage(false);
          return;
        } catch (e) {
          console.log("Error parsing saved filters:", e);
        }
      }
      
      // Set defaults if no saved filters or parsing failed
      const getCurrentYear = () => {
        return new Date().getFullYear().toString();
      };
      
      const getDefaultDateRange = () => {
        const now = new Date();
        const usDate = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const startDate = "2025-01-01";
        const endDate = usDate.toISOString().split("T")[0];
        return `${startDate} - ${endDate}`;
      };
      
      if (isViewAnalysis) {
        const defaultAnalyticsFilters = {
          institution_name: ["BlackRock, Inc."],
          index: ["S&P 500"],
          country: ["USA"],
          analyticsYear: [getCurrentYear()]
        };
        
        setAllAnalyticsFilter(defaultAnalyticsFilters);
        Object.entries(defaultAnalyticsFilters).forEach(([key, value]) => {
          setValue(key, value);
        });
        setSelectedChipFilters(generateFilterChips(defaultAnalyticsFilters));
        setFiltersLength(countValidFilters(defaultAnalyticsFilters));
        
        // Fetch vote and year options for default institutions
        getInstitutionDependentOptions(defaultAnalyticsFilters.institution_name);
      } else {
        const defaultFilters = { 
          country: ["USA"],
          year: getCurrentYear()
        };
        
        setallApplyFilter(defaultFilters);
        setValue("country", ["USA"]);
        setValue("year", getCurrentYear());
        setSelectedChipFilters(generateFilterChips(defaultFilters));
        setFiltersLength(countValidFilters(defaultFilters));
      }
      
      setSelectedCountries(["USA"]);
      setIsRestoringFromLocalStorage(false);
    };
    
    // Use setTimeout to ensure component is fully mounted
    setTimeout(restoreFilters, 50);
  }, [isViewAnalysis]);

  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch if we're still restoring from localStorage
      if (isRestoringFromLocalStorage) {
        return;
      }
      
      if (!isViewAnalysis && hasAnyValidFilter(allApplyFilter)) {
        setIsLoading(true);

        await dispatch(
          fetchVdsEuropeans(
            createDynamicURL(
              `${baseURL}/vds_european/`,
              allApplyFilter,
              undefined,
              page
            )
          )
        );

        // Only update chips for regular filters if not in analytics mode
        // Don't overwrite chips if they were just restored from localStorage
        if (!isRestoringFromLocalStorage) {
          setFiltersLength(countValidFilters(allApplyFilter));
          setSelectedChipFilters(generateFilterChips(allApplyFilter));
        }
        dispatch(setTempSearch(companyGlobalSearchName));

        setIsLoading(false);
      }
    };

    fetchData();
  }, [companyGlobalSearchTicker, searchTicker, allApplyFilter, page, isViewAnalysis, isRestoringFromLocalStorage]);

  // Ensure filter chips are always displayed when we have valid filters
  useEffect(() => {
    if (!isViewAnalysis && hasAnyValidFilter(allApplyFilter) && selectedChipFilters.length === 0 && !isRestoringFromLocalStorage) {
      setSelectedChipFilters(generateFilterChips(allApplyFilter));
      setFiltersLength(countValidFilters(allApplyFilter));
    }
  }, [allApplyFilter, selectedChipFilters.length, isRestoringFromLocalStorage, isViewAnalysis]);

  // Ensure filter chips are displayed for analytics filters
  useEffect(() => {
    if (isViewAnalysis && hasAnyValidFilter(allAnalyticsFilter) && selectedChipFilters.length === 0 && !isRestoringFromLocalStorage) {
      setSelectedChipFilters(generateFilterChips(allAnalyticsFilter));
      setFiltersLength(countValidFilters(allAnalyticsFilter));
    }
  }, [isViewAnalysis, allAnalyticsFilter, selectedChipFilters.length, isRestoringFromLocalStorage]);

  useEffect(() => {
    getDependentDropdown();
  }, [dropdownValues?.company_name]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const data = await getVdsEuropeanDropdownValues();
        setInstitutionOptions(data.institution || []);
        setCountryOptions(data.country || []);
        // Don't set vote and year here - they will be fetched with institution dependency
      } catch (error) {
        setInstitutionOptions([]);
        setCountryOptions([]);
        setVoteOptions([]);
        setYearOptions([]);
      }
    };
    fetchDropdownData();
    
    // Fetch vote and year options with default institution (BlackRock)
    getInstitutionDependentOptions(["BlackRock, Inc."]);
    
    // Fix: Make default API call for company filter with correct parameters
    // This will call: https://api.zmhadvisors.com/company/?company_name=a&index=["100"]
    const fetchDefaultCompanies = async () => {
      try {
        const res = await vdsEuropeanService.getDefaultCompanyDropdownValues({
          company_name: "a",
          index: ["100"]
        });
        if (res.result) {
          const companies = res.result.company_name || res.result.company || [];
          setCompanyOptions(companies);
        }
      } catch (error) {
        console.error("Error fetching default companies:", error);
        setCompanyOptions([]);
      }
    };
    fetchDefaultCompanies();
  }, []);

  // Calculate default date range: Jan 2024 to one day before current date
  const getDefaultDateRange = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const startDate = "2024-01-01";
    const endDate = yesterday.toISOString().split("T")[0];
    
    return `${startDate} - ${endDate}`;
  };

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<any>({
    defaultValues: {
      institution_name: [],
      vote: [],
      category: [],
      year: new Date().getFullYear().toString(),
      company_name: [],
      date_range: "",
      country: ["USA"],
    },
  });

  // Watch for changes in date_range and year to implement mutual exclusivity
  const watchedDateRange = watch("date_range");
  const watchedYear = watch("year");
  const watchedAnalyticsYear = watch("analyticsYear");
  
  // Track previous values to determine which field changed
  const [prevDateRange, setPrevDateRange] = useState("");
  const [prevYear, setPrevYear] = useState("");
  const [prevAnalyticsYear, setPrevAnalyticsYear] = useState([]);

  // Implement mutual exclusivity between date_range and year filters
  useEffect(() => {
    const currentDateRange = watchedDateRange || "";
    const currentYear = watchedYear || "";
    const currentAnalyticsYear = watchedAnalyticsYear || [];
    
    // Check if date_range changed and has a value
    if (currentDateRange !== prevDateRange && currentDateRange.trim() !== "") {
      // Date range was set, clear both year fields if they have values
      if (currentYear.trim() !== "") {
        setValue("year", "");
      }
      if (currentAnalyticsYear.length > 0) {
        setValue("analyticsYear", []);
      }
    }
    
    // Check if year changed and has a value
    if (currentYear !== prevYear && currentYear.trim() !== "") {
      // Year was set, clear date_range and analyticsYear if they have values
      if (currentDateRange.trim() !== "") {
        setValue("date_range", "");
      }
      if (currentAnalyticsYear.length > 0) {
        setValue("analyticsYear", []);
      }
    }
    
    // Check if analyticsYear changed and has a value
    if (JSON.stringify(currentAnalyticsYear) !== JSON.stringify(prevAnalyticsYear) && currentAnalyticsYear.length > 0) {
      // Analytics year was set, clear date_range and regular year if they have values
      if (currentDateRange.trim() !== "") {
        setValue("date_range", "");
      }
      if (currentYear.trim() !== "") {
        setValue("year", "");
      }
    }
    
    // Update previous values
    setPrevDateRange(currentDateRange);
    setPrevYear(currentYear);
    setPrevAnalyticsYear(currentAnalyticsYear);
  }, [watchedDateRange, watchedYear, watchedAnalyticsYear, prevDateRange, prevYear, prevAnalyticsYear, setValue]);

  const getDependentDropdown = async () => {
    const paramFilter = {
      company_name: Array.isArray(dropdownValues?.company_name)
        ? dropdownValues?.company_name
        : dropdownValues?.company_name
          ? [dropdownValues?.company_name]
          : [],
      institution_name: dropdownValues?.institution_name,
      year:
        dropdownValues?.institution_name && dropdownValues?.company_name
          ? 2024
          : null,
    };
    if (dropdownValues?.institution_name && dropdownValues?.company_name) {
      setValue("year", new Date().getFullYear());
    }
    try {
      if (!paramFilter.company_name.length) return;
      setGetDynamicDropdownLoader(true);
      const res = await vdsEuropeanService.getDynamicVDSEuropeanDropdownValues(
        paramFilter
      );
      if (res.result) {
        setApiDependentDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    } finally {
      setGetDynamicDropdownLoader(false);
    }
  };

  // New function to get vote and year options based on selected institution
  const getInstitutionDependentOptions = async (institutionNames: string[]) => {
    if (!institutionNames || institutionNames.length === 0) {
      setVoteOptions([]);
      setYearOptions([]);
      return;
    }
    
    try {
      setGetDynamicDropdownLoader(true);
      const res = await vdsEuropeanService.getDynamicVDSEuropeanDropdownValues({
        institution_name: institutionNames
      });
      if (res.result) {
        setVoteOptions(res.result.vote || []);
        setYearOptions(res.result.year || []);
      }
    } catch (error) {
      setVoteOptions([]);
      setYearOptions([]);
      console.error("Error fetching institution dependent options:", error);
    } finally {
      setGetDynamicDropdownLoader(false);
    }
  };

  // Function to search companies based on search term with debouncing
  const searchCompanies = (searchTerm: string, institutionNames: string[]) => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (!searchTerm || searchTerm.length < 2) {
      setCompanyOptions([]);
      setCompanySearchLoading(false);
      return;
    }
    
    setCompanySearchLoading(true);
    
    // Set new timeout for debouncing
    const newTimeout = setTimeout(async () => {
      try {
        // Fix: Use the correct API call format for search
        // This will call: https://api.zmhadvisors.com/get_vds_european_dropdown_values/?institution_name=["BlackRock, Inc."]&company_name=app
        const res = await vdsEuropeanService.getCompanySearchDropdownValues({
          institution_name: institutionNames || ["BlackRock, Inc."],
          company_name: searchTerm // Send as string for search
        });
        if (res.result) {
          const companies = res.result.company_name || res.result.company || [];
          console.log("Company search API response:", companies);
          
          // Store the full company objects for proper handling
          setCompanyOptions(companies);
        }
      } catch (error) {
        setCompanyOptions([]);
        console.error("Error searching companies:", error);
      } finally {
        setCompanySearchLoading(false);
      }
    }, 500); // 500ms debounce
    
    setSearchTimeout(newTimeout);
  };

  // Function to get dependent options when company is selected
  const getCompanyDependentOptions = async (companyNames: any[], institutionNames: string[]) => {
    if (!companyNames || companyNames.length === 0) return;
    
    try {
      setGetDynamicDropdownLoader(true);
      
      // Fix: Include all current filters when company is selected
      const currentFilters = {
        institution_name: institutionNames || ["BlackRock, Inc."],
        company_name: companyNames, // Send as array for selection
        index: watch("index") || [],
        vote: watch("vote") || [],
        country: watch("country") || ["USA"],
        analyticsYear: watch("analyticsYear") || [],
        year: watch("year") || "",
        date_range: watch("date_range") || "",
        proposal_type: watch("proposal_type") || [],
        proponent_type: watch("proponent_type") || [],
        meeting_type: watch("meeting_type") || [],
        proposal_keyword: watch("proposal_keyword") || []
      };
      
      const res = await vdsEuropeanService.getCompanySelectionDropdownValues(currentFilters);
      if (res.result) {
        // Update other dependent dropdowns if needed
        setApiDependentDropdownOptions(prev => ({ ...prev, ...res.result }));
      }
    } catch (error) {
      console.error("Error fetching company dependent options:", error);
    } finally {
      setGetDynamicDropdownLoader(false);
    }
  };

  const getInstituionDependentDropdown = async (value: any) => {
    if (value !== "") {
      const paramFilter = {
        company_name: [value],
      };
      try {
        setGetFundNameDropdownLoader(true);
        const res =
          await vdsEuropeanService.getDynamicVDSEuropeanDropdownValues(
            paramFilter
          );
        if (res.result) {
          setApiInstitutionDropdown({ ...res.result });
        }
      } catch (error) {
        return error;
      } finally {
        setGetFundNameDropdownLoader(false);
      }
    }
  };

  const handleDropdownChange = (key: string, value: any) => {
    setDropdownValues((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
  };

  const onSubmit = async (npxFilter: any) => {
    if (isViewAnalysis) {
      onAnalyticsSubmit(npxFilter);
      setIsFilterCollapse(false); // Ensure filter panel collapses in analytics mode
      return;
    }
    if (!npxFilter?.company_name || npxFilter?.company_name.length === 0) {
      toast.warning("Please Select Company Name");
      return;
    }
    
    // Validate that at least one country is selected
    if (!npxFilter?.country?.length) {
      toast.warning("Please select at least one country");
      return;
    }
    
    // Check if either year or date_range is provided (mutual exclusivity)
    const hasYear = npxFilter?.year && npxFilter?.year.trim() !== "";
    const hasDateRange = npxFilter?.date_range && npxFilter?.date_range.trim() !== "";
    
    if (!hasYear && !hasDateRange) {
      toast.warning("Please Select either Year or Date Range");
      return;
    }
    
    interface FilterObj {
      company_name: any;
      institution_name: any;
      vote_type: any;
      category: any;
      keyword: any;
      country: any;
      date_range?: any;
      year?: any;
    }

    const filterObj: FilterObj = {
      company_name: npxFilter?.company_name, // Already a flat array
      institution_name: npxFilter?.institution_name,
      vote_type: npxFilter?.vote,
      category: npxFilter?.category,
      keyword: npxFilter?.keyword,
      country: npxFilter?.country,
    };
    
    // Add only the active filter (year OR date_range, not both)
    if (hasDateRange) {
      filterObj.date_range = npxFilter?.date_range;
      // Explicitly exclude year when date_range is selected
    } else if (hasYear) {
      filterObj.year = npxFilter?.year;
      // Explicitly exclude date_range when year is selected
    }
    setallApplyFilter(filterObj);
    // Save to localStorage including all filters
    const completeFilterObj = {
      ...filterObj,
      vote: npxFilter?.vote, // Ensure vote filter is saved
      country: npxFilter?.country || ["USA"], // Ensure country filter is saved with USA default
      // Include all form fields to ensure complete restoration
      analyticsYear: npxFilter?.analyticsYear || [],
      index: npxFilter?.index || [],
      meeting_type: npxFilter?.meeting_type || [],
      proposal_type: npxFilter?.proposal_type || [],
      proponent_type: npxFilter?.proponent_type || [],
      proposal_keyword: npxFilter?.proposal_keyword || [],
      keyword: npxFilter?.keyword || "",
    };
    localStorage.setItem("vdsEuropeanFilters", JSON.stringify(completeFilterObj));
    dispatch(resetPage());
    setIsFilterCollapse(false);
  };

  const onAnalyticsSubmit = async (data: any) => {
    if (isViewAnalysis && !data?.institution_name?.length) {
      toast.warning("Please Select Institution Name");
      return;
    }
    
    // Validate that at least one country is selected
    if (!data?.country?.length) {
      toast.warning("Please select at least one country");
      return;
    }
    
    // Check mutual exclusivity for analytics as well
    const hasYear = data?.analyticsYear && data?.analyticsYear.length > 0;
    const hasDateRange = data?.date_range && data?.date_range.trim() !== "";
    
    // If neither year nor date_range is provided, default to current year
    if (!hasYear && !hasDateRange) {
      data.analyticsYear = [new Date().getFullYear().toString()];
    }
    
    interface AnalyticsObj {
      institution_name: any[];
      index: any[];
      company_name: any[];
      vote_type: any[];
      proposal_type?: any[];
      proponent_type?: any[];
      meeting_type?: any[];
      proposal_keyword?: any[];
      country?: any[];
      date_range?: string;
      analyticsYear?: any;
    }
    
    const analyticsObj: AnalyticsObj = {
      institution_name: data?.institution_name || [],
      index: data?.index || [],
      company_name: Array.isArray(data?.company_name) && data.company_name.length > 0
        ? data.company_name.map((item: any) => item.label || item.value || item)
        : [],
      vote_type: data?.vote || [], // always set vote_types
      proposal_type: data?.proposal_type || [],
      proponent_type: data?.proponent_type || [],
      meeting_type: data?.meeting_type || [],
      proposal_keyword: data?.proposal_keyword || [],
      country: data?.country || [],
    };
    
    // Prioritize analyticsYear over date_range for analytics
    const finalHasYear = data?.analyticsYear && data?.analyticsYear.length > 0;
    const finalHasDateRange = data?.date_range && data?.date_range.trim() !== "";
    
    if (finalHasYear) {
      analyticsObj.analyticsYear = data?.analyticsYear;
      // Don't include date_range when year is provided
    } else if (finalHasDateRange) {
      analyticsObj.date_range = data?.date_range;
      // Don't include year when date_range is provided
    } else {
      // Default to current year if neither is provided
      analyticsObj.analyticsYear = [new Date().getFullYear().toString()];
    }
    
    setAllAnalyticsFilter(analyticsObj);
    // Save analytics filters to localStorage
    localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(analyticsObj));
  };

  const onFilterClear = (onAnalyticsTab) => {
    setSelectedChipFilters([]);
    setFiltersLength(0);
    reset();
    resetFormValues();
    setDropdownValues({
      company_name: [],
      institution: [],
      index: [],
    });
    if (onAnalyticsTab) {
      const currentYear = new Date().getFullYear().toString();
      setAllAnalyticsFilter({
        institution_name: ["BlackRock, Inc."],
        index: ["S&P 500"],
        country: ["USA"],
        analyticsYear: [currentYear],
      });
      setValue("institution_name", ["BlackRock, Inc."]);
      setValue("index", ["S&P 500"]);
      setValue("country", ["USA"]);
      setValue("analyticsYear", [currentYear]);
      setSelectedCountries(["USA"]);
      setVdsEuropeansAnalytics({});
      localStorage.removeItem("vdsEuropeanAnalyticsFilters");
      
      // Fetch vote and year options for default institutions
      getInstitutionDependentOptions(["BlackRock, Inc."]);
    } else {
      const currentYear = new Date().getFullYear().toString();
      setallApplyFilter({ country: ["USA"], year: currentYear });
      dispatch(resetPage());
      dispatch(
        fetchVdsEuropeans(
          createDynamicURL(
            `${baseURL}/vds_european/`,
            { country: ["USA"], year: currentYear },
            undefined,
            page
          )
        )
      );

      setApiDependentDropdownOptions({
        institution: [],
        vote: [],
        category: [],
        year: [],
      });
      setApiInstitutionDropdown({
        institution: [],
      });
      localStorage.removeItem("vdsEuropeanFilters");
    }
  };

  const resetFormValues: any = () => {
    setValue("company_name", []);
    setValue("institution_name", ["BlackRock, Inc."]);
    setValue("vote", []);
    setValue("category", []);
    setValue("year", new Date().getFullYear().toString());
    setValue("keyword", "");
    setValue("date_range", "");
    setValue("analyticsYear", []);
    setValue("index", []);
    setValue("proponent_type", []);
    setValue("proposal_type", []);
    setValue("proposal_keyword", []);
    setValue("meeting_type", []);
    setValue("country", ["USA"]);
    setSelectedCountries(["USA"]);
    setCountryComponentKey(prev => prev + 1);
    setDropdownValues({
      company_name: [],
      institution: [],
      index: [],
    });
  };

  const handleNextPage = () => {
    if (isViewAnalysis) {
      const currentPage = vdsEuropeansAnalytics?.pagination?.current_page;
      const totalPages = vdsEuropeansAnalytics?.pagination?.total_pages;
      if (currentPage < totalPages) {
        setAnalyticsPage(currentPage + 1);
      }
    } else {
      if (page < totalPages) {
        dispatch(setPage(page + 1));
      }
    }
  };

  const handlePreviousPage = () => {
    if (isViewAnalysis) {
      const currentPage = vdsEuropeansAnalytics?.pagination?.current_page;
      if (currentPage > 1) {
        setAnalyticsPage(currentPage - 1);
      }
    } else {
      if (page > 1) {
        dispatch(setPage(page - 1));
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isViewAnalysis) {
      setAnalyticsPage(newPage);
    } else {
      dispatch(setPage(newPage));
    }
  };

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    // Handle country filter removal - allow removal but don't validate here
    if (removeKey === "country") {
      const currentCountries = isViewAnalysis ? allAnalyticsFilter.country || [] : allApplyFilter.country || [];
      
      // Remove the specific country value
      const updatedCountries = currentCountries.filter((country: string) => country !== removeValue);
      
      if (isViewAnalysis) {
        const updatedFilters = { ...allAnalyticsFilter, country: updatedCountries };
        setAllAnalyticsFilter(updatedFilters);
        setValue("country", updatedCountries);
        setSelectedCountries(updatedCountries);
        localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(updatedFilters));
      } else {
        const updatedFilters = { ...allApplyFilter, country: updatedCountries };
        setallApplyFilter(updatedFilters);
        setValue("country", updatedCountries);
        setSelectedCountries(updatedCountries);
        localStorage.setItem("vdsEuropeanFilters", JSON.stringify(updatedFilters));
      }
      return;
    }

    // Handle institution filter removal - allow removal but don't validate here
    if (removeKey === "institution_name") {
      const currentInstitutions = isViewAnalysis ? allAnalyticsFilter.institution_name || [] : allApplyFilter.institution_name || [];
      
      // Remove the specific institution value
      const updatedInstitutions = currentInstitutions.filter((institution: string) => institution !== removeValue);
      
      if (isViewAnalysis) {
        const updatedFilters = { ...allAnalyticsFilter, institution_name: updatedInstitutions };
        setAllAnalyticsFilter(updatedFilters);
        setValue("institution_name", updatedInstitutions);
        localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(updatedFilters));
      } else {
        const updatedFilters = { ...allApplyFilter, institution_name: updatedInstitutions };
        setallApplyFilter(updatedFilters);
        setValue("institution_name", updatedInstitutions);
        localStorage.setItem("vdsEuropeanFilters", JSON.stringify(updatedFilters));
      }
      return;
    }

    if (isViewAnalysis) {
      const updatedFilters = { ...allAnalyticsFilter };

      // Special handling for vote_type <-> vote field
      if (removeKey === "vote_type") {
        updatedFilters[removeKey] = (updatedFilters[removeKey] || []).filter(
          (item: any) => item !== removeValue
        );
        // Also update the form field "vote"
        setValue("vote", updatedFilters[removeKey]);
      } else if (Array.isArray(updatedFilters[removeKey])) {
        updatedFilters[removeKey] = updatedFilters[removeKey].filter(
          (item) => item !== removeValue
        );
        setValue(removeKey, updatedFilters[removeKey]);
      } else if (updatedFilters[removeKey] === removeValue) {
        if (removeKey === "year") {
          updatedFilters[removeKey] = " ";
        } else {
          updatedFilters[removeKey] = "";
        }
        setValue(removeKey, updatedFilters[removeKey]);
      }
      setAllAnalyticsFilter(updatedFilters);
      localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(updatedFilters));
      return;
    }

    const updatedFilters = { ...allApplyFilter };

    if (Array.isArray(updatedFilters[removeKey])) {
      updatedFilters[removeKey] = updatedFilters[removeKey].filter(
        (item) => item !== removeValue
      );
    } else if (updatedFilters[removeKey] === removeValue) {
      if (removeKey === "year") {
        updatedFilters[removeKey] = " ";
      } else {
        updatedFilters[removeKey] = "";
      }
    }

    setValue(removeKey, updatedFilters[removeKey]);
    setallApplyFilter(updatedFilters);
    localStorage.setItem("vdsEuropeanFilters", JSON.stringify(updatedFilters));
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      // Don't fetch if we're still restoring from localStorage
      if (isRestoringFromLocalStorage) {
        return;
      }
      
      if (isViewAnalysis && allAnalyticsFilter?.institution_name && allAnalyticsFilter.institution_name.length > 0) {
        setIsAnalyticsLoading(true);
        try {
          const response = await vdsEuropeanService.getVDSEuropeanAnalytics(
            `${baseURL}/api/proposal-voting-stats`,
            {
              investor_company: allAnalyticsFilter?.institution_name?.length
                ? allAnalyticsFilter.institution_name
                : allAnalyticsFilter.company_name || [],
              company_name: allAnalyticsFilter?.company_name?.length > 0
                ? allAnalyticsFilter.company_name
                : [],
              year:
                allAnalyticsFilter?.analyticsYear?.length > 0
                  ? allAnalyticsFilter?.analyticsYear
                  : [],
              proponent_type: allAnalyticsFilter?.proponent_type
                ? allAnalyticsFilter?.proponent_type
                : [],
              proposal_type: allAnalyticsFilter?.proposal_type
                ? allAnalyticsFilter?.proposal_type.map((item: any) =>
                  item.toLowerCase()
                )
                : [],
              index:
                allAnalyticsFilter?.index?.length > 0
                  ? allAnalyticsFilter.index
                  : [],
              proposal_keyword:
                allAnalyticsFilter?.proposal_keyword?.length > 0
                  ? allAnalyticsFilter.proposal_keyword
                  : [],
              meeting_type: allAnalyticsFilter?.meeting_type?.length > 0
                ? allAnalyticsFilter.meeting_type
                : [],
              vote_type: allAnalyticsFilter?.vote_type || [],
              date_range: allAnalyticsFilter?.date_range || null,
              country: allAnalyticsFilter?.country || ["USA"],
              page: analyticsPage || 1,
            }
          );
          if (isMounted) {
            setVdsEuropeansAnalytics(response.response);
            setIsAnalyticsLoading(false);
          }
        } catch (error) {
          if (isMounted) {
            setIsAnalyticsLoading(false);
          }
        }
      }
    };
    fetchAnalytics();
    
    // Generate filter chips only when analytics filter changes and not restoring
    if (isViewAnalysis && !isRestoringFromLocalStorage) {
      let filterForChips = allAnalyticsFilter;
      if (filterForChips.vote) {
        const { vote, ...rest } = filterForChips;
        filterForChips = rest;
      }
      setFiltersLength(countValidFilters(filterForChips));
      setSelectedChipFilters(generateFilterChips(filterForChips));
    }
    
    return () => { isMounted = false; };
  }, [allAnalyticsFilter, analyticsPage, isViewAnalysis, isRestoringFromLocalStorage]);

  // Handle URL params for analytics initialization
  useEffect(() => {
    if (!isViewAnalysis) return;
    
    // Only handle URL params if no filters are set and not restoring from localStorage
    if (Object.keys(allAnalyticsFilter).length > 0 || isRestoringFromLocalStorage) return;

    const query = new URLSearchParams(window.location.search);
    const institution_name = query.get("institution_name");
    const analyticsYear = query.get("year");

    // Set defaults based on URL params if provided
    if (institution_name || analyticsYear) {
      const currentYear = new Date().getFullYear().toString();
      const urlBasedFilters = {
        institution_name: institution_name ? [institution_name] : ["BlackRock, Inc."],
        analyticsYear: analyticsYear ? [analyticsYear] : [currentYear],
        country: ["USA"],
      };
      
      setAllAnalyticsFilter(urlBasedFilters);
      Object.entries(urlBasedFilters).forEach(([key, value]) => {
        setValue(key, value);
      });
      setSelectedCountries(["USA"]);
      
      // Fetch vote and year options for URL-based institutions
      getInstitutionDependentOptions(urlBasedFilters.institution_name);
    }
  }, [isViewAnalysis, isRestoringFromLocalStorage]);
 
  const getAllCaseStudyDropdowns = async () => {
    try {
      setGetDropdownLoader(true);
      const res = await peerAnalysisService.getPeerAnalysisDropdownValues();
      if (res.result) {
        setApiDependentDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    } finally {
      setGetDropdownLoader(false);
    }
  };

  useEffect(() => {
    if (isViewAnalysis) {
      getAllCaseStudyDropdowns();
    }
  }, [isViewAnalysis]);


  // Debug: Log analytics state before render
  console.log('vdsEuropeansAnalytics:', vdsEuropeansAnalytics);
  console.log('isAnalyticsLoading:', isAnalyticsLoading);

  return (
    <>
      <div className="flex justify-between items-center xs:flex-col md:flex-row py-3"></div>
      <div className="p-5 mt-1 box">
        <div className="flex flex-col p-5  sm:flex-row gap-y-2">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
            <span>
              <h1 className="text-lg font-bold flex items-center gap-2">
                Voting Data
                <Pill text="Beta" />
              </h1>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center">
            {!isViewAnalysis && count > 0 && (
              <h2 className="flex items-end font-semibold justify-end text-[13px] md:ml-auto mx-5">
                Count: {count.toLocaleString()}
              </h2>
            )}

            <div className="flex items-center gap-2">
              <Popover className="inline-block">
                {({ close }) => (
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
                      Filter
                      <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
                        {filtersLength}
                      </div>
                    </Popover.Button>
                  </>
                )}
              </Popover>
            </div>
          </div>
        </div>

        {/* Filter Pills immediately after filter card, before data */}
        {selectedChipFilters?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedChipFilters.map((chip, idx) => (
              <span key={idx} className="flex items-center bg-primary/10 text-primary font-medium px-3 py-1 rounded-full shadow-sm transition-all hover:bg-primary/20">
                {chip.label}
                <button
                  type="button"
                  className="ml-2 text-primary hover:text-red-600 transition-colors"
                  onClick={() => handleRemoveChip(chip.key, chip.value)}
                >
                  <FaTimes className="text-xs" />
                </button>
              </span>
            ))}
          </div>
        )}
        {/* Filter Card directly below heading, above pills and data */}
        {isFilterCollapse && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
            {/* Filter Toggle and Advanced Filters Button */}
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* First row: Institution, Year, Index, Date Range, Company */}
              <div className="grid gap-6 md:grid-cols-5 grid-cols-1">
                {/* Institution */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaUniversity className="text-gray-400" /> Institution*
                  </label>
                  <Controller
                    name="institution_name"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={institutionOptions.map(option => ({
                          value: option,
                          label: option,
                          isDisabled: field.value?.length >= 3 && !field.value.includes(option)
                        }))}
                        placeholder="Select Institutions"
                        loading={getFundNameDropdownLoader}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => option.value);
                          field.onChange(selectedValues);
                          handleDropdownChange("institution_name", selectedValues);
                          // Fetch vote and year options based on selected institutions
                          getInstitutionDependentOptions(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Year */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaCalendarAlt className="text-gray-400" /> Year
                  </label>
                  <Controller
                    name="analyticsYear"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={yearOptions.map(year => year.toString())}
                        placeholder="Select Year"
                        loading={getDynamicDropdownLoader}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => option.value);
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Index */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaLayerGroup className="text-gray-400" /> Index
                  </label>
                  <Controller
                    name="index"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={apiDependentDropdownOptions?.index?.map((item: any) => item)}
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
                {/* Date Range */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaCalendarAlt className="text-gray-400" /> Date Range
                  </label>
                  <div className="relative">
                    <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                      <Lucide icon="Calendar" className="w-4 h-4" />
                    </div>
                    <Controller
                      name="date_range"
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <Litepicker
                          value={field.value}
                          onChange={(date) => field.onChange(date)}
                          placeholder="Select Date Range"
                          options={{
                            autoApply: false,
                            singleMode: false,
                            numberOfColumns: 2,
                            numberOfMonths: 2,
                            showWeekNumbers: true,
                            splitView: true,
                            dropdowns: {
                              minYear: 2023,
                              maxYear: 2025,
                              months: true,
                              years: true,
                            },
                            maxDate: (() => {
                              // Get current US date (considering Pakistan is ahead by ~10-11 hours)
                              const now = new Date();
                              const usDate = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
                              return usDate.toISOString().split("T")[0];
                            })(),
                            minDate: "2023-01-01",
                            startDate: "2025-01-01",
                            endDate: (() => {
                              // Get current US date (considering Pakistan is ahead by ~10-11 hours)
                              const now = new Date();
                              const usDate = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
                              return usDate.toISOString().split("T")[0];
                            })(),
                          }}
                          className="pl-12"
                        />
                      )}
                    />
                  </div>
                </div>
                {/* Company */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaBuilding className="text-gray-400" /> Company
                  </label>
                  <Controller
                    name="company_name"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <CompanySelect
                        value={(field.value || []).map(companyName => {
                          // Find the full company object for this name
                          const companyObj = companyOptions.find(c => 
                            (typeof c === 'object' ? (c.name || c.company_name || c.label) : c) === companyName
                          );
                          return {
                            value: companyName,
                            label: companyName
                          };
                        })}
                        onChange={(selectedCompanies) => {
                          // Extract company names for form storage and API calls
                          const companiesArray = Array.isArray(selectedCompanies) ? selectedCompanies : (selectedCompanies ? [selectedCompanies] : []);
                          const companyNames = companiesArray.map(company => 
                            typeof company === 'string' ? company : company.label || company.value
                          );
                          
                          field.onChange(companyNames);
                          
                          // Get dependent options when companies are selected - send names not IDs
                          const currentInstitutions = watch("institution_name") || ["BlackRock, Inc."];
                          if (companyNames.length > 0) {
                            getCompanyDependentOptions(companyNames, currentInstitutions);
                          }
                        }}
                        // Fix: Use exactUrl to override the default API call and pass current filters
                        exactUrl="get_vds_european_dropdown_values_with_filters/"
                        arrayKeyName="company"
                        // Pass current form values as additional context
                        currentFilters={{
                          institution_name: watch("institution_name") || ["BlackRock, Inc."],
                          index: watch("index") || [],
                          vote: watch("vote") || [],
                          country: watch("country") || ["USA"],
                          analyticsYear: watch("analyticsYear") || [],
                          year: watch("year") || "",
                          date_range: watch("date_range") || "",
                          proposal_type: watch("proposal_type") || [],
                          proponent_type: watch("proponent_type") || [],
                          meeting_type: watch("meeting_type") || [],
                          proposal_keyword: watch("proposal_keyword") || []
                        }}
                        placeholder="Search Companies"
                        isMulti={true}
                      />
                    )}
                  />
                </div>
              </div>
              {/* Second row: Country, Meeting Type, Proposal Category, Proponent, Vote */}
              <div className="grid gap-6 md:grid-cols-5 grid-cols-1 mt-6">
                {/* Country */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaGlobe className="text-gray-400" /> Country
                  </label>
                  <Controller
                    name="country"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => {
                      // Use selectedCountries as the source of truth
                      const currentCountries = selectedCountries.length > 0 ? selectedCountries : (field.value || []);
                      
                      return (
                        <MultiSelectDropdown
                          key={`country-${countryComponentKey}`} // Force re-render to reset component state
                          data={countryOptions.map(option => ({
                            value: option,
                            label: option
                          }))}
                          placeholder="Select Country"
                          loading={false}
                          onChange={(selectedOptions) => {
                            const selectedValues = selectedOptions.map((option) => option.value);
                            
                            // Update both state and form field
                            setSelectedCountries(selectedValues);
                            field.onChange(selectedValues);
                          }}
                          selectedOption={currentCountries}
                        />
                      );
                    }}
                  />
                </div>
                {/* Meeting Type */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaTags className="text-gray-400" /> Meeting Type
                  </label>
                  <Controller
                    name="meeting_type"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={meeting_type.map((item: any) => convertToTitleCase(item))}
                        placeholder="Select Meeting Type"
                        loading={false}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => convertToTitleCase(option.value));
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Proposal Category */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaListUl className="text-gray-400" /> Proposal Category
                  </label>
                  <Controller
                    name="proposal_type"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={proposal_type.map((item: any) => convertToTitleCase(item))}
                        placeholder="Select Proposal Category"
                        loading={false}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => convertToTitleCase(option.value));
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Proponent */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaUserTie className="text-gray-400" /> Proponent
                  </label>
                  <Controller
                    name="proponent_type"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={proponent_type.map((item: any) => convertToTitleCase(item))}
                        placeholder="Select Proponent"
                        loading={false}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => convertToTitleCase(option.value));
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Vote */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaHandshake className="text-gray-400" /> Vote
                  </label>
                  <Controller
                    name="vote"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={voteOptions.map(vote => ({
                          value: vote,
                          label: vote
                        }))}
                        placeholder="Select Vote"
                        loading={getDynamicDropdownLoader}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => option.value);
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
              </div>
              {/* Third row: Keywords */}
              <div className="grid gap-6 md:grid-cols-4 grid-cols-4 mt-6">
                {/* Keywords */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaTags className="text-gray-400" /> Keywords
                  </label>
                  <Controller
                    name="proposal_keyword"
                    control={control}
                    render={({ field }) => (
                      <CreatableInputSelect
                        value={field.value || []}
                        onChange={(val) => field.onChange(val)}
                      />
                    )}
                  />
                </div>
              </div>
              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="primary"
                  className="w-36 flex items-center gap-2 text-base font-semibold shadow-md hover:bg-primary/90 transition-all"
                  type="submit"
                >
                  <FaSearch className="text-lg" /> Apply
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ANALYTICS TABLE (by_institution) and COLLAPSIBLE COMPANY LIST (by_company) with loader */}
        {isViewAnalysis && isAnalyticsLoading && (
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="rounded-2xl shadow-lg bg-white p-8 border border-gray-100 flex flex-col items-center">
              <LoadingIcon icon="three-dots" className="w-12 h-12 text-primary" />
            </div>
          </div>
        )}
        {isViewAnalysis && !isAnalyticsLoading && vdsEuropeansAnalytics && typeof vdsEuropeansAnalytics === 'object' && vdsEuropeansAnalytics.by_institution && Object.keys(vdsEuropeansAnalytics.by_institution).length > 0 && (
          <AnalyticsTableMemo vdsEuropeansAnalytics={vdsEuropeansAnalytics} openGroups={openGroups} toggleGroup={toggleGroup} />
        )}
        {isViewAnalysis && !isAnalyticsLoading && vdsEuropeansAnalytics && typeof vdsEuropeansAnalytics === 'object' && vdsEuropeansAnalytics.by_company && Array.isArray(vdsEuropeansAnalytics.by_company) && vdsEuropeansAnalytics.by_company.length > 0 && (
          <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 mt-8">
            {/* Expand All Button */}
            <div className="flex justify-end mb-4 px-4 pt-4">
              <button
                onClick={expandAllGroups}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium text-sm"
              >
                {areAllGroupsExpanded() ? "Collapse All" : "Expand All"}
                 <Lucide icon={areAllGroupsExpanded() ? "ChevronUp" : "ChevronDown"} className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {vdsEuropeansAnalytics.by_company.map((yearEntry, yearIdx) => (
                Array.isArray(yearEntry.companies)
                  ? yearEntry.companies.map((ele, index) => (
                    <div key={ele.company_id || `${yearIdx}-${index}`} className="py-2">
                      <div
                        className="flex flex-row justify-between items-center cursor-pointer px-4 py-3 rounded-lg bg-gray-50 hover:bg-primary/5 transition font-semibold text-base"
                        onClick={() => toggleGroup(ele.company_name)}
                      >
                        <span>
                          {`${ele.meeting_date} - ${ele.company_name}`}
                          {ele.meeting_type?.trim() && ` (${ele.meeting_type})`}
                        </span>

                        <span className="ml-2 text-primary font-bold">{openGroups[ele.company_name] ? '▲' : '▼'}</span>
                      </div>
                      {openGroups[ele.company_name] && Array.isArray(ele.sample_proposals) && (
                        <div className="mt-2 mb-4 bg-gray-50 rounded-lg overflow-x-auto">
                          <table className="min-w-full table-fixed">
                            <thead>
                              <tr className="bg-primary text-white text-sm">
                                <th className="px-4 py-2 text-left font-semibold w-[12%]">Proposal No.</th>
                                <th className="px-4 py-2 text-left font-semibold w-[35%]">Proposal</th>
                                <th className="px-4 py-2 text-left font-semibold w-[15%]">Mgmt Rec</th>
                                <th className="px-4 py-2 text-left font-semibold w-[15%]">Vote Cast</th>
                                <th className="px-4 py-2 text-left font-semibold w-[23%]">Institution Name</th>
                              </tr>
                            </thead>
                            <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                              {ele.sample_proposals.map((vds, vdsIdx) => (
                                <tr 
                                  key={vds.proposal_id || vdsIdx} 
                                  className="hover:bg-primary/10"
                                  style={getSequentialBorderStyle(vds?.proposal_num, ele.sample_proposals, vdsIdx)}
                                >
                                  <td className="px-4 py-2 w-[12%] align-middle">
                                    {vds?.proposal_num}
                                  </td>
                                  <td className="px-4 py-2 w-[35%] align-middle">
                                    {vds?.proposal}
                                  </td>
                                  <td className="px-4 py-2 w-[15%] align-middle">{convertToTitleCase(vds?.mgt_rec)}</td>
                                  <td className="px-4 py-2 w-[15%] align-middle">
                                    <div className="flex items-center">
                                      <span className={clsx([
                                        (vds?.vote?.includes("Against") || vds.vote?.includes("Withhold")) &&
                                        "text-red-700 font-semibold",
                                      ])}>
                                        {vds?.vote}
                                      </span>
                                      {vds?.notes && vds.notes.toLowerCase() !== "nan" && (
                                        <span
                                          data-tooltip-id="my-tooltip-data-html"
                                          data-tooltip-html={vds?.notes}
                                          className="ml-2 inline-flex items-center justify-center rounded-full bg-transparent cursor-pointer"
                                        >
                                          <Lucide icon="Info" className="w-4 h-4" />
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 w-[23%] align-middle">{vds?.institution_name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                  : null
              ))}
            </div>
            {vdsEuropeansAnalytics?.by_company?.length > 0 && (
              <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                <CPagination
                  page={vdsEuropeansAnalytics?.pagination?.current_page || 1}
                  totalPages={vdsEuropeansAnalytics?.pagination?.total_pages || 1}
                  handleNextPage={handleNextPage}
                  handlePageChange={handlePageChange}
                  handlePreviousPage={handlePreviousPage}
                />
              </div>
            )}
          </div>
        )}
        {isViewAnalysis && !isAnalyticsLoading && vdsEuropeansAnalytics && typeof vdsEuropeansAnalytics === 'object' && (!vdsEuropeansAnalytics.by_institution || Object.keys(vdsEuropeansAnalytics.by_institution).length === 0) && (
          <div className="text-center text-gray-500 py-8">No analytics data available for the selected filters.</div>
        )}
        {/* TABLE SECTION (with skeleton loader, sticky headers, zebra striping, pill badges, tooltips, and empty state) */}
        {!isViewAnalysis && (
          <TableWrapper isLoading={allApplyFilter && loading}>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
              <Table>
                <Table.Thead>
                  <Table.Tr className="sticky top-0 z-20 bg-primary/90 text-white shadow-md">
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "17.5%" }}>Institution</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "17.5%" }}>Meeting Type</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "5%" }}>No.</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "25%" }}>Proposal</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "30%" }}>Vote Cast</Table.Td>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <Table.Tr key={i} className="animate-pulse">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <Table.Td key={j}><Skeleton height={24} /></Table.Td>
                        ))}
                      </Table.Tr>
                    ))
                  ) : VdsEuropeans?.length > 0 ? (
                    (() => {
                      let lastInstitutionName = "";
                      let toggle = false;
                      return VdsEuropeans.map((vds: any, index: number) => {
                        const currentInstitution = vds?.excel_institution_name;
                        if (currentInstitution !== lastInstitutionName) {
                          toggle = !toggle;
                          lastInstitutionName = currentInstitution;
                        }
                        return (
                          <Table.Tr
                            key={vds?.id}
                            className={clsx(
                              "[&_td]:last:border-b-0 transition-all hover:bg-primary/5 cursor-pointer",
                              toggle ? "bg-white" : "bg-gray-50"
                            )}
                            style={getSequentialBorderStyle(vds?.proposal_num, VdsEuropeans, index)}
                          >
                            <Table.Td className="whitespace-nowrap overflow-hidden text-ellipsis font-semibold text-primary/80">
                              {vds?.excel_institution_name}
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                {convertToTitleCase(vds?.meeting_type)}
                              </span>
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <span className="inline-block px-2 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-bold">
                                {vds?.proposal_num}
                              </span>
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <span className="block truncate" title={vds?.proposal}>{vds?.proposal}</span>
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                {convertToTitleCase(vds?.mgt_rec)}
                              </span>
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <div className="flex items-center gap-2">
                                {vds?.vote === "Split Vote" ? (
                                  <Tippy content={vds?.split_vote_counts} options={{ theme: "light" }}>
                                    <span className="inline-block px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">{vds?.vote}</span>
                                  </Tippy>
                                ) : (
                                  <span className={clsx(
                                    "inline-block px-2 py-1 rounded-full text-xs font-bold",
                                    (vds?.vote?.includes("Against") || vds.vote?.includes("Withhold")) ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
                                  )}>
                                    {vds?.vote}
                                  </span>
                                )}
                                {vds?.notes && vds.notes.toLowerCase() !== "nan" && (
                                  <span data-tooltip-id="my-tooltip-data-html" data-tooltip-html={vds?.notes}>
                                    <Lucide icon="Info" className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800 cursor-pointer" />
                                  </span>
                                )}
                              </div>
                            </Table.Td>
                          </Table.Tr>
                        );
                      });
                    })()
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={6} className="text-center py-10 text-gray-400 text-lg font-semibold">
                        <FaCheckCircle className="mx-auto mb-2 text-4xl text-primary/60" />
                        No Voting Data available. Try adjusting your filters!
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </div>
          </TableWrapper>
        )}

        {VdsEuropeans?.length > 0 && (
          <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
            <CPagination
              page={page}
              totalPages={totalPages}
              handleNextPage={handleNextPage}
              handlePageChange={handlePageChange}
              handlePreviousPage={handlePreviousPage}
            />
          </div>
        )}
      </div>

      <Tooltip
        id="my-tooltip-data-html"
        style={{
          zIndex: 10,
          backgroundColor: "white",
          color: "#000000",
          width: "maxContent",
          maxWidth: 700,
          boxShadow: "2px 4px 6px rgba(0, 0, 0, 0.2)",
          cursor: "pointer",
        }}
      />
    </>
  );
};

const AnalyticsTable = ({ vdsEuropeansAnalytics, openGroups, toggleGroup }) => {
  // Get all institutions and years
  const institutions = vdsEuropeansAnalytics.by_institution || [];

  // Get all unique years across all institutions
  const allYears = new Set();
  institutions.forEach(inst => {
    Object.keys(inst.years).forEach(year => allYears.add(year));
  });
  const years = Array.from(allYears).sort();

  return (
    <div className="mb-8">
      <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
        <table className="w-[100%] mx-auto rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-primary text-white text-base">
              <th className="px-6 py-3 text-left font-semibold rounded-tl-2xl" rowSpan={2}>Summary</th>
              {institutions.map((institution) => (
                <th key={institution.institution_id} colSpan={years.length} className="px-6 py-3 text-center font-semibold">
                  {institution.institution_name}
                </th>
              ))}
            </tr>
            <tr className="bg-primary text-white text-base">
              {institutions.map((institution) => (
                years.map((year) => {
                  const yearData = institution.years[year as string];
                  const dateRange = yearData?.date_range;
                  const dateRangeText = dateRange ? ` (${dateRange.start_meeting} - ${dateRange.end_meeting})` : '';
                  return (
                    <th key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center font-semibold">
                      <div className="flex flex-col">
                        <div>{String(year)}</div>
                        {dateRange && (
                          <div className="text-xs font-normal mt-1">
                            ({dateRange.start_meeting} - {dateRange.end_meeting})
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-700 text-base divide-y divide-gray-100">
            <tr>
              <td className="px-6 py-3 font-medium">No. of unique companies</td>
              {institutions.map((institution) => (
                years.map((year: string | number) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData && yearData.unique_companies ? yearData.unique_companies.toLocaleString() : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium">No of proposals</td>
              {institutions.map((institution) => (
                years.map((year: string | number) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? yearData.total_proposals.toLocaleString() : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium">No. of FOR votes</td>
              {institutions.map((institution) => (
                years.map((year: any) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? `${yearData.for_votes.toLocaleString()} (${yearData.for_percentage}%)` : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium">No. of AGAINST/WITHHOLD votes</td>
              {institutions.map((institution) => (
                years.map((year: any) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? `${yearData.against_votes.toLocaleString()} (${yearData.against_percentage}%)` : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium">Alignment with management</td>
              {institutions.map((institution) => (
                years.map((year: any) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? yearData.aligned_with_mgmt : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium">Alignment percentage</td>
              {institutions.map((institution) => (
                years.map((year: any) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? `${yearData.alignment_percentage}%` : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AnalyticsTableMemo = React.memo(AnalyticsTable);

export default index;
