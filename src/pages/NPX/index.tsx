import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import {
  convertToTitleCase,
  countValidFilters,
  createDynamicURL,
  generateFilterChips,
  downloadFileFromAPI,
} from "@/utils/helper";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import _ from "lodash";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchNpxProxyDashboard,
  resetPage,
  setPage,
  setTempSearch,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft } from "lucide-react";
import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";
import { Controller, useForm } from "react-hook-form";
import {
  FormInput,
} from "@/components/Base/Form";
import { dashboardService } from "@/services/dashboard";
import { axiosInstance } from "@/services";
import TomSelect from "@/components/Base/TomSelect";
import CPagination from "@/components/Pagination";
import { toast } from "react-toastify";
import { setIsCompanySelected } from "@/stores/authenticationSlice";
import CompanySelect from "@/components/ReactSelectAsync";
import { Tooltip } from "react-tooltip";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";
import LoadingIcon from "@/components/Base/LoadingIcon";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import CreatableInputSelect from "@/components/Base/CreatableInputSelect";
import Pill from "@/components/Pill";
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaLayerGroup, FaTags, FaUserTie, FaHandshake, FaListUl, FaGlobe } from "react-icons/fa";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { MdOutlineClear } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import Litepicker from "@/components/Base/Litepicker";
import React from "react";

