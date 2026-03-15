import React from "react";
import Lucide from "@/components/Base/Lucide";
import clsx from "clsx";

interface AiFiltersSidebarProps {
  isAiFiltersLoading: boolean;
  aiFiltersData: any;
  isAllInvestorsSelected: boolean;
  setIsAllInvestorsSelected: React.Dispatch<React.SetStateAction<boolean>>;
  toggleAiFilter: (type: "investor" | "theme" | "year", value: any) => void;
  isAiFilterSelected: (
    type: "investor" | "theme" | "year",
    value: any
  ) => boolean;
  setInvestorSearch: (val: string) => void;
  setIsInvestorModalOpen: (val: boolean) => void;
  isAllThemesSelected: boolean;
  setIsAllThemesSelected: React.Dispatch<React.SetStateAction<boolean>>;
  isAllYearsSelected: boolean;
  setIsAllYearsSelected: React.Dispatch<React.SetStateAction<boolean>>;
}

const AiFiltersSidebar: React.FC<AiFiltersSidebarProps> = ({
  isAiFiltersLoading,
  aiFiltersData,
  isAllInvestorsSelected,
  setIsAllInvestorsSelected,
  toggleAiFilter,
  isAiFilterSelected,
  setInvestorSearch,
  setIsInvestorModalOpen,
  isAllThemesSelected,
  setIsAllThemesSelected,
  isAllYearsSelected,
  setIsAllYearsSelected,
}) => {
  return (
    <div className="col-span-12 md:col-span-4 xl:col-span-3 mb-6 md:mb-0">
      <div
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky"
        style={{ top: "6.5rem" }}
      >
        <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
          <Lucide icon="Filter" className="w-5 h-5 text-primary" />
          AI Filters
        </h3>

        {isAiFiltersLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : aiFiltersData ? (
          <div className="space-y-6">
            {/* INVESTORS / INSTITUTIONS */}
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  Investors
                </h4>
                <span
                  className="text-xs font-semibold text-primary cursor-pointer hover:underline"
                  onClick={() => {
                    setInvestorSearch("");
                    setIsInvestorModalOpen(true);
                  }}
                >
                  See more
                </span>
              </div>
              <div className="space-y-1 mt-3">
                {/* All Investors */}
                <div
                  onClick={() => setIsAllInvestorsSelected((prev) => !prev)}
                  className={clsx(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border",
                    isAllInvestorsSelected
                      ? "bg-primary/10 border-primary/30"
                      : "bg-slate-50 border-slate-200 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        "text-sm font-semibold",
                        isAllInvestorsSelected ? "text-primary" : "text-slate-500"
                      )}
                    >
                      {aiFiltersData?.investors?.all_investors?.label ||
                        "All Investors"}
                    </span>
                  </div>
                  <span
                    className={clsx(
                      "text-xs font-mono px-2 py-0.5 rounded-full border",
                      isAllInvestorsSelected
                        ? "bg-white text-primary border-primary/20"
                        : "bg-slate-100 text-slate-500 border-transparent"
                    )}
                  >
                    {aiFiltersData?.investors?.all_investors?.count || 0}
                  </span>
                </div>

                {/* Top 5 Investors */}
                {aiFiltersData?.investors?.top_5?.map((inv: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => toggleAiFilter("investor", inv.id)}
                    className={clsx(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group border",
                      isAiFilterSelected("investor", inv.id)
                        ? "bg-primary/10 border-primary/30"
                        : "hover:bg-slate-50 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                        <span
                          className={clsx(
                            "text-sm font-medium line-clamp-1",
                            isAiFilterSelected("investor", inv.id)
                              ? "text-primary font-bold"
                              : "text-slate-600 group-hover:text-slate-800"
                          )}
                        >
                          {inv.name}
                        </span>
                    </div>
                    <span
                      className={clsx(
                        "text-xs font-mono px-2 py-0.5 rounded-full border",
                        isAiFilterSelected("investor", inv.id)
                          ? "bg-white text-primary border-primary/20"
                          : "bg-slate-100 text-slate-500 border-transparent"
                      )}
                    >
                      {inv.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* THEMES */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 border-t border-slate-100 pt-4">
                Themes
              </h4>
              <div className="space-y-1">
                {/* All Themes */}
                <div
                  onClick={() => setIsAllThemesSelected((prev) => !prev)}
                  className={clsx(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border",
                    isAllThemesSelected
                      ? "bg-primary/10 border-primary/30"
                      : "bg-slate-50 border-slate-200 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        "text-sm font-semibold",
                        isAllThemesSelected ? "text-primary" : "text-slate-500"
                      )}
                    >
                      {aiFiltersData?.themes?.all_themes?.label || "All Themes"}
                    </span>
                  </div>
                  <span
                    className={clsx(
                      "text-xs font-mono px-2 py-0.5 rounded-full border",
                      isAllThemesSelected
                        ? "bg-white text-primary border-primary/20"
                        : "bg-slate-100 text-slate-500 border-transparent"
                    )}
                  >
                    {aiFiltersData?.themes?.all_themes?.count || 0}
                  </span>
                </div>

                {/* Theme Breakdown */}
                {aiFiltersData?.themes?.breakdown?.map(
                  (theme: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => toggleAiFilter("theme", theme.name)}
                      className={clsx(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group border",
                        isAiFilterSelected("theme", theme.name)
                          ? "bg-primary/10 border-primary/30"
                          : "hover:bg-slate-50 border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                          <span
                            className={clsx(
                              "text-sm font-medium line-clamp-1",
                              isAiFilterSelected("theme", theme.name)
                                ? "text-primary font-bold"
                                : "text-slate-600 group-hover:text-slate-800"
                            )}
                          >
                            {theme.name}
                          </span>
                      </div>
                      <span
                        className={clsx(
                          "text-xs font-mono px-2 py-0.5 rounded-full border",
                          isAiFilterSelected("theme", theme.name)
                            ? "bg-white text-primary border-primary/20"
                            : "bg-slate-100 text-slate-500 border-transparent"
                        )}
                      >
                        {theme.count}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* YEARS */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 border-t border-slate-100 pt-4">
                Year
              </h4>
              <div className="space-y-1">
                {/* All Years */}
                <div
                  onClick={() => setIsAllYearsSelected((prev) => !prev)}
                  className={clsx(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border",
                    isAllYearsSelected
                      ? "bg-primary/10 border-primary/30"
                      : "bg-slate-50 border-slate-200 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        "text-sm font-semibold",
                        isAllYearsSelected ? "text-primary" : "text-slate-500"
                      )}
                    >
                      {aiFiltersData?.years?.all_years?.label || "All Years"}
                    </span>
                  </div>
                  <span
                    className={clsx(
                      "text-xs font-mono px-2 py-0.5 rounded-full border",
                      isAllYearsSelected
                        ? "bg-white text-primary border-primary/20"
                        : "bg-slate-100 text-slate-500 border-transparent"
                    )}
                  >
                    {aiFiltersData?.years?.all_years?.count || 0}
                  </span>
                </div>

                {/* Individual Years */}
                {aiFiltersData?.years?.individual?.map(
                  (yearData: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => toggleAiFilter("year", yearData.year)}
                      className={clsx(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group border",
                        isAiFilterSelected("year", yearData.year)
                          ? "bg-primary/10 border-primary/30"
                          : "hover:bg-slate-50 border-transparent"
                      )}
                    >
                      <span
                        className={clsx(
                          "text-sm font-medium",
                          isAiFilterSelected("year", yearData.year)
                            ? "text-primary font-bold"
                            : "text-slate-600 group-hover:text-slate-800"
                        )}
                      >
                        {yearData.year}
                      </span>
                      <span
                        className={clsx(
                          "text-xs font-mono px-2 py-0.5 rounded-full border",
                          isAiFilterSelected("year", yearData.year)
                            ? "bg-white text-primary border-primary/20"
                            : "bg-slate-100 text-slate-500 border-transparent"
                        )}
                      >
                        {yearData.count}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AiFiltersSidebar;
