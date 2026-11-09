import React, { useEffect, useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { fetchCompensationProposals, setFilters } from "@/stores/compensationProposalsSlice";
import { AppDispatch, RootState } from "@/stores/store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import { FaUniversity, FaCalendarAlt, FaLayerGroup, FaHandshake, FaTimes, FaSearch, FaTags } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import CreatableInputSelect from "@/components/Base/CreatableInputSelect";
import Tippy from "@/components/Base/Tippy";
import Litepicker from "@/components/Base/Litepicker";
import LoadingIcon from "@/components/Base/LoadingIcon";
import CPagination from "@/components/Pagination";
import Skeleton from "react-loading-skeleton";
import { axiosInstance } from "@/services";
import { baseURL } from "@/constant";
import { compensationProposalsService } from "@/services/compensationProposals";
import { createDynamicURL } from "@/utils/helper";
import CompanyVotingCards from "./components/CompanyVotingCards";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";

const INDEX_OPTIONS = [
  { value: "S&P 100", label: "S&P 100" },
  { value: "S&P 500", label: "S&P 500" },
  { value: "Russell 3000", label: "Russell 3000" },
  { value: "All Companies", label: "All Companies" },
];

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021];

const VOTE_OPTIONS = ["For", "Against/Withhold", "Abstain", "Split Vote", "Other"];

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_INVESTORS = [
  "BlackRock Active Investment Stewardship (BAIS)",
  "BlackRock Investment Stewardship (BIS)",
  "Vanguard Capital Management",
  "State Street Investment Management",
  "Vanguard Portfolio Management",
];

// Institution IDs matching DEFAULT_INVESTORS, sent by default to the
// compensation proposals dropdown endpoint.
const DEFAULT_INSTITUTION_IDS = [1345, 1346, 38, 999, 1000];

const INSTITUTION_NAME_MAP: Record<string, string> = {
  "BlackRock (BAIS)": "BlackRock Active Investment Stewardship (BAIS)",
  "BlackRock (BIS)": "BlackRock Investment Stewardship (BIS)",
};

const normalizeInvestorNames = (values: any) => {
  if (!Array.isArray(values)) return values;
  return values.map((value) => INSTITUTION_NAME_MAP[value] ?? value);
};

const EXEC_COMP_RELOAD_SESSION_KEY = "executiveCompensationReloadHandled";
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

const PIE_COLORS = [
  "#8b1828",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#0891b2",
];

const YEAR_BAR_COLORS = ["#8b1828", "#0d9488", "#d97706", "#7c3aed", "#be123c"];

const VOTE_COLOR_MAP: Record<string, string> = {
  For: "#2563eb",
  "Against/Withhold": "#dc2626",
  Abstain: "#f59e0b",
  "Split Vote": "#9333ea",
  Other: "#64748b",
};

const formatPercent = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `${num.toFixed(1)}%`;
};

const formatNumber = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString();
};

