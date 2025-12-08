import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";

import {
  convertToTitleCase,
  countValidFilters,
  createDynamicURL,
  generateFilterChips,
  downloadFileFromAPI,
} from "@/utils/helper";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import _ from "lodash";
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
  fetchVdsEuropeanAnalytics,
  setAnalyticsPage,
  setAnalyticsFilters,
  resetDataLoaded,
  resetAnalyticsDataLoaded,
} from "@/stores/vdsEuropeanSlice";
import { vdsEuropeanService } from "@/services/vdsEuropean";
import { axiosInstance } from "@/services";
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
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { MdOutlineClear } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import { getVdsEuropeanDropdownValues } from "@/services/vdsEuropeanDropdown";
import Litepicker from "@/components/Base/Litepicker";
import React from "react";

const index = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const {
    VdsEuropeans,
    loading,
    page,
    totalPages,
    count,
    analytics,
    analyticsLoading,
    analyticsPage,
    analyticsFilters,
    dataLoaded,
    analyticsDataLoaded
  } = useAppSelector((state) => state.vdsEuropean);

  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const [searchParams] = useSearchParams();
  const searchTicker = searchParams.get("ticker");
  const [allApplyFilter, setallApplyFilter] = useState<any>({});
  const [allAnalyticsFilter, setAllAnalyticsFilter] = useState<any>({});
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [getFundNameDropdownLoader, setGetFundNameDropdownLoader] =
    useState<boolean>(true); // Initialize as true to show loading state immediately
  const [apiInstitutionDropdown, setApiInstitutionDropdown] = useState<any>({
    institution: [],
  });
  const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [dropdownValues, setDropdownValues] = useState<any>({
    company_name: [],
    institution: [],
    index: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isViewAnalysis, setIsViewAnalysis] = useState<boolean>(true);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [openInstitutionGroups, setOpenInstitutionGroups] = useState<{ [key: string]: boolean }>({});
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
  const [keywordDropdownOptions, setKeywordDropdownOptions] = useState<string[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);
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
    if (!analytics?.by_company) return;

    const allCompanyNames: string[] = [];
    analytics.by_company.forEach((yearEntry: any) => {
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
    if (!analytics?.by_company) return false;

    const allCompanyNames: string[] = [];
    analytics.by_company.forEach((yearEntry: any) => {
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

  // Institution accordion functions for table view
  const toggleInstitutionGroup = (institutionName: string) => {
    setOpenInstitutionGroups((prevState) => ({
      ...prevState,
      [institutionName]: !prevState[institutionName],
    }));
  };

  const expandAllInstitutionGroups = () => {
    if (!VdsEuropeans || VdsEuropeans.length === 0) return;

    const allInstitutionNames: string[] = [];
    VdsEuropeans.forEach((vds: any) => {
      if (vds?.excel_institution_name && !allInstitutionNames.includes(vds.excel_institution_name)) {
        allInstitutionNames.push(vds.excel_institution_name);
      }
    });

    const allExpanded = allInstitutionNames.every(name => openInstitutionGroups[name]);

    if (allExpanded) {
      // Collapse all
      setOpenInstitutionGroups({});
    } else {
      // Expand all
      const newOpenGroups: { [key: string]: boolean } = {};
      allInstitutionNames.forEach(name => {
        newOpenGroups[name] = true;
      });
      setOpenInstitutionGroups(newOpenGroups);
    }
  };

  const areAllInstitutionGroupsExpanded = () => {
    if (!VdsEuropeans || VdsEuropeans.length === 0) return false;

    const allInstitutionNames: string[] = [];
    VdsEuropeans.forEach((vds: any) => {
      if (vds?.excel_institution_name && !allInstitutionNames.includes(vds.excel_institution_name)) {
        allInstitutionNames.push(vds.excel_institution_name);
      }
    });

    return allInstitutionNames.length > 0 && allInstitutionNames.every(name => openInstitutionGroups[name]);
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

      // Check if query parameters are present first - they take precedence
      const institutionParam = searchParams.get('institution');
      const companyParam = searchParams.get('company');
      const yearParam = searchParams.get('year');
      const meetingTypeParam = searchParams.get('meeting_type');
      const hasQueryParams = institutionParam || companyParam || meetingTypeParam;

      // If query parameters are present, set year from query param if present
      if (hasQueryParams) {
        let filters: any = {};
        const institutions = institutionParam ? institutionParam.split('||').map(inst => decodeURIComponent(inst.trim())) : [];
        const companies = companyParam ? companyParam.split('||').map(comp => decodeURIComponent(comp.trim())) : [];

        if (institutions.length > 0) {
          filters.institution_name = [...institutions];
          setValue('institution_name', institutions); // Set form value for institutions
        }
        if (companies.length > 0) {
          filters.company_name = [...companies];
          setValue('company_name', companies); // Set form value for companies
        }

        // Handle meeting_type parameter
        if (meetingTypeParam) {
          const meetingTypes = meetingTypeParam.split('||').map(mt => decodeURIComponent(mt.trim()));
          if (meetingTypes.length > 0) {
            filters.meeting_type = [...meetingTypes];
            setValue('meeting_type', meetingTypes);
          }
        }

        if (yearParam) {
          if (isViewAnalysis) {
            setValue('analyticsYear', [yearParam]);
          } else {
            setValue('year', yearParam);
          }
          filters.year = yearParam;
        }
        // Always include year in both payloads
        setallApplyFilter({ ...filters });
        setAllAnalyticsFilter({ ...filters });
        setSelectedChipFilters(generateFilterChips({ ...filters }));
        setFiltersLength(countValidFilters({ ...filters }));
        setIsRestoringFromLocalStorage(false);
        return;
      }

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
          // If year is present in query params, auto-select it
          if (parsed.year) {
            if (isViewAnalysis) {
              setValue("analyticsYear", Array.isArray(parsed.year) ? parsed.year : [parsed.year]);
            } else {
              setValue("year", parsed.year);
            }
          }
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
            meeting_type: [],
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
        const usDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
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
  }, [isViewAnalysis, searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch if we're still restoring from localStorage
      if (isRestoringFromLocalStorage) {
        return;
      }

      // Check if we're not in analytics view and have valid filters
      if (!isViewAnalysis && hasAnyValidFilter(allApplyFilter)) {
        // If data is already loaded and we're not changing filters, don't fetch again
        const shouldRefetch = !dataLoaded || page > 1;

        if (shouldRefetch) {
          setIsLoading(true);
          // Always include year in payload if present in allApplyFilter
          const payload = { ...allApplyFilter };
          if (payload.year) {
            payload.year = payload.year;
          }
          await dispatch(
            fetchVdsEuropeans(
              createDynamicURL(
                `${baseURL}/vds_european/`,
                payload,
                undefined,
                page
              )
            )
          );
          // Only update chips for regular filters if not in analytics mode
          // Don't overwrite chips if they were just restored from localStorage
          if (!isRestoringFromLocalStorage) {
            setFiltersLength(countValidFilters(payload));
            setSelectedChipFilters(generateFilterChips(payload));
          }
          dispatch(setTempSearch(companyGlobalSearchName));
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [dispatch, companyGlobalSearchTicker, searchTicker, allApplyFilter, page, isViewAnalysis, isRestoringFromLocalStorage, dataLoaded, companyGlobalSearchName]);

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

  // Initialize institution groups when VdsEuropeans data changes
  useEffect(() => {
    if (VdsEuropeans && VdsEuropeans.length > 0) {
      const allInstitutionNames: string[] = [];
      VdsEuropeans.forEach((vds: any) => {
        if (vds?.excel_institution_name && !allInstitutionNames.includes(vds.excel_institution_name)) {
          allInstitutionNames.push(vds.excel_institution_name);
        }
      });

      // Initialize all institutions as expanded
      const initialOpenGroups: { [key: string]: boolean } = {};
      allInstitutionNames.forEach(name => {
        initialOpenGroups[name] = openInstitutionGroups[name] ?? true; // Default to true (expanded)
      });
      setOpenInstitutionGroups(initialOpenGroups);
    }
  }, [VdsEuropeans]);

  useEffect(() => {
    getDependentDropdown();
  }, [dropdownValues?.company_name]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setGetFundNameDropdownLoader(true);
        const data = await getVdsEuropeanDropdownValues();
        setInstitutionOptions(data.institution || []);
        setCountryOptions(data.country || []);
        // Don't set vote and year here - they will be fetched with institution dependency
      } catch (error) {
        setInstitutionOptions([]);
        setCountryOptions([]);
        setVoteOptions([]);
        setYearOptions([]);
      } finally {
        setGetFundNameDropdownLoader(false);
      }
    };
    fetchDropdownData();

    // Check if we have institutions in URL params
    const institutionParam = searchParams.get('institution');
    if (institutionParam) {
      const institutions = institutionParam.split('||').map(inst => decodeURIComponent(inst.trim()));
      if (institutions.length > 0) {
        getInstitutionDependentOptions(institutions);
      } else {
        // Fetch vote and year options with default institution (BlackRock)
        getInstitutionDependentOptions(["BlackRock, Inc."]);
      }
    } else {
      // Fetch vote and year options with default institution (BlackRock)
      getInstitutionDependentOptions(["BlackRock, Inc."]);
    }

    // Load default companies on initial page load
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
      year: "",
      company_name: [],
      date_range: "",
      country: [],
    },
  });

  // Watch for changes in date_range and year to implement mutual exclusivity
  const watchedDateRange = watch("date_range");
  const watchedYear = watch("year");
  const watchedAnalyticsYear = watch("analyticsYear");

  // Set default values only if no query parameters are present
  useEffect(() => {
    const institutionParam = searchParams.get('institution');
    const companyParam = searchParams.get('company');
    const meetingTypeParam = searchParams.get('meeting_type');
    const hasQueryParams = institutionParam || companyParam || meetingTypeParam;

    if (!hasQueryParams) {
      // Only set default values when no query parameters are present
      if (isViewAnalysis) {
        setValue('analyticsYear', [new Date().getFullYear().toString()]);
      } else {
        setValue('year', new Date().getFullYear().toString());
      }
      setValue('country', ["USA"]);
    }
  }, [searchParams, setValue]);

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
      if (isViewAnalysis && currentAnalyticsYear.length > 0) {
        setValue("analyticsYear", []);
      }
    }

    // Check if analyticsYear changed and has a value
    if (isViewAnalysis && JSON.stringify(currentAnalyticsYear) !== JSON.stringify(prevAnalyticsYear) && currentAnalyticsYear.length > 0) {
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

    // Only set year if no query parameters are present
    const institutionParam = searchParams.get('institution');
    const companyParam = searchParams.get('company');
    const meetingTypeParam = searchParams.get('meeting_type');
    const hasQueryParams = institutionParam || companyParam || meetingTypeParam;

    if (dropdownValues?.institution_name && dropdownValues?.company_name && !hasQueryParams) {
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
  const searchCompanies = useCallback((searchTerm: string, institutionNames: string[]) => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!searchTerm || searchTerm.length < 2) {
      // When search is cleared, revert to default API call
      fetchDefaultCompanies();
      setCompanySearchLoading(false);
      return;
    }

    setCompanySearchLoading(true);

    // Set new timeout for debouncing
    const newTimeout = setTimeout(async () => {
      try {
        // Search: call https://api.zmhadvisors.com/get_vds_european_dropdown_values/?institution_name=[SELECTED_INSTITUTION_NAME]&company_name={SEARCH_TEXT}
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
  }, [searchTimeout]);

  // Function to get dependent options when company is selected
  const getCompanyDependentOptions = async (companyNames: any[], institutionNames: string[]) => {
    if (!companyNames || companyNames.length === 0) {
      // When company filter is cleared, revert to default API call and reload data
      fetchDefaultCompanies();
      return;
    }

    try {
      setGetDynamicDropdownLoader(true);

      // Selection: call https://api.zmhadvisors.com/get_vds_european_dropdown_values/?institution_name=["BlackRock, Inc."]&company_name=["Apple Inc."]
      const currentFilters = {
        institution_name: institutionNames || ["BlackRock, Inc."],
        company_name: companyNames, // Send as array for selection
      };

      const res = await vdsEuropeanService.getCompanySelectionDropdownValues(currentFilters);
      if (res.result) {
        // Update other dependent dropdowns with the API response
        setVoteOptions(res.result.vote || []);
        setYearOptions(res.result.year || []);

        // Update the general dropdown options state
        setApiDependentDropdownOptions(prev => ({
          ...prev,
          vote: res.result.vote || [],
          year: res.result.year || [],
          category: res.result.category || [],
          meeting_type: res.result.meeting_type || [],
          country: res.result.country || []
        }));
      }
    } catch (error) {
      console.error("Error fetching company dependent options:", error);
    } finally {
      setGetDynamicDropdownLoader(false);
    }
  };

  // Function to fetch default companies on initial load
  const fetchDefaultCompanies = async () => {
    try {
      // Default load: call https://api.zmhadvisors.com/company/?company_name=a&index=["100"]
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
          '/get_vds_european_dropdown_values/',
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
    [setKeywordDropdownOptions, setKeywordLoading]
  );

  const fetchKeywordSuggestions = useCallback((searchTerm: string) => {
    // Add additional safety checks to prevent interference
    if (!searchTerm || typeof searchTerm !== 'string') {
      return;
    }
    debouncedFetchKeywordSuggestions(searchTerm);
  }, [debouncedFetchKeywordSuggestions]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedFetchKeywordSuggestions.cancel();
    };
  }, [debouncedFetchKeywordSuggestions]);

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
    // Check if query parameters are present to avoid triggering dependent dropdown logic
    const institutionParam = searchParams.get('institution');
    const companyParam = searchParams.get('company');
    const meetingTypeParam = searchParams.get('meeting_type');
    const hasQueryParams = institutionParam || companyParam || meetingTypeParam;

    // Only update dropdownValues if no query parameters are present
    if (!hasQueryParams) {
      setDropdownValues((prev: any) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
  };

  const handleAnalyticsDownload = async () => {
    // Construct the same analytics parameters as the regular analytics call
    const analyticsParams: Record<string, string | string[]> = {
      investor_company: allAnalyticsFilter?.institution_name?.length
        ? allAnalyticsFilter.institution_name
        : allAnalyticsFilter.company_name || [],
      company_name: allAnalyticsFilter?.company_name?.length > 0
        ? allAnalyticsFilter.company_name
        : [],
      year:
        allAnalyticsFilter?.year
          ? [parseInt(allAnalyticsFilter.year)]
          : (allAnalyticsFilter?.analyticsYear?.length > 0
            ? allAnalyticsFilter?.analyticsYear.map((year: string) => parseInt(year))
            : []),
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
      page: (analyticsPage || 1).toString(),
    };

    // Only include country if no company is selected
    if (allAnalyticsFilter?.company_name?.length === 0 || !allAnalyticsFilter?.company_name) {
      analyticsParams.country = allAnalyticsFilter?.country || ["USA"];
    }

    // Only include date_range if it has a value
    if (allAnalyticsFilter?.date_range) {
      analyticsParams.date_range = allAnalyticsFilter.date_range;
    }

    const downloadUrl = createDynamicURL(
      `${baseURL}/api/proposal-voting-stats/`,
      analyticsParams
    );

    const currentDate = new Date().toISOString().split('T')[0];
    downloadFileFromAPI({
      url: downloadUrl,
      fileName: `Voting Data - ${currentDate}.xlsx`,
      setLoading: setLoadingDownload,
      serviceMethod: vdsEuropeanService.getVDSEuropeanFile
    });
  };

  const handleDownload = async () => {
    if (isViewAnalysis) {
      // For analytics view, use the analytics download function
      handleAnalyticsDownload();
      return;
    }

    // For regular table view, download the table data
    const currentDate = new Date().toISOString().split('T')[0];
    downloadFileFromAPI({
      url: createDynamicURL(`${baseURL}/vds_european/`, allApplyFilter, undefined, page),
      fileName: `Voting Data - ${currentDate}.xlsx`,
      setLoading: setLoadingDownload,
      serviceMethod: vdsEuropeanService.getVDSEuropeanFile
    });
  };

  const onSubmit = async (npxFilter: any) => {
    if (isViewAnalysis) {
      onAnalyticsSubmit(npxFilter);
      setIsFilterCollapse(false); // Ensure filter panel collapses in analytics mode
      return;
    }
    
    // Check if institution is empty for regular view
    if (!npxFilter?.institution_name?.length) {
      return;
    }
    
    if (!npxFilter?.company_name || npxFilter?.company_name.length === 0) {
      toast.warning("Please Select Company Name");
      return;
    }

    const institutionParam = searchParams.get('institution');
    const companyParam = searchParams.get('company');
    const yearParam = searchParams.get('year');
    const meetingTypeParam = searchParams.get('meeting_type');
    const hasQueryParams = institutionParam || companyParam || yearParam || meetingTypeParam;

    if (!npxFilter?.company_name?.length && !hasQueryParams) {
      if (!npxFilter?.country?.length) {
        toast.warning("Please select at least one country");
        return;
      }
    }

    const hasYear = npxFilter?.year && npxFilter?.year.trim() !== "";
    const hasDateRange = npxFilter?.date_range && npxFilter?.date_range.trim() !== "";

    if (!hasQueryParams && !hasYear && !hasDateRange) {
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
      meeting_type?: any;
    }

    const filterObj: FilterObj = {
      company_name: npxFilter?.company_name, // Already a flat array
      institution_name: npxFilter?.institution_name,
      vote_type: npxFilter?.vote,
      category: npxFilter?.category,
      keyword: npxFilter?.keyword,
      // Always include country
      country: npxFilter?.country || ["USA"],
      // Include meeting_type if present
      meeting_type: npxFilter?.meeting_type?.length > 0 ? npxFilter?.meeting_type : undefined,
    };

    // Add only the active filter (year OR date_range, not both)
    // Only add year/date_range if query parameters are not present
    if (hasDateRange && !hasQueryParams) {
      filterObj.date_range = npxFilter?.date_range;
      // Explicitly exclude year when date_range is selected
    } else if (hasYear && !hasQueryParams) {
      // Only add year if no query parameters are present
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
    dispatch(resetDataLoaded()); // Reset dataLoaded flag to force data fetch with new filters
    setIsFilterCollapse(false);
  };

  const onAnalyticsSubmit = async (data: any) => {
    // Perform all validations first
    if (isViewAnalysis && !data?.institution_name?.length) {
      return;
    }

    // Check if query parameters are present
    const institutionParam = searchParams.get('institution');
    const companyParam = searchParams.get('company');
    const meetingTypeParam = searchParams.get('meeting_type');
    const hasQueryParams = institutionParam || companyParam || meetingTypeParam;

    // Validate that at least one country is selected (only if no company is selected and no query params)
    if (!data?.company_name?.length && !hasQueryParams) {
      if (!data?.country?.length) {
        toast.warning("Please select at least one country");
        return;
      }
    }

    // All validations passed, proceed with filter updates
    // Check mutual exclusivity for analytics as well
    const hasYear = data?.analyticsYear && data?.analyticsYear.length > 0;
    const hasDateRange = data?.date_range && data?.date_range.trim() !== "";

    // If neither year nor date_range is provided, default to current year only if no query params
    if (!hasQueryParams && !hasYear && !hasDateRange) {
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
        ? data.company_name
        : [],
      vote_type: data?.vote || [], // always set vote_types
      proposal_type: data?.proposal_type || [],
      proponent_type: data?.proponent_type || [],
      meeting_type: data?.meeting_type || [],
      proposal_keyword: data?.proposal_keyword || [],
      // Only include country if no company is selected
      country: (Array.isArray(data?.company_name) && data.company_name.length > 0) ? undefined : (data?.country || []),
    };

    // Prioritize analyticsYear over date_range for analytics
    const finalHasYear = data?.analyticsYear && data?.analyticsYear.length > 0;
    const finalHasDateRange = data?.date_range && data?.date_range.trim() !== "";

    if (finalHasYear && !hasQueryParams) {
      // Only add year if no query parameters are present
      analyticsObj.analyticsYear = data?.analyticsYear;
      // Don't include date_range when year is provided
    } else if (finalHasDateRange && !hasQueryParams) {
      // Only add date_range if no query parameters are present
      analyticsObj.date_range = data?.date_range;
      // Don't include year when date_range is provided
    } else if (!hasQueryParams) {
      // Default to current year if neither is provided and no query params
      analyticsObj.analyticsYear = [new Date().getFullYear().toString()];
    }

    // Update filters only after all validations pass
    setAllAnalyticsFilter(analyticsObj);
    // Reset analyticsDataLoaded to force data fetch with new filters
    dispatch(resetAnalyticsDataLoaded());
    // Save analytics filters to localStorage
    localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(analyticsObj));
  };

  const onClearAll = () => {
    // Check if query parameters are present
    const institutionParam = searchParams.get('institution');
    const companyParam = searchParams.get('company');
    const meetingTypeParam = searchParams.get('meeting_type');
    const hasQueryParams = institutionParam || companyParam || meetingTypeParam;

    // Clear all filters except mandatory ones
    const currentYear = new Date().getFullYear().toString();
    let institutionsToKeep = ["BlackRock, Inc."];
    let countryToKeep = ["USA"];
    let indexToKeep = ["S&P 500"];
    
    // Preserve query parameter values if present
    if (hasQueryParams && institutionParam) {
      const institutions = institutionParam.split('||').map(inst => decodeURIComponent(inst.trim()));
      if (institutions.length > 0) {
        institutionsToKeep = institutions;
      }
    }

    if (isViewAnalysis) {
      // For analytics view, keep only mandatory fields
      const mandatoryFilters = {
        institution_name: institutionsToKeep,
        index: indexToKeep,
        country: hasQueryParams ? [] : countryToKeep,
        analyticsYear: hasQueryParams ? [] : [currentYear],
      };
      
      setAllAnalyticsFilter(mandatoryFilters);
      
      // Reset form to mandatory values only
      setValue("institution_name", institutionsToKeep);
      setValue("index", indexToKeep);
      if (!hasQueryParams) {
        setValue("country", countryToKeep);
        setValue("analyticsYear", [currentYear]);
        setSelectedCountries(countryToKeep);
      } else {
        setValue("country", []);
        setValue("analyticsYear", []);
        setSelectedCountries([]);
      }
      
      // Clear non-mandatory fields
      setValue("company_name", []);
      setValue("vote", []);
      setValue("category", []);
      setValue("keyword", "");
      setValue("date_range", "");
      setValue("proponent_type", []);
      setValue("proposal_type", []);
      setValue("proposal_keyword", []);
      setValue("meeting_type", []);
      setValue("year", "");
      
      // Update filter chips and save to localStorage
      setSelectedChipFilters(generateFilterChips(mandatoryFilters));
      setFiltersLength(countValidFilters(mandatoryFilters));
      localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(mandatoryFilters));
      
      // Reset analytics data to force refetch
      dispatch(resetAnalyticsDataLoaded());
    } else {
      // For regular view, keep only mandatory fields
      const mandatoryFilters = {
        institution_name: institutionsToKeep,
        country: hasQueryParams ? [] : countryToKeep,
        year: hasQueryParams ? "" : currentYear,
      };
      
      setallApplyFilter(mandatoryFilters);
      
      // Reset form to mandatory values only
      setValue("institution_name", institutionsToKeep);
      if (!hasQueryParams) {
        setValue("country", countryToKeep);
        setValue("year", currentYear);
        setSelectedCountries(countryToKeep);
      } else {
        setValue("country", []);
        setValue("year", "");
        setSelectedCountries([]);
      }
      
      // Clear non-mandatory fields
      setValue("company_name", []);
      setValue("vote", []);
      setValue("category", []);
      setValue("keyword", "");
      setValue("date_range", "");
      setValue("analyticsYear", []);
      setValue("index", []);
      setValue("proponent_type", []);
      setValue("proposal_type", []);
      setValue("proposal_keyword", []);
      setValue("meeting_type", []);
      
      // Update filter chips and save to localStorage
      setSelectedChipFilters(generateFilterChips(mandatoryFilters));
      setFiltersLength(countValidFilters(mandatoryFilters));
      localStorage.setItem("vdsEuropeanFilters", JSON.stringify(mandatoryFilters));
      
      // Reset page and data to force refetch
      dispatch(resetPage());
      dispatch(resetDataLoaded());
    }
    
    // Reset dropdown values
    setDropdownValues({
      company_name: [],
      institution: [],
      index: [],
    });
    
    // Force country component refresh
    setCountryComponentKey(prev => prev + 1);
  };

  const onFilterClear = (onAnalyticsTab) => {
    // Check if query parameters are present
    const institutionParam = searchParams.get('institution');
    const companyParam = searchParams.get('company');
    const meetingTypeParam = searchParams.get('meeting_type');
    const hasQueryParams = institutionParam || companyParam || meetingTypeParam;

    setSelectedChipFilters([]);
    setFiltersLength(0);
    reset();
    resetFormValues(hasQueryParams);
    setDropdownValues({
      company_name: [],
      institution: [],
      index: [],
    });
    if (onAnalyticsTab) {
      const currentYear = new Date().getFullYear().toString();

      // If we have query parameters with institutions, preserve them
      let institutionsToUse = ["BlackRock, Inc."];
      if (hasQueryParams && institutionParam) {
        const institutions = institutionParam.split('||').map(inst => decodeURIComponent(inst.trim()));
        if (institutions.length > 0) {
          institutionsToUse = institutions;
        }
      }

      setAllAnalyticsFilter({
        institution_name: institutionsToUse,
        index: ["S&P 500"],
        country: hasQueryParams ? [] : ["USA"],
        analyticsYear: hasQueryParams ? [] : [currentYear],
      });
      setValue("institution_name", institutionsToUse);
      setValue("index", ["S&P 500"]);
      if (!hasQueryParams) {
        setValue("country", ["USA"]);
        setValue("analyticsYear", [currentYear]);
        setSelectedCountries(["USA"]);
      }
      localStorage.removeItem("vdsEuropeanAnalyticsFilters");

      // Fetch vote and year options for the institutions we're using
      getInstitutionDependentOptions(institutionsToUse);
    } else {
      const currentYear = new Date().getFullYear().toString();
      // setallApplyFilter({ country: ["USA"], year: currentYear });
      dispatch(resetPage());
      dispatch(
        fetchVdsEuropeans(
          createDynamicURL(
            `${baseURL}/vds_european/`,
            hasQueryParams ? {} : { country: ["USA"], year: currentYear },
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

  const resetFormValues: any = (hasQueryParams = false) => {
    // Use setTimeout to ensure all form operations complete before resetting
    setTimeout(() => {
      setValue("company_name", []);
      // If we have query parameters, preserve the institution_name from URL params
      const institutionParam = searchParams.get('institution');
      if (hasQueryParams && institutionParam) {
        const institutions = institutionParam.split('||').map(inst => decodeURIComponent(inst.trim()));
        if (institutions.length > 0) {
          setValue("institution_name", institutions);
        } else {
          setValue("institution_name", ["BlackRock, Inc."]);
        }
      } else {
        setValue("institution_name", ["BlackRock, Inc."]);
      }
      setValue("vote", []);
      setValue("category", []);
      if (!hasQueryParams) {
        setValue("year", new Date().getFullYear().toString());
        setValue("country", ["USA"]);
        setSelectedCountries(["USA"]);
        setCountryComponentKey(prev => prev + 1);
      } else {
        setValue("year", "");
        setValue("country", []);
        setSelectedCountries([]);
      }
      setValue("keyword", "");
      setValue("date_range", "");
      setValue("analyticsYear", []);
      setValue("index", []);
      setValue("proponent_type", []);
      setValue("proposal_type", []);
      setValue("proposal_keyword", []);
      setValue("meeting_type", []);
    }, 50); // Small delay to prevent form interference
    
    setDropdownValues({
      company_name: [],
      institution: [],
      index: [],
    });
  };

  const handleNextPage = () => {
    if (isViewAnalysis) {
      const currentPage = analytics?.pagination?.current_page;
      const totalPages = analytics?.pagination?.total_pages;
      if (currentPage < totalPages) {
        dispatch(setAnalyticsPage(currentPage + 1));
      }
    } else {
      if (page < totalPages) {
        dispatch(setPage(page + 1));
      }
    }
  };

  const handlePreviousPage = () => {
    if (isViewAnalysis) {
      const currentPage = analytics?.pagination?.current_page;
      if (currentPage > 1) {
        dispatch(setAnalyticsPage(currentPage - 1));
      }
    } else {
      if (page > 1) {
        dispatch(setPage(page - 1));
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isViewAnalysis) {
      dispatch(setAnalyticsPage(newPage));
    } else {
      dispatch(setPage(newPage));
    }
  };

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    // Handle country filter removal - prevent removal if company is selected
    if (removeKey === "country") {
      const currentCompanies = isViewAnalysis ? allAnalyticsFilter.company_name || [] : allApplyFilter.company_name || [];

      // If company is selected, don't allow country removal
      if (currentCompanies.length > 0) {
        return; // Block removal when company is selected
      }

      const currentCountries = isViewAnalysis ? allAnalyticsFilter.country || [] : allApplyFilter.country || [];

      // Remove the specific country value
      const updatedCountries = currentCountries.filter((country: string) => country !== removeValue);

      if (isViewAnalysis) {
        const updatedFilters = { ...allAnalyticsFilter, country: updatedCountries };
        setAllAnalyticsFilter(updatedFilters);
        setValue("country", updatedCountries);
        setSelectedCountries(updatedCountries);
        localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(updatedFilters));

        // Update filter chips to reflect the changes
        setSelectedChipFilters(generateFilterChips(updatedFilters));
        setFiltersLength(countValidFilters(updatedFilters));

        // Trigger analytics data reload
        dispatch(resetAnalyticsDataLoaded());
      } else {
        const updatedFilters = { ...allApplyFilter, country: updatedCountries };
        setallApplyFilter(updatedFilters);
        setValue("country", updatedCountries);
        setSelectedCountries(updatedCountries);
        localStorage.setItem("vdsEuropeanFilters", JSON.stringify(updatedFilters));

        // Update filter chips to reflect the changes
        setSelectedChipFilters(generateFilterChips(updatedFilters));
        setFiltersLength(countValidFilters(updatedFilters));

        // Trigger regular data reload
        dispatch(resetPage());
        dispatch(resetDataLoaded());
      }
      return;
    }

    // Handle institution filter removal - prevent removal of last institution
    if (removeKey === "institution_name") {
      const currentInstitutions = isViewAnalysis ? allAnalyticsFilter.institution_name || [] : allApplyFilter.institution_name || [];
      
      // Prevent removal if it's the last institution
      if (currentInstitutions.length <= 1) {
        return; // Block removal when only one institution remains
      }
      
      // Remove the specific institution value
      const updatedInstitutions = currentInstitutions.filter((institution: string) => institution !== removeValue);
      if (isViewAnalysis) {
        const updatedFilters = { ...allAnalyticsFilter, institution_name: updatedInstitutions };
        setAllAnalyticsFilter(updatedFilters);
        setValue("institution_name", updatedInstitutions);
        localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(updatedFilters));

        // Update filter chips to reflect the changes
        setSelectedChipFilters(generateFilterChips(updatedFilters));
        setFiltersLength(countValidFilters(updatedFilters));

        // Trigger analytics data reload
        dispatch(resetAnalyticsDataLoaded());
      } else {
        const updatedFilters = { ...allApplyFilter, institution_name: updatedInstitutions };
        setallApplyFilter(updatedFilters);
        setValue("institution_name", updatedInstitutions);
        localStorage.setItem("vdsEuropeanFilters", JSON.stringify(updatedFilters));

        // Update filter chips to reflect the changes
        setSelectedChipFilters(generateFilterChips(updatedFilters));
        setFiltersLength(countValidFilters(updatedFilters));

        // Trigger regular data reload
        dispatch(resetPage());
        dispatch(resetDataLoaded());
      }
      return;
    }

    // Handle company filter removal - restore USA country when company is removed
    if (removeKey === "company_name") {
      if (isViewAnalysis) {
        const updatedFilters = { ...allAnalyticsFilter };

        // Remove the specific company
        if (Array.isArray(updatedFilters[removeKey])) {
          updatedFilters[removeKey] = updatedFilters[removeKey].filter(
            (item) => item !== removeValue
          );
        }

        // If no companies left, restore USA country only if no query parameters
        const institutionParam = searchParams.get('institution');
        const companyParam = searchParams.get('company');
        const meetingTypeParam = searchParams.get('meeting_type');
        const hasQueryParams = institutionParam || companyParam || meetingTypeParam;

        if ((!updatedFilters[removeKey] || updatedFilters[removeKey].length === 0) && !hasQueryParams) {
          updatedFilters.country = ["USA"];
          setValue("country", ["USA"]);
          setSelectedCountries(["USA"]);
          setCountryComponentKey(prev => prev + 1);
        }

        setValue(removeKey, updatedFilters[removeKey]);
        setAllAnalyticsFilter(updatedFilters);
        localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(updatedFilters));

        // Update filter chips to reflect the changes
        setSelectedChipFilters(generateFilterChips(updatedFilters));
        setFiltersLength(countValidFilters(updatedFilters));

        // Trigger analytics data reload
        dispatch(resetAnalyticsDataLoaded());
      } else {
        const updatedFilters = { ...allApplyFilter };

        // Remove the specific company
        if (Array.isArray(updatedFilters[removeKey])) {
          updatedFilters[removeKey] = updatedFilters[removeKey].filter(
            (item) => item !== removeValue
          );
        }

        // If no companies left, restore USA country only if no query parameters
        if ((!updatedFilters[removeKey] || updatedFilters[removeKey].length === 0) && !updatedFilters.country) {
          updatedFilters.country = ["USA"];
          setValue("country", ["USA"]);
          setSelectedCountries(["USA"]);
          setCountryComponentKey(prev => prev + 1);
        }

        setValue(removeKey, updatedFilters[removeKey]);
        setallApplyFilter(updatedFilters);
        localStorage.setItem("vdsEuropeanFilters", JSON.stringify(updatedFilters));

        // Update filter chips to reflect the changes
        setSelectedChipFilters(generateFilterChips(updatedFilters));
        setFiltersLength(countValidFilters(updatedFilters));

        // Trigger regular data reload
        dispatch(resetPage());
        dispatch(resetDataLoaded());
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
      }
      // Special handling for proposal_keyword - remove individual keywords
      else if (removeKey === "proposal_keyword") {
        const currentKeywords = updatedFilters[removeKey] || [];
        // Remove the specific keyword from the array
        const updatedKeywords = currentKeywords.filter((keyword: any) => {
          const keywordValue = typeof keyword === 'object' && keyword.label ? keyword.label : keyword;
          const removeValueStr = typeof removeValue === 'object' && removeValue.label ? removeValue.label : removeValue;
          return keywordValue !== removeValueStr;
        });
        updatedFilters[removeKey] = updatedKeywords;
        
        // Use setTimeout to prevent form field interference
        setTimeout(() => {
          setValue(removeKey, updatedKeywords);
        }, 0);
      }
      else if (Array.isArray(updatedFilters[removeKey])) {
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

      // Update filter chips to reflect the changes
      setSelectedChipFilters(generateFilterChips(updatedFilters));
      setFiltersLength(countValidFilters(updatedFilters));

      // Trigger analytics data reload
      dispatch(resetAnalyticsDataLoaded());
      return;
    }

    const updatedFilters = { ...allApplyFilter };

    // Special handling for proposal_keyword - remove individual keywords
    if (removeKey === "proposal_keyword") {
      const currentKeywords = updatedFilters[removeKey] || [];
      // Remove the specific keyword from the array
      const updatedKeywords = currentKeywords.filter((keyword: any) => {
        const keywordValue = typeof keyword === 'object' && keyword.label ? keyword.label : keyword;
        const removeValueStr = typeof removeValue === 'object' && removeValue.label ? removeValue.label : removeValue;
        return keywordValue !== removeValueStr;
      });
      updatedFilters[removeKey] = updatedKeywords;
      
      // Use setTimeout to prevent form field interference
      setTimeout(() => {
        setValue(removeKey, updatedKeywords);
      }, 0);
    }
    else if (Array.isArray(updatedFilters[removeKey])) {
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

    // Update filter chips to reflect the changes
    setSelectedChipFilters(generateFilterChips(updatedFilters));
    setFiltersLength(countValidFilters(updatedFilters));

    // Trigger regular data reload
    dispatch(resetPage());
    dispatch(resetDataLoaded());
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Don't fetch if we're still restoring from localStorage
      if (isRestoringFromLocalStorage) {
        return;
      }

      if (isViewAnalysis && allAnalyticsFilter?.institution_name && allAnalyticsFilter.institution_name.length > 0) {
        // If analytics data is already loaded and we're not changing page, don't fetch again
        const shouldRefetch = !analyticsDataLoaded || analyticsPage > 1;
        if (!shouldRefetch) {
          return; // Skip fetching if data is already loaded
        }
        dispatch(setAnalyticsFilters(allAnalyticsFilter));

        // Check if query parameters are present
        const institutionParam = searchParams.get('institution');
        const companyParam = searchParams.get('company');
        const yearParam = searchParams.get('year');
        const meetingTypeParam = searchParams.get('meeting_type');
        const hasQueryParams = institutionParam || companyParam || yearParam || meetingTypeParam;

        const analyticsParams = {
          investor_company: allAnalyticsFilter?.institution_name?.length
            ? allAnalyticsFilter.institution_name
            : allAnalyticsFilter.company_name || [],
          company_name: allAnalyticsFilter?.company_name?.length > 0
            ? allAnalyticsFilter.company_name
            : [],
          // Include year from query params or from form - send entire array for analytics as numbers
          year: hasQueryParams
            ? (yearParam ? [parseInt(yearParam)] : [])
            : (allAnalyticsFilter?.analyticsYear?.length > 0
              ? allAnalyticsFilter.analyticsYear.map((year: string) => parseInt(year))
              : []),
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
          // Always include country
          country: allAnalyticsFilter?.country || ["USA"],
          page: analyticsPage || 1,
        };

        const analyticsUrl = createDynamicURL(
          `${baseURL}/api/proposal-voting-stats/`,
          analyticsParams
        );

        // Only fetch if data isn't already loaded or we're on a different page
        if (!analyticsDataLoaded || analyticsPage > 1) {
          dispatch(fetchVdsEuropeanAnalytics(analyticsUrl));
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
  }, [allAnalyticsFilter, analyticsPage, isViewAnalysis, isRestoringFromLocalStorage, analyticsDataLoaded, dispatch]);


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

  // Handle query parameters on component mount for /voting-data route
  // Run immediately when query parameters are present
  useEffect(() => {
    const institutionParam = searchParams.get('institution');
    const companyParam = searchParams.get('company');
    const yearParam = searchParams.get('year');

    // Only apply filters if at least one param is present
    if (institutionParam || companyParam || yearParam) {
      // Parse institution parameter (split by '||', decode each)
      const institutions = institutionParam ? institutionParam.split('||').map(inst => decodeURIComponent(inst.trim())) : [];
      // Parse company parameter (split by '||', decode each)
      const companies = companyParam ? companyParam.split('||').map(comp => decodeURIComponent(comp.trim())) : [];

      // Set form values for institution, company_name, and year
      setValue('institution_name', [...institutions]);
      setValue('company_name', [...companies]);
      if (isViewAnalysis) {
        setValue('analyticsYear', yearParam ? [yearParam] : []);
      } else {
        setValue('year', yearParam || "");
      }

      // Build filter object with institution, company, and year
      const filters: any = {};
      if (institutions.length > 0) filters.institution_name = [...institutions];
      if (companies.length > 0) filters.company_name = [...companies];
      if (yearParam) filters.year = yearParam;

      // Apply filters to both analytics and regular
      setAllAnalyticsFilter(filters);
      setallApplyFilter(filters);

      // Update filter chips immediately (each chip should be a separate entry)
      setSelectedChipFilters(generateFilterChips(filters));
      setFiltersLength(countValidFilters(filters));
    }
    // If no params, do nothing (keep default behavior)
  }, [searchParams, setValue]);

  const handleDownloadXlsx = async () => {
    try {
      setLoadingDownload(true);
      console.log('Download started...');
      console.log('isViewAnalysis:', isViewAnalysis);
      console.log('analytics:', analytics);
      console.log('VdsEuropeans:', VdsEuropeans);

      // Import XLSX library dynamically
      const XLSX = await import('xlsx');
      console.log('XLSX library loaded:', !!XLSX);

      if (isViewAnalysis && analytics?.by_institution) {
        // Export analytics summary data
        const institutions = analytics.by_institution || [];

        if (institutions.length === 0) {
          console.warn("No analytics data available for download");
          setLoadingDownload(false);
          return;
        }

        // Get all unique years across all institutions
        const allYears = new Set();
        institutions.forEach(inst => {
          Object.keys(inst.years).forEach(year => allYears.add(year));
        });
        const years = Array.from(allYears).sort();

        // Prepare summary data for Excel export
        const summaryData = [];

        // Header row with institution names
        const headerRow1 = ['Summary'];
        institutions.forEach(institution => {
          years.forEach(() => {
            headerRow1.push(institution.institution_name);
          });
        });
        summaryData.push(headerRow1);

        // Sub-header row with years and date ranges
        const headerRow2 = [''];
        institutions.forEach(institution => {
          years.forEach((year: any) => {
            const yearData = institution.years[year];
            const dateRange = yearData?.date_range;
            const dateRangeText = dateRange ? `${year} (${dateRange.start_meeting} - ${dateRange.end_meeting})` : year;
            headerRow2.push(dateRangeText);
          });
        });
        summaryData.push(headerRow2);

        // Data rows
        const metrics = [
          { label: 'No. of unique companies', key: 'unique_companies' },
          { label: 'No of proposals', key: 'total_proposals' },
          { label: 'No. of FOR votes', key: 'for_votes', showPercentage: true, percentageKey: 'for_percentage' },
          { label: 'No. of AGAINST/WITHHOLD votes', key: 'against_votes', showPercentage: true, percentageKey: 'against_percentage' },
          { label: 'Alignment with management', key: 'aligned_with_mgmt' },
          { label: 'Alignment percentage', key: 'alignment_percentage', isPercentage: true }
        ];

        metrics.forEach(metric => {
          const row = [metric.label];
          institutions.forEach(institution => {
            years.forEach((year: any) => {
              const yearData = institution.years[year];
              if (yearData) {
                let value = yearData[metric.key];
                if (metric.showPercentage && metric.percentageKey) {
                  const percentage = yearData[metric.percentageKey];
                  value = `${value?.toLocaleString() || 0} (${percentage || 0}%)`;
                } else if (metric.isPercentage) {
                  value = `${value || 0}%`;
                } else if (typeof value === 'number') {
                  value = value.toLocaleString();
                }
                row.push(value || '-');
              } else {
                row.push('-');
              }
            });
          });
          summaryData.push(row);
        });

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(summaryData);

        // Set column widths for better readability
        const columnWidths = [{ wch: 30 }]; // First column (metrics)
        institutions.forEach(() => {
          years.forEach(() => {
            columnWidths.push({ wch: 25 }); // Data columns
          });
        });
        worksheet['!cols'] = columnWidths;

        // Merge cells for institution headers
        const merges = [];
        let colIndex = 1; // Start from column B (index 1)
        institutions.forEach(institution => {
          if (years.length > 1) {
            merges.push({
              s: { r: 0, c: colIndex },
              e: { r: 0, c: colIndex + years.length - 1 }
            });
          }
          colIndex += years.length;
        });
        worksheet['!merges'] = merges;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Voting Data Summary');

        // Generate filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `Voting Data Summary - ${currentDate}.xlsx`;

        // Write and download the file
        XLSX.writeFile(workbook, filename);

        console.log(`Downloaded: ${filename}`);
      } else if (!isViewAnalysis && VdsEuropeans?.length > 0) {
        // Export regular table data
        const excelData = VdsEuropeans.map((vds: any) => ({
          'Institution': vds.excel_institution_name || '',
          'Meeting Type': vds.meeting_type || '',
          'Proposal No.': vds.proposal_num || '',
          'Proposal': vds.proposal || '',
          'Management Recommendation': vds.mgt_rec || '',
          'Vote Cast': vds.vote || '',
          'Notes': vds.notes && vds.notes.toLowerCase() !== "nan" ? vds.notes : '',
          'Company': vds.company_name || '',
          'Meeting Date': vds.meeting_date || '',
          'Country': vds.country || ''
        }));

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set column widths for better readability
        const columnWidths = [
          { wch: 25 }, // Institution
          { wch: 15 }, // Meeting Type
          { wch: 12 }, // Proposal No.
          { wch: 50 }, // Proposal
          { wch: 20 }, // Management Recommendation
          { wch: 15 }, // Vote Cast
          { wch: 30 }, // Notes
          { wch: 25 }, // Company
          { wch: 15 }, // Meeting Date
          { wch: 15 }  // Country
        ];
        worksheet['!cols'] = columnWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Voting Data');

        // Generate filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `Voting Data Summary_${currentDate}.xlsx`;

        // Write and download the file
        XLSX.writeFile(workbook, filename);

        console.log(`Downloaded: ${filename}`);
      } else {
        console.warn("No data available for download");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
    } finally {
      setLoadingDownload(false);
    }
  };

  // Debug: Log analytics state before render
  console.log('analytics:', analytics);
  console.log('analyticsLoading:', analyticsLoading);

  return (
    <>
      <div className="flex justify-between items-center xs:flex-col md:flex-row py-3"></div>
      <div className="p-5 mt-1 box">
        <div className="flex flex-col p-5  sm:flex-row gap-y-2">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
            <span>
              <h1 className="text-lg font-bold flex items-center gap-2">
                Voting Data
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
              {/* Clear and Apply buttons outside filter */}
              <div className="flex gap-2">
                <Tippy content="Download Excel" options={{ theme: "light" }}>
                  <div
                    className="box p-[5px] cursor-pointer"
                    onClick={() => !loadingDownload && handleDownloadXlsx()}
                  >
                    {loadingDownload ? (
                      <Lucide
                        icon="Loader"
                        className="w-6 h-7 stroke-[1.3] animate-spin"
                      />
                    ) : (
                      <img alt="download-icon" src={downloadIcon} />
                    )}
                  </div>
                </Tippy>
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
            {/* Filter Content */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={onClearAll}
                  className="w-full sm:w-auto"
                  type="button"
                >
                  Clear All
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
            {/* Filter Toggle and Advanced Filters Button */}
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* First row: Institution, Year, Index, Date Range */}
              <div className="grid gap-6 md:grid-cols-4 grid-cols-1">
                {/* Institution */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaUniversity className="text-gray-400" /> Institution*
                  </label>
                  <Controller
                    name="institution_name"
                    control={control}
                    defaultValue={[]}
                    rules={{
                      required: "At least one institution must be selected",
                      validate: (value) => 
                        value && value.length >= 1 ? true : "At least one institution must be selected"
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <div>
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
                            
                            // Prevent selecting more than 3 institutions
                            if (selectedValues.length > 3) {
                              return; // Don't update the field if more than 3 are selected
                            }
                            
                            field.onChange(selectedValues);
                            handleDropdownChange("institution_name", selectedValues);
                            // Fetch vote and year options based on selected institutions
                            getInstitutionDependentOptions(selectedValues);
                          }}
                          selectedOption={field.value || []}
                        />
                        {field.value?.length === 3 && (
                          <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Maximum institutions are selected
                          </div>
                        )}
                        {(!field.value || field.value?.length === 0) && (
                          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            At least one institution must be selected
                          </div>
                        )}
                      </div>
                    )}
                  />
                </div>
                {/* Year */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaCalendarAlt className="text-gray-400" /> Year
                  </label>
                  <Controller
                    name={isViewAnalysis ? "analyticsYear" : "year"}
                    control={control}
                    defaultValue={isViewAnalysis ? [] : ""}
                    render={({ field }) => (
                      isViewAnalysis ? (
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
                      ) : (
                        <TomSelect
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value)}
                          options={{
                            placeholder: "Select Year",
                            allowEmptyOption: true,
                            create: false
                          }}
                          className="w-full"
                        >
                          <option value="">Select Year</option>
                          {yearOptions.map(year => (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          ))}
                        </TomSelect>
                      )
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
                              const usDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
                              return usDate.toISOString().split("T")[0];
                            })(),
                            minDate: "2023-01-01",
                            startDate: "2025-01-01",
                            endDate: (() => {
                              // Get current US date (considering Pakistan is ahead by ~10-11 hours)
                              const now = new Date();
                              const usDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
                              return usDate.toISOString().split("T")[0];
                            })(),
                          }}
                          className="pl-12"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              {/* Second row: Company, Country, Meeting Type, Proposal Category */}
              <div className="grid gap-6 md:grid-cols-4 grid-cols-1 mt-6">
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
                        value={
                          // Convert string array back to object array for display
                          (field.value || []).map((companyName: string) => ({
                            value: companyName,
                            label: companyName,
                            company: { name: companyName }
                          }))
                        }
                        onChange={(companyNames) => {
                          // Ensure companyNames is always treated as an array
                          const companyArray = Array.isArray(companyNames) ? companyNames : companyNames ? [companyNames] : [];
                          
                          // Extract company names as strings from the objects
                          const companyNameStrings = companyArray.map((item: any) => {
                            if (typeof item === 'string') return item;
                            return item?.label || item?.company?.name || item?.value || item;
                          });
                          
                          // Set the form field with string array
                          field.onChange(companyNameStrings);
                          
                          // Clear country when company is selected
                          if (companyNameStrings && companyNameStrings.length > 0) {
                            // Only clear country if it hasn't been manually set
                            const currentCountries = watch("country") || [];
                            if (currentCountries.length > 0) {
                              setValue("country", []);
                              setSelectedCountries([]);
                              setCountryComponentKey(prev => prev + 1);
                            }

                            // Note: Filter updates removed - filters should only be applied via Apply button
                          }

                          // Only call API when there's an actual change in selection
                          const currentInstitutions = watch("institution_name") || ["BlackRock, Inc."];
                          const previousCompanies = field.value || [];

                          // Check if the selection actually changed
                          const hasChanged = JSON.stringify(companyNameStrings.sort()) !== JSON.stringify(previousCompanies.sort());

                          if (hasChanged) {
                            getCompanyDependentOptions(companyNameStrings, currentInstitutions);
                          }
                        }}
                        // Use exactUrl to handle VDS European specific API calls
                        exactUrl="get_vds_european_dropdown_values/"
                        arrayKeyName="company_name"
                        // Pass current institution filter as context
                        currentFilters={{
                          institution_name: watch("institution_name") || ["BlackRock, Inc."]
                        }}
                        placeholder="Search Companies"
                        isMulti={true}
                      />
                    )}
                  />
                </div>
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
              </div>
              {/* Third row: Proponent, Vote, Keywords */}
              <div className="grid gap-6 md:grid-cols-4 grid-cols-1 mt-6">
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
                {/* Keywords */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-2 text-slate-600 font-semibold">
                      <FaTags className="text-gray-400" /> Keywords (Beta)
                    </label>
                    {keywordDropdownOptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentValue = watch("proposal_keyword") || [];
                          const allKeywords = [...new Set([...currentValue, ...keywordDropdownOptions])];
                          setTimeout(() => {
                            setValue("proposal_keyword", allKeywords);
                          }, 0);
                        }}
                        className="text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        Select All
                      </button>
                    )}
                  </div>
                  <Controller
                    name="proposal_keyword"
                    control={control}
                    render={({ field }) => (
                      <CreatableInputSelect
                        placeholder="Type and press Enter to add keywords"
                        value={field.value || []}
                        onChange={(val) => {
                          // Prevent event bubbling that could affect other form fields
                          setTimeout(() => {
                            field.onChange(val);
                          }, 0);
                        }}
                        onInputChange={(inputValue: string) => {
                          // Debounce and prevent interference with other form operations
                          if (inputValue && inputValue.trim()) {
                            fetchKeywordSuggestions(inputValue);
                          }
                        }}
                        options={keywordDropdownOptions}
                        loading={keywordLoading}
                      />
                    )}
                  />
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ANALYTICS TABLE (by_institution) and COLLAPSIBLE COMPANY LIST (by_company) with loader */}
        {isViewAnalysis && analyticsLoading && (
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="rounded-2xl shadow-lg bg-white p-8 border border-gray-100 flex flex-col items-center">
              <LoadingIcon icon="three-dots" className="w-12 h-12 text-primary" />
            </div>
          </div>
        )}
        {isViewAnalysis && !analyticsLoading && analytics && typeof analytics === 'object' && analytics.by_institution && Object.keys(analytics.by_institution).length > 0 && (
          <AnalyticsTableMemo vdsEuropeansAnalytics={analytics} openGroups={openGroups} toggleGroup={toggleGroup} filteredDateRange={allAnalyticsFilter?.date_range} />
        )}
        {isViewAnalysis && !analyticsLoading && analytics && typeof analytics === 'object' && analytics.by_company && Array.isArray(analytics.by_company) && analytics.by_company.length > 0 && (
          <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 mt-8">
            {/* Expand All and Download Buttons */}
            <div className="flex justify-end gap-3 mb-4 px-4 pt-4">
              <Tippy content="Download Excel" options={{ theme: "light" }}>
                <div
                  className="box p-[5px] cursor-pointer"
                  onClick={() => !loadingDownload && handleAnalyticsDownload()}
                >
                  {loadingDownload ? (
                    <Lucide
                      icon="Loader"
                      className="w-6 h-7 stroke-[1.3] animate-spin"
                    />
                  ) : (
                    <img alt="download-icon" src={downloadIcon} />
                  )}
                </div>
              </Tippy>
              <button
                onClick={expandAllGroups}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium text-sm"
              >
                <span>
                  {areAllGroupsExpanded() ? "Collapse All" : "Expand All"}
                </span>
                <Lucide
                  icon={areAllGroupsExpanded() ? "ChevronUp" : "ChevronDown"}
                  className="w-4 h-4"
                />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {analytics.by_company.map((yearEntry, yearIdx) => (
                Array.isArray(yearEntry.companies)
                  ? yearEntry.companies.map((ele, index) => (
                    <div key={ele.company_id || `${yearIdx}-${index}`} className="py-2">
                      <div
                        className="flex flex-row justify-between items-center cursor-pointer px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 font-medium text-base"
                        onClick={() => toggleGroup(ele.company_name)}
                      >
                        <span className="text-gray-800">
                          {`${ele.meeting_date} - ${ele.company_name}`}
                          {ele.meeting_type?.trim() && ` (${ele.meeting_type})`}
                        </span>

                        <button className="text-primary hover:text-primary/80 transition-colors duration-200">
                          {openGroups[ele.company_name] ? (
                            <Lucide
                              icon="ChevronUp"
                              className="w-5 h-5"
                            />
                          ) : (
                            <Lucide
                              icon="ChevronDown"
                              className="w-5 h-5"
                            />
                          )}
                        </button>
                      </div>
                      {openGroups[ele.company_name] && Array.isArray(ele.sample_proposals) && (
                        <div className="mt-2 mb-4 bg-gray-50 overflow-x-auto">
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
            {analytics?.by_company?.length > 0 && (
              <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                <CPagination
                  page={analytics?.pagination?.current_page || 1}
                  totalPages={analytics?.pagination?.total_pages || 1}
                  handleNextPage={handleNextPage}
                  handlePageChange={handlePageChange}
                  handlePreviousPage={handlePreviousPage}
                />
              </div>
            )}
          </div>
        )}
        {isViewAnalysis && !analyticsLoading && analytics && typeof analytics === 'object' && (!analytics.by_institution || Object.keys(analytics.by_institution).length === 0) && (
          <div className="text-center text-gray-500 py-8">No analytics data available for the selected filters.</div>
        )}
        {/* TABLE SECTION (with skeleton loader, sticky headers, zebra striping, pill badges, tooltips, and empty state) */}
        {!isViewAnalysis && (
          <>
            {VdsEuropeans?.length > 0 && (
              <div className="flex justify-end items-center gap-4 mb-4">
                <button
                  onClick={expandAllInstitutionGroups}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors duration-200 border border-primary/30"
                >
                  <Lucide
                    icon={areAllInstitutionGroupsExpanded() ? "ChevronUp" : "ChevronDown"}
                    className="w-4 h-4"
                  />
                  <span>
                    {areAllInstitutionGroupsExpanded() ? "Collapse All" : "Expand All"}
                  </span>
                </button>
                <Tippy content="Download Excel" options={{ theme: "light" }}>
                  <div
                    className="box p-[5px] cursor-pointer"
                    onClick={() => !loadingDownload && handleDownload()}
                  >
                    {loadingDownload ? (
                      <Lucide
                        icon="Loader"
                        className="w-6 h-7 stroke-[1.3] animate-spin"
                      />
                    ) : (
                      <img alt="download-icon" src={downloadIcon} />
                    )}
                  </div>
                </Tippy>
              </div>
            )}
            <TableWrapper isLoading={allApplyFilter && loading}>
              <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                <Table>
                  <Table.Thead>
                    <Table.Tr className="sticky top-0 z-20 bg-primary/90 text-white shadow-md">
                      <Table.Td className="py-3 font-semibold h-[50px] bg-primary text-white first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-0" style={{ width: "17.5%" }}>Institution</Table.Td>
                      <Table.Td className="py-3 font-semibold h-[50px] bg-primary text-white first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-0" style={{ width: "17.5%" }}>Meeting Type</Table.Td>
                      <Table.Td className="py-3 font-semibold h-[50px] bg-primary text-white first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-0" style={{ width: "5%" }}>No.</Table.Td>
                      <Table.Td className="py-3 font-semibold h-[50px] bg-primary text-white first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-0" style={{ width: "25%" }}>Proposal</Table.Td>
                      <Table.Td className="py-3 font-semibold h-[50px] bg-primary text-white first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-0" style={{ width: "30%" }}>Vote Cast</Table.Td>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <Table.Tr key={i} className="animate-pulse">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Table.Td key={j}><Skeleton height={24} /></Table.Td>
                          ))}
                        </Table.Tr>
                      ))
                    ) : VdsEuropeans?.length > 0 ? (
                      (() => {
                        // Group data by institution
                        const groupedData = VdsEuropeans.reduce((acc: any, vds: any) => {
                          const institutionName = vds?.excel_institution_name || 'Unknown Institution';
                          if (!acc[institutionName]) {
                            acc[institutionName] = [];
                          }
                          acc[institutionName].push(vds);
                          return acc;
                        }, {});

                        return Object.entries(groupedData).map(([institutionName, institutionData]: [string, any]) => (
                          <>
                            {/* Institution Header Row */}
                            <Table.Tr
                              key={`header-${institutionName}`}
                              className="bg-gray-50 dark:bg-darkmode-700 cursor-pointer sticky top-12 z-10 hover:bg-gray-100 dark:hover:bg-darkmode-600 transition-all duration-200"
                              onClick={() => toggleInstitutionGroup(institutionName)}
                            >
                              <Table.Td
                                colSpan={5}
                                className="font-semibold py-3 px-4"
                              >
                                <div className="flex flex-row justify-between items-center">
                                  <div className="flex items-center">
                                    <span className="text-gray-800 dark:text-white font-medium">
                                      {institutionName}
                                    </span>
                                  </div>
                                  <button className="text-primary hover:text-primary/80 transition-colors duration-200">
                                    {openInstitutionGroups[institutionName] ? (
                                      <Lucide
                                        icon="ChevronUp"
                                        className="w-5 h-5"
                                      />
                                    ) : (
                                      <Lucide
                                        icon="ChevronDown"
                                        className="w-5 h-5"
                                      />
                                    )}
                                  </button>
                                </div>
                              </Table.Td>
                            </Table.Tr>

                            {/* Institution Data Rows - Show when expanded */}
                            {openInstitutionGroups[institutionName] &&
                              institutionData.map((vds: any, index: number) => (
                                <Table.Tr
                                  key={vds?.id}
                                  className="[&_td]:last:border-b-0"
                                  style={getSequentialBorderStyle(vds?.proposal_num, institutionData, index)}
                                >
                                  <Table.Td className="py-3 border-dashed dark:bg-darkmode-600 !w-[200px] bg-gray-50 dark:bg-darkmode-800">
                                    {/* Empty cell for institution name since it's in the header */}
                                  </Table.Td>
                                  <Table.Td className="py-3 border-dashed dark:bg-darkmode-600 bg-gray-50 dark:bg-darkmode-800">
                                    <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                      {convertToTitleCase(vds?.meeting_type)}
                                    </div>
                                  </Table.Td>
                                  <Table.Td className="py-3 border-dashed dark:bg-darkmode-600 bg-gray-50 dark:bg-darkmode-800">
                                    <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                      {vds?.proposal_num}
                                    </div>
                                  </Table.Td>
                                  <Table.Td className="py-3 border-dashed dark:bg-darkmode-600 bg-gray-50 dark:bg-darkmode-800">
                                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                                      <span className="block truncate" title={vds?.proposal}>{vds?.proposal}</span>
                                    </div>
                                  </Table.Td>
                                  <Table.Td className="py-3 border-dashed dark:bg-darkmode-600 bg-gray-50 dark:bg-darkmode-800">
                                    <div className="flex items-center gap-2">
                                      {vds?.vote === "Split Vote" ? (
                                        <Tippy content={vds?.split_vote_counts} options={{ theme: "light" }}>
                                          <span className="text-yellow-800 text-sm font-medium">{vds?.vote}</span>
                                        </Tippy>
                                      ) : (
                                        <span className={clsx([
                                          "text-sm font-medium",
                                          (vds?.vote?.includes("Against") || vds?.vote?.includes("Withhold")) ? "text-red-600" : "text-gray-700"
                                        ])}>
                                          {vds?.vote}
                                        </span>
                                      )}
                                      {vds?.notes && vds.notes.toLowerCase() !== "nan" && (
                                        <span data-tooltip-id="my-tooltip-data-html" data-tooltip-html={vds?.notes}>
                                          <Lucide icon="Info" className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-600 cursor-pointer" />
                                        </span>
                                      )}
                                    </div>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                          </>
                        ));
                      })()
                    ) : (
                      <Table.Tr>
                        <Table.Td colSpan={5} className="text-center py-10 text-gray-400 text-lg font-semibold">
                          <FaCheckCircle className="mx-auto mb-2 text-4xl text-primary/60" />
                          No Voting Data available. Try adjusting your filters!
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </div>
            </TableWrapper>
          </>
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

const AnalyticsTable = ({ vdsEuropeansAnalytics, openGroups, toggleGroup, filteredDateRange }) => {
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
                <th key={institution.institution_id} colSpan={years.length} className="px-6 py-3 pb-2 text-center font-semibold">
                  {institution.institution_name}
                </th>
              ))}
            </tr>
            <tr className="bg-primary text-white text-base">
              {institutions.map((institution) => (
                years.map((year) => {
                  const yearData = institution.years[year as string];
                  const apiDateRange = yearData?.date_range;

                  // Use filtered date range if available, otherwise use API date range
                  const displayDateRange = filteredDateRange && filteredDateRange.trim() !== ""
                    ? filteredDateRange
                    : apiDateRange;

                  return (
                    <th key={`${institution.institution_id}-${year}`} className="px-6 py-3 pt-0 text-center font-semibold">
                      <div className="flex flex-col">
                        {displayDateRange && (
                          <div className="text-xs font-semibold mt-1">
                            {filteredDateRange && filteredDateRange.trim() !== ""
                              ? `(${filteredDateRange})`
                              : `(${apiDateRange.start_meeting} - ${apiDateRange.end_meeting})`
                            }
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
