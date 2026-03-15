import React from "react";

interface ActiveFilterChipsProps {
  selectedAiInstitutionIds: number[];
  selectedAiThemes: string[];
  selectedAiYears: number[];
  aiFiltersData: any;
  toggleAiFilter: (type: "investor" | "theme" | "year", value: any) => void;
  onClearAll: () => void;
}

const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  selectedAiInstitutionIds,
  selectedAiThemes,
  selectedAiYears,
  aiFiltersData,
  toggleAiFilter,
  onClearAll,
}) => {
  if (
    selectedAiInstitutionIds.length === 0 &&
    selectedAiThemes.length === 0 &&
    selectedAiYears.length === 0
  ) {
    return null;
  }

  return (
    <div className="px-5 pb-6 border-b">
      <p className="font-bold text-slate-800 text-xl mb-4">Active Filters</p>
      <div className="flex flex-wrap gap-1.5">
        {selectedAiInstitutionIds.map((id) => {
          const inv =
            aiFiltersData?.investors?.all?.find((i: any) => i.id === id) ||
            aiFiltersData?.investors?.top_5?.find((i: any) => i.id === id);
          return (
            <span
              key={`inv-${id}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20"
            >
              {inv?.name || `Investor ${id}`}
              <button
                onClick={() => toggleAiFilter("investor", id)}
                className="ml-1 hover:text-primary/60"
              >
                ✕
              </button>
            </span>
          );
        })}
        {selectedAiThemes.map((theme) => (
          <span
            key={`theme-${theme}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100"
          >
            {theme}
            <button
              onClick={() => toggleAiFilter("theme", theme)}
              className="ml-1 hover:text-blue-400"
            >
              ✕
            </button>
          </span>
        ))}
        {selectedAiYears.map((year) => (
          <span
            key={`year-${year}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100"
          >
            {year}
            <button
              onClick={() => toggleAiFilter("year", year)}
              className="ml-1 hover:text-amber-400"
            >
              ✕
            </button>
          </span>
        ))}
        <button
          onClick={onClearAll}
          className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold border border-slate-200 hover:bg-slate-200 transition-colors"
        >
          Clear all
        </button>
      </div>
    </div>
  );
};

export default ActiveFilterChips;