const index = () => {

  const navigate = useNavigate();
  const dispatch: AppDispatch = useAppDispatch();
  const { npxProxyDetails, npxProxyLoading, tempSearch, page, totalNPXCount } =
    useAppSelector((state) => state.dashboard);

  // Debug data state
  console.log("🔍 Data State Debug:", {
    npxProxyDetails: npxProxyDetails?.length || 0,
    npxProxyLoading,
    totalNPXCount,
    hasData: npxProxyDetails?.length > 0
  });

  const totalPages = Math.ceil(totalNPXCount / 50);
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    companyGlobalSearchName,
    companyGlobalSearchTicker,
    isCompanySelected,
  } = useAppSelector((state: RootState) => state.authentiction);

  const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;
  const searchTicker = searchParams.get("ticker");
  const year = searchParams.get("year") ?? "2024"; // Default to 2024 if not specified
  const meetingDateFromURL = searchParams.get("meeting_date"); // Get meeting date from URL if available

  const [filter, setFilter] = useState("");
  const [allApplyFilter, setallApplyFilter] = useState<any>({});
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const [dropdownValues, setDropdownValues] = useState<any>({
    institution_name: [],
    fund_name: [],
  });

  const [getDynamicDropdownLoader, setGetDynamicDropdownLoader] =
    useState<boolean>(false);
  const [getFundNameDropdownLoader, setGetFundNameDropdownLoader] =
    useState<boolean>(false);
  const [showFundName, setShowFundName] = useState<boolean>(false);
  const [apiFundNameDropdown, setApiFundNameDropdown] = useState<any>({
    fund_name: [],
  });
  const [meetingDate, setMeetingDate] = useState('');
  const isFirstLoad = useRef(true);
  const savedInstitutionRef = useRef<string>('');
  const fetchRequestId = useRef(0); // incremented on every call; guards against stale responses
  const allApplyFilterRef = useRef<any>({}); // always-fresh mirror of allApplyFilter state
  const savedFiltersRef = useRef<any>({ fund_name: [], proposal: [], vote: [], vote_category: [], keyword: [] });
  const [apiDependentDropdownOptions, setApiDependentDropdownOptions] =
    useState<any>({
      proposal: [],
      vote: [],
      vote_category: [],
    });

  // State to store all institutions
  const [allInstitutions, setAllInstitutions] = useState<any[]>([]);

  // Local loading state to prevent "No data found" flash
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [keywordDropdownOptions, setKeywordDropdownOptions] = useState<string[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);

  // Function to format meeting date to YYYY-MM-DD format
  const formatMeetingDate = (dateString: string) => {
    if (!dateString) return '';

    try {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }

      // Parse the date and convert to YYYY-MM-DD format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      // Use local date to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting meeting date:', error);
      return '';
    }
  };

  const getFundNameDependentDropdown = async (value: any, meetingDateOverride?: string) => {
    if (value !== "") {
      // Always explicitly include year parameter
      // Accept an explicit override to avoid stale-closure issues when called programmatically
      const currentMeetingDate = meetingDateOverride !== undefined ? meetingDateOverride : meetingDate;
      const paramFilter = {
        global_search: companyGlobalSearchName,
        year: year || '2024', // Always provide a year value
        institution_name: [value], // Include the selected institution as an array
        ...(currentMeetingDate && { meeting_date: formatMeetingDate(currentMeetingDate) }), // Include formatted meeting date if available
      };
      try {
        setGetFundNameDropdownLoader(true);
        console.log("getFundNameDependentDropdown params:", paramFilter);
        const res = await dashboardService.getDynamicNPXDropdownValues(
          paramFilter
        );
        if (res.result) {
          console.log("getFundNameDependentDropdown API response:", res.result);
          console.log("Raw meeting_date from API:", res.result?.meeting_date);

          setMeetingDate(res.result?.meeting_date);

          // Always show fund name when an institution is selected, regardless of API response
          setShowFundName(true);

          // Make sure to extract fund names from the correct part of the response
          // Check all possible locations in the API response and ensure we get an array
          let fundData = [];

          // Log the response structure to debug
          console.log("Fund data response structure:", {
            fund_name: Array.isArray(res.result?.fund_name) ? `Array with ${res.result?.fund_name?.length} items` : typeof res.result?.fund_name,
            funds: Array.isArray(res.result?.funds) ? `Array with ${res.result?.funds?.length} items` : typeof res.result?.funds,
            fund: Array.isArray(res.result?.fund) ? `Array with ${res.result?.fund?.length} items` : typeof res.result?.fund
          });

          // Try different locations in order of preference
          if (Array.isArray(res.result?.fund_name) && res.result.fund_name.length > 0) {
            fundData = res.result.fund_name;
          } else if (Array.isArray(res.result?.funds) && res.result.funds.length > 0) {
            fundData = res.result.funds;
          } else if (Array.isArray(res.result?.fund) && res.result.fund.length > 0) {
            fundData = res.result.fund;
          } else if (typeof res.result?.fund_name === 'object' && res.result?.fund_name !== null) {
            // Handle case where fund_name might be an object with values
            fundData = Object.values(res.result.fund_name);
          }

          // Set fund data from the new API structure
          setApiFundNameDropdown({
            ...res.result,
            fund_name: fundData
          });

          // Also update the dependent dropdown options when institution changes
          setApiDependentDropdownOptions({ ...res.result });

          // Output for debugging
          console.log("Fund data set to:", fundData);
        }
      } catch (error) {
        console.error("Error in getFundNameDependentDropdown:", error);
        return error;
      } finally {
        setGetFundNameDropdownLoader(false);
      }
    }
  };

  // Function to fetch all available institutions and auto-select first one with single API call
  const fetchAllInstitutions = useCallback(async (savedInstitution?: string, initialMeetingDate?: string) => {
    // Stamp this call; if a newer call starts before this one resolves, discard this result
    const requestId = ++fetchRequestId.current;
    try {
      // Keep initial loading true until we complete the process
      setInitialLoading(true);

      // Use the explicitly passed meeting date — avoids stale closure issues.
      // Initial page load passes meetingDateFromURL; company-change calls pass '' so the
      // backend returns the correct date for the new company.
      const currentMeetingDate = initialMeetingDate || '';
      const paramFilter = {
        global_search: companyGlobalSearchName,
        year: year || '2024',
        ...(currentMeetingDate && { meeting_date: formatMeetingDate(currentMeetingDate) }), // Include formatted meeting date if available
      };

      const res = await dashboardService.getDynamicNPXDropdownValues(paramFilter);

      // A newer request has been fired — discard this stale response
      if (requestId !== fetchRequestId.current) return;

      if (res.result && res.result.all_institution && res.result.all_institution.length > 0) {
        setAllInstitutions(res.result.all_institution);

        // Prefer previously selected institution if it exists in the new company's list;
        // otherwise fall back to the first one.
        const firstInstitution =
          (savedInstitution && res.result.all_institution.includes(savedInstitution))
            ? savedInstitution
            : res.result.all_institution[0];

        // Format for the dropdown
        const institutionValue = {
          label: firstInstitution,
          value: firstInstitution
        };

        // Set the institution in the form
        setValue("institution_name", institutionValue);

        // Update dropdown values
        handleDropdownChange("institution_name", firstInstitution);

        // Create filter object with the selected institution
        const filterObj = {
          global_search: companyGlobalSearchName,
          institution_name: [firstInstitution],
          year: year || '2024',
          ...(res.result?.meeting_date && { meeting_date: formatMeetingDate(res.result.meeting_date) }), // Include formatted meeting date from API response
        };

        // Create filter object for chips (excluding global_search and year)
        const filterObjForChips = {
          institution_name: [firstInstitution],
          fund_name: [],
          proposal: [],
          vote: [],
          vote_category: [],
          keyword: "",
        };

        // Update filter states to show the institution pill
        setallApplyFilter(filterObj);
        setSelectedChipFilters(generateFilterChips(filterObjForChips));
        setFiltersLength(countValidFilters(filterObjForChips));

        // Reset page and fetch NPX data with the selected institution
        dispatch(resetPage());
        dispatch(
          fetchNpxProxyDashboard(
            createDynamicURL(`${baseURL}/npx/detail/`, filterObj, undefined, 1)
          )
        );

        // Set meeting date from the same response to avoid another API call
        console.log("Raw meeting_date from fetchAllInstitutions API:", res.result?.meeting_date);
        setMeetingDate(res.result?.meeting_date);

        // Set fund names from the same response if available
        if (res.result.fund_name && res.result.fund_name.length > 0) {
          setApiFundNameDropdown({
            fund_name: res.result.fund_name
          });
          setShowFundName(true);
        }

        // Set dependent dropdown options from the same response
        setApiDependentDropdownOptions({ ...res.result });

        // Fetch fund + dependent dropdown options for the selected institution using the
        // fresh meeting_date from this response (avoids stale-state issues on company change)
        if (firstInstitution && res.result?.meeting_date) {
          await getFundNameDependentDropdown(firstInstitution, formatMeetingDate(res.result.meeting_date));
        }

        // Re-apply any non-institution filters the user had before the company change
        if (requestId !== fetchRequestId.current) return;
        const saved = savedFiltersRef.current;
        const hasSavedFilters =
          (Array.isArray(saved.fund_name) && saved.fund_name.length > 0) ||
          (Array.isArray(saved.proposal) && saved.proposal.length > 0) ||
          (Array.isArray(saved.vote) && saved.vote.length > 0) ||
          (Array.isArray(saved.vote_category) && saved.vote_category.length > 0) ||
          (Array.isArray(saved.keyword) && saved.keyword.length > 0) ||
          (typeof saved.keyword === 'string' && saved.keyword.length > 0);

        if (hasSavedFilters) {
          if (Array.isArray(saved.fund_name) && saved.fund_name.length > 0) {
            setValue('fund_name', saved.fund_name);
            handleDropdownChange('fund_name', saved.fund_name);
            setShowFundName(true);
          }
          if (saved.proposal) setValue('proposal', saved.proposal);
          if (saved.vote) setValue('vote', saved.vote);
          if (saved.vote_category) setValue('vote_category', saved.vote_category);
          if (saved.keyword && (Array.isArray(saved.keyword) ? saved.keyword.length > 0 : saved.keyword)) {
            setValue('keyword', saved.keyword);
          }

          const fullFilterObj = {
            ...filterObj,
            ...(Array.isArray(saved.fund_name) && saved.fund_name.length > 0 && { fund_name: saved.fund_name }),
            ...(saved.proposal && { proposal: saved.proposal }),
            ...(saved.vote && { vote: saved.vote }),
            ...(saved.vote_category && { vote_category: saved.vote_category }),
            ...(saved.keyword && { keyword: saved.keyword }),
          };
          const fullChipsObj = {
            institution_name: [firstInstitution],
            fund_name: saved.fund_name || [],
            proposal: saved.proposal || [],
            vote: saved.vote || [],
            vote_category: saved.vote_category || [],
            keyword: saved.keyword || '',
          };
          setallApplyFilter(fullFilterObj);
          setSelectedChipFilters(generateFilterChips(fullChipsObj));
          setFiltersLength(countValidFilters(fullChipsObj));
          dispatch(resetPage());
          dispatch(fetchNpxProxyDashboard(createDynamicURL(`${baseURL}/npx/detail/`, fullFilterObj, undefined, 1)));
        }

      } else {
        if (requestId !== fetchRequestId.current) return;
        setAllInstitutions([]);
        // Even if no institutions, we need to stop initial loading
        setInitialLoading(false);
      }
    } catch (error) {
      if (requestId !== fetchRequestId.current) return;
      console.error("Error fetching institutions:", error);
      setAllInstitutions([]);
      setInitialLoading(false);
    } finally {
      // Only mark loading done if this is still the active request
      if (requestId === fetchRequestId.current) {
        setInitialLoading(false);
      }
    }
  }, [companyGlobalSearchName, year, dispatch]);

  // Combined data fetching function to reduce API calls
  const fetchInitialData = useCallback(async () => {
    try {
      // Prepare parameters with year and selected institution if any
      const currentMeetingDate = meetingDate; // Use state only
      const paramFilter = {
        global_search: companyGlobalSearchName,
        year: year,
        ...(currentMeetingDate && { meeting_date: formatMeetingDate(currentMeetingDate) }), // Include formatted meeting date if available
        // Include selected institution if available
        ...(dropdownValues?.institution_name && {
          institution_name: Array.isArray(dropdownValues.institution_name)
            ? dropdownValues.institution_name
            : [dropdownValues.institution_name]
        }),
      };

      // Make a single API call
      const res = await dashboardService.getDynamicNPXDropdownValues(paramFilter);

      if (res.result) {
        // Set meeting date
        setMeetingDate(res.result?.meeting_date);

        // Set dependent dropdown options
        setApiDependentDropdownOptions({ ...res.result });
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  }, [companyGlobalSearchName, year]);

  // Keep allApplyFilterRef always in sync so the company-change useEffect can read it without stale closure
  useEffect(() => {
    allApplyFilterRef.current = allApplyFilter;
  });

  useEffect(() => {
    // Save non-institution filter values BEFORE resetting, so they can be re-applied after company data loads
    const current = allApplyFilterRef.current;
    savedFiltersRef.current = {
      fund_name: current?.fund_name || [],
      proposal: current?.proposal || [],
      vote: current?.vote || [],
      vote_category: current?.vote_category || [],
      keyword: current?.keyword || [],
    };

    // Reset values on company or year change
    setMeetingDate('');
    setAllInstitutions([]);

    // Reset dropdown values to prevent unnecessary API calls
    setDropdownValues({
      institution_name: [],
      fund_name: [],
    });

    // Clear any existing data
    setallApplyFilter({});
    setSelectedChipFilters([]);
    setFiltersLength(0);

    // Clear keyword search state
    setKeywordDropdownOptions([]);
    setKeywordLoading(false);

    // Set initial loading to true when company changes
    setInitialLoading(true);

    // Only fetch institutions if we have company data
    // This will make ONLY ONE API call that handles everything
    if (companyGlobalSearchName) {
      // Initial page load: pass URL meeting_date so the correct meeting is pre-selected.
      // Company/year change: pass '' so no stale date constrains the new company's API call.
      const meetingDateToPass = isFirstLoad.current ? (meetingDateFromURL ?? '') : '';
      fetchAllInstitutions(savedInstitutionRef.current, meetingDateToPass);
    } else {
      // If no company, stop loading
      setInitialLoading(false);
    }
    // After the first call, URL meeting_date is no longer valid for subsequent companies
    isFirstLoad.current = false;
  }, [companyGlobalSearchName, year]);

  // Keep savedInstitutionRef in sync with the currently selected institution
  useEffect(() => {
    const inst = Array.isArray(dropdownValues.institution_name)
      ? dropdownValues.institution_name[0] ?? ''
      : (typeof dropdownValues.institution_name === 'string' ? dropdownValues.institution_name : '');
    if (inst) savedInstitutionRef.current = inst;
  }, [dropdownValues.institution_name]);

  // Keep URL ticker in sync when user changes company via global search
  useEffect(() => {
    if (!companyGlobalSearchTicker) return;
    const newTicker = companyGlobalSearchTicker.split('-')[0];
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (params.get('ticker') !== newTicker) {
        params.set('ticker', newTicker);
        params.delete('meeting_date'); // remove stale meeting_date for the old company
      }
      return params;
    });
  }, [companyGlobalSearchTicker]);

  // Update URL meeting_date once the API returns the correct date for the current company
  useEffect(() => {
    if (!meetingDate) return;
    const formatted = formatMeetingDate(meetingDate);
    if (!formatted) return;
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (params.get('meeting_date') !== formatted) {
        params.set('meeting_date', formatted);
      }
      return params;
    });
  }, [meetingDate]);


  const getDependentDropdown = async () => {
    // Prepare parameters for API call
    const currentMeetingDate = meetingDate; // Use state — always correct for the current company
    const paramFilter = {
      global_search: companyGlobalSearchName,
      year: year, // Add year parameter from URL
      ...(currentMeetingDate && { meeting_date: formatMeetingDate(currentMeetingDate) }), // Include formatted meeting date if available
      // Always include the selected institution if available - critical for dependent dropdowns
      ...(dropdownValues?.institution_name && {
        institution_name: Array.isArray(dropdownValues.institution_name)
          ? dropdownValues.institution_name
          : [dropdownValues.institution_name]
      }),
      // Only include fund_name if there's a value
      // With MultiSelectDropdown, fund_name values are always an array
      ...(dropdownValues?.fund_name?.length > 0 && {
        fund_name: dropdownValues.fund_name
      }),
    };

    try {
      setGetDynamicDropdownLoader(true);
      console.log("getDependentDropdown params:", paramFilter);
      const res = await dashboardService.getDynamicNPXDropdownValues(
        paramFilter
      );
      if (res.result) {
        console.log("getDependentDropdown response:", res.result);
        // Still using the same result structure for dropdown options
        setApiDependentDropdownOptions({ ...res.result });

        // Make sure any available fund_name data is also added to apiFundNameDropdown
        if (res.result.fund_name && res.result.fund_name.length > 0) {
          setApiFundNameDropdown(prev => ({
            ...prev,
            fund_name: res.result.fund_name
          }));
          // If fund names are found, make sure to show the dropdown
          setShowFundName(true);
        }
      }
    } catch (error) {
      return error;
    } finally {
      setGetDynamicDropdownLoader(false);
    }
  };

  const handleDropdownChange = (key: string, value: any) => {
    setDropdownValues((prev: any) => ({
      ...prev,
      [key]: value,
    }));
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
        // Include the necessary parameters that the NPX API expects
        const params = {
          keyword: searchTerm,
          global_search: companyGlobalSearchName,
          year: year || '2024'
        };

        const dynamicURL = createDynamicURL(
          '/get_npx_dropdown_values/',
          null,
          params,
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
    [companyGlobalSearchName, year]
  );

  const fetchKeywordSuggestions = (searchTerm: string) => {
    debouncedFetchKeywordSuggestions(searchTerm);
  };

  // Only make additional API calls when user explicitly changes filters after initial load
  useEffect(() => {
    // Skip if this is the initial auto-selection (when allInstitutions is being set)
    if (allInstitutions.length === 0) return;

    // Only make API calls when user explicitly changes fund filters
    // Institution changes are handled by getFundNameDependentDropdown directly
    const hasManualFundSelection =
      (dropdownValues.fund_name && dropdownValues.fund_name.length > 0);

    if (hasManualFundSelection) {
      // When fund is selected, fetch dependent dropdowns
      getDependentDropdown();
    }
  }, [dropdownValues.fund_name, allInstitutions.length]);

  useEffect(() => {
    // Only handle pagination changes, not initial data loading
    if (allApplyFilter && Object.keys(allApplyFilter).length > 0 && page > 1) {
      const currentMeetingDate = meetingDate; // Use state — always correct for the current company
      dispatch(
        fetchNpxProxyDashboard(
          createDynamicURL(
            `${baseURL}/npx/detail/`,
            {
              ...allApplyFilter,
              year: year || '2024',
              ...(currentMeetingDate && { meeting_date: formatMeetingDate(currentMeetingDate) })
            },
            undefined,
            page
          )
        )
      );
    }

    // Handle company change reset
    if (isCompanySelected) {
      reset();
      setShowFundName(false);
      dispatch(setIsCompanySelected(false));
    }
  }, [page, isCompanySelected]);

  const isObject = (item: any) => {
    if (typeof item === "object") {
      return true;
    } else {
      false;
    }
  };

  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(true);
  const [filtersLength, setFiltersLength] = useState<number>(0);

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
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
      institution_name: null,
      fund_name: [],
      proposal: [],
      vote: [],
      vote_category: [],
      keyword: [],
      meeting_date: ''
    },
  });

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    const updatedFilters = { ...allApplyFilter };

    if (Array.isArray(updatedFilters[removeKey])) {
      updatedFilters[removeKey] = updatedFilters[removeKey].filter(
        (item) => item !== removeValue
      );
    } else if (updatedFilters[removeKey] === removeValue) {
      updatedFilters[removeKey] = "";
    }

    // Update the form control values to match the updated filters
    if (removeKey === "institution_name") {
      setValue("institution_name", null);
      // Also clear fund_name if institution is removed
      setValue("fund_name", []);
      setShowFundName(false);
      setDropdownValues(prev => ({
        ...prev,
        institution_name: "",
        fund_name: []
      }));
    } else if (removeKey === "fund_name") {
      // For MultiSelectDropdown, we need to ensure the state is updated correctly
      const remainingFundValues = updatedFilters.fund_name || [];

      // Convert the remaining values to the format expected by MultiSelectDropdown
      const formattedValues = remainingFundValues.map((value: string) => ({
        value,
        label: value
      }));

      // Update form field value with the raw values
      setValue("fund_name", remainingFundValues);

      // Update dropdown state with the raw values
      setDropdownValues(prev => ({
        ...prev,
        fund_name: remainingFundValues
      }));
    } else if (removeKey === "vote_category") {
      setValue("vote_category", updatedFilters.vote_category || []);
    } else if (removeKey === "proposal") {
      setValue("proposal", updatedFilters.proposal || []);
    } else if (removeKey === "vote") {
      setValue("vote", updatedFilters.vote || []);
    } else if (removeKey === "keyword") {
      setValue("keyword", updatedFilters.keyword || []);
    }

    // Create filter object for chips (exclude global_search)
    const filterObjForChips = {
      institution_name: updatedFilters.institution_name,
      fund_name: updatedFilters.fund_name,
      proposal: updatedFilters.proposal,
      vote: updatedFilters.vote,
      vote_category: updatedFilters.vote_category,
      keyword: updatedFilters.keyword,
    };

    setallApplyFilter(updatedFilters);
    setSelectedChipFilters(generateFilterChips(filterObjForChips));
    setFiltersLength(countValidFilters(filterObjForChips));

    // Always explicitly include year parameter and meeting date
    const yearParam = year || '2024'; // Ensure we always have a year value
    const currentMeetingDate = meetingDate; // Use state — always correct for the current company
    updatedFilters.year = yearParam;
    if (currentMeetingDate) {
      updatedFilters.meeting_date = formatMeetingDate(currentMeetingDate); // Include formatted meeting date
    }

    // Dispatch data fetch with updated filters
    dispatch(resetPage());
    dispatch(
      fetchNpxProxyDashboard(
        createDynamicURL(`${baseURL}/npx/detail/`, updatedFilters, undefined, 1)
      )
    );
  };

  const onSubmit = async (npxFilter: any) => {
    console.log("=== DEBUG: onSubmit called ===");
    console.log("Raw form data:", npxFilter);

    if (!npxFilter?.institution_name || !npxFilter?.institution_name?.label) {
      toast.warning("Please select Institution");
      return;
    }

    const currentMeetingDate = meetingDate; // Use state — always correct for the current company
    const filterObj = {
      global_search: companyGlobalSearchName,
      institution_name:
        "Select" === npxFilter?.institution_name?.label
          ? ""
          : [npxFilter?.institution_name?.label],
      fund_name: Array.isArray(npxFilter?.fund_name) ? npxFilter?.fund_name : [],
      proposal: "Select" === npxFilter?.proposal ? "" : npxFilter?.proposal,
      vote: "Select" === npxFilter?.vote ? "" : npxFilter?.vote,
      vote_category:
        "Select" === npxFilter?.vote_category ? "" : npxFilter?.vote_category,
      keyword: Array.isArray(npxFilter?.keyword) ? npxFilter?.keyword : [],
      year: year || '2024',
      ...(currentMeetingDate && { meeting_date: formatMeetingDate(currentMeetingDate) }), // Include formatted meeting date
    };

    console.log("Filter object constructed:", filterObj);
    console.log("=== END DEBUG ===");

    const filterObjForChips = {
      institution_name: filterObj.institution_name,
      fund_name: filterObj.fund_name,
      proposal: filterObj.proposal,
      vote: filterObj.vote,
      vote_category: filterObj.vote_category,
      keyword: filterObj.keyword,
    };

    console.log("Form data received:", npxFilter);
    console.log("Filter object being sent to API:", filterObj);

    setallApplyFilter(filterObj);
    setSelectedChipFilters(generateFilterChips(filterObjForChips));
    setFiltersLength(countValidFilters(filterObjForChips));
    dispatch(resetPage());

    const apiUrl = createDynamicURL(`${baseURL}/npx/detail/`, filterObj, undefined, 1);
    console.log("🔍 DEBUGGING API URL:");
    console.log("Full URL:", apiUrl);

    // Parse the URL to check individual parameters
    const url = new URL(apiUrl);
    const params = new URLSearchParams(url.search);
    console.log("URL Parameters:");
    for (const [key, value] of params.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    dispatch(
      fetchNpxProxyDashboard(apiUrl)
    );

    setIsFilterCollapse(false);
  };

  const onFilterClear = () => {
    // Reset all form values properly
    reset({
      institution_name: null,
      fund_name: [],
      vote_category: [],
      proposal: [],
      vote: [],
      keyword: [],
      meeting_date: ''
    });

    // Reset dropdown state values
    setDropdownValues({
      institution_name: "",
      fund_name: []
    });

    // Clear filters and UI state
    setSelectedChipFilters([]);
    setFiltersLength(0);
    setShowFundName(false);
    setallApplyFilter({});

    // Reset pagination and fetch fresh data with just basic parameters
    const currentMeetingDate = meetingDate; // Use state — always correct for the current company
    dispatch(resetPage());
    dispatch(
      fetchNpxProxyDashboard(
        createDynamicURL(`${baseURL}/npx/detail/`, {
          global_search: companyGlobalSearchName,
          year: year || '2024',
          ...(currentMeetingDate && { meeting_date: formatMeetingDate(currentMeetingDate) }) // Include formatted meeting date
        }, undefined, 1)
      )
    );
  };

  const resetFormValues: any = () => {
    // Reset all form fields to default values
    setValue("institution_name", null);
    setValue("fund_name", []);
    setValue("vote_category", []);
    setValue("proposal", []);
    setValue("vote", []);
    setValue("keyword", []);
    setValue("meeting_date", "");

    // Reset dropdown state
    setDropdownValues({
      institution_name: "",
      fund_name: []
    });
  };

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

  return (
    <>
      <Button
        onClick={() => {
          navigate("/");
        }}
        variant="primary"
        className="bg-theme-2 border-bg-theme-2 mb-1"
      >
        <ChevronLeft
          className="group-[.mode--light]:text-white text-white"
          size={18}
          strokeWidth={1.5}
        />
        Back
      </Button>

      <div className="flex justify-between items-center xs:flex-col md:flex-row py-3"></div>
      <div className="p-5 mt-1 box">
        <div className="flex flex-col p-5  sm:flex-row gap-y-2">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
            <span>
              <h1 className="text-lg font-bold flex items-center gap-2">
                N-PX Voting
              </h1>
              {
                meetingDate &&
                <>
                  {console.log("Displaying meetingDate:", meetingDate)}
                  <p className=" italic"> Meeting Date: {meetingDate} </p>
                </>
              }
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center">
            {npxProxyDetails?.length > 0 && (
              <h2 className="flex items-end font-semibold justify-end text-[13px] md:ml-auto mx-5">
                Count: {totalNPXCount.toLocaleString()}
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
            {/* Filter Content */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
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
            {/* Filter Toggle and Advanced Filters Button */}
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* First row: Institution, Fund, Category */}
              <div className="grid gap-6 md:grid-cols-3 grid-cols-1">
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
                      <CompanySelect
                        isInstitution={true}
                        companyGlobalSearchName={companyGlobalSearchName}
                        value={field.value}
                        year={year} // Pass year from URL
                        isClearable={true}
                        onChange={(value: any) => {
                          field.onChange(value);
                          // Pass the selected institution value for API calls
                          handleDropdownChange(
                            "institution_name",
                            value?.label || ""
                          );
                          if (value?.label) {
                            getFundNameDependentDropdown(value.label);
                          } else {
                            // Clear fund dropdown and all dependent dropdowns when institution is cleared
                            setShowFundName(false);
                            setApiFundNameDropdown({ fund_name: [] });
                            setApiDependentDropdownOptions({
                              proposal: [],
                              vote: [],
                              vote_category: [],
                            });
                          }
                        }}
                      />
                    )}
                  />
                </div>

                {/* Fund */}
                {showFundName && (
                  <div>
                    <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                      <FaBuilding className="text-gray-400" /> Fund
                    </label>
                    <Controller
                      name="fund_name"
                      control={control}
                      defaultValue={[]}
                      render={({ field }) => (
                        <MultiSelectDropdown
                          loading={getFundNameDropdownLoader}
                          selectedOption={field.value || []}
                          onChange={(selectedOptions) => {
                            console.log("Fund selection changed:", selectedOptions);

                            // Extract values from the selected options
                            const selectedValues = selectedOptions.map((option: any) => option.value);

                            // Update both the form control and local state
                            handleDropdownChange("fund_name", selectedValues);
                            field.onChange(selectedValues);
                          }}
                          data={
                            getFundNameDropdownLoader
                              ? []
                              : (apiFundNameDropdown?.fund_name?.length > 0)
                                ? apiFundNameDropdown.fund_name.map((fund: string) => ({
                                  value: fund,
                                  label: fund
                                }))
                                : []
                          }
                          placeholder="Select Fund"
                          fieldName="fund"
                        />
                      )}
                    />
                  </div>
                )}

                {/* Category */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaTags className="text-gray-400" /> Category
                  </label>
                  <Controller
                    name="vote_category"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => {
                          // Handle both direct value and event objects from TomSelect
                          let selectedValues;

                          if (value && typeof value === 'object' && 'target' in value) {
                            // It's an event object with target.value
                            selectedValues = value.target.value;
                          } else {
                            // It's a direct value
                            selectedValues = value;
                          }

                          field.onChange(selectedValues);
                        }}
                        options={{
                          placeholder: "Select Vote Category",
                          onItemAdd: function (value) {
                            console.log("Vote Category item added:", value);
                          }
                        }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDependentDropdownOptions?.vote_category?.map(
                            (vote_category: any) => (
                              <option key={vote_category} value={vote_category}>
                                {convertToTitleCase(vote_category)}
                              </option>
                            )
                          )
                        )}
                      </TomSelect>
                    )}
                  />
                </div>
              </div>

              {/* Second row: Proposal, Vote, Keyword */}
              <div className="grid gap-6 md:grid-cols-3 grid-cols-1 mt-6">
                {/* Proposal */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaListUl className="text-gray-400" /> Proposal
                  </label>
                  <Controller
                    name="proposal"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => {
                          // Handle both direct value and event objects from TomSelect
                          let selectedValues;

                          if (value && typeof value === 'object' && 'target' in value) {
                            // It's an event object with target.value
                            selectedValues = value.target.value;
                          } else {
                            // It's a direct value
                            selectedValues = value;
                          }

                          field.onChange(selectedValues);
                        }}
                        options={{
                          placeholder: "Select Proposal",
                          onItemAdd: function (value) {
                            console.log("Proposal item added:", value);
                          }
                        }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDependentDropdownOptions?.proposal?.map(
                            (proposal: any) => (
                              <option key={proposal} value={proposal}>
                                {proposal}
                              </option>
                            )
                          )
                        )}
                      </TomSelect>
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
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => {
                          // Handle both direct value and event objects from TomSelect
                          let selectedValues;

                          if (value && typeof value === 'object' && 'target' in value) {
                            // It's an event object with target.value
                            selectedValues = value.target.value;
                          } else {
                            // It's a direct value
                            selectedValues = value;
                          }

                          field.onChange(selectedValues);
                        }}
                        options={{
                          placeholder: "Select Vote",
                          onItemAdd: function (value) {
                            console.log("Vote item added:", value);
                          }
                        }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDependentDropdownOptions?.vote?.map(
                            (vote: any) => (
                              <option key={vote} value={vote}>
                                {convertToTitleCase(vote)}
                              </option>
                            )
                          )
                        )}
                      </TomSelect>
                    )}
                  />
                </div>

                {/* Keyword */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-2 text-slate-600 font-semibold">
                      <FaSearch className="text-gray-400" /> Keywords
                    </label>
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
            </form>
          </div>
        )}

        {/* TABLE SECTION (with skeleton loader, sticky headers, zebra striping, pill badges, tooltips, and empty state) */}
        {(npxProxyLoading || initialLoading) ? (
          // Show loading skeleton while data is being fetched
          <TableWrapper isLoading={true}>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
              <Table>
                <Table.Thead>
                  <Table.Tr className="bg-primary text-white text-sm">
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "25%" }}>Proposal</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "15%" }}>Category</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "15%" }}>Vote</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "15%" }}>Fund Name</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "15%" }}>Shares Voted</Table.Td>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Table.Tr key={i} className="animate-pulse">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Table.Td key={j}><Skeleton height={24} /></Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          </TableWrapper>
        ) : npxProxyDetails?.length > 0 ? (
          // Show data table when we have data
          <TableWrapper isLoading={false}>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
              <Table>
                <Table.Thead>
                  <Table.Tr className="bg-primary text-white text-sm">
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "25%" }}>Proposal</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "15%" }}>Category</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "15%" }}>Vote</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "15%" }}>Fund Name</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "15%" }}>Shares Voted</Table.Td>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(() => {
                    let toggle = false;
                    return npxProxyDetails.map((noAction: any, index: number) => {
                      toggle = !toggle;
                      return (
                        <Table.Tr
                          key={noAction?.id}
                          className={clsx(
                            "[&_td]:last:border-b-0 transition-all hover:bg-primary/5 cursor-pointer",
                            toggle ? "bg-white" : "bg-gray-50"
                          )}
                        >
                          <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                            {noAction?.proposal}
                          </Table.Td>
                          <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                            {convertToTitleCase(noAction?.vote_category)}
                          </Table.Td>
                          <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                            {convertToTitleCase(noAction?.vote_split)}
                          </Table.Td>
                          <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                            {noAction?.fund_name}
                          </Table.Td>
                          <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                            {noAction?.shares_voted_split}
                          </Table.Td>
                        </Table.Tr>
                      );
                    });
                  })()}
                </Table.Tbody>
              </Table>
            </div>
          </TableWrapper>
        ) : (
          // Show "No data found" when no data is available and not loading
          <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            <div className="text-center text-gray-400 text-lg font-semibold">
              <FaTimes className="mx-auto mb-2 text-4xl text-red-500" />
              <div>No data found</div>
              <div className="text-sm mt-1">Try adjusting your filters!</div>
            </div>
          </div>
        )}

        {npxProxyDetails?.length > 0 && (
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

export default index;
