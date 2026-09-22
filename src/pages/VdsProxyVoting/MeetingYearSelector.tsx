import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { dashboardService } from "@/services/dashboard";

type MeetingOption = {
  year: string;
  date: string;
};

type MeetingYearSelectorProps = {
  source?: "VDS" | "NPX";
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

const MeetingYearSelector = ({ source = "VDS" }: MeetingYearSelectorProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { companyGlobalSearchId } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  const [options, setOptions] = useState<MeetingOption[]>([]);

  const selectedDate = searchParams.get("meeting_date") || "";

  useEffect(() => {
    let isMounted = true;

    const loadMeetingDates = async () => {
      if (!companyGlobalSearchId) return;

      try {
        const { result } = await dashboardService.getVdsNpxMeetingDates(companyGlobalSearchId);
        const entries = source === "NPX"
          ? Array.isArray(result?.NPX_Data)
            ? result.NPX_Data
            : Array.isArray(result?.npx_data)
              ? result.npx_data
              : []
          : Array.isArray(result?.VDS_data)
            ? result.VDS_data
            : Array.isArray(result?.VDS_Data)
              ? result.VDS_Data
              : Array.isArray(result?.vds_data)
                ? result.vds_data
                : [];

        // Keep every distinct (year, meeting_date) pair — a company can hold
        // more than one meeting in the same year (e.g. a special meeting
        // plus the annual meeting), so deduping down to one entry per year
        // was silently dropping real meetings (only the latest date per
        // year survived).
        const seen = new Set<string>();
        const meetingOptions = entries.reduce((acc: MeetingOption[], item: any) => {
          const year = String(item?.year || "");
          const date = String(item?.meeting_date || "");
          if (!year || !date) return acc;

          const key = `${year}|${date}`;
          if (seen.has(key)) return acc;
          seen.add(key);

          acc.push({ year, date });
          return acc;
        }, [] as MeetingOption[])
          .sort((a: MeetingOption, b: MeetingOption) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

        if (!isMounted) return;
        setOptions(meetingOptions);

        const requestedYear = searchParams.get("year");
        const requestedDate = searchParams.get("meeting_date");
        const defaultOption =
          meetingOptions.find((option) => option.date === requestedDate) ||
          meetingOptions.find((option) => option.year === requestedYear) ||
          meetingOptions[0];

        if (defaultOption && (defaultOption.date !== requestedDate || defaultOption.year !== requestedYear)) {
          setSearchParams((previousParams) => {
            const params = new URLSearchParams(previousParams);
            params.set("year", defaultOption.year);
            params.set("meeting_date", defaultOption.date);
            return params;
          });
        }
      } catch (error) {
        console.warn(`Failed to load ${source} meeting dates:`, error);
      }
    };

    loadMeetingDates();

    return () => {
      isMounted = false;
    };
  }, [companyGlobalSearchId, searchParams, setSearchParams, source]);

  // Resolve the value to actually show synchronously (falling back to the
  // most recent meeting) so the dropdown never flashes an empty
  // "Select year" placeholder while data or the URL sync is still catching up.
  const effectiveOption =
    options.find((option) => option.date === selectedDate) || options[0];
  const effectiveDate = effectiveOption?.date || "";

  if (!companyGlobalSearchId || options.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-3" aria-label="Meeting year selector">
      <div className="hidden items-center gap-2 text-right sm:flex">
        <div className="leading-tight">
          <div className="whitespace-nowrap text-sm font-semibold tracking-wide text-slate-400">
            Meeting Year
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
            aria-label="Select meeting year"
            onChange={(event) => {
              const date = event.target.value;
              const option = options.find((item) => item.date === date);
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
            {options.map((option) => (
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

export default MeetingYearSelector;
