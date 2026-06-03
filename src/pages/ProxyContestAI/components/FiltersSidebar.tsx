import React, { useRef, useState } from "react";
import Lucide from "@/components/Base/Lucide";
import clsx from "clsx";

interface FiltersSidebarProps {
  filtersData: any;
  filtersLoading: boolean;
  activeTab: "overview" | "detailed" | "activist_profile";
  /* shared (current tab) */
  selectedYears: string[];
  selectedInstIds: number[];
  selectedCompanyIds: number[];
  /* overview only */
  selectedInvestorSupport: boolean;
  /* detailed only */
  selectedActivists: string[];
  selectedIss: string | null;
  selectedGl: string | null;
  /* toggles */
  toggleYear: (y: string) => void;
  toggleInst: (id: number) => void;
  toggleCompany: (id: number) => void;
  toggleInvestorSupport: () => void;
  toggleActivist: (n: string) => void;
  toggleIss: (v: string) => void;
  toggleGl: (v: string) => void;
  onClearAll: () => void;
}

/* ── Reusable search-only picker ──────────────────────────────────────────── */
interface SearchPickerProps {
  label: string;
  placeholder: string;
  allItems: { id: number | string; name: string }[];
  selectedIds: (number | string)[];
  onToggle: (id: number | string) => void;
}
const SearchPicker: React.FC<SearchPickerProps> = ({ label, placeholder, allItems, selectedIds, onToggle }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? allItems.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div>
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</h4>

      {/* Search input */}
      <div className="relative" ref={wrapRef}>
        <Lucide icon="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        />
        {query && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <Lucide icon="X" className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dropdown results */}
        {open && query.trim() && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const isSel = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onToggle(item.id); setQuery(""); setOpen(false); }}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                      isSel ? "bg-primary/5 text-primary font-semibold" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className={clsx(
                      "w-4 h-4 flex-none rounded border flex items-center justify-center",
                      isSel ? "bg-primary border-primary" : "border-slate-300"
                    )}>
                      {isSel && <Lucide icon="Check" className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span className="leading-tight truncate">{item.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-sm text-slate-400 text-center">No results found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  filtersData,
  filtersLoading,
  activeTab,
  selectedYears,
  selectedInstIds,
  selectedCompanyIds,
  selectedInvestorSupport,
  selectedActivists,
  selectedIss,
  selectedGl,
  toggleYear,
  toggleInst,
  toggleCompany,
  toggleInvestorSupport,
  toggleActivist,
  toggleIss,
  toggleGl,
  onClearAll,
}) => {
  const [showAllActivists, setShowAllActivists] = useState(false);

  const hasAnyFilter =
    selectedYears.length > 0 ||
    selectedInstIds.length > 0 ||
    selectedCompanyIds.length > 0 ||
    selectedInvestorSupport ||
    selectedActivists.length > 0 ||
    !!selectedIss ||
    !!selectedGl;

  const getIssSupportCount = (opt: string) => {
    if (!filtersData?.iss_support) return null;
    const cnt = Array.isArray(filtersData.iss_support)
      ? filtersData.iss_support.find((i: any) => i.label === opt)?.count
      : filtersData.iss_support[opt];
    return cnt != null ? cnt : null;
  };
  const getGlSupportCount = (opt: string) => {
    if (!filtersData?.gl_support) return null;
    const cnt = Array.isArray(filtersData.gl_support)
      ? filtersData.gl_support.find((i: any) => i.label === opt)?.count
      : filtersData.gl_support[opt];
    return cnt != null ? cnt : null;
  };

  const companyItems = (filtersData?.companies || []).map((c: any) => ({ id: c.company_id, name: c.company_name }));
  const institutionItems = (filtersData?.institutions || []).map((i: any) => ({ id: i.institution_id, name: i.institution_name }));

  return (
    <div className="h-full">
      <style>{`
        .pc-filters-scroll { scrollbar-width: thin; scrollbar-color: rgba(226,232,240,0.3) transparent; }
        .pc-filters-scroll::-webkit-scrollbar { width: 4px; }
        .pc-filters-scroll::-webkit-scrollbar-track { background: transparent; }
        .pc-filters-scroll::-webkit-scrollbar-thumb { background: rgba(226,232,240,0.4); border-radius: 4px; }
      `}</style>
      <div
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 overflow-y-auto pc-filters-scroll h-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Lucide icon="Filter" className="w-5 h-5 text-primary" />
            Filters
          </h3>
          {hasAnyFilter && (
            <button
              onClick={onClearAll}
              className="text-xs text-primary hover:underline font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        {filtersLoading ? (
          <div className="space-y-5 animate-pulse">
            {[4, 3, 3, 2].map((count, i) => (
              <div key={i}>
                <div className="h-3 bg-slate-200 rounded w-20 mb-3" />
                {Array.from({ length: count }).map((_, j) => (
                  <div key={j} className="h-9 bg-slate-100 rounded mb-2" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">

            {/* YEAR */}
            {filtersData?.years?.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Year</h4>
                <div className="space-y-1">
                  {filtersData.years.map((item: any) => {
                    const isSelected = selectedYears.includes(String(item.year));
                    return (
                      <button key={item.year} onClick={() => toggleYear(String(item.year))}
                        className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          isSelected ? "bg-primary text-white font-semibold" : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <span>{item.year}</span>
                        <span className={clsx("text-xs rounded-full px-2 py-0.5 font-medium",
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        )}>{item.company_count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* COMPANY — search-only picker (overview: before institutions; detailed: after) */}
            {activeTab === "overview" && companyItems.length > 0 && (
              <SearchPicker
                label="Company"
                placeholder="Search companies..."
                allItems={companyItems}
                selectedIds={selectedCompanyIds}
                onToggle={(id) => toggleCompany(id as number)}
              />
            )}

            {/* ACTIVIST — Detailed view only */}
            {(activeTab === "detailed" || activeTab === "activist_profile") && filtersData?.activist_names?.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Activist</h4>
                <div className="space-y-1">
                  {/* Show less — appears at TOP when expanded */}
                  {showAllActivists && filtersData.activist_names.length > 1 && (
                    <button onClick={() => setShowAllActivists(false)}
                      className="w-full text-sm text-primary hover:text-primary/70 font-medium py-1 flex items-center justify-center gap-1"
                    >
                      <Lucide icon="ChevronUp" className="w-3 h-3" />Show less
                    </button>
                  )}
                  {(showAllActivists ? filtersData.activist_names : filtersData.activist_names.slice(0, 1)).map((item: any) => {
                    const isSel = selectedActivists.includes(item.activist_name);
                    return (
                      <button key={item.activist_name} onClick={() => toggleActivist(item.activist_name)}
                        className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          isSel ? "bg-primary text-white font-semibold" : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <span className="truncate text-left">{item.activist_name}</span>
                        <span className={clsx("text-xs rounded-full px-2 py-0.5 font-medium flex-none ml-2",
                          isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        )}>{item.company_count}</span>
                      </button>
                    );
                  })}
                  {/* See more — appears at BOTTOM when collapsed */}
                  {!showAllActivists && filtersData.activist_names.length > 1 && (
                    <button onClick={() => setShowAllActivists(true)}
                      className="w-full text-sm text-primary hover:text-primary/70 font-medium py-1 flex items-center justify-center gap-1"
                    >
                      <Lucide icon="ChevronDown" className="w-3 h-3" />See more ({filtersData.activist_names.length - 1})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ADVISOR SUPPORT — ISS + GL merged into one section */}
            {(filtersData?.iss_support || filtersData?.gl_support) && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Advisor Support</h4>
                {/* Header row */}
                <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-1.5 mb-1">
                  <div />
                  {(["Management", "Activist"] as const).map((col) => (
                    <span key={col} className="text-[10px] font-semibold text-slate-400 uppercase text-center tracking-wide">{col}</span>
                  ))}
                </div>
                {/* ISS row */}
                {filtersData?.iss_support && (
                  <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-1.5 mb-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">ISS</span>
                    {(["Management", "Activist"] as const).map((opt) => {
                      const sel = selectedIss === opt;
                      const cnt = getIssSupportCount(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() => toggleIss(opt)}
                          className={clsx(
                            "flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs font-medium transition-all duration-150",
                            sel ? "bg-primary text-white border-primary shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                          )}
                        >
                          <span className={clsx("w-2.5 h-2.5 rounded-full border-2 mb-0.5 transition-all", sel ? "bg-white border-white" : "bg-white border-slate-300")} />
                          {cnt != null && <span className={clsx("text-[11px] font-bold leading-none", sel ? "text-white" : "text-slate-600")}>{cnt}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* GL row */}
                {filtersData?.gl_support && (
                  <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">GL</span>
                    {(["Management", "Activist"] as const).map((opt) => {
                      const sel = selectedGl === opt;
                      const cnt = getGlSupportCount(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() => toggleGl(opt)}
                          className={clsx(
                            "flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs font-medium transition-all duration-150",
                            sel ? "bg-primary text-white border-primary shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                          )}
                        >
                          <span className={clsx("w-2.5 h-2.5 rounded-full border-2 mb-0.5 transition-all", sel ? "bg-white border-white" : "bg-white border-slate-300")} />
                          {cnt != null && <span className={clsx("text-[11px] font-bold leading-none", sel ? "text-white" : "text-slate-600")}>{cnt}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* INSTITUTION — search-only picker */}
            {institutionItems.length > 0 && (
              <SearchPicker
                label="Institution"
                placeholder="Search institutions..."
                allItems={institutionItems}
                selectedIds={selectedInstIds}
                onToggle={(id) => toggleInst(id as number)}
              />
            )}

            {/* COMPANY — Detailed: after institutions */}
            {activeTab === "detailed" && companyItems.length > 0 && (
              <SearchPicker
                label="Company"
                placeholder="Search companies..."
                allItems={companyItems}
                selectedIds={selectedCompanyIds}
                onToggle={(id) => toggleCompany(id as number)}
              />
            )}

            {/* INVESTOR SUPPORT ACTIVIST — Overview only */}
            {activeTab === "overview" && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Investor Support</h4>
                <button
                  onClick={toggleInvestorSupport}
                  className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150",
                    selectedInvestorSupport ? "bg-primary text-white font-semibold" : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <span>Investor supported activist</span>
                  <span className={clsx(
                    "w-8 h-4 rounded-full flex items-center transition-all flex-none",
                    selectedInvestorSupport ? "bg-white/30" : "bg-slate-200"
                  )}>
                    <span className={clsx(
                      "w-3 h-3 rounded-full shadow transition-transform mx-0.5",
                      selectedInvestorSupport ? "bg-white translate-x-4" : "bg-white translate-x-0"
                    )} />
                  </span>
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default FiltersSidebar;
