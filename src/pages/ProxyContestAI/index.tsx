import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { proxyContestAIService } from "@/services/proxyContestAI";
import FiltersSidebar from "./components/FiltersSidebar";
import OverviewSummaryTable from "./components/OverviewSummaryTable";
import CompaniesTable from "./components/CompaniesTable";
import VotingRecordsList from "./components/VotingRecordsList";
import ProxyContestModal from "../ProxyContest/components/ProxyContestModal";
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";

const DEFAULT_INSTITUTION_IDS = [33, 34];
const DEFAULT_YEARS = ["2025", "2026"];

type TabKey = "overview" | "detailed";

// ── localStorage persistence (keyed by token so it clears on logout) ──────────
const getTokenSlice = () => (localStorage.getItem("token") || "").slice(-8);
const storageKey = (tab: string) => `pcai_v3_${tab}_${getTokenSlice()}`;
const loadF = (tab: string): any => {
  try { return JSON.parse(localStorage.getItem(storageKey(tab)) || "null"); } catch { return null; }
};
const saveF = (tab: string, data: any) => {
  try { localStorage.setItem(storageKey(tab), JSON.stringify(data)); } catch {}
};

function ProxyContestAI() {
  const { user } = useAppSelector((state: RootState) => state.authentiction);
  const isAdminOrAnalyst = user?.user_type === "Admin" || user?.user_type === "Analyst";

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // ── Overview filters (persisted per-tab) ────────────────────────────────────
  const [ovYears, setOvYears] = useState<string[]>(() => loadF("overview")?.years ?? DEFAULT_YEARS);
  const [ovInstIds, setOvInstIds] = useState<number[]>(() => loadF("overview")?.instIds ?? DEFAULT_INSTITUTION_IDS);
  const [ovInvestorSupport, setOvInvestorSupport] = useState<boolean>(() => loadF("overview")?.investorSupport ?? false);
  const [ovCompanyIds, setOvCompanyIds] = useState<number[]>(() => loadF("overview")?.companyIds ?? []);
  const [ovIss, setOvIss] = useState<string | null>(() => loadF("overview")?.iss ?? null);
  const [ovGl, setOvGl] = useState<string | null>(() => loadF("overview")?.gl ?? null);

  // ── Detailed filters (persisted per-tab) ────────────────────────────────────
  const [dtYears, setDtYears] = useState<string[]>(() => loadF("detailed")?.years ?? DEFAULT_YEARS);
  const [dtInstIds, setDtInstIds] = useState<number[]>(() => loadF("detailed")?.instIds ?? DEFAULT_INSTITUTION_IDS);
  const [dtActivists, setDtActivists] = useState<string[]>(() => loadF("detailed")?.activists ?? []);
  const [dtIss, setDtIss] = useState<string | null>(() => loadF("detailed")?.iss ?? null);
  const [dtGl, setDtGl] = useState<string | null>(() => loadF("detailed")?.gl ?? null);
  const [dtCompanyIds, setDtCompanyIds] = useState<number[]>(() => loadF("detailed")?.companyIds ?? []);

  // Persist overview filters on change
  useEffect(() => {
    saveF("overview", { years: ovYears, instIds: ovInstIds, investorSupport: ovInvestorSupport, companyIds: ovCompanyIds, iss: ovIss, gl: ovGl });
  }, [ovYears, ovInstIds, ovInvestorSupport, ovCompanyIds, ovIss, ovGl]);

  // Persist detailed filters on change
  useEffect(() => {
    saveF("detailed", { years: dtYears, instIds: dtInstIds, activists: dtActivists, iss: dtIss, gl: dtGl, companyIds: dtCompanyIds });
  }, [dtYears, dtInstIds, dtActivists, dtIss, dtGl, dtCompanyIds]);

  // ── Filter options (from API) ────────────────────────────────────────────────
  const [filtersData, setFiltersData] = useState<any>(null);
  const [filtersLoading, setFiltersLoading] = useState(false);

  // ── Overview data ────────────────────────────────────────────────────────────
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [votingRecordsData, setVotingRecordsData] = useState<any>(null);
  const [vrLoading, setVrLoading] = useState(false);
  const [vrPage, setVrPage] = useState(1);

  // ── Detailed data ────────────────────────────────────────────────────────────
  const [companiesData, setCompaniesData] = useState<any>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesPage, setCompaniesPage] = useState(1);

  // ── Inline warning for institution enforcement ───────────────────────────────
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showWarn = (msg: string) => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    setWarnMsg(msg);
    warnTimer.current = setTimeout(() => setWarnMsg(null), 4000);
  };

  // ── Fetch refs ───────────────────────────────────────────────────────────────
  const filtersFetchId = useRef(0);
  const summaryFetchId = useRef(0);
  const vrFetchId = useRef(0);
  const companiesFetchId = useRef(0);

  // ── Fetch filters ────────────────────────────────────────────────────────────
  const fetchFilters = useCallback(async (years: string[], tab: TabKey = "overview", instIds?: number[]) => {
    const id = ++filtersFetchId.current;
    setFiltersLoading(true);
    try {
      const data = tab === "overview"
        ? await proxyContestAIService.getSummaryFilters(
            years.length ? years : undefined,
            instIds && instIds.length ? instIds : undefined
          )
        : await proxyContestAIService.getOverviewFilters(years.length ? years : undefined);
      if (id !== filtersFetchId.current) return;
      setFiltersData(data);
    } catch {} finally {
      if (id === filtersFetchId.current) setFiltersLoading(false);
    }
  }, []);

  // ── Fetch summary stats + VR page 1 (on filter change) ──────────────────────
  const fetchSummaryStats = useCallback(async (
    years: string[], instIds: number[], companyIds: number[],
    vrPageNum = 1, iss?: string | null, gl?: string | null, investorSupport?: boolean
  ) => {
    const id = ++summaryFetchId.current;
    setSummaryLoading(true);
    try {
      const data = await proxyContestAIService.getOverviewSummary({
        year: years.length ? years : undefined,
        institution_id: instIds.length ? instIds : undefined,
        company_id: companyIds.length ? companyIds : undefined,
        iss_support: iss || undefined,
        gl_support: gl || undefined,
        investor_support_activist: investorSupport || undefined,
        vr_page: vrPageNum,
        vr_page_size: 10,
      });
      if (id !== summaryFetchId.current) return;
      setSummaryData(data?.summary ?? data);
      setVotingRecordsData(data?.voting_records ?? null);
    } catch {} finally {
      if (id === summaryFetchId.current) setSummaryLoading(false);
    }
  }, []);

  // ── Fetch only voting records (VR page change — does NOT reload summary) ─────
  const fetchVotingRecordsOnly = useCallback(async (
    years: string[], instIds: number[], companyIds: number[],
    vrPageNum: number, iss?: string | null, gl?: string | null, investorSupport?: boolean
  ) => {
    const id = ++vrFetchId.current;
    setVrLoading(true);
    try {
      const data = await proxyContestAIService.getOverviewSummary({
        year: years.length ? years : undefined,
        institution_id: instIds.length ? instIds : undefined,
        company_id: companyIds.length ? companyIds : undefined,
        iss_support: iss || undefined,
        gl_support: gl || undefined,
        investor_support_activist: investorSupport || undefined,
        vr_page: vrPageNum,
        vr_page_size: 10,
      });
      if (id !== vrFetchId.current) return;
      setVotingRecordsData(data?.voting_records ?? null);
    } catch {} finally {
      if (id === vrFetchId.current) setVrLoading(false);
    }
  }, []);

  // ── Fetch companies (detailed) ───────────────────────────────────────────────
  const fetchCompanies = useCallback(async (
    years: string[], instIds: number[], activists: string[], companyIds: number[],
    page: number, iss?: string | null, gl?: string | null
  ) => {
    const id = ++companiesFetchId.current;
    setCompaniesLoading(true);
    try {
      const data = await proxyContestAIService.getCompanies({
        year: years.length ? years : undefined,
        institution_id: instIds.length ? instIds : undefined,
        activist_name: activists.length ? activists : undefined,
        company_id: companyIds.length ? companyIds : undefined,
        page,
        page_size: 10,
        iss_support: iss || undefined,
        gl_support: gl || undefined,
      });
      if (id !== companiesFetchId.current) return;
      setCompaniesData(data);
    } catch {} finally {
      if (id === companiesFetchId.current) setCompaniesLoading(false);
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchFilters(ovYears, "overview", ovInstIds);
    fetchSummaryStats(ovYears, ovInstIds, ovCompanyIds, 1, ovIss, ovGl, ovInvestorSupport);
    fetchCompanies(dtYears, dtInstIds, dtActivists, dtCompanyIds, 1, dtIss, dtGl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refetch filters when switching tabs ──────────────────────────────────────
  const prevTab = useRef<TabKey>("overview");
  useEffect(() => {
    if (prevTab.current === activeTab) return;
    prevTab.current = activeTab;
    const years = activeTab === "overview" ? ovYears : dtYears;
    const instIds = activeTab === "overview" ? ovInstIds : undefined;
    fetchFilters(years, activeTab, instIds);
  }, [activeTab]);

  // ── Overview toggle helpers ──────────────────────────────────────────────────
  const ovToggleYear = (y: string) => {
    const next = ovYears.includes(y) ? ovYears.filter(x => x !== y) : [...ovYears, y];
    setOvYears(next); fetchFilters(next, "overview", ovInstIds);
    fetchSummaryStats(next, ovInstIds, ovCompanyIds, 1, ovIss, ovGl, ovInvestorSupport); setVrPage(1);
  };
  const ovToggleInst = (id: number) => {
    if (ovInstIds.includes(id) && ovInstIds.length <= 1) {
      showWarn("At least one institution must be selected. Please add another institution before removing this one.");
      return;
    }
    const next = ovInstIds.includes(id) ? ovInstIds.filter(x => x !== id) : [...ovInstIds, id];
    setOvInstIds(next);
    fetchFilters(ovYears, "overview", next);
    fetchSummaryStats(ovYears, next, ovCompanyIds, 1, ovIss, ovGl, ovInvestorSupport); setVrPage(1);
  };
  const ovToggleInvestorSupport = () => {
    const next = !ovInvestorSupport;
    setOvInvestorSupport(next);
    fetchSummaryStats(ovYears, ovInstIds, ovCompanyIds, 1, ovIss, ovGl, next); setVrPage(1);
  };
  const ovToggleCompany = (id: number) => {
    const next = ovCompanyIds.includes(id) ? ovCompanyIds.filter(x => x !== id) : [...ovCompanyIds, id];
    setOvCompanyIds(next);
    fetchSummaryStats(ovYears, ovInstIds, next, 1, ovIss, ovGl, ovInvestorSupport); setVrPage(1);
  };
  const ovToggleIss = (v: string) => {
    const next = ovIss === v ? null : v; setOvIss(next);
    fetchSummaryStats(ovYears, ovInstIds, ovCompanyIds, 1, next, ovGl, ovInvestorSupport); setVrPage(1);
  };
  const ovToggleGl = (v: string) => {
    const next = ovGl === v ? null : v; setOvGl(next);
    fetchSummaryStats(ovYears, ovInstIds, ovCompanyIds, 1, ovIss, next, ovInvestorSupport); setVrPage(1);
  };
  const ovClearAll = () => {
    setOvYears(DEFAULT_YEARS); setOvCompanyIds([]); setOvIss(null); setOvGl(null); setOvInvestorSupport(false);
    fetchFilters(DEFAULT_YEARS, "overview", ovInstIds);
    fetchSummaryStats(DEFAULT_YEARS, ovInstIds, [], 1, null, null, false); setVrPage(1);
  };

  // ── Detailed toggle helpers ──────────────────────────────────────────────────
  const dtToggleYear = (y: string) => {
    const next = dtYears.includes(y) ? dtYears.filter(x => x !== y) : [...dtYears, y];
    setDtYears(next); fetchFilters(next, "detailed");
    fetchCompanies(next, dtInstIds, dtActivists, dtCompanyIds, 1, dtIss, dtGl); setCompaniesPage(1);
  };
  const dtToggleInst = (id: number) => {
    const next = dtInstIds.includes(id) ? dtInstIds.filter(x => x !== id) : [...dtInstIds, id];
    setDtInstIds(next);
    fetchCompanies(dtYears, next, dtActivists, dtCompanyIds, 1, dtIss, dtGl); setCompaniesPage(1);
  };
  const dtToggleActivist = (n: string) => {
    const next = dtActivists.includes(n) ? dtActivists.filter(x => x !== n) : [...dtActivists, n];
    setDtActivists(next);
    fetchCompanies(dtYears, dtInstIds, next, dtCompanyIds, 1, dtIss, dtGl); setCompaniesPage(1);
  };
  const dtToggleIss = (v: string) => {
    const next = dtIss === v ? null : v; setDtIss(next);
    fetchCompanies(dtYears, dtInstIds, dtActivists, dtCompanyIds, 1, next, dtGl); setCompaniesPage(1);
  };
  const dtToggleGl = (v: string) => {
    const next = dtGl === v ? null : v; setDtGl(next);
    fetchCompanies(dtYears, dtInstIds, dtActivists, dtCompanyIds, 1, dtIss, next); setCompaniesPage(1);
  };
  const dtToggleCompany = (id: number) => {
    const next = dtCompanyIds.includes(id) ? dtCompanyIds.filter(x => x !== id) : [...dtCompanyIds, id];
    setDtCompanyIds(next);
    fetchCompanies(dtYears, dtInstIds, dtActivists, next, 1, dtIss, dtGl); setCompaniesPage(1);
  };
  const dtClearAll = () => {
    setDtYears(DEFAULT_YEARS); setDtInstIds(DEFAULT_INSTITUTION_IDS);
    setDtActivists([]); setDtIss(null); setDtGl(null); setDtCompanyIds([]);
    fetchFilters(DEFAULT_YEARS, "detailed");
    fetchCompanies(DEFAULT_YEARS, DEFAULT_INSTITUTION_IDS, [], [], 1, null, null); setCompaniesPage(1);
  };

  // ── Pagination ───────────────────────────────────────────────────────────────
  const handleCompaniesPageChange = (p: number) => {
    setCompaniesPage(p);
    fetchCompanies(dtYears, dtInstIds, dtActivists, dtCompanyIds, p, dtIss, dtGl);
  };
  const handleVrPageChange = (p: number) => {
    setVrPage(p);
    fetchVotingRecordsOnly(ovYears, ovInstIds, ovCompanyIds, p, ovIss, ovGl, ovInvestorSupport);
  };

  // ── Name lookup maps (fix institution chips showing IDs on initial render) ───
  const instNameMap = React.useMemo(() => {
    const m = new Map<number, string>();
    (filtersData?.institutions || []).forEach((i: any) => m.set(i.institution_id, i.institution_name));
    return m;
  }, [filtersData?.institutions]);

  const companyNameMap = React.useMemo(() => {
    const m = new Map<number, string>();
    (filtersData?.companies || []).forEach((c: any) => m.set(c.company_id, c.company_name));
    return m;
  }, [filtersData?.companies]);

  // Return null while filters haven't loaded yet or if the ID isn't in the API result
  const getInstName = (id: number): string | null => {
    if (!filtersData) return null;
    return instNameMap.get(id) ?? null;
  };
  const getCmpName = (id: number): string | null => {
    if (!filtersData) return null;
    return companyNameMap.get(id) ?? null;
  };

  // ── Active chips (per active tab) ────────────────────────────────────────────
  const ovChips = [
    ...ovYears.map(y => ({ label: `Year: ${y}`, onRemove: () => ovToggleYear(y) })),
    ...ovInstIds.filter(id => id != null && !isNaN(id)).flatMap(id => {
      const n = getInstName(id); return n ? [{ label: `Institution: ${n}`, onRemove: () => ovToggleInst(id) }] : [];
    }),
    ...(ovInvestorSupport ? [{ label: 'Investor supported activist', onRemove: ovToggleInvestorSupport }] : []),
    ...ovCompanyIds.filter(id => id != null).flatMap(id => {
      const n = getCmpName(id); return n ? [{ label: `Company: ${n}`, onRemove: () => ovToggleCompany(id) }] : [];
    }),
    ...(ovIss ? [{ label: `ISS: ${ovIss}`, onRemove: () => ovToggleIss(ovIss) }] : []),
    ...(ovGl  ? [{ label: `GL: ${ovGl}`,   onRemove: () => ovToggleGl(ovGl)   }] : []),
  ];
  const dtChips = [
    ...dtYears.map(y => ({ label: `Year: ${y}`, onRemove: () => dtToggleYear(y) })),
    ...dtInstIds.filter(id => id != null && !isNaN(id)).flatMap(id => {
      const n = getInstName(id); return n ? [{ label: `Institution: ${n}`, onRemove: () => dtToggleInst(id) }] : [];
    }),
    ...dtActivists.map(n => ({ label: `Activist: ${n}`, onRemove: () => dtToggleActivist(n) })),
    ...(dtIss ? [{ label: `ISS: ${dtIss}`, onRemove: () => dtToggleIss(dtIss) }] : []),
    ...(dtGl ? [{ label: `GL: ${dtGl}`, onRemove: () => dtToggleGl(dtGl) }] : []),
    ...dtCompanyIds.filter(id => id != null).flatMap(id => {
      const n = getCmpName(id); return n ? [{ label: `Company: ${n}`, onRemove: () => dtToggleCompany(id) }] : [];
    }),
  ];
  const activeChips = activeTab === "overview" ? ovChips : dtChips;
  const handleClearAll = activeTab === "overview" ? ovClearAll : dtClearAll;

  // ── Current tab's filter values for sidebar ──────────────────────────────────
  const curYears = activeTab === "overview" ? ovYears : dtYears;
  const curInstIds = activeTab === "overview" ? ovInstIds : dtInstIds;
  const curCompanyIds = activeTab === "overview" ? ovCompanyIds : dtCompanyIds;
  const curIss = activeTab === "overview" ? ovIss : dtIss;
  const curGl  = activeTab === "overview" ? ovGl  : dtGl;
  const curToggleYear    = activeTab === "overview" ? ovToggleYear    : dtToggleYear;
  const curToggleInst    = activeTab === "overview" ? ovToggleInst    : dtToggleInst;
  const curToggleCompany = activeTab === "overview" ? ovToggleCompany : dtToggleCompany;
  const curToggleIss     = activeTab === "overview" ? ovToggleIss     : dtToggleIss;
  const curToggleGl      = activeTab === "overview" ? ovToggleGl      : dtToggleGl;

  return (
    <div className="grid grid-cols-12 gap-y-4 gap-x-6 pb-10">
      {/* Page header — Case Studies style white card */}
      <div className="col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Proxy Contest AI</h2>
          {isAdminOrAnalyst && (
            <Button variant="primary" onClick={() => setAddModalOpen(true)}>
              <Lucide icon="Plus" className="w-4 h-4 mr-1.5" />
              Add Proxy Contest
            </Button>
          )}
        </div>
        {/* Tabs + Hide/Show Filters button (Admin/Analyst only) */}
        <div className="flex items-center justify-between">
          <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm flex items-center gap-1">
            {(["overview", "detailed"] as TabKey[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
                  activeTab === tab
                    ? "bg-primary text-white shadow"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                {tab === "overview" ? (
                  <span className="flex items-center gap-1.5">
                    <Lucide icon="BarChart3" className="w-4 h-4" />
                    Overview
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Lucide icon="Table" className="w-4 h-4" />
                    Detailed View
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors whitespace-nowrap"
            >
              <Lucide icon={sidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} className="w-4 h-4" />
              {sidebarOpen ? "Hide Filters" : "Show Filters"}
            </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="col-span-12 flex flex-wrap items-center gap-2 -mt-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Filters:
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full"
            >
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-primary/70">
                <Lucide icon="X" className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={handleClearAll}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Institution enforcement warning */}
      {warnMsg && (
        <div className="col-span-12 flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 -mt-1">
          <Lucide icon="AlertTriangle" className="w-4 h-4 flex-shrink-0 text-amber-500" />
          {warnMsg}
        </div>
      )}

      {/* Sidebar + content in same-height flex row */}
      <div className="col-span-12 flex gap-6">
        {/* Filters sidebar */}
        {sidebarOpen && (
          <div className="w-64 flex-shrink-0 self-stretch">
            <FiltersSidebar
              filtersData={filtersData}
              filtersLoading={filtersLoading}
              activeTab={activeTab}
              selectedYears={curYears}
              selectedInstIds={curInstIds}
              selectedCompanyIds={curCompanyIds}
              selectedInvestorSupport={ovInvestorSupport}
              selectedActivists={dtActivists}
              selectedIss={curIss}
              selectedGl={curGl}
              toggleYear={curToggleYear}
              toggleInst={curToggleInst}
              toggleCompany={curToggleCompany}
              toggleInvestorSupport={ovToggleInvestorSupport}
              toggleActivist={dtToggleActivist}
              toggleIss={curToggleIss}
              toggleGl={curToggleGl}
              onClearAll={handleClearAll}
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Tab content */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5" style={{ minHeight: "calc(100vh - 14rem)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Lucide icon="BarChart3" className="w-5 h-5 text-primary" />
                  Voting Summary
                </h3>
                {ovYears.length > 0 && (
                  <span className="text-sm text-slate-400">{ovYears.join(", ")}</span>
                )}
              </div>
              <OverviewSummaryTable
                summaryData={summaryData}
                loading={summaryLoading}
              />
              <VotingRecordsList
                votingRecords={votingRecordsData}
                loading={summaryLoading}
                vrLoading={vrLoading}
                page={vrPage}
                onPageChange={handleVrPageChange}
              />
            </div>
          )}

          {activeTab === "detailed" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5" style={{ minHeight: "calc(100vh - 14rem)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Lucide icon="Table" className="w-5 h-5 text-primary" />
                  Companies
                  {companiesData?.count != null && (
                    <span className="text-sm text-slate-400 font-normal">
                      ({companiesData.count} total)
                    </span>
                  )}
                </h3>
              </div>
              <CompaniesTable
                data={companiesData}
                loading={companiesLoading}
                page={companiesPage}
                onPageChange={handleCompaniesPageChange}
                institutionIds={dtInstIds}
              />
            </div>
          )}
        </div>
      </div>
      {/* Add Proxy Contest modal — Admin / Analyst only */}
      {isAdminOrAnalyst && (
        <ProxyContestModal
          open={addModalOpen}
          mode="add"
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => {
            setAddModalOpen(false);
            fetchCompanies(dtYears, dtInstIds, dtActivists, dtCompanyIds, 1, dtIss, dtGl);
          }}
        />
      )}
    </div>
  );
}

export default ProxyContestAI;
