import React, { useState } from "react";
import Lucide from "@/components/Base/Lucide";
import clsx from "clsx";

type TabKey = "overview" | "detailed";

interface FiltersSidebarProps {
  filtersData: any;
  filtersLoading: boolean;
  activeTab: TabKey;
  /* shared (current tab) */
  selectedYears: string[];
  selectedInstIds: number[];
  selectedCompanyIds: number[];
  /* overview only */
  selectedVotes: string[];
  /* detailed only */
  selectedActivists: string[];
  selectedIss: string | null;
  selectedGl: string | null;
  /* toggles */
  toggleYear: (y: string) => void;
  toggleInst: (id: number) => void;
  toggleCompany: (id: number) => void;
  toggleVote: (v: string) => void;
  toggleActivist: (n: string) => void;
  toggleIss: (v: string) => void;
  toggleGl: (v: string) => void;
  onClearAll: () => void;
}

const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  filtersData,
  filtersLoading,
  activeTab,
  selectedYears,
  selectedInstIds,
  selectedCompanyIds,
  selectedVotes,
  selectedActivists,
  selectedIss,
  selectedGl,
  toggleYear,
  toggleInst,
  toggleCompany,
  toggleVote,
  toggleActivist,
  toggleIss,
  toggleGl,
  onClearAll,
}) => {
  const [showAllActivists, setShowAllActivists] = useState(false);
  const [showAllInstitutions, setShowAllInstitutions] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  const hasAnyFilter =
    selectedYears.length > 0 ||
    selectedInstIds.length > 0 ||
    selectedCompanyIds.length > 0 ||
    selectedVotes.length > 0 ||
    selectedActivists.length > 0 ||
    !!selectedIss ||
    !!selectedGl;

  return (
    <div className="h-full">
      <style>{`
        .pc-filters-scroll { scrollbar-width: thin; scrollbar-color: rgba(226,232,240,0.3) transparent; }
        .pc-filters-scroll::-webkit-scrollbar { width: 4px; }
        .pc-filters-scroll::-webkit-scrollbar-track { background: transparent; }
        .pc-filters-scroll::-webkit-scrollbar-thumb { background: rgba(226,232,240,0.4); border-radius: 4px; }
      `}</style>
      <div
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky overflow-y-auto pc-filters-scroll"
        style={{ top: "6.5rem", maxHeight: "calc(100vh - 8rem)", minHeight: "calc(100vh - 14rem)" }}
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
            {[4, 5, 4, 3].map((count, i) => (
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

            {/* COMPANIES — Overview: before Institutions */}
            {activeTab === "overview" && filtersData?.companies?.length > 0 && (() => {
              const filtered = filtersData.companies.filter((c: any) =>
                c.company_name.toLowerCase().includes(companySearch.toLowerCase())
              );
              const displayed = showAllCompanies ? filtered : filtered.slice(0, 3);
              return (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Company</h4>
                  <div className="relative mb-2">
                    <Lucide icon="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Search companies..." value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {companySearch && (
                      <button onClick={() => setCompanySearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <Lucide icon="X" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {displayed.length > 0 ? displayed.map((c: any) => {
                      const isSel = selectedCompanyIds.includes(c.company_id);
                      return (
                        <button key={c.company_id} onClick={() => toggleCompany(c.company_id)}
                          className={clsx("w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left gap-2",
                            isSel ? "bg-primary/10 text-primary font-semibold border border-primary/30" : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <span className={clsx("w-4 h-4 flex-none rounded border flex items-center justify-center",
                            isSel ? "bg-primary border-primary" : "border-slate-300"
                          )}>
                            {isSel && <Lucide icon="Check" className="w-3 h-3 text-white" />}
                          </span>
                          <span className="leading-tight break-words">{c.company_name}</span>
                        </button>
                      );
                    }) : <div className="text-sm text-slate-400 text-center py-3">No companies found</div>}
                    {!companySearch && filtered.length > 3 && (
                      <button onClick={() => setShowAllCompanies(!showAllCompanies)}
                        className="w-full text-sm text-primary hover:text-primary/70 font-medium py-1.5 flex items-center justify-center gap-1"
                      >
                        {showAllCompanies
                          ? <><Lucide icon="ChevronUp" className="w-3 h-3" />Show less</>
                          : <><Lucide icon="ChevronDown" className="w-3 h-3" />See more ({filtered.length - 3})</> }
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ACTIVIST — Detailed view only (before Institutions) */}
            {activeTab === "detailed" && filtersData?.activist_names?.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Activist</h4>
                <div className="space-y-1">
                  {(showAllActivists ? filtersData.activist_names : filtersData.activist_names.slice(0, 3)).map((item: any) => {
                    const isSel = selectedActivists.includes(item.activist_name);
                    return (
                      <button key={item.activist_name} onClick={() => toggleActivist(item.activist_name)}
                        className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          isSel ? "bg-primary text-white font-semibold" : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <span className="truncate text-left">{item.activist_name}</span>
                        <span className={clsx("text-sm rounded-full px-2 py-0.5 font-medium flex-none ml-2",
                          isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        )}>{item.company_count}</span>
                      </button>
                    );
                  })}
                  {filtersData.activist_names.length > 3 && (
                    <button onClick={() => setShowAllActivists(!showAllActivists)}
                      className="w-full text-sm text-primary hover:text-primary/70 font-medium py-1.5 flex items-center justify-center gap-1"
                    >
                      {showAllActivists
                        ? <><Lucide icon="ChevronUp" className="w-3 h-3" />Show less</>
                        : <><Lucide icon="ChevronDown" className="w-3 h-3" />See more ({filtersData.activist_names.length - 3})</>}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ISS SUPPORT — Detailed view only (before Institutions) */}
            {activeTab === "detailed" && filtersData?.iss_support && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">ISS Support</h4>
                <div className="space-y-1">
                  {(["Management", "Activist"] as const).map((opt) => {
                    const isSel = selectedIss === opt;
                    return (
                      <button key={opt} onClick={() => toggleIss(opt)}
                        className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          isSel ? "bg-primary text-white font-semibold" : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <span>{opt}</span>
                        <span className={clsx("text-sm rounded-full px-2 py-0.5 font-medium",
                          isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        )}>{(Array.isArray(filtersData.iss_support) ? filtersData.iss_support.find((i: any) => i.label === opt)?.count : filtersData.iss_support[opt]) ?? 0}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GL SUPPORT — Detailed view only (before Institutions) */}
            {activeTab === "detailed" && filtersData?.gl_support && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">GL Support</h4>
                <div className="space-y-1">
                  {(["Management", "Activist"] as const).map((opt) => {
                    const isSel = selectedGl === opt;
                    return (
                      <button key={opt} onClick={() => toggleGl(opt)}
                        className={clsx("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          isSel ? "bg-primary text-white font-semibold" : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <span>{opt}</span>
                        <span className={clsx("text-sm rounded-full px-2 py-0.5 font-medium",
                          isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        )}>{(Array.isArray(filtersData.gl_support) ? filtersData.gl_support.find((i: any) => i.label === opt)?.count : filtersData.gl_support[opt]) ?? 0}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* INSTITUTIONS */}
            {filtersData?.institutions?.length > 0 && (() => {
              const filteredInst = filtersData.institutions.filter((i: any) =>
                i.institution_name.toLowerCase().includes(institutionSearch.toLowerCase())
              );
              const displayedInst = showAllInstitutions ? filteredInst : filteredInst.slice(0, 3);
              return (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Institutions</h4>
                  <div className="relative mb-2">
                    <Lucide icon="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Search institutions..." value={institutionSearch}
                      onChange={(e) => setInstitutionSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {institutionSearch && (
                      <button onClick={() => setInstitutionSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <Lucide icon="X" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {displayedInst.length > 0 ? displayedInst.map((inst: any) => {
                      const isSel = selectedInstIds.includes(inst.institution_id);
                      return (
                        <button key={inst.institution_id} onClick={() => toggleInst(inst.institution_id)}
                          className={clsx("w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left gap-2",
                            isSel ? "bg-primary/10 text-primary font-semibold border border-primary/30" : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <span className={clsx("w-4 h-4 flex-none rounded border flex items-center justify-center",
                            isSel ? "bg-primary border-primary" : "border-slate-300"
                          )}>
                            {isSel && <Lucide icon="Check" className="w-3 h-3 text-white" />}
                          </span>
                          <span className="leading-tight">{inst.institution_name}</span>
                        </button>
                      );
                    }) : <div className="text-sm text-slate-400 text-center py-3">No institutions found</div>}
                    {!institutionSearch && filteredInst.length > 3 && (
                      <button onClick={() => setShowAllInstitutions(!showAllInstitutions)}
                        className="w-full text-sm text-primary hover:text-primary/70 font-medium py-1.5 flex items-center justify-center gap-1"
                      >
                        {showAllInstitutions
                          ? <><Lucide icon="ChevronUp" className="w-3 h-3" />Show less</>
                          : <><Lucide icon="ChevronDown" className="w-3 h-3" />See more ({filteredInst.length - 3})</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* COMPANIES — Detailed: after Institutions */}
            {activeTab === "detailed" && filtersData?.companies?.length > 0 && (() => {
              const filtered = filtersData.companies.filter((c: any) =>
                c.company_name.toLowerCase().includes(companySearch.toLowerCase())
              );
              const displayed = showAllCompanies ? filtered : filtered.slice(0, 3);
              return (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Company</h4>
                  <div className="relative mb-2">
                    <Lucide icon="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Search companies..." value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {companySearch && (
                      <button onClick={() => setCompanySearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <Lucide icon="X" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {displayed.length > 0 ? displayed.map((c: any) => {
                      const isSel = selectedCompanyIds.includes(c.company_id);
                      return (
                        <button key={c.company_id} onClick={() => toggleCompany(c.company_id)}
                          className={clsx("w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left gap-2",
                            isSel ? "bg-primary/10 text-primary font-semibold border border-primary/30" : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <span className={clsx("w-4 h-4 flex-none rounded border flex items-center justify-center",
                            isSel ? "bg-primary border-primary" : "border-slate-300"
                          )}>
                            {isSel && <Lucide icon="Check" className="w-3 h-3 text-white" />}
                          </span>
                          <span className="leading-tight break-words">{c.company_name}</span>
                        </button>
                      );
                    }) : <div className="text-sm text-slate-400 text-center py-3">No companies found</div>}
                    {!companySearch && filtered.length > 3 && (
                      <button onClick={() => setShowAllCompanies(!showAllCompanies)}
                        className="w-full text-sm text-primary hover:text-primary/70 font-medium py-1.5 flex items-center justify-center gap-1"
                      >
                        {showAllCompanies
                          ? <><Lucide icon="ChevronUp" className="w-3 h-3" />Show less</>
                          : <><Lucide icon="ChevronDown" className="w-3 h-3" />See more ({filtered.length - 3})</> }
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* VOTES — Overview only */}
            {activeTab === "overview" && filtersData?.votes?.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Vote</h4>
                <div className="flex flex-wrap gap-2">
                  {filtersData.votes.map((vote: string) => {
                    const isSel = selectedVotes.includes(vote);
                    return (
                      <button key={vote} onClick={() => toggleVote(vote)}
                        className={clsx("px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
                          isSel ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary"
                        )}
                      >{vote}</button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default FiltersSidebar;
