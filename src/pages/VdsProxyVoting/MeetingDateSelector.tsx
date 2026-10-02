import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Lucide from "@/components/Base/Lucide";

export type MeetingDateOption = {
  year: string;
  date: string;
};

type MeetingDateSelectorProps = {
  options: MeetingDateOption[];
  label?: string;
};

const formatMeetingDate = (date: string) => {
  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Some companies hold more than one meeting in the same year (e.g. a special
// meeting plus the annual meeting), so a plain "year" dropdown isn't enough
// to disambiguate. This selector lists every distinct (year, meeting_date)
// pair from the API's `total_meeting_date_years` and keeps both "year" and
// "meeting_date" in the URL so the correct meeting can be requested/derived.
const MeetingDateSelector = ({ options, label = "Meeting Year" }: MeetingDateSelectorProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const sortedOptions = [...options]
    .filter((option) => option.year && option.date)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const selectedDate = searchParams.get("meeting_date") || "";
  // Resolve the value to actually show synchronously (falling back to the
  // most recent meeting) so the dropdown never flashes an empty
  // "Select year" placeholder while the effect below is syncing the URL.
  const effectiveOption =
    sortedOptions.find((option) => option.date === selectedDate) || sortedOptions[0];
  const effectiveDate = effectiveOption?.date || "";

  useEffect(() => {
    if (!effectiveOption) return;

    if (effectiveOption.date !== selectedDate || effectiveOption.year !== searchParams.get("year")) {
      setSearchParams(
        (previousParams) => {
          const params = new URLSearchParams(previousParams);
          params.set("year", effectiveOption.year);
          params.set("meeting_date", effectiveOption.date);
          return params;
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOption?.date, selectedDate]);

  if (sortedOptions.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-3" aria-label="Meeting date selector">
      <div className="hidden items-center gap-2 text-right sm:flex">
        <div className="leading-tight">
          <div className="whitespace-nowrap text-sm font-semibold tracking-wide text-slate-400">
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
            value={effectiveDate}
            aria-label={`Select ${label.toLowerCase()}`}
            onChange={(event) => {
              const date = event.target.value;
              const option = sortedOptions.find((item) => item.date === date);
              if (!option) return;

              setSearchParams((previousParams) => {
                const params = new URLSearchParams(previousParams);
                params.set("year", option.year);
                params.set("meeting_date", option.date);
                return params;
              });
            }}
            className="h-10 w-full appearance-none border-0 bg-transparent px-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:ring-0"
          >
            {!effectiveDate && (
              <option value="" disabled>
                Select year
              </option>
            )}
            {sortedOptions.map((option) => (
              <option key={`${option.year}-${option.date}`} value={option.date}>
                {`${option.year} · ${formatMeetingDate(option.date)}`}
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

export default MeetingDateSelector;
