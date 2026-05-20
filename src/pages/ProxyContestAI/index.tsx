import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Lucide from "@/components/Base/Lucide";
import { proxyContestAIService } from "@/services/proxyContestAI";
import FiltersSidebar from "./components/FiltersSidebar";
import OverviewSummaryTable from "./components/OverviewSummaryTable";
import CompaniesTable from "./components/CompaniesTable";
import VotingRecordsList from "./components/VotingRecordsList";

const DEFAULT_INSTITUTION_IDS = [33, 34];
const DEFAULT_YEARS = ["2025", "2026"];

type TabKey = "overview" | "detailed";

function ProxyContestAI() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Shared filter state ─────────────────────────────────────────────────────
  const [selectedYears, setSelectedYears] = useState<string[]>(DEFAULT_YEARS);
  const [selectedInstitutionIds, setSelectedInstitutionIds] = useState<number[]>(DEFAULT_INSTITUTION_IDS);
  const [selectedActivistNames, setSelectedActivistNames] = useState<string[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<string[]>([]);

  // ── ISS / GL support filters (Companies API only) ───────────────────────────
  const [selectedIssSupport, setSelectedIssSupport] = useState<string | null>(null);
  const [selectedGlSupport, setSelectedGlSupport] = useState<string | null>(null);

  // ── Filter options ──────────────────────────────────────────────────────────
  const [filtersData, setFiltersData] = useState<any>(null);
  const [filtersLoading, setFiltersLoading] = useState(false);

  // ── Overview tab data ───────────────────────────────────────────────────────
  const [summaryData, setSummaryData] = useState<any>(null);
  const [votingRecordsData, setVotingRecordsData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [vrPage, setVrPage] = useState(1);

  // ── Detailed tab data ───────────────────────────────────────────────────────
  const [companiesData, setCompaniesData] = useState<any>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesPage, setCompaniesPage] = useState(1);

  // ── Ref to track in-flight requests ────────────────────────────────────────
  const filtersFetchId = useRef(0);
  const summaryFetchId = useRef(0);
  const companiesFetchId = useRef(0);

  // ── Fetch overview filters (called when year changes) ───────────────────────
  const fetchFilters = useCallback(async (years: string[]) => {
    const id = ++filtersFetchId.current;
    setFiltersLoading(true);
    try {
      const data = await proxyContestAIService.getOverviewFilters(
        years.length > 0 ? years : undefined
      );
      if (id !== filtersFetchId.current) return;
      setFiltersData(data);
    } catch {
      /* silently ignore */
    } finally {
      if (id === filtersFetchId.current) setFiltersLoading(false);
    }
  }, []);

  // ── Fetch overview summary ──────────────────────────────────────────────────
  const fetchSummary = useCallback(
    async (years: string[], institutionIds: number[], votes: string[], vrPageNum = 1) => {
      const id = ++summaryFetchId.current;
      setSummaryLoading(true);
      try {
        const data = await proxyContestAIService.getOverviewSummary({
          year: years.length > 0 ? years : undefined,
          institution_id: institutionIds.length > 0 ? institutionIds : undefined,
          vote: votes.length > 0 ? votes : undefined,
          vr_page: vrPageNum,
          vr_page_size: 50,
        });
        if (id !== summaryFetchId.current) return;
        setSummaryData(data?.summary ?? data);
        setVotingRecordsData(data?.voting_records ?? null);
      } catch {
        /* silently ignore */
      } finally {
        if (id === summaryFetchId.current) setSummaryLoading(false);
      }
    },
    []
  );

  // ── Fetch companies (detailed view) ────────────────────────────────────────
  const fetchCompanies = useCallback(
    async (
      years: string[],
      institutionIds: number[],
      page: number,
      issSupport?: string | null,
      glSupport?: string | null
    ) => {
      const id = ++companiesFetchId.current;
      setCompaniesLoading(true);
      try {
        const data = await proxyContestAIService.getCompanies({
          year: years.length > 0 ? years : undefined,
          institution_id: institutionIds.length > 0 ? institutionIds : undefined,
          page,
          page_size: 10,
          iss_support: issSupport || undefined,
          gl_support: glSupport || undefined,
        });
        if (id !== companiesFetchId.current) return;
        setCompaniesData(data);
      } catch {
        /* silently ignore */
      } finally {
        if (id === companiesFetchId.current) setCompaniesLoading(false);
      }
    },
    []
  );

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchFilters(selectedYears);
    fetchSummary(selectedYears, selectedInstitutionIds, selectedVotes, 1);
    fetchCompanies(selectedYears, selectedInstitutionIds, 1, null, null);
  }, []);

  // ── When filters change, re-fetch everything ────────────────────────────────
  const applyFilters = useCallback(
    (
      years: string[],
      institutionIds: number[],
      activistNames: string[],
      votes: string[],
      issSupport?: string | null,
      glSupport?: string | null
    ) => {
      fetchSummary(years, institutionIds, votes, 1);
      setVrPage(1);
      fetchCompanies(years, institutionIds, 1, issSupport, glSupport);
      setCompaniesPage(1);
    },
    [fetchSummary, fetchCompanies]
  );

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  const toggleYear = (year: string) => {
    const next = selectedYears.includes(year)
      ? selectedYears.filter((y) => y !== year)
      : [...selectedYears, year];
    setSelectedYears(next);
    fetchFilters(next);
    applyFilters(next, selectedInstitutionIds, selectedActivistNames, selectedVotes, selectedIssSupport, selectedGlSupport);
  };

  const toggleInstitution = (id: number) => {
    const next = selectedInstitutionIds.includes(id)
      ? selectedInstitutionIds.filter((i) => i !== id)
      : [...selectedInstitutionIds, id];
    setSelectedInstitutionIds(next);
    applyFilters(selectedYears, next, selectedActivistNames, selectedVotes, selectedIssSupport, selectedGlSupport);
  };

  const toggleActivistName = (name: string) => {
    const next = selectedActivistNames.includes(name)
      ? selectedActivistNames.filter((n) => n !== name)
      : [...selectedActivistNames, name];
    setSelectedActivistNames(next);
    applyFilters(selectedYears, selectedInstitutionIds, next, selectedVotes, selectedIssSupport, selectedGlSupport);
  };

  const toggleVote = (vote: string) => {
    const next = selectedVotes.includes(vote)
      ? selectedVotes.filter((v) => v !== vote)
      : [...selectedVotes, vote];
    setSelectedVotes(next);
    applyFilters(selectedYears, selectedInstitutionIds, selectedActivistNames, next, selectedIssSupport, selectedGlSupport);
  };

  const toggleIssSupport = (val: string) => {
    const next = selectedIssSupport === val ? null : val;
    setSelectedIssSupport(next);
    fetchCompanies(selectedYears, selectedInstitutionIds, 1, next, selectedGlSupport);
    setCompaniesPage(1);
  };

  const toggleGlSupport = (val: string) => {
    const next = selectedGlSupport === val ? null : val;
    setSelectedGlSupport(next);
    fetchCompanies(selectedYears, selectedInstitutionIds, 1, selectedIssSupport, next);
    setCompaniesPage(1);
  };

  const handleClearAll = () => {
    setSelectedYears(DEFAULT_YEARS);
    setSelectedInstitutionIds(DEFAULT_INSTITUTION_IDS);
    setSelectedActivistNames([]);
    setSelectedVotes([]);
    setSelectedIssSupport(null);
    setSelectedGlSupport(null);
    fetchFilters(DEFAULT_YEARS);
    applyFilters(DEFAULT_YEARS, DEFAULT_INSTITUTION_IDS, [], [], null, null);
  };

  const handleCompaniesPageChange = (p: number) => {
    setCompaniesPage(p);
    fetchCompanies(selectedYears, selectedInstitutionIds, p, selectedIssSupport, selectedGlSupport);
  };

  const handleVrPageChange = (p: number) => {
    setVrPage(p);
    fetchSummary(selectedYears, selectedInstitutionIds, selectedVotes, p);
  };

  // ── Active filter chips ─────────────────────────────────────────────────────
  const activeChips: { label: string; onRemove: () => void }[] = [
    ...selectedYears.map((y) => ({
      label: `Year: ${y}`,
      onRemove: () => toggleYear(y),
    })),
    ...selectedInstitutionIds.map((id) => {
      const inst = filtersData?.institutions?.find((i: any) => i.institution_id === id);
      return {
        label: `Institution: ${inst?.institution_name || id}`,
        onRemove: () => toggleInstitution(id),
      };
    }),
    ...selectedActivistNames.map((n) => ({
      label: `Activist: ${n}`,
      onRemove: () => toggleActivistName(n),
    })),
    ...selectedVotes.map((v) => ({
      label: `Vote: ${v}`,
      onRemove: () => toggleVote(v),
    })),
    ...(selectedIssSupport ? [{ label: `ISS: ${selectedIssSupport}`, onRemove: () => toggleIssSupport(selectedIssSupport) }] : []),
    ...(selectedGlSupport ? [{ label: `GL: ${selectedGlSupport}`, onRemove: () => toggleGlSupport(selectedGlSupport) }] : []),
  ];

  return (
    <div className="grid grid-cols-12 gap-y-6 gap-x-6 pb-10">
      {/* Page header */}
      <div className="col-span-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Proxy Contest AI</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Institutional voting summaries &amp; activism documents
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <Lucide icon={sidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} className="w-4 h-4" />
            {sidebarOpen ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="col-span-12 flex flex-wrap items-center gap-2 -mt-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Filters:
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
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

      {/* Filters sidebar */}
      {sidebarOpen && <FiltersSidebar
        filtersData={filtersData}
        filtersLoading={filtersLoading}
        selectedYears={selectedYears}
        selectedInstitutionIds={selectedInstitutionIds}
        selectedActivistNames={selectedActivistNames}
        selectedVotes={selectedVotes}
        selectedIssSupport={selectedIssSupport}
        selectedGlSupport={selectedGlSupport}
        toggleYear={toggleYear}
        toggleInstitution={toggleInstitution}
        toggleActivistName={toggleActivistName}
        toggleVote={toggleVote}
        toggleIssSupport={toggleIssSupport}
        toggleGlSupport={toggleGlSupport}
        onClearAll={handleClearAll}
      />}

      {/* Main content */}
      <div className={sidebarOpen ? "col-span-12 md:col-span-9" : "col-span-12"}>
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-5 bg-white rounded-xl border border-slate-200 p-1 w-fit shadow-sm">
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

        {/* Tab content */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Lucide icon="BarChart3" className="w-5 h-5 text-primary" />
                Voting Summary
              </h3>
              {selectedYears.length > 0 && (
                <span className="text-xs text-slate-400">
                  {selectedYears.join(", ")}
                </span>
              )}
            </div>
            <OverviewSummaryTable
              summaryData={summaryData}
              loading={summaryLoading}
            />
            <VotingRecordsList
              votingRecords={votingRecordsData}
              loading={summaryLoading}
              page={vrPage}
              onPageChange={handleVrPageChange}
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
                  <span className="text-xs text-slate-400 font-normal">
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
              institutionIds={selectedInstitutionIds}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ProxyContestAI;
