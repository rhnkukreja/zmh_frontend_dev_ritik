import React, { useEffect, useState, useCallback } from "react";
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
import { Download } from "lucide-react";
import { FaUniversity, FaCalendarAlt, FaLayerGroup, FaHandshake, FaTimes } from "react-icons/fa";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import CPagination from "@/components/Pagination";
import Skeleton from "react-loading-skeleton";
import { axiosInstance } from "@/services";
import { baseURL } from "@/constant";
import { compensationProposalsService } from "@/services/compensationProposals";
import CompanyVotingCards from "./components/CompanyVotingCards";

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
  "BlackRock, Inc.",
  "The Vanguard Group",
  "State Street Investment Management",
];

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
    const saved = typeof window !== "undefined" ? localStorage.getItem("executiveCompensationFilters") : null;
    if (saved) {
      try {
        return { ...filters, ...JSON.parse(saved) };
      } catch {
        // ignore invalid cache
      }
    }
    return filters;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showMaxInstitutionMessage, setShowMaxInstitutionMessage] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
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

  const fetchData = useCallback(
    (page = 1) => {
      const payload: any = {
        page,
        page_size: localFilters.page_size || 25,
      };
      if (localFilters.year?.length) payload.year = localFilters.year;
      if (localFilters.index) payload.index = localFilters.index;
      if (localFilters.vote?.length) payload.vote = localFilters.vote;
      if (localFilters.investor_company?.length) {
        payload.investor_company = localFilters.investor_company;
      }
      if (localFilters.keyword?.trim()) payload.keyword = localFilters.keyword.trim();
      dispatch(fetchCompensationProposals({ filters: payload }));
    },
    [dispatch, localFilters]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      keyword: "",
      page_size: 25,
    };
    setLocalFilters(defaults);
    dispatch(setFilters(defaults));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Step 1: call the stats API with the active filters to get a fresh,
      // signed export_url that matches the exact current filter set.
      const payload: any = {
        page: currentPage,
        page_size: localFilters.page_size || 25,
      };
      if (localFilters.year?.length) payload.year = localFilters.year;
      if (localFilters.index) payload.index = localFilters.index;
      if (localFilters.vote?.length) payload.vote = localFilters.vote;
      if (localFilters.investor_company?.length) {
        payload.investor_company = localFilters.investor_company;
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

  const dropdownOptions = data?.dropdown_options || {};

  const yearSource: (string | number)[] = dropdownOptions.years?.length ? dropdownOptions.years : YEARS;
  const yearOptions = yearSource.map((y) => ({
    value: String(y),
    label: String(y),
  }));

  const voteSource: string[] = dropdownOptions.votes?.length ? dropdownOptions.votes : VOTE_OPTIONS;
  const voteOptions = voteSource.map((v) => ({
    value: v,
    label: v,
  }));

  const indexSource: string[] = dropdownOptions.index?.length ? dropdownOptions.index : INDEX_OPTIONS.map((i) => i.value);
  const indexOptions = indexSource.map((idx) => ({ value: idx, label: idx }));

  const institutionSource: string[] = dropdownOptions.institutions?.length
    ? dropdownOptions.institutions.map((inst: any) => inst.institution)
    : DEFAULT_INVESTORS;
  const investorOptions = [
    ...new Map(
      institutionSource.map((name) => ({ value: name, label: name })).map((opt) => [opt.value, opt])
    ).values(),
  ];

  const appliedChips: { key: string; value: string; label: string }[] = [];
  (filters.year || []).forEach((y: any) => {
    appliedChips.push({ key: "year", value: String(y), label: `Year: ${y}` });
  });
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
  if (filters.keyword?.trim()) {
    appliedChips.push({ key: "keyword", value: filters.keyword.trim(), label: `Keyword: ${filters.keyword.trim()}` });
  }

  const handleRemoveChip = (key: string, value: string) => {
    let updated: any = { ...filters };
    if (key === "investor_company" || key === "year" || key === "vote") {
      updated[key] = (updated[key] || []).filter((v: any) => String(v) !== String(value));
    } else if (key === "index" || key === "category") {
      updated[key] = "";
    } else if (key === "keyword") {
      updated.keyword = "";
    }
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Lucide icon="FileText" className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            No compensation proposal voting data found for the selected filters.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full table-fixed">
            <Table.Thead>
              <Table.Tr>
                <Table.Th
                  rowSpan={2}
                  className="text-left text-sm font-semibold text-white bg-[#8b1828] py-3 px-4 align-middle w-64"
                >
                  Summary
                </Table.Th>
                {institutionsWithYears.map((inst: any) => (
                  <Table.Th
                    key={inst.institution_name}
                    colSpan={inst.yearsSorted.length || 1}
                    className="text-center text-sm font-semibold text-white bg-[#8b1828] py-3 px-2 border-l border-white/20 break-words leading-snug"
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
                      className="text-center text-xs font-medium text-white bg-[#8b1828]/90 py-2 px-2 border-l border-white/10 leading-tight"
                    >
                      {formatDateRange(inst.years[year]?.date_range)}
                    </Table.Th>
                  ))
                )}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {summaryMetricRows.map((metric) => (
                <Table.Tr key={metric.key} className="border-t border-slate-100 hover:bg-slate-50">
                  <Table.Td className="py-3 px-4 text-sm font-medium text-slate-700 break-words">
                    {metric.label}
                  </Table.Td>
                  {institutionsWithYears.flatMap((inst: any) =>
                    inst.yearsSorted.map((year: string) => (
                      <Table.Td
                        key={`${inst.institution_name}-${year}-${metric.key}`}
                        className="py-3 px-2 text-sm text-slate-700 text-center whitespace-nowrap"
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

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">{title}</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pivoted} margin={{ top: 24, right: 20, left: 0, bottom: 40 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey={xKey}
                tick={{ fill: "#334155", fontSize: 12, fontWeight: 500 }}
                interval={0}
                height={40}
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
          {title && <h3 className="text-base font-bold text-gray-900 mb-4 text-center">{title}</h3>}
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
        {title && <h3 className="text-base font-bold text-gray-900 mb-2 text-center truncate">{title}</h3>}
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={normalized}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={({ value, cx, cy, midAngle, innerRadius, outerRadius: outR }: any) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outR - innerRadius) * 0.65;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  const pct = total ? Math.round((value / total) * 100) : 0;
                  if (pct < 5) return null;
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#ffffff"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={14}
                      fontWeight={700}
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
                    >
                      {formatNumber(value)}
                    </text>
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
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900">
            <Lucide icon="Briefcase" className="w-5 h-5 text-[#8b1828] mt-[1px] shrink-0" />
            <span className="text-slate-500">Institution Insights</span>
            <span className="text-slate-400">›</span>
            <span>Executive Compensation Overview</span>
          </h1>
        </div>
      </div>

      {/* Action bar: filter chips + export + filter toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          {appliedChips.map((chip, idx) => (
            <span
              key={`${chip.key}-${chip.value}-${idx}`}
              className="inline-flex items-center gap-1.5 bg-[#8b1828]/10 text-[#8b1828] font-medium px-2.5 py-1 rounded-full text-sm leading-none"
            >
              {chip.label}
              <button
                type="button"
                className="text-[#8b1828] hover:text-red-600 transition-colors flex items-center justify-center"
                onClick={() => handleRemoveChip(chip.key, chip.value)}
              >
                <FaTimes className="text-xs" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={isExporting || loading || !exportUrl}
            className="flex items-center gap-2 bg-[#8b1828] border-[#8b1828] hover:bg-[#8b1828]/90"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Downloading..." : "Download Now"}
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="flex items-center gap-2"
          >
            <Lucide icon="ArrowDownWideNarrow" className="w-4 h-4" />
            Filter
            <span className="flex items-center justify-center h-5 px-1.5 text-xs font-medium border rounded-full bg-slate-100">
              {appliedChips.length}
            </span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {isFilterOpen && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-semibold text-slate-700">Filters</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline-secondary" onClick={handleResetFilters} className="px-5">
                Reset
              </Button>
              <Button variant="primary" onClick={handleApplyFilters} className="px-5">
                Apply
              </Button>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3 grid-cols-1">
            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1 text-sm">
                <FaCalendarAlt className="text-gray-400" /> Year
              </label>
              <MultiSelectDropdown
                data={yearOptions}
                placeholder="Select Years"
                selectedOption={(localFilters.year || []).map((y: any) => String(y))}
                onChange={(selected: any) => {
                  const values = selected.map((s: any) => Number(s.value));
                  setLocalFilters({ ...localFilters, year: values });
                }}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1 text-sm">
                <FaUniversity className="text-gray-400" /> Institution
              </label>
              <MultiSelectDropdown
                data={investorOptions.map((opt: any) => ({
                  ...opt,
                  isDisabled:
                    (localFilters.investor_company || []).length >= 5 &&
                    !(localFilters.investor_company || []).includes(opt.value),
                }))}
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
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1 text-sm">
                <FaLayerGroup className="text-gray-400" /> Index
              </label>
              <select
                value={localFilters.index || "S&P 500"}
                onChange={(e) => setLocalFilters({ ...localFilters, index: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#8b1828] focus:ring-[#8b1828]"
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
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1 text-sm">
                <FaLayerGroup className="text-gray-400" /> Category
              </label>
              <select
                value={localFilters.category || "Say on Pay"}
                onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#8b1828] focus:ring-[#8b1828]"
                style={{ minHeight: "42px" }}
              >
                <option value="Say on Pay">Say on Pay</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1 text-sm">
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
              <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1 text-sm">
                <Lucide icon="Search" className="w-4 h-4 text-gray-400" /> Keyword
              </label>
              <input
                type="text"
                value={localFilters.keyword || ""}
                placeholder="Search companies, proposals, votes..."
                onChange={(e) => setLocalFilters({ ...localFilters, keyword: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#8b1828] focus:ring-[#8b1828] focus:outline-none"
                style={{ minHeight: "42px" }}
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

      {loading && !data ? (
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
  );
};

export default ExecutiveCompensation;

