import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Lucide from "@/components/Base/Lucide";

type YearSelectorProps = {
  years: string[];
  label?: string;
  paramName?: string;
};

const YearSelector = ({
  years,
  label = "Meeting Year",
  paramName = "year",
}: YearSelectorProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedYear = searchParams.get(paramName) || "";

  const sortedYears = [...years]
    .filter((year) => year && !Number.isNaN(Number(year)))
    .sort((a, b) => Number(b) - Number(a));

  useEffect(() => {
    if (sortedYears.length === 0) return;

    const defaultYear =
      sortedYears.find((year) => year === selectedYear) || sortedYears[0];

    if (defaultYear !== selectedYear) {
      setSearchParams(
        (previousParams) => {
          const params = new URLSearchParams(previousParams);
          params.set(paramName, defaultYear);
          return params;
        },
        { replace: true }
      );
    }
  }, [sortedYears, paramName, selectedYear, setSearchParams]);

  if (sortedYears.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-3" aria-label="Year selector">
      <div className="hidden items-center gap-2 text-right sm:flex">
        <div className="leading-tight">
          <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </div>
        </div>
      </div>
      <div className="flex h-10 shrink-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex h-full w-10 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50 text-primary">
          <Lucide icon="CalendarDays" className="h-4 w-4" />
        </div>
        <div className="relative min-w-[220px]">
          <select
            value={selectedYear}
            aria-label={`Select ${label.toLowerCase()}`}
            onChange={(event) => {
              const year = event.target.value;
              setSearchParams((previousParams) => {
                const params = new URLSearchParams(previousParams);
                params.set(paramName, year);
                return params;
              });
            }}
            className="h-10 w-full appearance-none border-0 bg-transparent px-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:ring-0"
          >
            {!selectedYear && (
              <option value="" disabled>
                Select year
              </option>
            )}
            {sortedYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <Lucide
            icon="ChevronDown"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          />
        </div>
      </div>
    </div>
  );
};

export default YearSelector;
