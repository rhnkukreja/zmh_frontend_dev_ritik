import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import TableWrapper from "@/components/TableWrapper";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import Litepicker from "@/components/Base/Litepicker";
import { dashboardService } from "@/services/dashboard";
import { axiosInstance } from "@/services";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { fetchNpxProposalVotingStats } from "@/stores/dashboardSlice";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import CompanySelect from "@/components/ReactSelectAsync";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import CreatableInputSelect from "@/components/Base/CreatableInputSelect";
import VoteCategoryTaxonomySelect from "@/components/NPX/VoteCategoryTaxonomySelect";
import LoadingIcon from "@/components/Base/LoadingIcon";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { MdOutlineClear } from "react-icons/md";
import { toast } from "react-toastify";
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaTags, FaLayerGroup, FaListUl } from "react-icons/fa";
import CPagination from "@/components/Pagination";
import clsx from "clsx";

interface FilterState {
  investor_company?: string[];
  institution_id?: Array<string | number>;
  company_name?: string[];
  company_ids?: Array<string | number>;
  fund_name?: string[];
  proposal?: string[];
  vote?: string[];
  vote_category?: string[];
  keyword?: string[];
  meeting_date?: string;
  date_range?: string;
  year?: string[];
  country?: string[];
  index?: string[];
}

const toOptions = (arr: any[]) =>
  Array.isArray(arr)
    ? arr
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .map((v) => ({ value: String(v), label: String(v) }))
    : [];

const uniqueStrings = (values: any[]) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .map((v) => String(v))
    )
  );

const sortYearsDesc = (values: any[]) =>
  uniqueStrings(values).sort((a, b) => Number(b) - Number(a));

const formatValue = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number" && !Number.isInteger(value)) return value.toFixed(2);
  return String(value);
};

const formatNumberWithCommas = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const DEFAULT_INVESTOR = "BlackRock, Inc.";
// Default institution used when there's no cache and the user hasn't picked
// one yet — matches the default institution used elsewhere (Executive
// Compensation, Proxy Contest AI). The dropdown endpoint is queried by ID;
// the name is only used as a UI fallback label if the API doesn't echo one back.
const DEFAULT_NPX_INSTITUTION_ID = 1345;
const DEFAULT_NPX_INSTITUTION = "BlackRock Active Investment Stewardship (BAIS)";
const DEFAULT_NPX_INDEX = "S&P 500";
const DEFAULT_COMPANY_SEARCH_COUNTRIES = ["USA", "Canada"];
const COMPANY_SEARCH_FILTERS = { country: DEFAULT_COMPANY_SEARCH_COUNTRIES };
const NPX_FILTER_CACHE_KEY = "npxProposalVotingFilters";
// Institution/Company are staged selections — they only commit into `filters`
// (and the cache above) once the user clicks Apply, so every click doesn't
// fire an API call. But that means an in-progress (not-yet-applied) pick was
// never persisted, so navigating away and back before clicking Apply showed
// the dropdown reverting to blank/default. This separate key persists the
// staged selection itself, independent of whether it's been applied yet.
const NPX_DRAFT_SELECTION_CACHE_KEY = "npxProposalVotingDraftSelection";

type DraftSelection = {
  investor_company: string[];
  institution_id: Array<string | number>;
  company_name: string[];
  company_ids: Array<string | number>;
};

