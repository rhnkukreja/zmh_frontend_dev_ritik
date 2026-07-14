import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { proxyContestAIService, setProxyContestSettledMode } from "@/services/proxyContestAI";
import FiltersSidebar from "./components/FiltersSidebar";
import OverviewSummaryTable from "./components/OverviewSummaryTable";
import CompaniesTable from "./components/CompaniesTable";
import VotingRecordsList from "./components/VotingRecordsList";
import ProxyContestModal from "../ProxyContest/components/ProxyContestModal";
import ActivistIntelligenceDashboard from "../AIChatbot/ActivistDashboard"; 
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { toast } from "react-toastify";
import axios from "axios";
import { AI_CHATBOT_API_BASE } from '@/pages/AIChatbot/api';
import { Popover, Dialog, Menu } from "@/components/Base/Headless";

type ProxyContestTabKey = "overview" | "detailed" | "activist_profile";

const DEFAULT_INSTITUTION_IDS = [33, 34];
const DEFAULT_YEARS = ["2025", "2026"];

// ── In-memory data cache with TTL (clears on page refresh) ─────────────────
const DATA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const _dataCache = new Map<string, { data: any; ts: number }>();
const cacheGet = (key: string): any => {
  const entry = _dataCache.get(key);
  if (entry && Date.now() - entry.ts < DATA_CACHE_TTL) return entry.data;
  return null;
};
const cacheSet = (key: string, data: any) => _dataCache.set(key, { data, ts: Date.now() });
const cacheClear = () => _dataCache.clear();

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
  const isAdmin = user?.user_type === "Admin";
  const isAdminOrAnalyst = isAdmin || user?.user_type === "Analyst";

  const [activeTab, setActiveTab] = useState<ProxyContestTabKey>(() => {
    const saved = loadF("activeTab");
    return (saved as ProxyContestTabKey) ?? "activist_profile";
  });
  const setActiveTabPersisted = (tab: ProxyContestTabKey) => {
    setActiveTab(tab);
    saveF("activeTab", tab);
  };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [generateProfileSignal, setGenerateProfileSignal] = useState(0);
  const [splitAction, setSplitAction] = useState<"add" | "generate">("add");
  const [editInitialData, setEditInitialData] = useState<any>(null);

  // ── Edit handler ─────────────────────────────────────────────────────────────
  const openEditModal = async (company: any) => {
    try {
      const data = await proxyContestAIService.getActivismTables(
        company.company_name,
        company.year ? [String(company.year)] : undefined
      );
      const selectedYear = String(company.year || "");
      const presentations = Array.isArray(data?.Activism_Presentation) ? data.Activism_Presentation : [];
      const pressReleases = Array.isArray(data?.Activism_Press_Release) ? data.Activism_Press_Release : [];
      const allDocs = [
        ...presentations.map((item: any) => ({
          id: item?.id,
          year: String(item?.year || selectedYear || ""),
          keyword: String(item?.keyword || "Presentation"),
          documentName: String(item?.document_name || ""),
          activistName: String(item?.activist_name || ""),
          documentDate: String(item?.document_date || ""),
          isCompanyActivist: item?.is_company_activist || "company",
          existingDocumentUrl: String(item?.document_url || ""),
        })),
        ...pressReleases.map((item: any) => ({
          id: item?.id,
          year: String(item?.year || selectedYear || ""),
          keyword: String(item?.keyword || "Press Release"),
          documentName: String(item?.document_name || ""),
          activistName: String(item?.activist_name || ""),
          documentDate: String(item?.document_date || ""),
          isCompanyActivist: item?.is_company_activist || "company",
          existingDocumentUrl: String(item?.document_url || ""),
        })),
      ];
      const recommendations = Array.isArray(data?.Activism_ISS_GL) ? data.Activism_ISS_GL : [];
      const issRow = recommendations.find((r: any) => String(r?.type || "").toUpperCase() === "ISS");
      const glRow = recommendations.find((r: any) => String(r?.type || "").toUpperCase() === "GL");
      setEditInitialData({
        company: { id: Number(company.company_id || 0), name: company.company_name },
        documents: allDocs,
        advisory: {
          iss: { id: issRow?.id, management: Boolean(issRow?.management), activist: Boolean(issRow?.activist), split: Boolean(issRow?.split) },
          gl:  { id: glRow?.id,  management: Boolean(glRow?.management),  activist: Boolean(glRow?.activist),  split: Boolean(glRow?.split)  },
        },
      });
      setEditModalOpen(true);
    } catch {
      /* silent */
    }
  };

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

  // ── Voting records Excel download ─────────────────────────────────────────
  const [vrDownloading, setVrDownloading] = useState(false);

  // ── Settled / excluded campaigns (admin audit view) ────────────────────────
  const [includeSettled, setIncludeSettled] = useState(false);

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
  const fetchFilters = useCallback(async (years: string[], tab: ProxyContestTabKey = "overview", instIds?: number[]) => {
    const cacheKey = `filters_${tab}_${years.join(",")}_${(instIds || []).join(",")}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setFiltersData(cached); return; }
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
      cacheSet(cacheKey, data);
    } catch {} finally {
      if (id === filtersFetchId.current) setFiltersLoading(false);
    }
  }, []);

  // ── Fetch summary stats + VR page 1 (on filter change) ──────────────────────
  const fetchSummaryStats = useCallback(async (
    years: string[], instIds: number[], companyIds: number[],
    vrPageNum = 1, iss?: string | null, gl?: string | null, investorSupport?: boolean
  ) => {
    const cacheKey = `summary_${years.join(",")}_${instIds.join(",")}_${companyIds.join(",")}_${vrPageNum}_${iss}_${gl}_${investorSupport}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setSummaryData(cached.summary); setVotingRecordsData(cached.vr); return; }
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
      cacheSet(cacheKey, { summary: data?.summary ?? data, vr: data?.voting_records ?? null });
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
    const cacheKey = `companies_${years.join(",")}_${instIds.join(",")}_${activists.join(",")}_${companyIds.join(",")}_${page}_${iss}_${gl}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setCompaniesData(cached); return; }
    const id = ++companiesFetchId.current;
    setCompaniesLoading(true);
    try {
      const data = await proxyContestAIService.getCompanies({
        year: years.length ? years : undefined,
        institution_id: instIds.length ? instIds : undefined,
        activist_name: activists.length ? activists : undefined,
        company_id: companyIds.length ? companyIds : undefined,
        page,
        page_size: 20,
        iss_support: iss || undefined,
        gl_support: gl || undefined,
      });
      if (id !== companiesFetchId.current) return;
      setCompaniesData(data);
      cacheSet(cacheKey, data);
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
  const prevTab = useRef<ProxyContestTabKey>("activist_profile");
  
  useEffect(() => {
    if (prevTab.current === activeTab) return;
    prevTab.current = activeTab;
    const years = activeTab === "overview" ? ovYears : dtYears;
    const instIds = activeTab === "overview" ? ovInstIds : undefined;
    fetchFilters(years, activeTab, instIds);
  }, [activeTab]);

  // ── Auto-prune stale company filters ─────────────────────────────────────────
  // When the loaded filter options no longer contain a selected company (e.g. it
  // doesn't exist for the current year/institution selection), drop that
  // company_id and re-call the data API without it so the flow doesn't get stuck
  // sending a company that no longer exists in the filter options.`

 


  useEffect(() => {
    if (filtersLoading || !filtersData || !Array.isArray(filtersData.companies)) return;
    const validIds = new Set<number>(
      (filtersData.companies as any[]).map((c) => c.company_id)
    );
    if (activeTab === "detailed") {
      const next = dtCompanyIds.filter((id) => validIds.has(id));
      if (next.length !== dtCompanyIds.length) {
        setDtCompanyIds(next);
        fetchCompanies(dtYears, dtInstIds, dtActivists, next, 1, dtIss, dtGl);
        setCompaniesPage(1);
      }
    } else if (activeTab === "overview") {
      const next = ovCompanyIds.filter((id) => validIds.has(id));
      if (next.length !== ovCompanyIds.length) {
        setOvCompanyIds(next);
        fetchSummaryStats(ovYears, ovInstIds, next, 1, ovIss, ovGl, ovInvestorSupport);
        setVrPage(1);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersData, filtersLoading, activeTab]);

  // useEffect(() => {
  //   if (!isAdmin && activeTab === "activist_profile") {
  //     setActiveTab("overview");
  //   }
  // }, [activeTab, isAdmin]);

  // const tabs = [
  //   { key: "overview", label: "Overview", icon: "BarChart3" },
  //   { key: "activist_profile", label: "Activism Profile", icon: "UserRound" },
  //   { key: "detailed", label: "Detailed View", icon: "Table" },
  //   ...(isAdmin ? [{ key: "activist_profile", label: "Activist Profile", icon: "UserRound" }] : []),
  // ] as Array<{ key: ProxyContestTabKey; label: string; icon: string }>;


  const tabs = [
    { key: "activist_profile", label: "Activist Profile", icon: "UserRound" },
    { key: "overview", label: "Voting Analytics", icon: "BarChart3" },
    { key: "detailed", label: "Campaign Details", icon: "Table" },
    // ...(isAdmin ? [{ key: "activist_profile", label: "Activist Profile", icon: "UserRound" }] : []),
  ] as Array<{ key: ProxyContestTabKey; label: string; icon: string }>;
  
      
      
     
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

  // ── Download all voting records matching current overview filters as Excel ───
  const handleDownloadVotingRecords = async () => {
    setVrDownloading(true);
    try {
      const blob = await proxyContestAIService.downloadVotingRecordsExcel({
        year: ovYears.length ? ovYears : undefined,
        institution_id: ovInstIds.length ? ovInstIds : undefined,
        company_id: ovCompanyIds.length ? ovCompanyIds : undefined,
        iss_support: ovIss || undefined,
        gl_support: ovGl || undefined,
        investor_support_activist: ovInvestorSupport || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "voting_records.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      /* silent */
    } finally {
      setVrDownloading(false);
    }
  };

  // ── Toggle settled/excluded campaigns visibility & refetch everything ───────
  const toggleIncludeSettled = () => {
    const next = !includeSettled;
    setIncludeSettled(next);
    setProxyContestSettledMode(next ? "Include" : undefined);
    _dataCache.clear();
    fetchFilters(activeTab === "overview" ? ovYears : dtYears, activeTab, activeTab === "overview" ? ovInstIds : undefined);
    fetchSummaryStats(ovYears, ovInstIds, ovCompanyIds, 1, ovIss, ovGl, ovInvestorSupport);
    setVrPage(1);
    fetchCompanies(dtYears, dtInstIds, dtActivists, dtCompanyIds, 1, dtIss, dtGl);
    setCompaniesPage(1);
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

  // ── Sticky header height measurement (for sidebar sticky-top offset) ────────
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const [stickyHeaderH, setStickyHeaderH] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = stickyHeaderRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStickyHeaderH(el.offsetHeight));
    ro.observe(el);
    setStickyHeaderH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

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


  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [newInvestorName, setNewInvestorName] = useState<string>("");
  const [selectedJsonFiles, setSelectedJsonFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null);

 const handleJsonUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvestorName || selectedJsonFiles.length === 0) {
      toast.error("Please provide both an investor name and select at least one JSON file.");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("investor_name", newInvestorName);
    
    selectedJsonFiles.forEach(file => {
      formData.append("files", file);
    });

    try {
      // 🛑 1. Hit the PREVIEW endpoint instead of upload
      const response = await axios.post(`${AI_CHATBOT_API_BASE}/api/activist-profiles/preview-multi`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      // 🛑 2. Save the preview data to state to pass to the Dashboard
      setPreviewData(response.data?.data);
      
      toast.info("Preview generated! Please review and click 'Approve & Publish' below.");
      setUploadModalOpen(false);
      setNewInvestorName("");
      setSelectedJsonFiles([]); 
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate profile preview.");
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 7rem)" }}>

      {/* ── Sticky top bar: header + tabs + chips + warning ───────────────── */}
      <div
        ref={stickyHeaderRef}
        className="sticky z-30 bg-[#f1f5f9]"
        style={{ top: "4rem" }}
      >
       {/* Page header card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <span className="text-slate-400">Shared Research</span>
            <Lucide icon="ChevronRight" className="w-5 h-5 text-slate-300" />
            <span>Proxy Contest</span>
            <Lucide icon="ChevronRight" className="w-5 h-5 text-slate-300" />
            <span className="text-primary">
              {tabs.find((tabItem) => tabItem.key === activeTab)?.label}
            </span>
          </h2>
          
          <div className="flex items-center gap-3">
            {/* 
               PRODUCTION BOUNDARY GATING: 
               Verifies the global store credentials so that only authenticated Admins 
               or Analysts can view or use the system mode toggle.
            */}
            {activeTab === "activist_profile" && (user?.user_type === "Admin" || user?.user_type === "Analyst") && (
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 h-[38px] items-center">
                <button
                  onClick={() => setIsAdminMode(false)}
                  className={clsx(
                    "px-4 py-1 text-sm font-semibold rounded-md transition-all duration-200",
                    !isAdminMode ? "bg-[#10b981] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  User View
                </button>
                <button
                  onClick={() => setIsAdminMode(true)}
                  className={clsx(
                    "px-4 py-1 text-sm font-semibold rounded-md transition-all duration-200",
                    isAdminMode ? "bg-[#8b1828] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Admin View
                </button>
              </div>
            )}

            {/* Show Upload Button ONLY in Admin Mode */}
            {activeTab === "activist_profile" && isAdminMode && (
              <Button
                variant="outline-primary"
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-2 !border-[#8b1828] !text-[#8b1828] hover:!bg-[#8b1828] hover:!text-white hover:!opacity-100 h-[38px] transition-colors"
              >
                <Lucide icon="UploadCloud" className="w-4 h-4" />
                Upload Activist Profile
              </Button>
            )}

            {/* Add Proxy Contest split button — main action + dropdown for related actions */}
            {isAdminOrAnalyst && (
              <div className="inline-flex h-[38px] rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    if (splitAction === "add") {
                      setAddModalOpen(true);
                    } else {
                      setActiveTabPersisted("activist_profile");
                      setGenerateProfileSignal((v) => v + 1);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 text-sm font-medium text-white bg-primary border border-primary rounded-l-md hover:bg-primary/90 transition-colors whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                >
                  <Lucide icon={splitAction === "add" ? "Plus" : "Sparkles"} className="w-4 h-4" />
                  {splitAction === "add" ? "Add Proxy Contest" : "Generate Activism Profile"}
                </button>
                <Menu as="div" className="relative flex">
                  <Menu.Button
                    as="button"
                    className="flex items-center justify-center w-9 h-full bg-primary border border-l-0 border-primary rounded-r-md text-white hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                  >
                    <Lucide icon="ChevronDown" className="w-4 h-4" />
                  </Menu.Button>
                  {/* ── UPDATE THIS SECTION IN YOUR CODE ── */}
                  <Menu.Items placement="bottom-end" className="w-[200px] mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1 z-40">
                  {splitAction !== "add" && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          className={clsx(
                            "w-full px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-slate-700 whitespace-nowrap text-left",
                            active ? "bg-slate-100 text-slate-900" : "bg-white"
                          )}
                          onClick={() => setSplitAction("add")}
                        >
                          Add Proxy Contest
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  {splitAction !== "generate" && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          className={clsx(
                            "w-full px-3 py-9.5 text-xs font-medium rounded-md transition-colors text-slate-700 whitespace-nowrap text-left",
                            active ? "bg-slate-100 text-slate-900" : "bg-white"
                          )}
                          onClick={() => {
                            setSplitAction("generate");
                            setActiveTabPersisted("activist_profile");
                            setGenerateProfileSignal((v) => v + 1);
                          }}
                        >
                          Generate Activism Profile
                        </button>
                      )}
                    </Menu.Item>
                  )}
                </Menu.Items>
                </Menu>
              </div>
            )}
          </div>
        </div>

        {/* Tabs + Hide/Show Filters */}
        <div className="flex items-center justify-between mb-3">
          <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm flex items-center gap-1">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.key}
                onClick={() => setActiveTabPersisted(tabItem.key)}
                className={clsx(
                  "relative px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
                  activeTab === tabItem.key
                    ? "bg-primary text-white shadow"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Lucide icon={tabItem.icon as any} className="w-4 h-4" />
                  {tabItem.label}
                </span>
                {(tabItem.key === "overview" || tabItem.key === "activist_profile") && (
                  <span className="pointer-events-none absolute -top-2 -right-2 inline-flex items-center rounded-full bg-orange-500 px-[5px] py-[1px] text-[8px] font-bold uppercase tracking-[0.08em] text-white shadow-sm animate-pulse">
                    BETA
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeTab !== "activist_profile" && (
            <div className="flex items-center gap-2">
              {isAdminOrAnalyst && (
                <button
                  onClick={toggleIncludeSettled}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap",
                    includeSettled
                      ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <Lucide icon={includeSettled ? "EyeOff" : "Eye"} className="w-4 h-4" />
                  {includeSettled ? "Including Settled" : "Include Settled"}
                </button>
              )}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors whitespace-nowrap"
              >
                <Lucide icon={sidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} className="w-4 h-4" />
                {sidebarOpen ? "Hide Filters" : "Show Filters"}
              </button>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && activeTab !== "activist_profile" && (
          <div className="flex flex-wrap items-center gap-2 pb-3">
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
          </div>
        )}

        {/* Institution enforcement warning */}
        {warnMsg && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 mt-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <Lucide icon="AlertTriangle" className="w-4 h-4 flex-shrink-0 text-amber-500" />
            {warnMsg}
          </div>
        )}
      </div>

      {/* ── Body: sidebar (sticky) + content ─────────────────────────────── */}
      <div className="flex gap-6 flex-1 min-h-0 items-start">

        {/* Filters sidebar — sticky, stays in document flow (never overlaps content) */}
        {sidebarOpen && activeTab !== "activist_profile" && (
          <div
            className="w-64 flex-shrink-0 sticky"
            style={{
              top: `calc(4rem + ${stickyHeaderH}px + 0.75rem)`,
              height: `calc(100vh - 4rem - ${stickyHeaderH}px - 1.5rem)`,
            }}
          >
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

        {/* Main content — takes remaining space */}
        <div className="flex-1 min-w-0 pb-10">
          {activeTab === "overview" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Lucide icon="BarChart3" className="w-5 h-5 text-primary" />
                  Voting Summary
                </h3>
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
                onDownload={handleDownloadVotingRecords}
                downloading={vrDownloading}
              />
            </div>
          )}
        
          {activeTab === "detailed" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
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
                isAdminOrAnalyst={isAdminOrAnalyst}
                onEdit={openEditModal}
              />
            </div>
          )}

          {/* {isAdmin && activeTab === "activist_profile" && (
            <ActivistIntelligenceDashboard />
          )} */}

          {/* ── PASS THE MODE TOGGLE DOWN AS A LIFETIME PROP ── */}
{activeTab === "activist_profile" && (
  <ActivistIntelligenceDashboard
    isAdminMode={isAdminMode}
    externalPreviewData={previewData}
    onPreviewPublished={() => setPreviewData(null)}
    openGenerateModalSignal={generateProfileSignal}
  />
)}
        </div>
      </div>
      
      {/* Upload Investor JSON Modal */}
      {uploadModalOpen && (
        <Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)}>
          <Dialog.Panel className="p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-[#8b1828]">Upload Investor Profile Payload</h2>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors">
                <Lucide icon="X" className="w-5 h-5" />
              </button>
            </div>
            
            {/* ADDED INSTRUCTIONAL TEXT HERE */}
            <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">
              Upload distinct data files (13F, Campaigns, Investor Profile). The Engine will synthesize the data and index it onto the cluster.
            </p>
            
            <form onSubmit={handleJsonUploadSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Investor Name <span className="text-danger">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={newInvestorName} 
                  onChange={(e) => setNewInvestorName(e.target.value)} 
                  placeholder="e.g. Elliott Investment Management" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Data Modules (.json fragments) <span className="text-danger">*</span>
                </label>
                <input 
                  type="file" 
                  multiple 
                  accept=".json" 
                  value={""} // Prevents overwrite bug if selecting the same file twice
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      setSelectedJsonFiles((prevFiles) => [...prevFiles, ...newFiles]);
                    }
                  }} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none text-sm text-slate-600" 
                />
              </div>

              {/* Visual list of currently queued files */}
              {selectedJsonFiles.length > 0 && (
                <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    Selected Files ({selectedJsonFiles.length}):
                  </p>
                  <ul className="flex flex-col gap-2">
                    {selectedJsonFiles.map((file, idx) => (
                      <li key={idx} className="flex justify-between items-center text-xs text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-md shadow-sm">
                        <span className="truncate pr-4">{file.name}</span>
                        <button 
                          type="button"
                          onClick={() => setSelectedJsonFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-[#8b1828] font-bold hover:underline shrink-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 border-t border-slate-100 pt-5">
                <Button 
                  type="button" 
                  variant="outline-secondary" 
                  onClick={() => {
                    setUploadModalOpen(false);
                    setSelectedJsonFiles([]);
                    setNewInvestorName("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isUploading} className="min-w-[150px] bg-[#8b1828]">
  {isUploading ? "Processing..." : "Generate Preview"}
</Button>
              </div>
            </form>
          </Dialog.Panel>
        </Dialog>
      )}

      {/* Add Proxy Contest modal — Admin / Analyst only */}
      {isAdminOrAnalyst && (
        <ProxyContestModal
          open={addModalOpen}
          mode="add"
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => {
            setAddModalOpen(false);
            cacheClear();
            fetchCompanies(dtYears, dtInstIds, dtActivists, dtCompanyIds, 1, dtIss, dtGl);
          }}
        />
      )}
      {isAdminOrAnalyst && (
        <ProxyContestModal
          open={editModalOpen}
          mode="edit"
          initialData={editInitialData}
          onClose={() => { setEditModalOpen(false); setEditInitialData(null); }}
          onSuccess={() => {
            setEditModalOpen(false);
            setEditInitialData(null);
            // Exclusion/edit changes server data; drop the in-memory cache so the
            // refetch hits the network and the excluded company is removed.
            cacheClear();
            fetchFilters(dtYears, "detailed");
            fetchCompanies(dtYears, dtInstIds, dtActivists, dtCompanyIds, companiesPage, dtIss, dtGl);
          }}
        />
      )}
    </div>
  );
}

export default ProxyContestAI;