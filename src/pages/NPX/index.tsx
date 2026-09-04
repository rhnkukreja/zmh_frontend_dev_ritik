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
import { useSearchParams } from "react-router-dom";
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

const NPX_DETAILS_CACHE_KEY = "npxDetailsFilters";
const NPX_DETAILS_RELOAD_SESSION_KEY = "npxDetailsReloadHandled";

const isPageReloadOnce = (sessionKey: string) => {
  if (typeof window === "undefined") return false;
  const navEntry = window.performance?.getEntriesByType?.("navigation")?.[0] as any;
  const isReload = navEntry?.type ? navEntry.type === "reload" : (window.performance as any)?.navigation?.type === 1;
  try {
    const handled = sessionStorage.getItem(sessionKey) === "true";
    if (isReload && !handled) {
      sessionStorage.setItem(sessionKey, "true");
      return true;
    }
    return false;
  } catch {
    return isReload;
  }
};

const readCachedNpxDetailsFilters = (): any | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(NPX_DETAILS_CACHE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const index = () => {

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
    companyGlobalSearchId,
    isCompanySelected,
  } = useAppSelector((state: RootState) => state.authentiction);

  const year = searchParams.get("year") ?? ""; // derive from meeting date if missing
  const meetingDateFromURL = searchParams.get("meeting_date"); // Get meeting date from URL if available

  const [filter, setFilter] = useState("");
  const [allApplyFilter, setallApplyFilter] = useState<any>({});
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const [dropdownValues, setDropdownValues] = useState<any>({
    institution_name: [],
    fund_name: [],
    vote_category: [],
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
  const [npxMeetings, setNpxMeetings] = useState<any[]>([]); // cache of NPX meetings {year, meeting_date}
  const isFirstLoad = useRef(true);
  const savedInstitutionRef = useRef<string>('');
  const fetchRequestId = useRef(0); // incremented on every call; guards against stale responses
  const allApplyFilterRef = useRef<any>({}); // always-fresh mirror of allApplyFilter state
  const savedFiltersRef = useRef<any>({ fund_name: [], proposal: [], vote: [], vote_category: [], keyword: [] });

  // Filter/data persistence: compute reload state once, and read any cached filters
  // on the very first render (before any effect runs). On a hard refresh, the cache
  // is cleared so the module falls back to its normal default-institution bootstrap.
  const isReloadRef = useRef<boolean | null>(null);
  const cachedFiltersRef = useRef<any>(null);
  const cacheInitRef = useRef(false);
  if (!cacheInitRef.current) {
    cacheInitRef.current = true;
    isReloadRef.current = isPageReloadOnce(NPX_DETAILS_RELOAD_SESSION_KEY);
    if (isReloadRef.current) {
      try { localStorage.removeItem(NPX_DETAILS_CACHE_KEY); } catch { /* no-op */ }
    } else {
      cachedFiltersRef.current = readCachedNpxDetailsFilters();
    }
  }
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
  const hasTriggeredStatsRequestRef = useRef(false);
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
          if (Array.isArray(res.result?.year)) {
            const years = res.result.year.map((y: any) => String(y)).filter(Boolean);
          }

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

  // Function to fetch all available institutions and auto-select first one with a single dropdown API call (scoped)
  const fetchAllInstitutions = useCallback(async (savedInstitution?: string, initialMeetingDate?: string) => {
    // Stamp this call; if a newer call starts before this one resolves, discard this result
    const requestId = ++fetchRequestId.current;
    try {
      // Keep initial loading true until the stats request completes
      setInitialLoading(true);

      // Use the explicitly passed meeting date — avoids stale closure issues.
      // Initial page load passes meetingDateFromURL; company-change calls pass '' so the
      // backend returns the correct date for the new company.
      const currentMeetingDate = initialMeetingDate || '';
      // 1) Fetch institutions list via lightweight search API (does not hit the heavy dropdown endpoint)
      try {
        const instRes = await dashboardService.fetchInstitutionByName(
          'a',
          companyGlobalSearchName,
          year || '2024'
        );
        if (requestId !== fetchRequestId.current) return;
        const list = Array.isArray(instRes.results) ? instRes.results : [];
        const normalizedList = list
          .map((item: any) => (typeof item === "string" ? item : item?.name))
          .filter(Boolean) as string[];

        if (normalizedList.length > 0) {
          setAllInstitutions(normalizedList);
          const firstInstitution =
            (savedInstitution && normalizedList.includes(savedInstitution))
              ? savedInstitution
              : normalizedList[0];

          // Format for the dropdown and set
          const institutionValue = { label: firstInstitution, value: firstInstitution };
          setValue('institution_name', institutionValue);
          handleDropdownChange('institution_name', firstInstitution);

          // 2) Build base filters including the meeting_date we already know for this company/year
          const filterObj = {
            global_search: companyGlobalSearchName,
            institution_name: [firstInstitution],
            year: year || undefined,
            ...(currentMeetingDate && { meeting_date: formatMeetingDate(currentMeetingDate) }),
          };

          // Reflect in UI chips immediately
          const filterObjForChips = {
            institution_name: [firstInstitution],
            fund_name: [],
            proposal: [],
            vote: [],
            vote_category: [],
            keyword: "",
          };
          setallApplyFilter(filterObj);
          setSelectedChipFilters(generateFilterChips(filterObjForChips));
          setFiltersLength(countValidFilters(filterObjForChips));

          // Kick off stats fetch using the same scoped filters
          dispatch(resetPage());
          hasTriggeredStatsRequestRef.current = true;
          dispatch(
            fetchNpxProxyDashboard(
              createDynamicURL(`${baseURL}/npx/detail/`, filterObj, undefined, 1)
            )
          );

          // 3) Make a SINGLE dropdown API call scoped to (global_search, year, meeting_date, institution_name)
          await getFundNameDependentDropdown(firstInstitution, currentMeetingDate ? formatMeetingDate(currentMeetingDate) : undefined);

          // Ensure local meeting_date state is in sync (in case it wasn't set yet)
          if (currentMeetingDate) setMeetingDate(currentMeetingDate);
        } else {
          // Fallback: if institution search returns nothing, do one scoped dropdown call without institution to derive it
          const paramFilter = {
            global_search: companyGlobalSearchName,
            year: year || undefined,
            ...(currentMeetingDate && { meeting_date: formatMeetingDate(currentMeetingDate) }),
          };
          const res = await dashboardService.getDynamicNPXDropdownValues(paramFilter);
          if (requestId !== fetchRequestId.current) return;
          const institutions = Array.isArray(res?.result?.all_institution)
            ? res.result.all_institution.filter(Boolean)
            : [];
          if (institutions.length === 0) {
            setAllInstitutions([]);
            return;
          }
          setAllInstitutions(institutions);
          const firstInstitution = (savedInstitution && institutions.includes(savedInstitution)) ? savedInstitution : institutions[0];
          const institutionValue = { label: firstInstitution, value: firstInstitution };
          setValue('institution_name', institutionValue);
          handleDropdownChange('institution_name', firstInstitution);

          const filterObj = {
            global_search: companyGlobalSearchName,
            institution_name: [firstInstitution],
            year: year || undefined,
            ...(res.result?.meeting_date && { meeting_date: formatMeetingDate(res.result.meeting_date) }),
          };
          const chipsObj = { institution_name: [firstInstitution], fund_name: [], proposal: [], vote: [], vote_category: [], keyword: '' };
          setallApplyFilter(filterObj);
          setSelectedChipFilters(generateFilterChips(chipsObj));
          setFiltersLength(countValidFilters(chipsObj));
          dispatch(resetPage());
          hasTriggeredStatsRequestRef.current = true;
          dispatch(fetchNpxProxyDashboard(createDynamicURL(`${baseURL}/npx/detail/`, filterObj, undefined, 1)));

          // Single scoped dropdown call for dependent data
          await getFundNameDependentDropdown(firstInstitution, res.result?.meeting_date ? formatMeetingDate(res.result.meeting_date) : undefined);
          if (res.result?.meeting_date) setMeetingDate(res.result.meeting_date);
        }
      } catch (e) {
        if (requestId !== fetchRequestId.current) return;
        setAllInstitutions([]);
      }
    } catch (error) {
      if (requestId !== fetchRequestId.current) return;
      console.error("Error fetching institutions:", error);
      setAllInstitutions([]);
    } finally {
      // Only mark loading done if this is still the active request
      if (requestId === fetchRequestId.current && npxProxyLoading) {
        setInitialLoading(false);
      }
    }
  }, [companyGlobalSearchName, year, dispatch]);

  // Restore filters + data from a cached snapshot (localStorage) instead of running the
  // default-institution bootstrap. Used when navigating back into the module with a
  // previously applied filter set for the same company/year (not on a hard refresh).
  const restoreFiltersFromCache = useCallback(async (cache: any, dateForYear: string) => {
    const requestId = ++fetchRequestId.current;
    setInitialLoading(true);
    try {
      // Populate the institution search dropdown's default option list (lightweight call)
      try {
        const instRes = await dashboardService.fetchInstitutionByName('a', companyGlobalSearchName, year || '2024');
        if (requestId !== fetchRequestId.current) return;
        const list = Array.isArray(instRes.results) ? instRes.results : [];
        const normalizedList = list
          .map((item: any) => (typeof item === "string" ? item : item?.name))
          .filter(Boolean) as string[];
        setAllInstitutions(normalizedList.length > 0 ? normalizedList : ['__cache_restored__']);
      } catch {
        setAllInstitutions(['__cache_restored__']);
      }

      const cachedInstitution = Array.isArray(cache?.filterObj?.institution_name)
        ? cache.filterObj.institution_name[0]
        : undefined;
      const cachedFundNames = Array.isArray(cache?.filterObj?.fund_name) ? cache.filterObj.fund_name : [];
      const cachedCategory = cache?.filterObj?.vote_category
        ? (Array.isArray(cache.filterObj.vote_category) ? cache.filterObj.vote_category : [cache.filterObj.vote_category])
        : [];
      const cachedProposal = cache?.filterObj?.proposal || [];
      const cachedVote = cache?.filterObj?.vote || [];
      const cachedKeyword = cache?.filterObj?.keyword || [];

      // Restore react-hook-form fields
      setValue('institution_name', cachedInstitution ? { label: cachedInstitution, value: cachedInstitution } : null);
      setValue('fund_name', cachedFundNames);
      setValue('vote_category', cachedCategory);
      setValue('proposal', cachedProposal);
      setValue('vote', cachedVote);
      setValue('keyword', cachedKeyword);

      // Restore local dropdown state (drives the consolidated dependent-dropdown effect)
      setDropdownValues({
        institution_name: cachedInstitution || '',
        fund_name: cachedFundNames,
        vote_category: cachedCategory,
      });
      setShowFundName(!!cachedInstitution);

      const currentDate = dateForYear || cache?.meetingDate || '';
      if (currentDate) setMeetingDate(currentDate);

      const filterObj: any = {
        ...cache.filterObj,
        global_search: companyGlobalSearchName,
        year: year || '2024',
        ...(currentDate && { meeting_date: formatMeetingDate(currentDate) }),
      };

      const filterObjForChips = {
        ...(filterObj.institution_name ? { institution_name: filterObj.institution_name } : {}),
        fund_name: filterObj.fund_name,
        proposal: filterObj.proposal,
        vote: filterObj.vote,
        vote_category: filterObj.vote_category,
        keyword: filterObj.keyword,
      } as any;

      setallApplyFilter(filterObj);
      setSelectedChipFilters(generateFilterChips(filterObjForChips));
      setFiltersLength(countValidFilters(filterObjForChips));

      dispatch(resetPage());
      hasTriggeredStatsRequestRef.current = true;
      dispatch(
        fetchNpxProxyDashboard(
          createDynamicURL(`${baseURL}/npx/detail/`, filterObj, undefined, 1)
        )
      );

      // Populate dependent dropdown OPTIONS (proposal/vote/category/fund choices).
      // If an institution was cached, this also fetches fund options.
      // If category-only (no institution), the consolidated effect watching
      // dropdownValues.vote_category will fetch dependent dropdown options automatically.
      if (cachedInstitution) {
        await getFundNameDependentDropdown(cachedInstitution, currentDate ? formatMeetingDate(currentDate) : undefined);
      }
    } finally {
      if (requestId === fetchRequestId.current) setInitialLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyGlobalSearchName, year, dispatch]);

  // Combined data fetching function to reduce API calls
  const fetchInitialData = useCallback(async () => {
    try {
      // Prepare parameters with year and selected institution if any
      const currentMeetingDate = meetingDate; // Use state only
      const paramFilter = {
        global_search: companyGlobalSearchName,
        year: year || undefined,
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

  // Persist applied filters (and, implicitly, the data view they produce) so they survive
  // in-app navigation away from and back to this module. Cleared on a hard page refresh.
  useEffect(() => {
    if (!companyGlobalSearchName) return;
    if (!allApplyFilter || Object.keys(allApplyFilter).length === 0) return;
    try {
      localStorage.setItem(
        NPX_DETAILS_CACHE_KEY,
        JSON.stringify({
          companyGlobalSearchName,
          year,
          meetingDate,
          filterObj: allApplyFilter,
        })
      );
    } catch {
      /* no-op */
    }
  }, [allApplyFilter, companyGlobalSearchName, year, meetingDate]);

  useEffect(() => {
    // If year isn't set yet (awaiting meeting years API), don't proceed
    if (!year) return;
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

    // Defer fetching institutions to the meeting-date-aware effect below,
    // which ensures a single scoped call including meeting_date and institution.
    if (!companyGlobalSearchName) {
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

  // Update URL meeting_date and year once the API returns the correct date for the current company
  useEffect(() => {
    if (!meetingDate) return;
    const formatted = formatMeetingDate(meetingDate);
    if (!formatted) return;
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (params.get('meeting_date') !== formatted) {
        params.set('meeting_date', formatted);
      }
      const yearFromDate = String(new Date(meetingDate).getFullYear());
      if (yearFromDate && params.get('year') !== yearFromDate) {
        params.set('year', yearFromDate);
      }
      return params;
    });
  }, [meetingDate]);

  // Load meeting years from consolidated endpoint (NPX side)
  useEffect(() => {
    const loadMeetingYears = async () => {
      try {
        if (!companyGlobalSearchId) return;
        const { result } = await dashboardService.getVdsNpxMeetingDates(companyGlobalSearchId);
        const npxKey = result?.NPX_Data || result?.npx_data || [];
        setNpxMeetings(Array.isArray(npxKey) ? npxKey : []);
        const years = Array.from(new Set(
          (Array.isArray(npxKey) ? npxKey : []).map((x: any) => String(x?.year)).filter(Boolean)
        )).sort((a: string, b: string) => Number(b) - Number(a));
        if (years.length > 0) {
          const currentYear = searchParams.get('year');
          const defaultYear = currentYear && years.includes(currentYear) ? currentYear : years[0];
          if (defaultYear !== currentYear) {
            setSearchParams(prev => {
              const params = new URLSearchParams(prev);
              params.set('year', defaultYear);
              return params;
            });
          }
          const match = (Array.isArray(npxKey) ? npxKey : []).find((x: any) => String(x?.year) === String(defaultYear));
          if (match?.meeting_date) setMeetingDate(match.meeting_date);
        }
      } catch (e) {
        console.warn('Failed to load NPX meeting dates:', e);
      }
    };
    loadMeetingYears();
  }, [companyGlobalSearchId]);


  const getDependentDropdown = async (
    overrideCategories?: string[],
    overrideInstitution?: string | null
  ) => {
    // Prepare parameters for API call
    const currentMeetingDate = meetingDate; // Use state — always correct for the current company
    // Source of truth: read latest from RHF
    const catsFromForm = overrideCategories ?? watch('vote_category');
    const normalizedCats = Array.isArray(catsFromForm)
      ? catsFromForm
      : (catsFromForm ? [catsFromForm] : []);
    const catsFromLocal = Array.isArray(dropdownValues?.vote_category)
      ? dropdownValues.vote_category
      : (dropdownValues?.vote_category ? [dropdownValues.vote_category] : []);
    const effectiveCats = normalizedCats.length > 0 ? normalizedCats : catsFromLocal;
    const hasCategory = effectiveCats.length > 0;
    const effectiveInstitution =
      overrideInstitution !== undefined ? overrideInstitution : dropdownValues?.institution_name;
    const isCategoryOnly =
      hasCategory &&
      !effectiveInstitution &&
      !(Array.isArray(dropdownValues?.fund_name) && dropdownValues.fund_name.length > 0);

    const baseParams: any = {
      global_search: companyGlobalSearchName,
      year: year,
    };

    const meetingDatePart =
      currentMeetingDate && !isCategoryOnly
        ? { meeting_date: formatMeetingDate(currentMeetingDate) }
        : {};

    const institutionPart =
      effectiveInstitution
        ? {
            institution_name: Array.isArray(effectiveInstitution)
              ? effectiveInstitution
              : [effectiveInstitution],
          }
        : {};

    const fundPart =
      Array.isArray(dropdownValues?.fund_name) && dropdownValues.fund_name.length > 0
        ? { fund_name: dropdownValues.fund_name }
        : {};

    const categoryPart = hasCategory
      ? { vote_category: effectiveCats }
      : {};

    // If category-only, omit meeting_date and institution/fund; otherwise include normally
    const paramFilter = {
      ...baseParams,
      ...meetingDatePart,
      ...institutionPart,
      ...fundPart,
      ...categoryPart,
    };

    try {
      setGetDynamicDropdownLoader(true);
      console.log("getDependentDropdown params:", paramFilter);
      const res = await dashboardService.getDynamicNPXDropdownValues(
        paramFilter
      );
      if (res.result) {
        console.log("getDependentDropdown response:", res.result);
        // Preserve currently selected vote_category values if API response doesn't include them
        const currentCats = Array.isArray(dropdownValues?.vote_category)
          ? dropdownValues.vote_category
          : dropdownValues?.vote_category
          ? [dropdownValues.vote_category]
          : [];
        const nextResult = { ...res.result } as any;
        if (currentCats.length > 0) {
          const allowed = new Set(nextResult.vote_category || []);
          const filtered = currentCats.filter((c: string) => allowed.has(c));
          nextResult.vote_category = Array.from(allowed);
          // Update the form to the filtered list so UI doesn't show mismatched tokens
          setValue('vote_category', filtered as any);
        }
        // Still using the same result structure for dropdown options
        setApiDependentDropdownOptions(nextResult);
        // No extra re-apply needed; form state was already normalized above

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
          year: year || '2024',
          ...(meetingDate && { meeting_date: formatMeetingDate(meetingDate) })
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

  // When company or selected year changes, ensure meeting_date is set consistently and fetch institutions for that date
  useEffect(() => {
    if (!companyGlobalSearchName || !year) return;
    // Find the meeting date for the selected year from cached meetings
    const match = (Array.isArray(npxMeetings) ? npxMeetings : []).find((x: any) => String(x?.year) === String(year));
    const dateForYear = match?.meeting_date ? formatMeetingDate(match.meeting_date) : '';

    if (dateForYear) {
      // Set meeting date and URL param
      if (meetingDate !== dateForYear) setMeetingDate(dateForYear);
      setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.set('meeting_date', dateForYear);
        return params;
      });
    }

    // If we have a cached filter snapshot for this exact company/year (and this isn't a
    // hard refresh), restore filters + data from it instead of auto-selecting a default.
    const cache = cachedFiltersRef.current;
    const cacheMatches =
      cache &&
      cache.companyGlobalSearchName === companyGlobalSearchName &&
      String(cache.year) === String(year);
    if (cacheMatches) {
      cachedFiltersRef.current = null; // consume once
      restoreFiltersFromCache(cache, dateForYear);
      return;
    }

    if (dateForYear) {
      // Make a single scoped call that includes meeting_date and default institution
      fetchAllInstitutions(savedInstitutionRef.current, dateForYear);
    } else {
      // If not found, clear and let API determine default
      fetchAllInstitutions(savedInstitutionRef.current, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyGlobalSearchName, year]);

  // SINGLE source of truth for dependent-dropdown fetching.
  // Consolidates fund/category/institution-cleared triggers into one deterministic effect
  // that always reads dropdownValues AFTER it has committed (no stale-closure races).
  // Institution SELECTION is handled separately by getFundNameDependentDropdown (richer response,
  // sets meeting_date, fund options, etc.), so this effect intentionally skips firing when an
  // institution is present to avoid duplicate/conflicting calls.
  useEffect(() => {
    if (allInstitutions.length === 0) return;

    const hasInstitution = !!dropdownValues?.institution_name;
    if (hasInstitution) return; // handled by getFundNameDependentDropdown instead

    const cats = Array.isArray(dropdownValues?.vote_category)
      ? dropdownValues.vote_category
      : (dropdownValues?.vote_category ? [dropdownValues.vote_category] : []);
    const hasCategory = cats.length > 0;
    const hasFund = Array.isArray(dropdownValues?.fund_name) && dropdownValues.fund_name.length > 0;

    if (hasCategory || hasFund) {
      // Explicitly pass fresh values (post-commit) to guarantee correct params every time
      getDependentDropdown(hasCategory ? cats : undefined, null);
    }
  }, [dropdownValues.institution_name, dropdownValues.fund_name, dropdownValues.vote_category, allInstitutions.length]);

  useEffect(() => {
    // Only handle pagination changes, not initial data loading
    if (allApplyFilter && Object.keys(allApplyFilter).length > 0 && page > 1) {
      const currentMeetingDate = meetingDate; // Use state — always correct for the current company
      hasTriggeredStatsRequestRef.current = true;
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
      // Immediately refetch institutions and auto-select the first for the active meeting date
      const md = meetingDateFromURL || meetingDate || '';
      fetchAllInstitutions(savedInstitutionRef.current, md);
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
      setDropdownValues(prev => ({
        ...prev,
        vote_category: updatedFilters.vote_category || []
      }));
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
    hasTriggeredStatsRequestRef.current = true;
    setInitialLoading(true);
    dispatch(
      fetchNpxProxyDashboard(
        createDynamicURL(`${baseURL}/npx/detail/`, updatedFilters, undefined, 1)
      )
    );
  };

  const onSubmit = async (npxFilter: any) => {
    console.log("=== DEBUG: onSubmit called ===");
    console.log("Raw form data:", npxFilter);

    const currentMeetingDate = meetingDate; // Use state — always correct for the current company
    const filterObj = {
      global_search: companyGlobalSearchName,
      ...(npxFilter?.institution_name?.label && npxFilter?.institution_name?.label !== "Select"
        ? { institution_name: [npxFilter.institution_name.label] }
        : {}),
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
      ...(filterObj.institution_name ? { institution_name: filterObj.institution_name } : {}),
      fund_name: filterObj.fund_name,
      proposal: filterObj.proposal,
      vote: filterObj.vote,
      vote_category: filterObj.vote_category,
      keyword: filterObj.keyword,
    } as any;

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

    // Clear the cached filter snapshot so it isn't restored on next visit
    try { localStorage.removeItem(NPX_DETAILS_CACHE_KEY); } catch { /* no-op */ }

    // Reset pagination and fetch fresh data with just basic parameters
    setInitialLoading(true);
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

  useEffect(() => {
    if (hasTriggeredStatsRequestRef.current && !npxProxyLoading) {
      setInitialLoading(false);
    }
  }, [npxProxyLoading]);

  return (
    <>
      <div className="p-3 mt-1 box">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {selectedChipFilters?.map((chip, idx) => (
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
          <div className="ml-auto flex items-center gap-3">
            {npxProxyDetails?.length > 0 && (
              <h2 className="text-xs font-semibold text-slate-500">
                Count: {totalNPXCount.toLocaleString()}
              </h2>
            )}
            <Popover className="inline-block">
              {({ close }) => (
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
              )}
            </Popover>
          </div>
        </div>

        {/* Filter Card directly below heading, above pills and data */}
        {isFilterCollapse && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 transition-all duration-300">
            {/* Filter Content */}
            <div className="flex justify-between items-center mb-4">
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
                    <FaUniversity className="text-gray-400" /> Institution
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
                            // Clear fund dropdown when institution is cleared.
                            // Do NOT clear apiDependentDropdownOptions here — the consolidated
                            // effect below (watching dropdownValues) will re-fetch dependent
                            // dropdowns with category-only params if a Category is selected.
                            setShowFundName(false);
                            setApiFundNameDropdown({ fund_name: [] });
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
                        value={Array.isArray(field.value) ? field.value : (field.value ? [field.value] : [])}
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

                          const normalized = Array.isArray(selectedValues)
                            ? selectedValues
                            : (selectedValues ? [selectedValues] : []);
                          field.onChange(normalized);
                          handleDropdownChange('vote_category', normalized);
                          // Fetching is handled by the consolidated effect that watches
                          // dropdownValues.vote_category, avoiding duplicate/racing calls.
                        }}
                        options={{
                          placeholder: "Select Vote Category",
                          // Do not allow creating arbitrary values; must pick from API
                          create: false,
                          persist: false
                        }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          [...(apiDependentDropdownOptions?.vote_category || [])]
                            .sort((a: string, b: string) => a.localeCompare(b))
                            .map((vote_category: any) => (
                              <option key={vote_category} value={vote_category}>
                                {convertToTitleCase(vote_category)}
                              </option>
                            ))
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
                      <Tippy content="Keyword search applies on proposal text" options={{ theme: "light" }}>
                        <span>
                          <Lucide icon="Info" className="w-4 h-4 text-blue-600 cursor-pointer" />
                        </span>
                      </Tippy>
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
