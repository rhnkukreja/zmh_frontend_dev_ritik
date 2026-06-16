import React, { useState, useEffect, useRef } from "react";
import TableWrapper from "../components/TableWrapper";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import { SkeletonTable } from "@/components/Base/Skeletons";
import { FaDownload, FaTimes, FaSearch } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import downloadIcon from "@/assets/images/zmh-images/download-icon.png";
import { reportsService, governanceProfileService, CompanyOwnership } from "@/services/reports";
import { useAppSelector } from "@/stores/hooks";
import CompanySelect from "@/components/ReactSelectAsync";
import clsx from "clsx";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import CPagination from "@/components/Pagination";
import StandardizedTable from "@/components/StandardizedTable";
import GovernanceTab from "@/components/CompanyOverview/GovernanceTab";
import { X, Check } from "lucide-react";
import {Users} from "lucide-react";

// ── Index options (hardcoded — not from API) ─────────────────────────────────
const GP_INDEX_OPTIONS = [
  { value: "SP 500", label: "S&P 500" },
  { value: "Russell 3000", label: "Russell 3000" },
];

type CategoryYesNo = { category: string; yes_no: "Yes" | "No" };
type GPFilters = { index: string[]; multiFilters: CategoryYesNo[] };

const GovernanceProfileTab = () => {
  const getDefaults = (cats: string[]): GPFilters => ({
    index: ["SP 500"],
    multiFilters: cats.length > 0 ? [{ category: cats[0], yes_no: "Yes" }] : [],
  });

  const [dropdowns, setDropdowns] = useState<{ categories: string[] }>({ categories: [] });
  const [tempFilters, setTempFilters] = useState<GPFilters>({ index: ["SP 500"], multiFilters: [] });
  const [appliedFilters, setAppliedFilters] = useState<GPFilters>({ index: ["SP 500"], multiFilters: [] });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dropdownsLoading, setDropdownsLoading] = useState(true);
  const [catSearch, setCatSearch] = useState("");
  const [modalCompanyId, setModalCompanyId] = useState<number | null>(null);
  const [modalCompanyName, setModalCompanyName] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const PAGE_SIZE = 20;

  const fetchData = async (pageNum: number, filters: GPFilters) => {
    setLoading(true);
    try {
      const data = await governanceProfileService.getCompanies({
        index: filters.index,
        multiFilters: filters.multiFilters,
        page: pageNum,
      });
      setResults(data?.results || []);
      setTotal(data?.count || 0);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setDropdownsLoading(true);
      try {
        const data = await governanceProfileService.getDropdowns();
        setDropdowns({ categories: data.categories });
        const defaults = getDefaults(data.categories);
        setTempFilters(defaults);
        setAppliedFilters(defaults);
        fetchData(1, defaults);
      } catch { /* silent */ }
      finally { setDropdownsLoading(false); }
    })();
  }, []);

  const handleApply = () => {
    setAppliedFilters({ ...tempFilters });
    setPage(1);
    fetchData(1, tempFilters);
    setFiltersOpen(false);
    setCatSearch("");
  };

  const handleClear = () => {
    const defaults = getDefaults(dropdowns.categories);
    setTempFilters(defaults);
    setAppliedFilters(defaults);
    setPage(1);
    fetchData(1, defaults);
    setFiltersOpen(false);
    setCatSearch("");
  };

  const toggleCategory = (cat: string) => {
    const exists = tempFilters.multiFilters.find(f => f.category === cat);
    if (exists) {
      setTempFilters(p => ({ ...p, multiFilters: p.multiFilters.filter(f => f.category !== cat) }));
    } else {
      setTempFilters(p => ({ ...p, multiFilters: [...p.multiFilters, { category: cat, yes_no: "Yes" }] }));
    }
  };

  const setCatYesNo = (cat: string, yn: "Yes" | "No") => {
    const exists = tempFilters.multiFilters.find(f => f.category === cat);
    if (exists) {
      setTempFilters(p => ({
        ...p,
        multiFilters: p.multiFilters.map(f => f.category === cat ? { ...f, yes_no: yn } : f),
      }));
    } else {
      setTempFilters(p => ({ ...p, multiFilters: [...p.multiFilters, { category: cat, yes_no: yn }] }));
    }
  };

  const removeIndexChip = (val: string) => {
    const next = { ...appliedFilters, index: appliedFilters.index.filter(v => v !== val) };
    if (next.index.length === 0) return;
    setAppliedFilters(next); setTempFilters(next); setPage(1); fetchData(1, next);
  };

  const removeMultiChip = (cat: string) => {
    const next = { ...appliedFilters, multiFilters: appliedFilters.multiFilters.filter(f => f.category !== cat) };
    setAppliedFilters(next); setTempFilters(next); setPage(1); fetchData(1, next);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(newPage, appliedFilters);
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const blob = await governanceProfileService.downloadExcel({
        index: appliedFilters.index,
        multiFilters: appliedFilters.multiFilters,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'governance_screener.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      /* silent */
    } finally {
      setIsDownloading(false);
    }
  };

  const totalChips = appliedFilters.index.length + appliedFilters.multiFilters.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filteredCats = dropdowns.categories.filter(c =>
    c.toLowerCase().includes(catSearch.toLowerCase())
  );

  return (
    <div>
      {/* Top action bar: Count + Download + Filters toggle */}
      <div className="flex items-center justify-end gap-3 mb-3">
        {total > 0 && (
          <span className="text-sm text-slate-500">Count: <span className="font-semibold">{total}</span></span>
        )}
        <button
          onClick={handleDownloadExcel}
          disabled={isDownloading || total === 0}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap bg-primary text-white border-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <Lucide icon="Loader" className="w-4 h-4 animate-spin" />
          ) : (
            <Lucide icon="Download" className="w-4 h-4" />
          )}
          {isDownloading ? 'Downloading...' : 'Download Now'}
        </button>
        <Button
          variant="outline-secondary"
          className="w-full sm:w-auto cursor-pointer"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Lucide icon="ArrowDownWideNarrow" className="stroke-[1.3] w-4 h-4 mr-2" />
          Filters
          <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
            {totalChips}
          </div>
        </Button>
      </div>

      {/* Filter chips row */}
      {(appliedFilters.index.length > 0 || appliedFilters.multiFilters.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {appliedFilters.index.map(v => (
            <div key={v} className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full border border-rose-200 bg-rose-50 text-rose-700">
              <span>{v === "SP 500" ? "S&P 500" : v}</span>
              <button onClick={() => removeIndexChip(v)} className="hover:bg-rose-200/60 rounded-full p-0.5 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {appliedFilters.multiFilters.map(f => (
            <div key={f.category} className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full border border-rose-200 bg-rose-50 text-rose-700">
              <span>{f.category}: <span className="font-semibold">{f.yes_no}</span></span>
              <button onClick={() => removeMultiChip(f.category)} className="hover:bg-rose-200/60 rounded-full p-0.5 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="font-medium text-base">Filters</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline-secondary" className="cursor-pointer" onClick={handleClear}>
                <MdOutlineClear className="mr-1.5 w-4 h-4" /> Clear
              </Button>
              <Button variant="primary" className="cursor-pointer" onClick={handleApply}>
                <FaSearch className="mr-1.5 w-3.5 h-3.5" /> Apply
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Index — same inline checkbox style as category */}
            <div>
              <label className="block text-slate-600 font-semibold text-sm mb-2">Index</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {GP_INDEX_OPTIONS.map(opt => {
                  const isChecked = tempFilters.index.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setTempFilters(p => ({
                        ...p,
                        index: isChecked ? p.index.filter(v => v !== opt.value) : [...p.index, opt.value],
                      }))}
                      className={clsx(
                        "flex items-center gap-2.5 px-3 py-2 border-b border-slate-100 last:border-0 cursor-pointer transition-colors",
                        isChecked ? "bg-primary/5" : "hover:bg-slate-50"
                      )}
                    >
                      <div className={clsx(
                        "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                        isChecked ? "bg-primary border-primary" : "border-slate-300"
                      )}>
                        {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Category + Yes/No combined — spans 2 cols */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-600 font-semibold text-sm">Category &amp; Yes / No</label>
                <span className="text-xs text-slate-400 font-medium">{tempFilters.multiFilters.length} selected</span>
              </div>
              {/* Search */}
              <div className="relative mb-2">
                <Lucide icon="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={catSearch}
                  onChange={e => setCatSearch(e.target.value)}
                  placeholder="Search categories…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {/* Category rows */}
              <div className="border border-slate-200 rounded-xl overflow-hidden" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {dropdownsLoading ? (
                  <div className="flex flex-col gap-2 p-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : filteredCats.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-400">No categories found</div>
                ) : filteredCats.map(cat => {
                  const entry = tempFilters.multiFilters.find(f => f.category === cat);
                  const isChecked = !!entry;
                  return (
                    <div
                      key={cat}
                      className={clsx(
                        "flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0 transition-colors",
                        isChecked ? "bg-primary/5" : "hover:bg-slate-50"
                      )}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0" onClick={() => toggleCategory(cat)}>
                        <div className={clsx(
                          "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                          isChecked ? "bg-primary border-primary" : "border-slate-300"
                        )}>
                          {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </div>
                        <span className="text-sm text-slate-700 truncate">{cat}</span>
                      </label>
                      <div className={clsx(
                        "flex-shrink-0 flex rounded-full border border-slate-200 overflow-hidden text-xs font-semibold ml-3",
                        !isChecked ? "opacity-50" : ""
                      )}>
                        <button
                          onClick={() => setCatYesNo(cat, "Yes")}
                          className={clsx(
                            "px-2.5 py-1 transition-colors",
                            entry?.yes_no === "Yes" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setCatYesNo(cat, "No")}
                          className={clsx(
                            "px-2.5 py-1 border-l border-slate-200 transition-colors",
                            entry?.yes_no === "No" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <StandardizedTable isLoading={loading} skeletonRows={8} skeletonCols={2}>
        <StandardizedTable.Header>
          <StandardizedTable.Cell isHeader className="w-full">Company</StandardizedTable.Cell>
          <StandardizedTable.Cell isHeader className="w-40 text-center whitespace-nowrap">Governance Profile</StandardizedTable.Cell>
        </StandardizedTable.Header>
        <Table.Tbody>
          {results.length > 0 ? results.map((item, idx) => (
            <StandardizedTable.Row key={idx} index={idx}>
              <StandardizedTable.Cell>
                <button
                  onClick={() => { setModalCompanyId(item.company_id); setModalCompanyName(item.company); }}
                  className="block w-full font-medium whitespace-nowrap text-left text-slate-900 hover:opacity-75 cursor-pointer"
                >
                  <span className="underline">{item.company}</span>
                </button>
              </StandardizedTable.Cell>
              <StandardizedTable.Cell className="text-center">
                <button
                  onClick={() => { setModalCompanyId(item.company_id); setModalCompanyName(item.company); }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition-colors cursor-pointer mx-auto"
                  title="View Governance Profile"
                >
                  <Lucide icon="Eye" className="w-4 h-4" />
                </button>
              </StandardizedTable.Cell>
            </StandardizedTable.Row>
          )) : (
            <Table.Tr>
              <Table.Td colSpan={2}>
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Lucide icon="SearchX" className="w-10 h-10 mb-3 opacity-40" />
                  <p>Apply filters to see governance profile results.</p>
                </div>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </StandardizedTable>
      {totalPages > 1 && (
        <div className="flex justify-end mt-4">
          <CPagination
            page={page}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
            handlePreviousPage={() => { if (page > 1) handlePageChange(page - 1); }}
            handleNextPage={() => { if (page < totalPages) handlePageChange(page + 1); }}
          />
        </div>
      )}

      {/* ── Company Governance Modal ── */}
      {modalCompanyId !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center px-4 pb-4"
          style={{ zIndex: 99999, paddingTop: '4.5rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalCompanyId(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col" style={{ maxHeight: 'calc(100vh - 4.5rem)', width: 'min(90vw, 72rem)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary to-primary/90 flex-shrink-0 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-white">{modalCompanyName}</h2>
                <p className="text-sm text-white/80">Governance Screener</p>
              </div>
              <button
                onClick={() => setModalCompanyId(null)}
                className="inline-flex items-center justify-center rounded-full w-8 h-8 hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            {/* Content: overflow-x-hidden prevents table horizontal scrollbars */}
            <div className="overflow-y-auto overflow-x-hidden p-6 flex-1 min-h-0">
              <GovernanceTab companyId={modalCompanyId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomReports = () => {
  // Get global company ticker from authentication store
  const { companyGlobalSearchTicker } = useAppSelector((state) => state.authentiction);

  // Tab state
  const [activeTab, setActiveTab] = useState<'ownership' | 'governance'>('ownership');

  // Initialize with local storage data, global company ticker, or default values
  const getInitialTickers = () => {
    // Try to get saved tickers from localStorage first
    const savedTickers = localStorage.getItem('customReports_selectedTickers');
    if (savedTickers) {
      try {
        const parsedTickers = JSON.parse(savedTickers);
        if (Array.isArray(parsedTickers) && parsedTickers.length > 0) {
          return parsedTickers;
        }
      } catch (e) {
        console.error("Error parsing saved tickers:", e);
      }
    }
    
    // Fall back to global ticker or defaults
    if (companyGlobalSearchTicker) {
      return [companyGlobalSearchTicker];
    }
    return ["AAPL", "AMZN"];
  };
  
  // Get initial ownership data from localStorage if available
  const getInitialOwnershipData = () => {
    const savedData = localStorage.getItem('customReports_ownershipData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          return parsedData;
        }
      } catch (e) {
        console.error("Error parsing saved ownership data:", e);
      }
    }
    return [];
  };

  const [selectedTickers, setSelectedTickers] = useState<string[]>(getInitialTickers());
  const [ownershipData, setOwnershipData] = useState<CompanyOwnership[]>(getInitialOwnershipData());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [tableExpanded, setTableExpanded] = useState<boolean>(false);
  const companySearchCache = useRef<Record<string, any[]>>({});

  // Update selected tickers when global company changes, but only on initial load or when empty
  useEffect(() => {
    // Only add the global ticker if:
    // 1. We have a global ticker
    // 2. We don't already have it in our selections
    // 3. Either this is initial load (selectedTickers is empty) OR we haven't manually removed it before
    const isInitialLoad = selectedTickers.length === 0 || 
                         (selectedTickers.length === 1 && selectedTickers[0] === "AAPL" || selectedTickers[0] === "AMZN");
                         
    if (companyGlobalSearchTicker && 
        !selectedTickers.includes(companyGlobalSearchTicker) && 
        isInitialLoad) {
      
      // Update the selected tickers
      setSelectedTickers([companyGlobalSearchTicker]);
      // Clear any existing data to prevent confusion
      setOwnershipData([]);
      
      // Initial load: fetch data
      if (isInitialLoad) {
        setTimeout(() => fetchOwnershipData(), 0);
      }
    }
  }, [companyGlobalSearchTicker]);

  // Fetch ownership data on initial load if we have selected tickers but no cached data
  useEffect(() => {
    // On initial mount, if we have selected tickers and no cached data, fetch data
    if (selectedTickers.length > 0 && ownershipData.length === 0) {
      fetchOwnershipData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on component mount, with explicit dependency list

  const fetchOwnershipData = async () => {
    if (selectedTickers.length === 0) {
      setError("Please select at least one company");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setOwnershipData([]); // Clear previous data
      
      // Create a fresh copy of the current selected tickers and normalize them to uppercase
      const currentTickers = [...selectedTickers].map(ticker => ticker.toUpperCase());
      console.log("Fetching data for tickers:", currentTickers);
      
      const data = await reportsService.getMultipleTickersOwnership(currentTickers);
      
      // Verify the response matches our requested tickers
      console.log("Received data for tickers:", data.map(item => item.ticker));
      
      // Ensure data is exactly matched with current ticker selections (case insensitive)
      const normalizedCurrentTickers = currentTickers.map(t => t.toUpperCase());
      const filteredData = data.filter(company => 
        normalizedCurrentTickers.includes(company.ticker.toUpperCase())
      );
      
      console.log("Final filtered data for tickers:", filteredData.map(item => item.ticker));
      setOwnershipData(filteredData);
      
      // Save to localStorage
      localStorage.setItem('customReports_ownershipData', JSON.stringify(filteredData));
      
      // Check if we're missing any data
      const returnedTickers = filteredData.map(item => item.ticker.toUpperCase());
      const missingTickers = normalizedCurrentTickers.filter(t => !returnedTickers.includes(t));
      if (missingTickers.length > 0) {
        console.warn("Missing data for tickers:", missingTickers);
      }
      
    } catch (err) {
      setError("Failed to fetch ownership data. Please try again.");
      console.error("Error fetching ownership data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (selectedOptions: any) => {
    if (selectedOptions && selectedOptions.length > 0) {
      // Extract tickers from selected companies using the symbol field
      const newTickers = selectedOptions.slice(0, 5).map((option: any) => {
        return option.symbol || option.company?.symbol || option.company?.ticker || option.label.split(' ')[0];
      }).filter((ticker: string) => ticker); // Filter out any null/undefined values

      // Merge with existing tickers, keeping global company ticker if it exists
      const allTickers = [...new Set([...selectedTickers, ...newTickers])]; // Remove duplicates
      const finalTickers = allTickers.slice(0, 5); // Limit to 5 companies
      setSelectedTickers(finalTickers);
      saveTickersToLocalStorage(finalTickers);
    } else {
      // Only clear if global company ticker is not present
      const defaultTickers = companyGlobalSearchTicker ? [companyGlobalSearchTicker] : [];
      setSelectedTickers(defaultTickers);
      saveTickersToLocalStorage(defaultTickers);
    }
  };

  // Save selected tickers to local storage
  const saveTickersToLocalStorage = (tickers: string[]) => {
    localStorage.setItem('customReports_selectedTickers', JSON.stringify(tickers));
  };

  const removeTicker = (ticker: string) => {
    // Remove the ticker from the selected list, including global ticker
    const updatedTickers = selectedTickers.filter(t => t !== ticker);
    
    // Update the selected tickers
    setSelectedTickers(updatedTickers);
    // Save to localStorage
    saveTickersToLocalStorage(updatedTickers);
    
    // If we have tickers left, fetch new data
    if (updatedTickers.length > 0) {
      // Use setTimeout to ensure state is updated before API call
      setTimeout(() => fetchOwnershipData(), 0);
    } else {
      // Clear the displayed data if no tickers left
      setOwnershipData([]);
    }
  };

  // Download Excel
  const handleDownload = () => {
    let csv = "Ticker,Company Name,Investor Name,Ownership %\n";
    ownershipData.forEach(company => {
      company.ownership_data.slice(0, 20).forEach(inv => {
        csv += `${company.ticker},"${company.company_name}","${inv.institution_name}",${inv.percent_ownership}\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ownership_summary.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="box p-5 mt-3.5">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm flex items-center gap-1 mb-5 w-fit">
        <button
          onClick={() => setActiveTab('ownership')}
          className={clsx(
            "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-1.5",
            activeTab === 'ownership'
              ? "bg-primary text-white shadow"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}
        >
          <Users className="w-4 h-4" />
          Ownership
        </button>
        <button
          onClick={() => setActiveTab('governance')}
          className={clsx(
            "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-1.5",
            activeTab === 'governance'
              ? "bg-primary text-white shadow"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}
        >
          <Lucide icon="ShieldCheck" className="w-4 h-4" />
          <span className="relative">
            Governance Screener
            <span className="pointer-events-none absolute -top-3 -right-7 inline-flex items-center rounded-full bg-orange-500 px-[5px] py-[1px] text-[8px] font-bold uppercase tracking-[0.08em] text-white shadow-sm animate-pulse">
              BETA
            </span>
          </span>
        </button>
      </div>

      {/* Ownership Tab */}
      {activeTab === 'ownership' && (
        <>
          <div className="flex flex-col sm:flex-row gap-y-2 justify-between items-center mb-4">
            <h1 className="text-lg font-bold">Ownership Summary (Maximum 5 companies can be selected)</h1>
        <div className="flex items-center gap-2">
          {/* Download icon only visible when not loading and data exists */}
          {!loading && ownershipData.length > 0 && (
            <Tippy content="Download Excel" options={{ theme: "light" }}>
              <div
                className="box p-[5px] cursor-pointer"
                onClick={handleDownload}
              >
                <img alt="download-icon" src={downloadIcon} />
              </div>
            </Tippy>
          )}
        </div>
      </div>

      {/* Ticker Search Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-[550px]">
            <CompanySelect
              value={[]}
              onChange={handleCompanySelect}
              isMulti={true}
              placeholder="Search by company name, ticker, or symbol (US company only)"
              className="w-full"
              isClearable={true}
            />
          </div>
          <Button
            variant="primary"
            onClick={fetchOwnershipData}
            className="whitespace-nowrap"
          >
            Apply
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => {
              const defaultTickers = companyGlobalSearchTicker ? [companyGlobalSearchTicker] : [];
              setSelectedTickers(defaultTickers);
              saveTickersToLocalStorage(defaultTickers);
              setOwnershipData([]);
              localStorage.removeItem('customReports_ownershipData');
              setError("");
            }}
            className="whitespace-nowrap"
          >
            Clear
          </Button>

        </div>

        {/* Selected Tickers */}
        <div className="flex flex-wrap gap-3 mb-3">
          {selectedTickers.map(ticker => (
            <div
              key={ticker}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md"
            >
              {ticker}
              <button
                onClick={() => removeTicker(ticker)}
                title="Remove and update data"
                aria-label="Remove ticker and update data"
                className="ml-1 hover:bg-white hover:text-primary rounded-full p-1 transition-colors duration-200"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-5 mt-3.5 box bg-white">
          <SkeletonTable
            rows={8}
            columns={Math.max(2, selectedTickers.length * 2)}
          />
        </div>
      )}

      {/* Single Combined Table */}
      {!loading && ownershipData.length > 0 && (
        <TableWrapper
          isLoading={loading}
          rows={8}
          columns={Math.max(2, selectedTickers.length * 2)}
        >
          <div className="overflow-x-auto max-h-[650px] overflow-y-scroll">
            <Table className="table_ownership w-full min-w-[600px]">
              <Table.Thead className="sticky top-0 z-10">
                <Table.Tr className="row_ownership">
                  {/* Only show columns for companies that match currently selected tickers */}
                  {ownershipData
                    .filter(company => selectedTickers.map(t => t.toUpperCase()).includes(company.ticker.toUpperCase()))
                    .map((company, companyIndex, arr) => (
                      <React.Fragment key={company.ticker}>
                        <Table.Td 
                          className={`cell_ownership py-2 font-semibold h-[50px] bg-header text-[#000000B2] text-left w-[220px] 
                            ${companyIndex === 0 ? 'first:rounded-tl-[0.6rem]' : ''} 
                            ${companyIndex === 0 && arr.length === 1 ? 'last:rounded-tr-[0.6rem]' : ''}`}
                        >
                          {company.company_name}
                        </Table.Td>
                        <Table.Td 
                          className={`cell_ownership py-2 font-semibold h-[50px] bg-header text-[#000000B2] text-center w-[140px]
                            ${(companyIndex === arr.length - 1) ? 'last:rounded-tr-[0.6rem]' : ''}`}
                        >
                          Ownership
                        </Table.Td>
                      </React.Fragment>
                    ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...Array(20)].map((_, rowIdx) => (
                  <Table.Tr key={rowIdx} className="row_ownership [&_td]:last:border-b-0">
                    {/* Only show data for companies that match currently selected tickers */}
                    {ownershipData
                      .filter(company => selectedTickers.map(t => t.toUpperCase()).includes(company.ticker.toUpperCase()))
                      .map(company => {
                        const inv = company.ownership_data?.[rowIdx];
                        if (!inv) {
                          return (
                            <React.Fragment key={company.ticker + rowIdx}>
                              <Table.Td className="cell_ownership py-2 border-dashed dark:bg-darkmode-600 w-[220px] text-left"></Table.Td>
                              <Table.Td className="cell_ownership py-2 border-dashed dark:bg-darkmode-600 w-[140px] text-center"></Table.Td>
                            </React.Fragment>
                          );
                        }
                        return (
                          <React.Fragment key={company.ticker + rowIdx}>
                            <Table.Td className="cell_ownership py-2 border-dashed dark:bg-darkmode-600 w-[220px] text-left">
                              <h1 className={inv.status ? "font-semibold text-blue-600" : ""}>
                                {inv.institution_name}
                              </h1>
                            </Table.Td>
                            <Table.Td className="cell_ownership py-2 border-dashed dark:bg-darkmode-600 w-[140px] text-center">
                              <h1>
                                {inv.percent_ownership}%
                              </h1>
                            </Table.Td>
                          </React.Fragment>
                        );
                      })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        </TableWrapper>
      )}

      {/* No Data State */}
      {!loading && ownershipData.length === 0 && selectedTickers.length > 0 && !error && (
        <div className="text-center py-8 text-gray-800 font-medium">
          No ownership data available for the selected tickers.
        </div>
      )}
        </>
      )}

      {/* Governance Profile Tab */}
      {activeTab === 'governance' && <GovernanceProfileTab />}
    </div>
  );
};

export default CustomReports;