const ExecutiveCompensation: React.FC = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const { data, loading, error, filters } = useAppSelector(
    (state: RootState) => state.compensationProposals
  );

  const [localFilters, setLocalFilters] = useState<any>(() => {
    if (isPageReloadOnce(EXEC_COMP_RELOAD_SESSION_KEY)) {
      localStorage.removeItem("executiveCompensationFilters");
      return {
        year: [CURRENT_YEAR],
        index: "S&P 500",
        vote: [],
        investor_company: DEFAULT_INVESTORS,
        category: "Say on Pay",
        keyword: [],
        date_range: "",
        page_size: 25,
      };
    }

    const saved = typeof window !== "undefined" ? localStorage.getItem("executiveCompensationFilters") : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const cachedKeyword = parsed?.keyword ?? filters?.keyword;
        return {
          ...filters,
          ...parsed,
          investor_company: normalizeInvestorNames(parsed?.investor_company ?? filters?.investor_company ?? DEFAULT_INVESTORS),
          // Older cached sessions stored keyword as a single string; normalize
          // to the array shape the tag-based keyword input now expects.
          keyword: Array.isArray(cachedKeyword)
            ? cachedKeyword
            : (cachedKeyword ? [cachedKeyword] : []),
        };
      } catch {
        // ignore invalid cache
      }
    }
    return filters;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showMaxInstitutionMessage, setShowMaxInstitutionMessage] = useState(false);
  const [dropdowns, setDropdowns] = useState<any>({});
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [prevYearSelection, setPrevYearSelection] = useState<(string | number)[]>([]);
  const [prevDateRangeSelection, setPrevDateRangeSelection] = useState("");

  const institutionNameToId = useMemo(() => {
    const map: Record<string, number> = {};
    (dropdowns?.institution_options || []).forEach((opt: any) => {
      if (opt?.institution && opt?.id !== undefined) map[opt.institution] = opt.id;
    });
    return map;
  }, [dropdowns?.institution_options]);

  const resolveInstitutionIds = useCallback(
    (names?: string[]): (string | number)[] => {
      if (!names || names.length === 0) return DEFAULT_INSTITUTION_IDS;
      const ids = names.map((name) => institutionNameToId[name]).filter((id) => id !== undefined);
      return ids.length > 0 ? ids : DEFAULT_INSTITUTION_IDS;
    },
    [institutionNameToId]
  );

  const loadDropdowns = useCallback(
    async (names?: string[], context?: { year?: (string | number)[]; index?: string; date_range?: string }) => {
      setDropdownLoading(true);
      try {
        const hasDateRange = Boolean(context?.date_range && context.date_range.trim());
        const response = await compensationProposalsService.getCompensationDropdown({
          institution_id: resolveInstitutionIds(names),
          ...(hasDateRange
            ? { date_range: context?.date_range }
            : context?.year?.length
              ? { year: context.year }
              : {}),
          ...(context?.index ? { index: context.index } : {}),
        });
        setDropdowns(response || {});
      } catch (err) {
        console.error("[ExecutiveCompensation] loadDropdowns error:", err);
      } finally {
        setDropdownLoading(false);
      }
    },
    [resolveInstitutionIds]
  );

  // Dropdown options also only refresh from the committed `filters`, in sync
  // with `fetchData`, so switching institutions/year/index in the (not yet
  // applied) filter panel doesn't trigger a request until Apply is clicked.
  useEffect(() => {
    loadDropdowns(filters.investor_company, {
      year: filters.year,
      index: filters.index,
      date_range: filters.date_range,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.investor_company, filters.year, filters.index, filters.date_range]);

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
    const fallbackStart = availableDateRange?.startDate || "2022-01-01";
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
      console.error("[ExecutiveCompensation] Failed to navigate date picker:", err);
    }
  };

  const handleYearChange = (values: number[]) => {
    setPrevYearSelection(values);
    setPrevDateRangeSelection("");
    setLocalFilters((prev: any) => ({ ...prev, year: values, date_range: "" }));
  };

  const handleDateRangeChange = (value: string) => {
    const hasValue = Boolean(value && value.trim());
    setLocalFilters((prev: any) => ({
      ...prev,
      date_range: value,
      year: hasValue ? [] : (prevYearSelection.length > 0 ? prevYearSelection : [CURRENT_YEAR]),
    }));
    setPrevDateRangeSelection(hasValue ? value : "");
    if (hasValue) setPrevYearSelection([]);
  };

  useEffect(() => {
    setLocalFilters((prev: any) => ({
      ...filters,
      investor_company: normalizeInvestorNames(prev?.investor_company ?? filters?.investor_company ?? DEFAULT_INVESTORS),
    }));
  }, [filters]);

  // Dispatch cached filters to Redux on mount
  useEffect(() => {
    dispatch(setFilters(localFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem("executiveCompensationFilters", JSON.stringify(filters));
  }, [filters]);

  // Persist unsaved local filter selections too (for same-session navigation)
  useEffect(() => {
    localStorage.setItem("executiveCompensationFilters", JSON.stringify(localFilters));
  }, [localFilters]);

  // Stats only refetch from the committed (applied) `filters`, never from the
  // in-progress `localFilters` draft — so editing the filter panel doesn't
  // hit the API or change the page until the user clicks Apply.
  const fetchData = useCallback(
    (page = 1) => {
      const payload: any = {
        page,
        page_size: filters.page_size || 25,
      };
      const hasDateRange = Boolean(filters.date_range && filters.date_range.trim());
      if (hasDateRange) {
        payload.date_range = filters.date_range;
      } else if (filters.year?.length) {
        payload.year = filters.year;
      }
      if (filters.index) payload.index = filters.index;
      if (filters.vote?.length) payload.vote = filters.vote;
      if (filters.investor_company?.length) {
        payload.institution_id = resolveInstitutionIds(filters.investor_company);
      }
      if (filters.keyword?.length) payload.keyword = filters.keyword;
      dispatch(
        fetchCompensationProposals({
          filters: payload,
          requestKey: createDynamicURL("/api/compensation-proposals/stats/", payload),
        })
      );
    },
    [dispatch, filters, resolveInstitutionIds]
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const byInstitution = data?.by_institution || [];
  const byCompany = data?.by_company || [];
  const chartData = data?.chart_data || {};
  const barChart = chartData.bar_chart;
  const pieCharts = chartData.pie_charts || [];
  const tableData = data?.table_data || [];
  const pagination = data?.pagination || {};
  const exportUrl = data?.export_url;

  const currentPage = pagination.page || 1;
  const totalPages = pagination.total_pages || 1;
  const pageSize = pagination.page_size || 25;

  const handlePageChange = (page: number) => fetchData(page);

  const handleApplyFilters = () => {
    dispatch(setFilters(localFilters));
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    const defaults = {
      year: [CURRENT_YEAR],
      index: "S&P 500",
      vote: [],
      investor_company: DEFAULT_INVESTORS,
      category: "Say on Pay",
      keyword: [],
      date_range: "",
      page_size: 25,
    };
    setLocalFilters(defaults);
    dispatch(setFilters(defaults));
    setPrevYearSelection([]);
    setPrevDateRangeSelection("");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Step 1: call the stats API with the active filters to get a fresh,
      // signed export_url that matches the exact current filter set.
      const payload: any = {
        page: currentPage,
        page_size: filters.page_size || 25,
      };
      const hasDateRange = Boolean(filters.date_range && filters.date_range.trim());
      if (hasDateRange) {
        payload.date_range = filters.date_range;
      } else if (filters.year?.length) {
        payload.year = filters.year;
      }
      if (filters.index) payload.index = filters.index;
      if (filters.vote?.length) payload.vote = filters.vote;
      if (filters.investor_company?.length) {
        payload.institution_id = resolveInstitutionIds(filters.investor_company);
      }
      const statsData = await compensationProposalsService.getCompensationStats(payload);
      const freshExportUrl = statsData?.export_url || exportUrl;
      if (!freshExportUrl) {
        console.error("Export failed: no export_url returned by stats API");
        return;
      }

      // Step 2: download the Excel file using the signed export_url (token-based, no rebuilding).
      const url = freshExportUrl.startsWith("http") ? freshExportUrl : `${baseURL}${freshExportUrl}`;
      const response = await axiosInstance.get(url, { responseType: "blob" });
      const contentType =
        (response.headers["content-type"] as string) ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([response.data], { type: contentType });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Compensation Proposal Overview.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const yearSource: (string | number)[] = dropdowns?.year?.length ? dropdowns.year : YEARS;
  const yearOptions = yearSource.map((y) => ({
    value: String(y),
    label: String(y),
  }));

  const voteSource: string[] = dropdowns?.vote?.length ? dropdowns.vote : VOTE_OPTIONS;
  const voteOptions = voteSource.map((v) => ({
    value: v,
    label: v,
  }));

  const indexSource: string[] = dropdowns?.index?.length ? dropdowns.index : INDEX_OPTIONS.map((i) => i.value);
  const indexOptions = indexSource.map((idx) => ({ value: idx, label: idx }));

  const institutionSource: string[] = dropdowns?.institution?.length
    ? dropdowns.institution
    : DEFAULT_INVESTORS;
  const investorOptions = [
    ...new Map(
      institutionSource.map((name) => ({ value: name, label: name })).map((opt) => [opt.value, opt])
    ).values(),
  ];

  const appliedChips: { key: string; value: string; label: string }[] = [];
  if (filters.date_range) {
    appliedChips.push({ key: "date_range", value: filters.date_range, label: `Date Range: ${filters.date_range}` });
  } else {
    (filters.year || []).forEach((y: any) => {
      appliedChips.push({ key: "year", value: String(y), label: `Year: ${y}` });
    });
  }
  (filters.investor_company || []).forEach((name: string) => {
    appliedChips.push({ key: "investor_company", value: name, label: `Institution: ${name}` });
  });
  if (filters.index) {
    appliedChips.push({ key: "index", value: filters.index, label: `Index: ${filters.index}` });
  }
  (filters.vote || []).forEach((v: string) => {
    appliedChips.push({ key: "vote", value: v, label: `Vote: ${v}` });
  });
  if (filters.category) {
    appliedChips.push({ key: "category", value: filters.category, label: `Category: ${filters.category}` });
  }
  (filters.keyword || []).forEach((kw: string) => {
    appliedChips.push({ key: "keyword", value: kw, label: `Keyword: ${kw}` });
  });

  const handleRemoveChip = (key: string, value: string) => {
    let updated: any = { ...filters };
    if (key === "investor_company" || key === "year" || key === "vote" || key === "keyword") {
      updated[key] = (updated[key] || []).filter((v: any) => String(v) !== String(value));
    } else if (key === "index" || key === "category") {
      updated[key] = "";
    } else if (key === "date_range") {
      updated.date_range = "";
      updated.year = prevYearSelection.length > 0 ? prevYearSelection : [CURRENT_YEAR];
      setPrevDateRangeSelection("");
    }
    updated.investor_company = normalizeInvestorNames(updated.investor_company ?? []);
    setLocalFilters(updated);
    dispatch(setFilters(updated));
  };

  const institutionsWithYears = byInstitution.map((inst: any) => {
    const years = inst.years || {};
    const yearsSorted = Object.keys(years).sort((a, b) => Number(a) - Number(b));
    return { institution_name: inst.institution_name, years, yearsSorted };
  });

  const formatDateRange = (dateRange: any) => {
    if (!dateRange) return "-";
    return `${dateRange.start_meeting || "-"} - ${dateRange.end_meeting || "-"}`;
  };

  const formatCountAndPercent = (count: any, percent: any) => {
    if (count === null || count === undefined) return "-";
    return `${formatNumber(count)} (${formatPercent(percent)})`;
  };

  const summaryMetricRows = [
    {
      key: "unique_companies",
      label: "No. of unique companies",
      render: (y: any) => formatNumber(y?.unique_companies),
    },
    {
      key: "total_proposals",
      label: "No of proposals",
      render: (y: any) => formatNumber(y?.total_proposals),
    },
    {
      key: "for",
      label: "No. of FOR votes",
      render: (y: any) => formatCountAndPercent(y?.for_votes, y?.for_percentage),
    },
    {
      key: "split",
      label: "No. of SPLIT votes",
      render: (y: any) => formatCountAndPercent(y?.split_votes, y?.split_percentage),
    },
    {
      key: "against",
      label: "No. of AGAINST/WITHHOLD votes",
      render: (y: any) => formatCountAndPercent(y?.against_votes, y?.against_percentage),
    },
    {
      key: "abstain",
      label: "No. of Abstain votes",
      render: (y: any) => formatCountAndPercent(y?.abstain_votes, y?.abstain_percentage),
    },
  ];

  const renderSummaryTable = () => {
    if (!institutionsWithYears || institutionsWithYears.length === 0) {
      return (
        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 mb-8">
          <div className="bg-primary text-white px-6 py-3 rounded-t-2xl">
            <h3 className="text-base font-semibold">Summary</h3>
          </div>
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center text-slate-500">
            <FaTimes className="text-3xl text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">No summary data available</p>
            <p className="text-sm mt-1">Try changing the institution, year, index, or category.</p>
          </div>
        </div>
      );
    }

    // The compact (table-fixed, evenly-spaced) layout looks best when each
    // institution only has a single year/period column. Once any institution
    // has multiple columns (multi-year or a date range split into several
    // periods), fixed equal-width columns get too narrow and the values
    // overlap — so switch to an auto-sized, horizontally scrollable table.
    const maxColumnsPerInstitution = Math.max(
      1,
      ...institutionsWithYears.map((inst: any) => inst.yearsSorted.length || 1)
    );
    const isWideLayout = maxColumnsPerInstitution > 1;

    return (
      <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 mb-8 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className={isWideLayout ? "table-fixed w-max min-w-full" : "min-w-full table-fixed"}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th
                  rowSpan={2}
                  className={clsx(
                    "text-left text-sm font-semibold text-white bg-primary py-3 px-4 align-middle",
                    isWideLayout ? "w-[160px] sticky left-0 z-10" : "w-64"
                  )}
                >
                  Summary
                </Table.Th>
                {institutionsWithYears.map((inst: any) => (
                  <Table.Th
                    key={inst.institution_name}
                    colSpan={inst.yearsSorted.length || 1}
                    className="text-center text-sm font-semibold text-white bg-primary py-3 px-2 border-l border-white/20 break-words leading-snug"
                  >
                    {inst.institution_name}
                  </Table.Th>
                ))}
              </Table.Tr>
              <Table.Tr>
                {institutionsWithYears.flatMap((inst: any) =>
                  inst.yearsSorted.map((year: string) => (
                    <Table.Th
                      key={`${inst.institution_name}-${year}`}
                      className={clsx(
                        "text-center text-sm font-semibold text-white bg-primary/90 py-2 px-2 border-l border-white/10 leading-tight",
                        isWideLayout ? "whitespace-nowrap w-[130px]" : ""
                      )}
                    >
                      <div>{year}</div>
                      {formatDateRange(inst.years[year]?.date_range) !== "-" && (
                        <div className="text-[13px] font-normal opacity-80 mt-0.5">
                          {formatDateRange(inst.years[year]?.date_range)}
                        </div>
                      )}
                    </Table.Th>
                  ))
                )}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {summaryMetricRows.map((metric) => (
                <Table.Tr key={metric.key} className="border-t border-slate-100 hover:bg-slate-50">
                  <Table.Td
                    className={clsx(
                      "py-3 px-4 text-sm font-medium text-slate-700 break-words",
                      isWideLayout && "w-[160px] sticky left-0 z-10 bg-white"
                    )}
                  >
                    {metric.label}
                  </Table.Td>
                  {institutionsWithYears.flatMap((inst: any) =>
                    inst.yearsSorted.map((year: string) => (
                      <Table.Td
                        key={`${inst.institution_name}-${year}-${metric.key}`}
                        className={clsx(
                          "py-3 px-2 text-sm text-slate-700 text-center whitespace-nowrap",
                          isWideLayout && "w-[130px]"
                        )}
                      >
                        {metric.render(inst.years[year])}
                      </Table.Td>
                    ))
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      </div>
    );
  };

  const renderBarChart = (chart: any) => {
    const title = chart?.title || "Institution Proposal Volume";
    const dataset = chart?.data || [];
    const xKey = chart?.x_key || "institution_name";
    const yKey = chart?.y_key || "total_proposals";
    const seriesKey = chart?.series_key || "year";

    if (!dataset || dataset.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">{title}</h3>
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Lucide icon="BarChart3" className="w-10 h-10 text-slate-300 mb-2" />
            <p>No data available</p>
          </div>
        </div>
      );
    }

    const seriesValues: string[] = Array.from(
      new Set(dataset.map((item: any) => String(item[seriesKey])))
    );

    const pivotMap = new Map<string, any>();
    dataset.forEach((item: any) => {
      const key = item[xKey];
      if (!pivotMap.has(key)) pivotMap.set(key, { [xKey]: key });
      pivotMap.get(key)[String(item[seriesKey])] = item[yKey];
    });
    const pivoted = Array.from(pivotMap.values());

    // Wrap long institution names onto multiple lines instead of letting
    // them overlap each other when there isn't enough horizontal room.
    const wrapLabel = (label: string, maxCharsPerLine = 16) => {
      const words = String(label || "").split(" ");
      const lines: string[] = [];
      let current = "";
      words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxCharsPerLine && current) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      });
      if (current) lines.push(current);
      return lines.slice(0, 3);
    };

    const renderXAxisTick = (props: any) => {
      const { x, y, payload } = props;
      const lines = wrapLabel(payload?.value);
      return (
        <g transform={`translate(${x},${y})`}>
          {lines.map((line, idx) => (
            <text
              key={idx}
              x={0}
              y={idx * 12}
              dy={12}
              textAnchor="middle"
              fill="#334155"
              fontSize={11}
              fontWeight={500}
            >
              {line}
            </text>
          ))}
        </g>
      );
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">{title}</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pivoted} margin={{ top: 24, right: 20, left: 0, bottom: 60 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey={xKey}
                tick={renderXAxisTick}
                interval={0}
                height={70}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              {seriesValues.map((s, idx) => (
                <Bar key={s} dataKey={s} name={s} fill={YEAR_BAR_COLORS[idx % YEAR_BAR_COLORS.length]} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey={s} position="top" fill="#0f172a" fontSize={13} fontWeight={700} formatter={(v: any) => formatNumber(v)} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderPieChart = (chart: any) => {
    const title = chart?.title || "";
    const dataset = chart?.data || [];
    const labelKey = chart?.label_key || "label";
    const valueKey = chart?.value_key || "count";

    if (!dataset || dataset.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          {title && (
            <h3 className="text-base font-bold text-gray-900 mb-2 text-center break-words leading-snug min-h-[2.75rem] flex items-center justify-center">
              {title}
            </h3>
          )}
          <div className="h-56 flex flex-col items-center justify-center text-slate-500">
            <Lucide icon="PieChart" className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm">No data available</p>
          </div>
        </div>
      );
    }

    const normalized = dataset
      .map((item: any) => ({
        name: item[labelKey] || item.label || item.name || "Unknown",
        value: Number(item[valueKey] || item.count || item.value || 0),
      }))
      .filter((item: any) => item.value > 0);

    const total = normalized.reduce((sum: number, item: any) => sum + item.value, 0);
    const sortedLegend = [...normalized].sort((a, b) => b.value - a.value);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
        {title && (
          <h3 className="text-base font-bold text-gray-900 mb-2 text-center break-words leading-snug min-h-[2.75rem] flex items-center justify-center">
            {title}
          </h3>
        )}
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={normalized}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={68}
                labelLine={false}
                label={({ value, name, cx, cy, midAngle, outerRadius: outR }: any) => {
                  const RADIAN = Math.PI / 180;
                  const sliceColor = VOTE_COLOR_MAP[name] || PIE_COLORS[0];

                  // Every slice gets a leader line out to an outside label,
                  // so small slices stay readable and large ones stay
                  // visually consistent with the rest of the chart.
                  const startRadius = outR;
                  const bendRadius = outR + 12;
                  const sx = cx + startRadius * Math.cos(-midAngle * RADIAN);
                  const sy = cy + startRadius * Math.sin(-midAngle * RADIAN);
                  const mx = cx + bendRadius * Math.cos(-midAngle * RADIAN);
                  const my = cy + bendRadius * Math.sin(-midAngle * RADIAN);
                  const isRight = Math.cos(-midAngle * RADIAN) >= 0;
                  const ex = mx + (isRight ? 14 : -14);

                  return (
                    <g>
                      <path
                        d={`M${sx},${sy}L${mx},${my}L${ex},${my}`}
                        stroke={sliceColor}
                        fill="none"
                      />
                      <text
                        x={ex + (isRight ? 4 : -4)}
                        y={my}
                        fill="#0f172a"
                        textAnchor={isRight ? "start" : "end"}
                        dominantBaseline="central"
                        fontSize={12}
                        fontWeight={700}
                      >
                        {formatNumber(value)}
                      </text>
                    </g>
                  );
                }}
              >
                {normalized.map((entry: any) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={VOTE_COLOR_MAP[entry.name] || PIE_COLORS[0]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-1.5">
          {sortedLegend.map((entry: any) => {
            const pct = total ? ((entry.value / total) * 100).toFixed(1) : "0.0";
            return (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: VOTE_COLOR_MAP[entry.name] || PIE_COLORS[0] }}
                  />
                  {entry.name}
                </span>
                <span className="font-semibold text-slate-800 whitespace-nowrap ml-2">
                  {formatNumber(entry.value)} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPieChartFrame = () => {
    const frameTitle = "Investor Voting Mix";
    if (!pieCharts || pieCharts.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">{frameTitle}</h3>
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Lucide icon="PieChart" className="w-10 h-10 text-slate-300 mb-2" />
            <p>No compensation proposal voting data found for the selected filters.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">{frameTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pieCharts.map((chart: any, idx: number) => (
            <div key={idx}>{renderPieChart(chart)}</div>
          ))}
        </div>
      </div>
    );
  };

  const labelMap: Record<string, string> = {
    year: "Year",
    institution_name: "Institution",
    company_name: "Company",
    company_ticker: "Ticker",
    meeting_date: "Meeting Date",
    proposal_num: "Proposal #",
    proposal: "Proposal",
    vote: "Vote",
    notes: "Rationale",
    rationale: "Rationale",
  };

  const tableColumns = [
    "year",
    "institution_name",
    "company_name",
    "company_ticker",
    "meeting_date",
    "proposal_num",
    "proposal",
    "vote",
    "rationale",
  ];

  const renderTable = () => {
    if (!tableData || tableData.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Lucide icon="FileText" className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            No compensation proposal voting data found for the selected filters.
          </p>
        </div>
      );
    }

    const firstRow = tableData[0] || {};
    let headers = tableColumns.filter((h) => Object.prototype.hasOwnProperty.call(firstRow, h));
    if (headers.includes("rationale") && headers.includes("notes")) {
      headers = headers.filter((h) => h !== "notes");
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <Table.Thead className="bg-slate-50">
              <Table.Tr>
                {headers.map((h) => (
                  <Table.Th
                    key={h}
                    className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4 whitespace-nowrap"
                  >
                    {labelMap[h] || h.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tableData.map((row: any, idx: number) => (
                <Table.Tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                  {headers.map((h) => (
                    <Table.Td key={h} className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {typeof row[h] === "boolean"
                        ? row[h]
                          ? "Yes"
                          : "No"
                        : typeof row[h] === "object" && row[h] !== null
                        ? JSON.stringify(row[h])
                        : row[h] ?? "-"}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-slate-500">
            Page {currentPage} of {totalPages} · {pageSize} rows
          </p>
          {totalPages > 1 && (
            <CPagination
              page={currentPage}
              totalPages={totalPages}
              handlePageChange={handlePageChange}
              handlePreviousPage={() => handlePageChange(Math.max(1, currentPage - 1))}
              handleNextPage={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes blink-beta {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .blink-beta {
          animation: blink-beta 1.2s ease-in-out infinite;
        }
      `}</style>
      {/* Page header card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <span className="text-slate-500">Institution Insights</span>
          <span className="text-slate-400">›</span>
          <span>Exec. Comp. Voting Data</span>
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
                    className={`box p-[5px] transition-opacity duration-200 ${isExporting || loading || !exportUrl ? "cursor-wait opacity-80" : "cursor-pointer"}`}
                    onClick={isExporting || loading || !exportUrl ? undefined : handleExport}
                    disabled={isExporting || loading || !exportUrl}
                    aria-label="Download Excel"
                  >
                    {isExporting ? (
                      <LoadingIcon icon="tail-spin" color="#800000" className="w-6 h-6" />
                    ) : (
                      <img alt="download-icon" src={downloadIcon} className="w-6 h-6 transition-transform duration-200" />
                    )}
                  </button>
                </Tippy>
                <Button
                  variant="outline-secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setIsFilterOpen((prev) => !prev)}
                >
                  <Lucide icon="ArrowDownWideNarrow" className="stroke-[1.3] w-4 h-4 mr-2" />
                  Filter
                  <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
                    {appliedChips.length}
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {appliedChips.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {appliedChips.map((chip, idx) => (
              <span
                key={`${chip.key}-${chip.value}-${idx}`}
                className="flex items-center bg-primary/10 text-primary font-medium px-3 py-1 rounded-full shadow-sm transition-all hover:bg-primary/20"
              >
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

      {/* Filters */}
      {isFilterOpen && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline-secondary"
                onClick={handleResetFilters}
                className="w-full sm:w-auto flex items-center gap-2"
                type="button"
              >
                <MdOutlineClear /> Clear All
              </Button>
              <Button
                variant="primary"
                onClick={handleApplyFilters}
                className="w-full sm:w-auto flex items-center gap-2"
                type="button"
              >
                <FaSearch className="text-lg" /> Apply
              </Button>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-4 grid-cols-1">
            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                <FaUniversity className="text-gray-400" /> Institution
              </label>
              <MultiSelectDropdown
                data={investorOptions.map((opt: any) => ({
                  ...opt,
                  isDisabled:
                    (localFilters.investor_company || []).length >= 5 &&
                    !(localFilters.investor_company || []).includes(opt.value),
                }))}
                loading={dropdownLoading}
                placeholder="Select Institutions"
                selectedOption={localFilters.investor_company || []}
                onChange={(selected: any) => {
                  const values = selected.map((s: any) => s.value);
                  if (values.length > 5) return;
                  if (values.length === 5) {
                    setShowMaxInstitutionMessage(true);
                    setTimeout(() => setShowMaxInstitutionMessage(false), 3000);
                  } else {
                    setShowMaxInstitutionMessage(false);
                  }
                  setLocalFilters({ ...localFilters, investor_company: values });
                }}
              />
              {showMaxInstitutionMessage && (
                <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1 mt-1 flex items-center gap-1 animate-fade-in">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Maximum institutions are selected</span>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                <FaCalendarAlt className="text-gray-400" /> Year
              </label>
              <MultiSelectDropdown
                data={yearOptions}
                loading={dropdownLoading}
                placeholder="Select Years"
                selectedOption={(localFilters.date_range ? [] : (localFilters.year || [])).map((y: any) => String(y))}
                onChange={(selected: any) => {
                  const values = selected.map((s: any) => Number(s.value));
                  handleYearChange(values);
                }}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                <FaCalendarAlt className="text-gray-400" /> Date Range
              </label>
              <div className="relative">
                <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                  <Lucide icon="Calendar" className="w-4 h-4" />
                </div>
                <Litepicker
                  value={localFilters.date_range || ""}
                  onChange={(e) => handleDateRangeChange(e.target.value || "")}
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

            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                <FaLayerGroup className="text-gray-400" /> Index
              </label>
              <select
                value={localFilters.index || "S&P 500"}
                onChange={(e) => setLocalFilters({ ...localFilters, index: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-primary"
                style={{ minHeight: "42px" }}
              >
                {indexOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                <FaLayerGroup className="text-gray-400" /> Category
              </label>
              <select
                value={localFilters.category || "Say on Pay"}
                onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-primary"
                style={{ minHeight: "42px" }}
              >
                <option value="Say on Pay">Say on Pay</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                <FaHandshake className="text-gray-400" /> Vote
              </label>
              <MultiSelectDropdown
                data={voteOptions}
                placeholder="Select Vote"
                selectedOption={localFilters.vote || []}
                onChange={(selected: any) => {
                  const values = selected.map((s: any) => s.value);
                  setLocalFilters({ ...localFilters, vote: values });
                }}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                <FaTags className="text-gray-400" /> Keywords (Beta)
                <Tippy content="Keyword search applies on proposal text and rationale" options={{ theme: "light" }}>
                  <span>
                    <Lucide icon="Info" className="w-4 h-4 text-blue-600 cursor-pointer" />
                  </span>
                </Tippy>
              </label>
              <CreatableInputSelect
                placeholder="Type and press Enter to add keywords"
                value={localFilters.keyword || []}
                onChange={(vals) => setLocalFilters({ ...localFilters, keyword: vals })}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Unable to load compensation proposal voting stats. Please try again.
        </div>
      )}

      {loading || dropdownLoading ? (
        <div className="space-y-6">
          {/* Summary table skeleton */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <Skeleton height={20} width="30%" className="mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={16} width={`${[100, 92, 88, 95, 90, 85][i]}%`} />
              ))}
            </div>
          </div>

          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 h-80">
              <Skeleton height={20} width="40%" className="mb-4" />
              <Skeleton height="80%" width="100%" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 h-80">
              <Skeleton height={20} width="40%" className="mb-4" />
              <div className="flex items-center justify-center h-48">
                <Skeleton circle height={120} width={120} />
              </div>
            </div>
          </div>

          {/* Company voting cards skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <Skeleton height={20} width="30%" />
              <Skeleton height={36} width={120} />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={56} width="100%" borderRadius={8} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {renderSummaryTable()}
          {renderBarChart(barChart)}
          {renderPieChartFrame()}
          <CompanyVotingCards byCompany={byCompany} loading={loading} />
        </div>
      )}
    </div>
  </>);
};

export default ExecutiveCompensation;