const readCachedFilters = (): FilterState | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(NPX_FILTER_CACHE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const readCachedDraftSelection = (): DraftSelection | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(NPX_DRAFT_SELECTION_CACHE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const NpxInstitutionView = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { companyGlobalSearchTicker } = useAppSelector(
    (state) => state.authentiction
  );
  const { npxProposalVotingStats, npxProposalVotingStatsLoading } = useAppSelector(
    (state) => state.dashboard
  );

  // Filters stay cached (localStorage) across page reloads and in-app navigation —
  // they're only cleared on logout, so a new session/user always starts from the
  // default single-institution bootstrap instead of a previous user's filters.
  const [filters, setFilters] = useState<FilterState>({
    ...(() => {
      const cachedFilters = readCachedFilters();
      if (cachedFilters) {
        return {
          ...cachedFilters,
          // Older caches predate the Index filter — default to S&P 500, but
          // respect an explicitly saved (even empty) selection.
          index: cachedFilters.index !== undefined ? cachedFilters.index : [DEFAULT_NPX_INDEX],
          year: searchParams.get("year")
            ? [searchParams.get("year") as string]
            : cachedFilters.year || [],
        };
      }

      return {
        investor_company: [],
        index: [DEFAULT_NPX_INDEX],
        year: searchParams.get("year") ? [searchParams.get("year") as string] : [],
      };
    })(),
  });
  const [dropdowns, setDropdowns] = useState<any>({});
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [pageSize] = useState(25);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [showFundName, setShowFundName] = useState(false);
  const [getFundNameDropdownLoader, setGetFundNameDropdownLoader] = useState(false);
  const [apiFundNameDropdown, setApiFundNameDropdown] = useState<any>({ fund_name: [] });
  const [isFilterCollapse, setIsFilterCollapse] = useState(false);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [prevYearSelection, setPrevYearSelection] = useState<string[]>([]);
  const [prevDateRangeSelection, setPrevDateRangeSelection] = useState("");
  const [showInstitutionFirstMessage, setShowInstitutionFirstMessage] = useState(false);
  // Seed the staged selections from the draft cache first (an in-progress
  // pick that was never Applied), falling back to the already-applied filters.
  const draftSelectionRef = useRef<DraftSelection | null>(null);
  if (draftSelectionRef.current === null) {
    draftSelectionRef.current = readCachedDraftSelection() || {
      investor_company: [],
      institution_id: [],
      company_name: [],
      company_ids: [],
    };
  }
  const [companySelection, setCompanySelection] = useState<{ company_name: string[]; company_ids: Array<string | number> }>({
    company_name: draftSelectionRef.current.company_name?.length ? draftSelectionRef.current.company_name : (filters.company_name || []),
    company_ids: draftSelectionRef.current.company_ids?.length ? draftSelectionRef.current.company_ids : (filters.company_ids || []),
  });
  const [institutionSelection, setInstitutionSelection] = useState<string[]>(
    draftSelectionRef.current.investor_company?.length ? draftSelectionRef.current.investor_company : (filters.investor_company || [])
  );
  // Staged institution ids (selected value is institution_id, not the name)
  const [institutionIdSelection, setInstitutionIdSelection] = useState<Array<string | number>>(
    draftSelectionRef.current.institution_id?.length ? draftSelectionRef.current.institution_id : (filters.institution_id || [])
  );
  // Maps institution_name -> institution_id from org_institution responses
  const institutionIdMapRef = useRef<Map<string, string | number>>(new Map());
  const [summaryLoading, setSummaryLoading] = useState(true);
  const hasBootstrappedInstitutionRef = useRef(false);
  const skipNextDropdownEffectRef = useRef(false);
  const lastStatsSignatureRef = useRef<string>("");
  const statsLoadStartedRef = useRef(false);
  const hasSelectedInstitution = Boolean(filters.investor_company && filters.investor_company.length > 0 && filters.investor_company[0]);
  const isInstitutionSelectionPending = useMemo(() => {
    const draft = institutionSelection?.[0] || "";
    const committed = filters.investor_company?.[0] || "";
    return draft !== committed;
  }, [institutionSelection, filters.investor_company]);

  // On a fresh mount, the staged selection (restored from the draft cache) can
  // disagree with the already-applied institution (restored from the filter
  // cache) — e.g. the user picked a different institution but navigated away
  // or refreshed before clicking Apply. `isInstitutionSelectionPending` then
  // starts out permanently `true`, which blocks the dropdown/stats effects
  // below forever (nothing else ever changes those two pieces of state back
  // into agreement), leaving the page stuck on the loading skeleton. Resolve
  // that once on mount by letting the already-applied institution win, so the
  // committed view always loads instead of hanging indefinitely on an
  // unresolved stale draft.
  const hasReconciledInitialSelectionRef = useRef(false);
  useEffect(() => {
    if (hasReconciledInitialSelectionRef.current) return;
    hasReconciledInitialSelectionRef.current = true;

    if (hasSelectedInstitution && isInstitutionSelectionPending) {
      setInstitutionSelection(filters.investor_company || []);
      setInstitutionIdSelection(filters.institution_id || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasBootstrappedInstitutionRef.current && !hasSelectedInstitution) return;
    localStorage.setItem(NPX_FILTER_CACHE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Persist the staged (not-necessarily-applied) selection too, so it survives
  // navigating away before clicking Apply instead of silently reverting.
  useEffect(() => {
    try {
      localStorage.setItem(
        NPX_DRAFT_SELECTION_CACHE_KEY,
        JSON.stringify({
          investor_company: institutionSelection,
          institution_id: institutionIdSelection,
          company_name: companySelection.company_name,
          company_ids: companySelection.company_ids,
        })
      );
    } catch {
      /* no-op */
    }
  }, [institutionSelection, institutionIdSelection, companySelection]);

  const viewData = useMemo(() => npxProposalVotingStats || {}, [npxProposalVotingStats]);
  const byInstitution = useMemo(() => viewData.by_institution || [], [viewData]);
  const byCompany = useMemo(() => viewData.by_company || [], [viewData]);

  const meetingDate = searchParams.get("meeting_date") || "";

  const selectedInstitution = useMemo(() => byInstitution?.[0] || {}, [byInstitution]);
  // The API can return stats for multiple selected years at once (e.g. when
  // Year filter has both 2026 and 2025 applied). Show every year the API
  // returned, newest first, instead of collapsing down to a single year.
  const summaryYearKeys = useMemo(
    () => (selectedInstitution?.years ? sortYearsDesc(Object.keys(selectedInstitution.years)) : []),
    [selectedInstitution]
  );

  const hasStatsData = Boolean(npxProposalVotingStats);
  const isStatsLoading = dropdownLoading || summaryLoading || npxProposalVotingStatsLoading;

  const availableDateRange = useMemo(() => {
    const range = dropdowns?.available_date_range;
    if (!range?.start_meeting || !range?.end_meeting) return null;

    const startDate = dayjs(range.start_meeting, ["DD MMM, YYYY", "D MMM, YYYY"], true);
    const endDate = dayjs(range.end_meeting, ["DD MMM, YYYY", "D MMM, YYYY"], true);

    if (!startDate.isValid() || !endDate.isValid()) return null;

    return {
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: endDate.format("YYYY-MM-DD"),
    };
  }, [dropdowns?.available_date_range]);

  const datePickerBounds = useMemo(() => {
    const fallbackStart = availableDateRange?.startDate || "2023-01-01";
    const fallbackEnd = availableDateRange?.endDate || new Date().toISOString().split("T")[0];

    return {
      minYear: Number(fallbackStart.slice(0, 4)),
      maxYear: Number(fallbackEnd.slice(0, 4)),
      startDate: fallbackStart,
      endDate: fallbackEnd,
    };
  }, [availableDateRange]);

  // Navigate the calendar to the latest/selected year exactly when it opens,
  // without affecting the currently selected/displayed date range value.
  const handleDateRangePickerShow = (picker: any) => {
    const targetYear = datePickerBounds.endDate.slice(0, 4);
    if (!targetYear) return;
    try {
      picker.gotoDate(new Date(`${targetYear}-01-01`), 0);
      picker.gotoDate(new Date(`${targetYear}-02-01`), 1);
    } catch (err) {
      console.error("[NpxInstitutionView] Failed to navigate date picker:", err);
    }
  };

  const tableRows = useMemo(() => {
    const rows: any[] = [];
    byCompany.forEach((yearBlock: any) => {
      const blockYear = yearBlock?.year;
      (yearBlock?.companies || []).forEach((company: any) => {
        (company?.sample_proposals || []).forEach((proposal: any) => {
          rows.push({
            year: blockYear,
            company_id: company?.company_id,
            company_name: company?.company_name,
            meeting_date: company?.meeting_date,
            meeting_type: company?.meeting_type,
            total_proposals: company?.total_proposals,
            ...proposal,
          });
        });
      });
    });
    return rows;
  }, [byCompany]);

  const proposalSections = useMemo(() => {
    const sections: Array<{
      key: string;
      year: string;
      company: any;
    }> = [];

    byCompany.forEach((yearBlock: any) => {
      const blockYear = String(yearBlock?.year || "");
      (yearBlock?.companies || []).forEach((company: any, companyIndex: number) => {
        sections.push({
          key: `${blockYear}-${company?.company_id ?? companyIndex}`,
          year: blockYear,
          company,
        });
      });
    });

    return sections;
  }, [byCompany]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const areAllGroupsExpanded = () =>
    proposalSections.length > 0 && proposalSections.every((section) => openGroups[section.key]);

  const expandAllGroups = () => {
    const shouldExpand = !areAllGroupsExpanded();
    const nextOpenGroups: { [key: string]: boolean } = {};
    proposalSections.forEach((section) => {
      nextOpenGroups[section.key] = shouldExpand;
    });
    setOpenGroups(nextOpenGroups);
  };

  // Merge org_institution [{institution_id, institution_name}] entries into the id map
  const mergeOrgInstitutions = (list: any[]) => {
    (list || []).forEach((o: any) => {
      if (o?.institution_name && o?.institution_id != null) {
        institutionIdMapRef.current.set(o.institution_name, o.institution_id);
      }
    });
  };

  // Resolve institution ids for the selected names — from explicit ids first,
  // then the org_institution name->id map.
  const resolveInstitutionIds = (names: string[] = [], ids?: Array<string | number>) =>
    (ids && ids.length === names.length && ids.length > 0)
      ? ids
      : names
        .map((n) => institutionIdMapRef.current.get(n))
        .filter((id): id is string | number => id != null);

  // Always send institution_id — mapped institutions resolve to their id,
  // unmapped fund-name selections keep the name inside institution_id.
  const institutionParam = (names: string[] = [], ids?: Array<string | number>) => ({
    institution_id: names.map((n, i) =>
      (ids && ids[i] != null) ? ids[i] : (institutionIdMapRef.current.get(n) ?? n)
    ),
  });


  const loadDropdowns = async (selectedInstitution?: string[], filterOverride?: FilterState) => {
    const activeFilters = filterOverride ?? filters;
    const resolvedInstitution = selectedInstitution && selectedInstitution.length > 0
      ? selectedInstitution
      : (activeFilters.investor_company && activeFilters.investor_company.length > 0 ? activeFilters.investor_company : []);

    if (!resolvedInstitution.length) {
      setDropdowns({});
      setShowFundName(false);
      setApiFundNameDropdown({ fund_name: [] });
      setDropdownLoading(false);
      return;
    }

    setDropdownLoading(true);
    try {
      const params: any = { ...institutionParam(resolvedInstitution, activeFilters.institution_id) };
      if (activeFilters.company_ids && activeFilters.company_ids.length > 0) params.company_ids = activeFilters.company_ids;
      if (activeFilters.year && activeFilters.year.length > 0) params.year = activeFilters.year;
      const normalizedDateRange = typeof activeFilters.date_range === "string" ? activeFilters.date_range : "";
      if (normalizedDateRange.trim()) params.date_range = normalizedDateRange;
      if (activeFilters.index && activeFilters.index.length > 0) params.index = activeFilters.index;
      if (meetingDate) params.meeting_date = meetingDate;
      const response = await dashboardService.getNpxProposalVotingDropdown(params);
      if (response?.result) {
        mergeOrgInstitutions(response.result.org_institution);
        // Backfill institution_id once org_institution resolves the selected
        // names — cached filters predate ids and the stats calls need them.
        const selectedNames = activeFilters.investor_company || [];
        if (selectedNames.length > 0 && !(activeFilters.institution_id || []).length) {
          const backfilledIds = resolveInstitutionIds(selectedNames);
          if (backfilledIds.length === selectedNames.length && backfilledIds.length > 0) {
            setFilters((prev) => ({ ...prev, institution_id: backfilledIds }));
            setInstitutionIdSelection(backfilledIds);
          }
        }
        setDropdowns(response.result);

        const availableYears = sortYearsDesc(response.result.year || []);
        const fallbackYear = availableYears[0] || searchParams.get("year") || new Date().getFullYear().toString();
        const hasDateRange = Boolean(normalizedDateRange.trim());
        if (!hasDateRange && (!activeFilters.year || activeFilters.year.length === 0) && fallbackYear) {
          setFilters((prev) => ({
            ...prev,
            year: [fallbackYear],
          }));
        }

        const fundData = Array.isArray(response.result?.fund_name) ? response.result.fund_name : [];
        const isConnectedInstitution = response.result?.is_institution !== false;
        setApiFundNameDropdown({
          ...response.result,
          fund_name: fundData,
        });
        setShowFundName(isConnectedInstitution && fundData.length > 0);
        if (!isConnectedInstitution || fundData.length === 0) {
          setFilters((prev) => ({
            ...prev,
            fund_name: [],
          }));
        }
      }
    } catch (err) {
      console.error("[NpxInstitutionView] loadDropdowns error:", err);
    } finally {
      setDropdownLoading(false);
    }
  };

  useEffect(() => {
    // Also skip if there's already a staged (not-yet-applied) institution pick
    // restored from the draft cache — don't clobber it with the default.
    if (hasSelectedInstitution || hasBootstrappedInstitutionRef.current || institutionSelection.length > 0) {
      return;
    }

    const bootstrapDefaultInstitution = async () => {
      try {
        setDropdownLoading(true);

        const fallbackYear =
          filters.year && filters.year.length > 0
            ? filters.year
            : [searchParams.get("year") || new Date().getFullYear().toString()];

        // Always request a specific default institution (BlackRock Active
        // Investment Stewardship (BAIS), id 1345) by ID rather than an
        // unscoped call — the dropdown endpoint doesn't reliably return a
        // browsable institution list without a filter, so there's nothing to
        // "guess" a default from otherwise.
        const params: any = {
          year: fallbackYear,
          institution_id: [DEFAULT_NPX_INSTITUTION_ID],
          index: [DEFAULT_NPX_INDEX],
        };

        if (meetingDate) params.meeting_date = meetingDate;

        const response = await dashboardService.getNpxProposalVotingDropdown(params);

        hasBootstrappedInstitutionRef.current = true;

        if (!response?.result) {
          return;
        }

        mergeOrgInstitutions(response.result.org_institution);
        setDropdowns(response.result);

        const availableYears = sortYearsDesc(response.result.year || []);
        const resolvedYear = fallbackYear.length > 0
          ? fallbackYear
          : [availableYears[0] || new Date().getFullYear().toString()];

        const fundData = Array.isArray(response.result?.fund_name) ? response.result.fund_name : [];
        const isConnectedInstitution = response.result?.is_institution !== false;

        setApiFundNameDropdown({
          ...response.result,
          fund_name: fundData,
        });
        setShowFundName(isConnectedInstitution && fundData.length > 0);

        // The rest of this view (filters, dropdown/stats calls) works off the
        // institution name, so resolve it from the API response if it echoed
        // one back; otherwise fall back to the known label for this ID.
        const resolvedInstitutionName =
          response.result?.institution_name ||
          (Array.isArray(response.result?.institution) ? response.result.institution[0] : null) ||
          DEFAULT_NPX_INSTITUTION;

        const resolvedInstitutionId =
          response.result?.institution_id ??
          institutionIdMapRef.current.get(resolvedInstitutionName) ??
          DEFAULT_NPX_INSTITUTION_ID;

        setInstitutionSelection([resolvedInstitutionName]);
        setInstitutionIdSelection([resolvedInstitutionId]);
        setFilters((prev) => ({
          ...prev,
          investor_company: [resolvedInstitutionName],
          institution_id: [resolvedInstitutionId],
          fund_name: [],
          ...((!prev.year || prev.year.length === 0) && resolvedYear.length > 0 ? { year: resolvedYear } : {}),
        }));
        setShowInstitutionFirstMessage(false);
      } catch (err) {
        console.error("[NpxInstitutionView] bootstrapDefaultInstitution error:", err);
      } finally {
        setDropdownLoading(false);
      }
    };

    bootstrapDefaultInstitution();
  }, [filters.year, hasSelectedInstitution, meetingDate, searchParams]);

  const loadStats = async (
    page = 1,
    companyOverride?: { company_name: string[]; company_ids: Array<string | number> },
    filterOverride?: FilterState
  ) => {
    let activeFilters = filterOverride ?? filters;
    const hasInstitutionSelection = Boolean(activeFilters.investor_company && activeFilters.investor_company.length > 0 && activeFilters.investor_company[0]);
    if (!hasInstitutionSelection) {
      return;
    }

    // Backfill institution_id from the org_institution map if the applied
    // filters only carry names (e.g. older cached filters).
    if (!(activeFilters.institution_id || []).length) {
      const resolvedIds = resolveInstitutionIds(activeFilters.investor_company || []);
      if (resolvedIds.length === (activeFilters.investor_company || []).length && resolvedIds.length > 0) {
        activeFilters = { ...activeFilters, institution_id: resolvedIds };
        setFilters((prev) => ({ ...prev, institution_id: resolvedIds }));
        setInstitutionIdSelection(resolvedIds);
      }
    }

    const investor = activeFilters.investor_company?.[0] || DEFAULT_INVESTOR;
    const normalizedDateRange = typeof activeFilters.date_range === "string" ? activeFilters.date_range : "";
    const hasDateRange = Boolean(normalizedDateRange.trim());
    const resolvedYear = !hasDateRange && activeFilters.year && activeFilters.year.length > 0
      ? activeFilters.year
      : [sortYearsDesc(dropdowns.year || [])[0] || searchParams.get("year") || new Date().getFullYear().toString()];
    const { company_name: _companyNames, investor_company: _investorCompany, institution_id: _institutionIds, ...restFilters } = activeFilters;
    const selectedCompanyIds = companyOverride?.company_ids ?? activeFilters.company_ids ?? [];
    const payload: any = {
      view: "by_institution",
      page,
      page_size: pageSize,
      ...institutionParam([investor], activeFilters.institution_id),
      ...restFilters,
      ...(selectedCompanyIds.length > 0 ? { company_ids: selectedCompanyIds } : {}),
      ...(hasDateRange ? { date_range: normalizedDateRange } : { year: resolvedYear }),
    };
    if (meetingDate) payload.meeting_date = meetingDate;
    lastStatsSignatureRef.current = JSON.stringify([
      activeFilters.investor_company,
      activeFilters.institution_id,
      activeFilters.company_ids,
      activeFilters.year,
      activeFilters.date_range,
      activeFilters.index,
      meetingDate,
    ]);
    statsLoadStartedRef.current = true;
    setSummaryLoading(true);
    dispatch(
      fetchNpxProposalVotingStats({
        view: "by_institution",
        filters: payload,
        requestKey: createDynamicURL(`/api/npx-proposal-voting-stats/`, payload),
      })
    );
  };

  useEffect(() => {
    if (isInstitutionSelectionPending) {
      return;
    }

    if (!hasSelectedInstitution) {
      setDropdowns({});
      setShowFundName(false);
      setApiFundNameDropdown({ fund_name: [] });
      setDropdownLoading(false);
      setPrevYearSelection([]);
      setPrevDateRangeSelection("");
      return;
    }

    if (skipNextDropdownEffectRef.current) {
      skipNextDropdownEffectRef.current = false;
      return;
    }

    loadDropdowns(filters.investor_company, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.year, filters.date_range, filters.investor_company, filters.company_name, filters.company_ids, filters.index, meetingDate, hasSelectedInstitution, isInstitutionSelectionPending]);

  useEffect(() => {
    if (isInstitutionSelectionPending) {
      return;
    }
    if (!hasSelectedInstitution) {
      return;
    }
    if ((!filters.year || filters.year.length === 0) && !filters.date_range) return;
    // Skip if loadStats already ran for this exact filter set (e.g. Apply
    // calls it manually — avoids a duplicate heavy request when committing
    // the staged institution flips isInstitutionSelectionPending).
    const signature = JSON.stringify([
      filters.investor_company,
      filters.institution_id,
      filters.company_ids,
      filters.year,
      filters.date_range,
      filters.index,
      meetingDate,
    ]);
    if (lastStatsSignatureRef.current === signature) return;
    loadStats(1);
    setActivePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.year, filters.date_range, filters.index, meetingDate, hasSelectedInstitution, isInstitutionSelectionPending]);

  useEffect(() => {
    if (statsLoadStartedRef.current && !npxProposalVotingStatsLoading) {
      setSummaryLoading(false);
      statsLoadStartedRef.current = false;
    }
  }, [npxProposalVotingStatsLoading]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "year" && Array.isArray(value) && value.length > 0) {
        next.date_range = "";
        setPrevYearSelection(value);
        setPrevDateRangeSelection("");
      }

      if (key === "date_range") {
        const currentYear = String(new Date().getFullYear());
        next.year = typeof value === "string" && value.trim()
          ? []
          : (prevYearSelection.length > 0 ? prevYearSelection : [currentYear]);
        setPrevDateRangeSelection(typeof value === "string" ? value : "");
        if (typeof value === "string" && value.trim()) {
          setPrevYearSelection([]);
        }
      }

      return next;
    });
  };

  const handleRemoveChip = async (key: keyof FilterState, value: string) => {
    const next: FilterState = { ...filters };
    let nextCompanySelection = {
      company_name: filters.company_name || [],
      company_ids: filters.company_ids || [],
    };

    if (key === "date_range") {
      const currentYear = String(new Date().getFullYear());
      next.date_range = "";
      const fallbackYear =
        prevYearSelection.length > 0
          ? prevYearSelection
          : (next.year && next.year.length > 0)
            ? next.year
            : [sortYearsDesc(dropdowns.year || [])[0] || currentYear];

      next.year = fallbackYear;
      setPrevDateRangeSelection("");
    } else if (key === "company_name") {
      const companyNames = next.company_name || [];
      const removeIndex = companyNames.findIndex((name) => name === value);
      const updatedCompanyNames = companyNames.filter((name) => name !== value);
      const updatedCompanyIds = Array.isArray(next.company_ids)
        ? next.company_ids.filter((_, index) => index !== removeIndex)
        : [];
      next.company_name = updatedCompanyNames;
      next.company_ids = updatedCompanyIds;
      nextCompanySelection = {
        company_name: updatedCompanyNames,
        company_ids: updatedCompanyIds,
      };
      setCompanySelection(nextCompanySelection);
    } else if (key === "year" || key === "investor_company" || key === "fund_name" || key === "proposal" || key === "vote" || key === "vote_category" || key === "keyword" || key === "index") {
      next[key] = (next[key] as string[] | undefined)?.filter((v) => v !== value) || [];
      if (key === "investor_company") {
        setInstitutionSelection(next.investor_company || []);
        next.institution_id = [];
        setInstitutionIdSelection([]);
      }
    }

    setFilters(next);
    setActivePage(1);
    skipNextDropdownEffectRef.current = true;
    await loadDropdowns(next.investor_company, next);
    loadStats(1, nextCompanySelection, next);
  };

  const handleInstitutionChange = async (selected: any) => {
    const institutionValue = selected?.label ? String(selected.label) : "";
    // The option value carries institution_id for mapped institutions; fall
    // back to the id map for values that are still plain names.
    const rawId = selected?.value;
    const resolvedId = institutionValue
      ? (rawId !== undefined && rawId !== institutionValue
        ? rawId
        : institutionIdMapRef.current.get(institutionValue))
      : undefined;
    setShowInstitutionFirstMessage(false);
    setInstitutionSelection(institutionValue ? [institutionValue] : []);
    setInstitutionIdSelection(institutionValue && resolvedId !== undefined ? [resolvedId] : []);
    setShowFundName(false);
    setApiFundNameDropdown({ fund_name: [] });
  };

  const handleCompanyChange = (selected: any) => {
    const selectedOptions = Array.isArray(selected)
      ? selected
      : selected
        ? [selected]
        : [];

    const companyNames = selectedOptions
      .map((option: any) => String(option?.label || option?.company?.name || option?.value || ""))
      .filter(Boolean);

    const companyIds = selectedOptions
      .map((option: any) => {
        const rawValue = option?.value ?? option?.company?.id;
        const numericValue = Number(rawValue);
        return Number.isNaN(numericValue) ? rawValue : numericValue;
      })
      .filter((value: any) => value !== null && value !== undefined && value !== "");

    setCompanySelection({
      company_name: companyNames,
      company_ids: companyIds,
    });
  };

  const handleApply = async () => {
    if (!hasSelectedInstitution) {
      setShowInstitutionFirstMessage(true);
      return;
    }

    const appliedCompanySelection = {
      company_name: companySelection.company_name,
      company_ids: companySelection.company_ids,
    };
    const nextFilters: FilterState = {
      ...filters,
      investor_company: institutionSelection,
      institution_id: institutionIdSelection,
      company_name: appliedCompanySelection.company_name,
      company_ids: appliedCompanySelection.company_ids,
    };

    setShowInstitutionFirstMessage(false);
    setFilters(nextFilters);
    setActivePage(1);
    skipNextDropdownEffectRef.current = true;
    await loadDropdowns(nextFilters.investor_company, nextFilters);
    loadStats(1, appliedCompanySelection, nextFilters);
  };

  const handleClear = () => {
    const fallbackYear = sortYearsDesc(dropdowns.year || [])[0] || new Date().getFullYear().toString();
    setFilters({ investor_company: [], institution_id: [], company_name: [], company_ids: [], year: [fallbackYear], fund_name: [], date_range: "", index: [DEFAULT_NPX_INDEX] });
    setInstitutionSelection([]);
    setInstitutionIdSelection([]);
    setCompanySelection({ company_name: [], company_ids: [] });
    setShowFundName(false);
    setApiFundNameDropdown({ fund_name: [] });
    setPrevYearSelection([]);
    setPrevDateRangeSelection("");
    setShowInstitutionFirstMessage(false);
    setActivePage(1);
    localStorage.removeItem(NPX_FILTER_CACHE_KEY);
    localStorage.removeItem(NPX_DRAFT_SELECTION_CACHE_KEY);
  };

  const handleDownload = () => {
    if (!hasSelectedInstitution) return;
    const { company_name: _companyNames, investor_company: _investorCompany, institution_id: _institutionIds, ...restFilters } = filters;
    const params: any = {
      view: "by_institution",
      download: true,
      ...institutionParam(filters.investor_company || [], filters.institution_id),
      ...restFilters,
      ...(filters.company_ids && filters.company_ids.length > 0 ? { company_ids: filters.company_ids } : {}),
    };
    if (filters.date_range && filters.date_range.trim()) {
      delete params.year;
    } else {
      params.year = filters.year && filters.year.length > 0
        ? filters.year
        : [sortYearsDesc(dropdowns.year || [])[0] || new Date().getFullYear().toString()];
    }
    if (meetingDate) params.meeting_date = meetingDate;

    const downloadUrl = createDynamicURL(`${baseURL}/api/npx-proposal-voting-stats/`, params);
    const fileName = `NPX_Proposal_Voting_Stats_${dayjs().format("YYYY-MM-DD")}.xlsx`;

    setDownloadLoading(true);
    axiosInstance
      .get(downloadUrl, { responseType: "blob", timeout: 120000 })
      .then((response) => {
        const blob = response.data;
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      })
      .catch((error) => {
        console.error("Error downloading NPX proposal voting stats:", error);
        const status = error?.response?.status;
        const isTimeout = String(error?.message || "").toLowerCase().includes("timeout");
        const message =
          status === 413 || status === 504 || isTimeout
            ? "Export is too large or timed out. Please narrow the filters and try again."
            : "Failed to download NPX Proposal Voting Stats. Please try again or narrow the filters.";
        toast.error(message, {
          autoClose: 10000,
          pauseOnHover: true,
        });
      })
      .finally(() => {
        setDownloadLoading(false);
      });
  };

  const totalPages = useMemo(() => viewData.pagination?.total_pages || 1, [viewData]);
  const yearOptions = useMemo(() => toOptions(sortYearsDesc(dropdowns.year || [])), [dropdowns.year]);
  const defaultYear = useMemo(
    () => yearOptions[0]?.value || filters.year?.[0] || searchParams.get("year") || new Date().getFullYear().toString(),
    [filters.year, searchParams, yearOptions]
  );

  const fundOptions = useMemo(
    () => toOptions(uniqueStrings(apiFundNameDropdown.fund_name || dropdowns.fund_name || [])),
    [apiFundNameDropdown.fund_name, dropdowns.fund_name]
  );
  const voteOptions = useMemo(() => toOptions(uniqueStrings(dropdowns.vote || [])), [dropdowns.vote]);
  const indexOptions = useMemo(() => toOptions(uniqueStrings(dropdowns.index || [])), [dropdowns.index]);
  const keywordOptions = useMemo(
    () => toOptions(uniqueStrings(dropdowns.synonyms || dropdowns.keyword || [])),
    [dropdowns.synonyms, dropdowns.keyword]
  );

  const selectedInstitutionValue = useMemo(
    () => {
      const selected = institutionSelection?.[0];
      if (!selected) return null;
      const selectedId = institutionIdSelection?.[0] ?? institutionIdMapRef.current.get(selected);
      return { value: selectedId ?? selected, label: selected };
    },
    [institutionSelection, institutionIdSelection]
  );

  const selectedCompanyValues = useMemo(
    () =>
      (companySelection.company_name || []).map((name, index) => ({
        label: name,
        value: companySelection.company_ids?.[index] ?? name,
      })),
    [companySelection.company_name, companySelection.company_ids]
  );

  const filterChips = useMemo(() => {
    const chips: Array<{ label: string; value: string; key: keyof FilterState | null }> = [
      ...(filters.investor_company || []).map((value) => ({ label: "Institution", value, key: "investor_company" as keyof FilterState })),
      ...(filters.company_name || []).map((value) => ({ label: "Company", value, key: "company_name" as keyof FilterState })),
      ...(filters.fund_name || []).map((value) => ({ label: "Fund", value, key: "fund_name" as keyof FilterState })),
      ...(filters.date_range ? [{ label: "Date Range", value: filters.date_range, key: "date_range" as keyof FilterState }] : []),
      ...(filters.date_range ? [] : (filters.year || []).map((value) => ({ label: "Year", value, key: "year" as keyof FilterState }))),
      ...(filters.vote || []).map((value) => ({ label: "Vote", value, key: "vote" as keyof FilterState })),
      ...(filters.vote_category || []).map((value) => ({ label: "Vote Category", value, key: "vote_category" as keyof FilterState })),
      ...(filters.keyword || []).map((value) => ({ label: "Keyword", value, key: "keyword" as keyof FilterState })),
      ...(filters.index || []).map((value) => ({ label: "Index", value, key: "index" as keyof FilterState })),
      ...(meetingDate ? [{ label: "Meeting Date", value: meetingDate, key: null }] : []),
    ];
    return chips;
  }, [filters, meetingDate]);

  const filtersLength = filterChips.length;

  const renderFilterChips = () => {
    if (!filterChips.length) return null;
    return (
      <div className="mb-4 flex flex-wrap gap-2">
        {filterChips.map((chip, index) => (
          <span
            key={`${chip.label}-${chip.value}-${index}`}
            className="flex items-center bg-primary/10 text-primary font-medium px-3 py-1 rounded-full shadow-sm transition-all hover:bg-primary/20"
          >
            {chip.label}: {chip.value}
            {chip.key ? (
              <button
                type="button"
                className="ml-2 text-primary hover:text-red-600 transition-colors"
                onClick={() => handleRemoveChip(chip.key as keyof FilterState, chip.value)}
              >
                <FaTimes className="text-xs" />
              </button>
            ) : null}
          </span>
        ))}
      </div>
    );
  };

  const renderSummaryCard = () => {
    if (!selectedInstitution) return null;

    const hasSummaryData = summaryYearKeys.some((yearKey) => {
      const stats = selectedInstitution.years?.[yearKey];
      return Boolean(
        stats &&
        (
          stats.unique_companies !== undefined ||
          stats.total_proposals !== undefined ||
          stats.for_votes !== undefined ||
          stats.split_votes !== undefined ||
          stats.against_votes !== undefined ||
          stats.withhold_votes !== undefined ||
          stats.abstain_votes !== undefined ||
          stats.aligned_with_mgmt !== undefined ||
          stats.alignment_percentage !== undefined
        )
      );
    });

    if (!hasSummaryData) {
      return (
        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 mb-8">
          <div className="bg-primary text-white px-6 py-3 rounded-t-2xl">
            <h3 className="text-base font-semibold">Summary</h3>
          </div>
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center text-slate-500">
            <FaTimes className="text-3xl text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">No summary data available</p>
            <p className="text-sm mt-1">Try changing the institution, year, or date range.</p>
          </div>
        </div>
      );
    }

    const summaryMetrics: Array<{
      label: string;
      getValue: (stats: any) => string;
    }> = [
      {
        label: "No. of unique companies",
        getValue: (stats) => formatNumberWithCommas(stats?.unique_companies),
      },
      {
        label: "No of proposals",
        getValue: (stats) => formatNumberWithCommas(stats?.total_proposals),
      },
      {
        label: "No. of FOR votes",
        getValue: (stats) => `${formatNumberWithCommas(stats?.for_votes)} (${formatValue(stats?.for_percentage)}%)`,
      },
      {
        label: "No. of SPLIT votes",
        getValue: (stats) => `${formatNumberWithCommas(stats?.split_votes)} (${formatValue(stats?.split_percentage)}%)`,
      },
      {
        label: "No. of AGAINST votes",
        getValue: (stats) => `${formatNumberWithCommas(stats?.against_votes)} (${formatValue(stats?.against_percentage)}%)`,
      },
      {
        label: "No. of WITHHOLD votes",
        getValue: (stats) => `${formatNumberWithCommas(stats?.withhold_votes)} (${formatValue(stats?.withhold_percentage)}%)`,
      },
      {
        label: "No. of Abstain votes",
        getValue: (stats) => `${formatNumberWithCommas(stats?.abstain_votes)} (${formatValue(stats?.abstain_percentage)}%)`,
      },
    ];

    const getDateRangeLabel = (stats: any) =>
      stats?.date_range
        ? `(${stats.date_range.start_meeting || "-"} - ${stats.date_range.end_meeting || "-"})`
        : "";

    return (
      <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 mb-8">
        <table className="w-full mx-auto rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-primary text-white text-base">
              <th className="px-6 py-3 text-left font-semibold rounded-tl-2xl" rowSpan={2}>
                Summary
              </th>
              <th
                className="px-6 py-3 pb-2 text-center font-semibold rounded-tr-2xl"
                colSpan={summaryYearKeys.length}
              >
                {selectedInstitution.institution_name || "-"}
              </th>
            </tr>
            <tr className="bg-primary text-white text-base">
              {summaryYearKeys.map((yearKey) => {
                const dateRange = getDateRangeLabel(selectedInstitution.years?.[yearKey]);
                return (
                  <th key={yearKey} className="px-6 py-3 pt-0 text-center font-semibold">
                    <div>{yearKey}</div>
                    {dateRange && <div className="text-xs font-normal opacity-80 mt-0.5">{dateRange}</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="text-gray-700 text-base divide-y divide-gray-100">
            {summaryMetrics.map((metric) => (
              <tr key={metric.label}>
                <td className="px-6 py-3 font-medium">{metric.label}</td>
                {summaryYearKeys.map((yearKey) => (
                  <td key={yearKey} className="px-6 py-3 text-center">
                    {metric.getValue(selectedInstitution.years?.[yearKey])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderProposalSections = () => {
    if (!proposalSections.length) return null;

    return (
      <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
        <div className="flex justify-end gap-3 mb-4 px-4 pt-4">
          <button
            onClick={expandAllGroups}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium text-sm"
          >
            <span>{areAllGroupsExpanded() ? "Collapse All" : "Expand All"}</span>
            <Lucide icon={areAllGroupsExpanded() ? "ChevronUp" : "ChevronDown"} className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {proposalSections.map(({ company, key }) => {
            const proposals = Array.isArray(company?.sample_proposals) ? company.sample_proposals : [];
            const headerText = `${company?.meeting_date || "-"} - ${company?.company_name || "-"}${company?.meeting_type ? ` (${company.meeting_type})` : ""}`;
            const isOpen = !!openGroups[key];

            return (
              <div key={key} className="py-2">
                <div
                  className="flex flex-row justify-between items-center cursor-pointer px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 font-medium text-base"
                  onClick={() => toggleGroup(key)}
                >
                  <span className="text-gray-800">{headerText}</span>
                  <button className="text-primary hover:text-primary/80 transition-colors duration-200">
                    <Lucide icon={isOpen ? "ChevronUp" : "ChevronDown"} className="w-5 h-5" />
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-2 mb-4 bg-gray-50">
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="bg-primary text-white text-sm">
                          <th rowSpan={2} className="px-4 py-2 text-left align-middle font-semibold w-[26%] border-b border-r border-white/30">Proposal</th>
                          <th rowSpan={2} className="px-4 py-2 text-left align-middle font-semibold w-[15%] border-b border-r border-white/30">Category</th>
                          <th rowSpan={2} className="px-4 py-2 text-left align-middle font-semibold w-[17%] border-b border-r border-white/30">Fund</th>
                          <th colSpan={3} className="px-4 py-2 text-center text-sm font-semibold border-b border-r border-white/30">Details of Vote</th>
                          <th rowSpan={2} className="px-4 py-2 text-left align-middle font-semibold w-[10%] border-b border-white/30">Source</th>
                        </tr>
                        <tr className="bg-primary text-white text-sm">
                          <th className="px-4 py-2 text-left font-semibold w-[12%] border-r border-white/30">Shares Voted</th>
                          <th className="px-4 py-2 text-left font-semibold w-[8%] border-r border-white/30">Vote</th>
                          <th className="px-4 py-2 text-left font-semibold w-[12%] border-r border-white/30">For/Against Management</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                        {proposals.map((proposal: any, proposalIndex: number) => (
                          <tr key={`${company?.company_id}-${proposalIndex}`} className="hover:bg-primary/10">
                            <td className="px-4 py-2 text-left align-top break-words whitespace-normal leading-tight">{formatValue(proposal.proposal)}</td>
                            <td className="px-4 py-2 text-left align-top break-words whitespace-normal leading-tight">{formatValue(proposal.vote_category)}</td>
                            <td className="px-4 py-2 text-left align-top break-words whitespace-normal leading-tight">{formatValue(proposal.fund_name)}</td>
                            <td className="px-4 py-2 text-left align-top break-words whitespace-normal leading-tight">{formatValue(proposal.shares_voted_split)}</td>
                            <td className="px-4 py-2 text-left align-top break-words whitespace-normal leading-tight">
                              <span
                                className={clsx(
                                  (String(proposal.vote_split).includes("Against") || String(proposal.vote_split).includes("Withhold")) &&
                                    "text-red-700 font-semibold"
                                )}
                              >
                                {String(proposal.vote_split).includes("Against/Withhold") ? (
                                  <span className="whitespace-normal leading-tight">
                                    <span>Against/</span>
                                    <br />
                                    <span>Withhold</span>
                                  </span>
                                ) : (
                                  formatValue(proposal.vote_split)
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-left align-top break-words whitespace-normal leading-tight">{formatValue(proposal.for_or_against_management_split)}</td>
                            <td className="px-4 py-2 text-left align-top break-words whitespace-normal leading-tight">
                              {proposal.index_link ? (
                                <a
                                  href={proposal.index_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  <Lucide icon="ExternalLink" className="w-3.5 h-3.5" />
                                  View
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
        <CPagination
          page={activePage}
          totalPages={totalPages}
          handlePageChange={(page) => {
            setActivePage(page);
            loadStats(page);
          }}
          handlePreviousPage={() => {
            if (activePage > 1) {
              const newPage = activePage - 1;
              setActivePage(newPage);
              loadStats(newPage);
            }
          }}
          handleNextPage={() => {
            if (activePage < totalPages) {
              const newPage = activePage + 1;
              setActivePage(newPage);
              loadStats(newPage);
            }
          }}
        />
      </div>
    );
  };

  return (
    <>
      {/* Page header card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <span className="text-slate-500">Institution Insights</span>
          <span className="text-slate-400">›</span>
          <span>N-PX Voting Data</span>
          <span className="px-2 py-1 text-xs font-bold bg-red-800 text-white rounded-full">BETA</span>
        </h1>
      </div>

      <div className="p-5 mt-1 box">
        <div className="flex flex-col p-5 sm:flex-row gap-y-2">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row" />
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <Tippy content="Download Excel" options={{ theme: "light" }}>
                  <button
                    type="button"
                    className={`box p-[5px] transition-opacity duration-200 ${downloadLoading ? "cursor-wait opacity-80" : "cursor-pointer"}`}
                    onClick={downloadLoading ? undefined : handleDownload}
                    disabled={downloadLoading}
                    aria-label="Download Excel"
                  >
                    {downloadLoading ? (
                      <LoadingIcon icon="tail-spin" color="#800000" className="w-6 h-6" />
                    ) : (
                      <img alt="download-icon" src={downloadIcon} className="w-6 h-6 transition-transform duration-200" />
                    )}
                  </button>
                </Tippy>
                <Button
                  variant="outline-secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setIsFilterCollapse((prev) => !prev)}
                >
                  <Lucide icon="ArrowDownWideNarrow" className="stroke-[1.3] w-4 h-4 mr-2" />
                  Filter
                  <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
                    {filtersLength}
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {renderFilterChips()}

        {isFilterCollapse && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={handleClear}
                  className="w-full sm:w-auto flex items-center gap-2"
                  type="button"
                >
                  <MdOutlineClear /> Clear
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApply}
                  className="w-full sm:w-auto flex items-center gap-2"
                  type="button"
                >
                  <FaSearch className="text-lg" /> Apply
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4 grid-cols-1">
              <div className="relative order-1">
                {showInstitutionFirstMessage ? (
                  <div className="absolute -top-8 left-0 z-10 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1 inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                    <Lucide icon="Info" className="w-4 h-4" />
                    Select institution first
                  </div>
                ) : null}
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaUniversity className="text-gray-400" /> Institution
                </label>
                <CompanySelect
                  isInstitution={true}
                  value={selectedInstitutionValue}
                  useProposalVotingStatsDropdown={true}
                  year={filters.year?.[0] || defaultYear}
                  isClearable={true}
                  onChange={(option: any) => handleInstitutionChange(option)}
                  placeholder="Select Investor Company(s)"
                  showDefaultOptions={false}
                />
              </div>
              <div className="order-3">
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaCalendarAlt className="text-gray-400" /> Year
                </label>
                <MultiSelectDropdown
                  data={yearOptions}
                  loading={dropdownLoading}
                  selectedOption={(filters.date_range ? [] : (filters.year && filters.year.length > 0 ? filters.year : [defaultYear])).filter(Boolean)}
                  onChange={(opts) => handleFilterChange("year", opts.map((o) => o.value))}
                  placeholder="Select Year"
                />
              </div>
              <div className="order-4">
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaCalendarAlt className="text-gray-400" /> Date Range
                </label>
                <div className="relative">
                  <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                    <Lucide icon="Calendar" className="w-4 h-4" />
                  </div>
                  <Litepicker
                    value={filters.date_range || ""}
                    onChange={(e) => {
                      const nextValue = e.target.value || "";
                      handleFilterChange("date_range", nextValue);
                    }}
                    onShow={handleDateRangePickerShow}
                    placeholder="Select Date Range"
                    options={{
                      autoApply: false,
                      singleMode: false,
                      numberOfColumns: 2,
                      numberOfMonths: 2,
                      showWeekNumbers: true,
                      splitView: true,
                      dropdowns: {
                        minYear: datePickerBounds.minYear,
                        maxYear: datePickerBounds.maxYear,
                        months: true,
                        years: true,
                      },
                      minDate: availableDateRange?.startDate,
                      maxDate: availableDateRange?.endDate,
                      startDate: datePickerBounds.startDate,
                      endDate: datePickerBounds.endDate,
                    }}
                    className="pl-12"
                  />
                </div>
              </div>
              {showFundName ? (
                <div className="order-2">
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaLayerGroup className="text-gray-400" /> Fund
                  </label>
                  <MultiSelectDropdown
                    data={fundOptions}
                    loading={dropdownLoading || getFundNameDropdownLoader}
                    selectedOption={filters.fund_name || []}
                    onChange={(opts) => handleFilterChange("fund_name", opts.map((o) => o.value))}
                    placeholder="Select Fund(s)"
                  />
                </div>
              ) : null}
              <div className="order-5">
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaLayerGroup className="text-gray-400" /> Index
                </label>
                <MultiSelectDropdown
                  data={indexOptions}
                  loading={dropdownLoading}
                  selectedOption={filters.index || []}
                  onChange={(opts) => handleFilterChange("index", opts.map((o) => o.value))}
                  placeholder="Select Index"
                />
              </div>
              <div className="order-8">
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaCheckCircle className="text-gray-400" /> Vote
                </label>
                <MultiSelectDropdown
                  data={voteOptions}
                  loading={dropdownLoading}
                  selectedOption={filters.vote || []}
                  onChange={(opts) => handleFilterChange("vote", opts.map((o) => o.value))}
                  placeholder="Select Vote(s)"
                />
              </div>
              <div className="order-7">
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaListUl className="text-gray-400" /> Vote Category
                </label>
                <VoteCategoryTaxonomySelect
                  taxonomy={dropdowns?.vote_category_taxonomy || []}
                  selectedValues={filters.vote_category || []}
                  loading={dropdownLoading}
                  placeholder="Select Category(s)"
                  onChange={(values) => handleFilterChange("vote_category", values)}
                />
              </div>
              <div className="order-6">
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaBuilding className="text-gray-400" /> Company
                </label>
                <CompanySelect
                  key={selectedCompanyValues.map((option) => String(option.value)).join("|") || "company-select-empty"}
                  isMulti={true}
                  value={selectedCompanyValues}
                  onChange={handleCompanyChange}
                  placeholder="Select Company(s)"
                  currentFilters={COMPANY_SEARCH_FILTERS}
                  isClearable={true}
                />
              </div>
              <div className="order-9">
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaTags className="text-gray-400" /> Keywords (Beta)
                  <Tippy content="Keyword search applies on proposal text" options={{ theme: "light" }}>
                    <span>
                      <Lucide icon="Info" className="w-4 h-4 text-blue-600 cursor-pointer" />
                    </span>
                  </Tippy>
                </label>
                <CreatableInputSelect
                  placeholder="Type and press Enter to add keywords"
                  value={filters.keyword || []}
                  onChange={(vals) => handleFilterChange("keyword", vals)}
                  options={keywordOptions.map((o) => o.value)}
                  loading={dropdownLoading}
                />
              </div>
            </div>
          </div>
        )}

        <TableWrapper isLoading={isStatsLoading} rows={6} columns={5}>
          <>
            {renderSummaryCard()}
            {renderProposalSections()}
            {tableRows.length === 0 && !isStatsLoading ? (
              <div className="h-52 flex items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <div className="text-center text-slate-500">
                  <Lucide icon="FileX" className="w-10 h-10 mx-auto mb-2" />
                  <p>No data found</p>
                </div>
              </div>
            ) : (
              <>{renderPagination()}</>
            )}
          </>
        </TableWrapper>
      </div>
    </>
  );
};

export default NpxInstitutionView;
