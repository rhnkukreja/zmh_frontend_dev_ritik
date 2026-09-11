import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dashboardService } from "@/services/dashboard";
import StandardizedTable from "@/components/StandardizedTable";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import Lucide, { AppIconName } from "@/components/Base/Lucide";
import Popover from "@/components/Base/Headless/Popover";
import { FormCheck } from "@/components/Base/Form";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import FilterChips from "@/components/FilterChips";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import CPagination from "@/components/Pagination";
import { toast } from "react-toastify";

const THEME_MAROON = "#8b1828";
const PAGE_SIZE = 50;

// One row per captured SEC filing -- NOT one row per company+filer campaign.
// The same investor filing three times against one company shows as three
// separate rows here. status/notes/campaign_id are joined in from a campaign
// record when one exists for this company+filer pair, and are null otherwise.
type FilingItem = {
  id: string | number;
  accession_number?: string;
  form_type?: string;
  company_name?: string;
  subject_cik?: string;
  ticker?: string;
  filer?: string;
  filer_cik?: string;
  in_activism_flow?: boolean;
  filing_url?: string;
  filed_at?: string;
  alert_sent_at?: string | null;
  alert_sent_by?: string | null;
  // Set by the backend when a filing matched a suppression rule and its alert
  // was deliberately held rather than sent. Absent on every filing that wasn't
  // held, and on any deployment predating the feature -- absent must read as
  // "not held". alert_suppressed_reason is a complete sentence naming the
  // matched phrase, written by the backend and shown verbatim.
  alert_suppressed_at?: string | null;
  alert_suppressed_rule?: string | null;
  alert_suppressed_reason?: string | null;
  status?: string | null;
  notes?: string | null;
  campaign_id?: string | number | null;
  // Local-only: set when send-alert returns sent:true with alert_sent_at
  // still null and a `warning` -- the email genuinely went out, only the
  // database write of when recording it failed. Never comes from a GET; only
  // ever set from a send-alert response, and never cleared by a refetch.
  alertSendWarning?: string | null;
  [key: string]: any;
};

const toTrimmedString = (value: unknown) => String(value ?? "").trim();

// Server-side filter, unlike the Status/Ticker/Filer/Category panels: these
// `value`s are the backend's own `alert_state` param, which takes exactly one
// of them and 400s on anything else. So they're a closed list, single-select,
// and never composed or lower-cased from a label at the call site.
//
// Filtering has to happen server-side here: held filings are scattered through
// every page, and a client-side filter would only ever narrow the page already
// loaded -- filtering to "Held by filter" on page 1 would hide held rows
// sitting on page 3, which is exactly the review this is for.
const ALERT_STATE_ALL = "all";
const ALERT_STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: ALERT_STATE_ALL, label: "All" },
  { value: "sent", label: "Alert sent" },
  { value: "suppressed", label: "Held by filter" },
  { value: "no_alert", label: "No alert" },
];

const alertStateLabel = (value: string): string =>
  ALERT_STATE_OPTIONS.find((option) => option.value === value)?.label || value;

// A held row is one the backend stamped as suppressed AND that hasn't since
// been sent. The second half matters: a manual override sets alert_sent_at
// while the suppression stamp stays on the record, so without it the chip
// would come back on the next refetch of a row that was already overridden.
// It also means the bulk flow clears the chip without being touched.
const isFilingHeld = (filing: FilingItem): boolean =>
  !!filing.alert_suppressed_at && !filing.alert_sent_at && !filing.alertSendWarning;


const formatDateOnly = (value: any): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatDateTime = (value: any): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

// ─── Bulk send ──────────────────────────────────────────────────────────────
// One send takes ~27s in production (OpenAI summarisation with retries and a
// provider fallback, an SEC document fetch, exhibit listing, then the email)
// -- this is used only to show an honest time estimate, never to change how
// sends are paced (always sequential, one at a time, below).
const SECONDS_PER_SEND = 27;
// "Large selection" warning threshold, in filings -- an approximate line, not
// a hard limit on anything.
const LARGE_SELECTION_COUNT_THRESHOLD = 5;
// How many selected-filing chips to render before collapsing the rest into
// "+N more" -- keeps the bar from growing tall enough to push the table (up
// to ~86 rows) off screen.
const SELECTED_CHIPS_DISPLAY_CAP = 20;

const formatEstimatedDuration = (filingCount: number): string => {
  const totalSeconds = filingCount * SECONDS_PER_SEND;
  if (totalSeconds < 90) return `about ${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
};

// ─── Filing category buckets ──────────────────────────────────────────────
// The backend stores form_type as free-form strings ("Schedule 13D",
// "DEF 14A", ...) with inconsistent case/spacing seen in the data, so
// matching is done on a normalized (uppercased, whitespace-collapsed) form
// rather than the raw string. Anything that doesn't match either named
// bucket still gets its own "Other" bucket rather than being dropped, so no
// row becomes unreachable through this filter.
const OWNERSHIP_FILING_TYPES = new Set(["SCHEDULE 13D", "SCHEDULE 13D/A"]);
const PROXY_FILING_TYPES = new Set(["DEF 14A", "DEFA14A", "DEF 14C"]);
const FILING_CATEGORY_OTHER = "Other";
const FILING_CATEGORY_ORDER = ["Ownership filings", "Proxy filings", FILING_CATEGORY_OTHER];

const normalizeFilingType = (value: unknown) => toTrimmedString(value).toUpperCase().replace(/\s+/g, " ");

const getFilingCategory = (formType: unknown): string => {
  const normalized = normalizeFilingType(formType);
  if (OWNERSHIP_FILING_TYPES.has(normalized)) return "Ownership filings";
  if (PROXY_FILING_TYPES.has(normalized)) return "Proxy filings";
  return FILING_CATEGORY_OTHER;
};

// ─── Filter panel — one MultiSelectDropdown + "Select All" checkbox, reused
// for Status/Ticker/Filer (ActivistFilings only needed two of these inline;
// a third made the copy-pasted block worth factoring out). ──────────────────
const CampaignFilterPanel = ({
  label,
  icon,
  options,
  draft,
  onDraftChange,
  loading,
}: {
  label: string;
  icon: AppIconName;
  options: string[];
  draft: string[];
  onDraftChange: (next: string[]) => void;
  loading: boolean;
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 text-slate-600 font-semibold">
        <Lucide icon={icon} className="w-4 h-4 text-slate-400" />
        {label}
      </div>

      {options.length > 0 && (
        <FormCheck className="mr-2">
          <FormCheck.Label>Select All</FormCheck.Label>
          <FormCheck.Input
            className="ml-1"
            checked={draft.length === options.length && options.length > 0}
            type="checkbox"
            onChange={(e) => onDraftChange(e.target.checked ? options : [])}
          />
        </FormCheck>
      )}
    </div>

    <MultiSelectDropdown
      data={options}
      placeholder={`Select ${label}`}
      loading={loading}
      onChange={(selectedOptions) => onDraftChange(selectedOptions.map((option) => String(option.value)))}
      selectedOption={draft}
      size="compact"
      alignLeft
    />
  </div>
);

// Date range filter, same visual container as CampaignFilterPanel above.
// Native <input type="date"> -- same date-input pattern already used
// elsewhere in this codebase (e.g. ProxyContestModal.tsx), no new
// date-picker dependency.
const DateRangeFilterPanel = ({
  draftFrom,
  draftTo,
  onDraftFromChange,
  onDraftToChange,
}: {
  draftFrom: string;
  draftTo: string;
  onDraftFromChange: (value: string) => void;
  onDraftToChange: (value: string) => void;
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
    <div className="flex items-center gap-2 text-slate-600 font-semibold mb-3">
      <Lucide icon="Calendar" className="w-4 h-4 text-slate-400" />
      First Filed
    </div>

    <div className="flex flex-col gap-3">
      <label className="block">
        <span className="block text-xs text-slate-500 mb-1">From</span>
        <input
          type="date"
          value={draftFrom}
          onChange={(e) => onDraftFromChange(e.target.value)}
          className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="block text-xs text-slate-500 mb-1">To</span>
        <input
          type="date"
          value={draftTo}
          onChange={(e) => onDraftToChange(e.target.value)}
          className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none"
        />
      </label>
    </div>
  </div>
);

// Alert Status filter. Same container treatment as DateRangeFilterPanel above
// so it reads as one of the filter panels, but a native single-select rather
// than the checkbox lists, because alert_state accepts exactly one value.
const AlertStateFilterPanel = ({
  draft,
  onDraftChange,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
    <div className="flex items-center gap-2 text-slate-600 font-semibold mb-3">
      <Lucide icon="BellRing" className="w-4 h-4 text-slate-400" />
      Alert Status
    </div>

    <select
      value={draft}
      onChange={(e) => onDraftChange(e.target.value)}
      className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none"
    >
      {ALERT_STATE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// Renders the preview endpoint's structured `blocks` (document order) instead
// of flat body_text, so headings/lists/checkboxes the filing actually marked
// up read as such instead of one undifferentiated wall of text.
type PreviewBlock = { type: string; text?: string; checked?: boolean };

const FilingPreviewBlocks: React.FC<{ blocks: PreviewBlock[] }> = ({ blocks }) => (
  <div>
    {blocks.map((block, i) => {
      if (block.type === "heading") {
        // Space above (groups it away from whatever came before) but little
        // below, so it visually belongs with the paragraph/list that follows
        // rather than floating between two sections.
        return (
          <h4
            key={i}
            style={{ fontSize: 14.5, fontWeight: 700, color: "#111827", margin: i === 0 ? "0 0 6px" : "20px 0 6px" }}
          >
            {block.text}
          </h4>
        );
      }

      if (block.type === "list_item") {
        // The number is already IN block.text (e.g. "1. as a special
        // resolution...") -- no <ol>, no marker of our own, just a hanging
        // indent so a wrapped line aligns under the text after the number
        // rather than under the number itself.
        return (
          <p
            key={i}
            style={{
              fontSize: 13.5, color: "#374151", lineHeight: 1.7, maxWidth: "70ch",
              margin: "0 0 8px", paddingLeft: "1.75em", textIndent: "-1.75em",
            }}
          >
            {block.text}
          </p>
        );
      }

      if (block.type === "checkbox") {
        // The glyph isn't in the text -- a custom indicator (not a native
        // disabled <input>, which renders inconsistently washed-out across
        // browsers) reusing this app's own checkmark glyph, on the same line
        // as the label via flex so the label wraps beside it, not under it.
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "0 0 8px" }}>
            <div
              aria-hidden="true"
              style={{
                width: 14, height: 14, marginTop: 3, borderRadius: 3, flexShrink: 0,
                border: `1.5px solid ${block.checked ? THEME_MAROON : "#9ca3af"}`,
                background: block.checked ? THEME_MAROON : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {block.checked && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.5, flex: 1, minWidth: 0 }}>
              {block.text}
            </span>
          </div>
        );
      }

      // "paragraph", and any future/unrecognized type -- rendered as normal
      // body text rather than dropped, so block order always stays complete.
      return (
        <p key={i} style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, maxWidth: "70ch", margin: "0 0 10px" }}>
          {block.text}
        </p>
      );
    })}
  </div>
);

// A section is rendered only when it actually carries text. Null for every
// Schedule 13D and for any proxy whose section wasn't found, and a
// whitespace-only string counts as absent -- an empty heading is worse than no
// heading, since it reads as a section we failed to load.
const hasPreviewText = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

// The contested-proxy counterpart of Item 2 / Item 4: same heading and body
// treatment, so a proxy preview and a 13D preview read as the same thing.
//
// The one difference is length. These sections run 12k-24k characters, an order
// of magnitude past an Item 2, so the body gets its own scroll box instead of
// adding thousands of lines to the modal's own scroll -- which would leave the
// second heading buried far below the fold with no sign it was there. The
// heading sits outside that box, so it stays put while the text scrolls.
const SolicitationSection: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div>
    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>{title}</h3>
    <div
      style={{
        fontSize: 13.5, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap",
        maxHeight: 360, overflowY: "auto",
        border: "1px solid #e5e7eb", borderRadius: 6, padding: "12px 14px", background: "#fafafa",
      }}
    >
      {text}
    </div>
  </div>
);

function ActivistCampaigns() {
  const [loading, setLoading] = useState(false);
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [totalFilings, setTotalFilings] = useState(0);
  const [page, setPage] = useState(1);

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedFilers, setSelectedFilers] = useState<string[]>([]);
  const [selectedFilingCategories, setSelectedFilingCategories] = useState<string[]>([]);
  const [selectedAlertState, setSelectedAlertState] = useState<string>(ALERT_STATE_ALL);
  // searchInput is what's in the box; appliedSearch is what the loaded rows
  // actually reflect. Kept apart so the debounce below can tell "the user is
  // still typing" from "this is already the query on screen", and so every
  // other refetch (paging, Apply, chip removal) can carry the live query
  // through instead of silently dropping it.
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedDateFrom, setSelectedDateFrom] = useState("");
  const [selectedDateTo, setSelectedDateTo] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<string[]>([]);
  const [draftTickers, setDraftTickers] = useState<string[]>([]);
  const [draftFilers, setDraftFilers] = useState<string[]>([]);
  const [draftFilingCategories, setDraftFilingCategories] = useState<string[]>([]);
  const [draftAlertState, setDraftAlertState] = useState<string>(ALERT_STATE_ALL);
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");

  // Send Alert -- replaces the old local-only sendAlertFlags entirely. The
  // checkbox's checked state now reflects the real alert_sent_at on the row,
  // not unsent local intent; clicking it opens a confirm dialog rather than
  // toggling anything directly.
  const [alertConfirmTarget, setAlertConfirmTarget] = useState<FilingItem | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | number | null>(null);
  const [alertSendError, setAlertSendError] = useState<string | null>(null);

  // Filing preview modal -- lets an analyst read the filing text and decide
  // whether to send the alert without leaving the page. previewFiling is the
  // row that opened it (captured at open time, for the header); the live
  // row (currentPreviewFiling, derived below) is what Send Alert actually
  // acts on, so a send from inside the modal reflects immediately.
  const [previewFiling, setPreviewFiling] = useState<FilingItem | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Bulk selection -- purely local, for building up a set of filings to send
  // alerts for in one action. Reset on every refetch (page change, Apply,
  // Clear, chip removal), since it's addressing rows on a specific loaded
  // page that may no longer be the same rows afterward.
  const [selectedFilingIds, setSelectedFilingIds] = useState<Set<string | number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkStopRequested, setBulkStopRequested] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ index: number; total: number; current: FilingItem } | null>(null);
  const [bulkResults, setBulkResults] = useState<
    Array<{ filing: FilingItem; status: "sent" | "warning" | "failed"; message?: string }> | null
  >(null);
  const bulkStopRequestedRef = useRef(false);

  const [editingFiling, setEditingFiling] = useState<FilingItem | null>(null);
  const [editStatus, setEditStatus] = useState("ongoing");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const dropzoneRef = useRef<DropzoneElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Server-side pagination + date filtering, per the backend contract --
  // never fetch everything and paginate/filter dates in the browser, since
  // this table will hold thousands of rows.
  const fetchFilings = useCallback(async (targetPage: number, dateFrom: string, dateTo: string, alertState: string = ALERT_STATE_ALL, search: string = "") => {
    setLoading(true);
    try {
      const response = await dashboardService.getActivistCampaignFilings({
        limit: PAGE_SIZE,
        offset: (targetPage - 1) * PAGE_SIZE,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        // Server-side, so it searches all filings rather than the page in
        // memory -- the whole point, since the row being looked for is usually
        // not on the page currently loaded.
        search: search.trim() || undefined,
        // Omitted rather than sent as "all", so an unfiltered request is
        // byte-identical to what it was before this param existed. Guarded
        // against the closed list because the backend 400s on any other value,
        // which would blank the table rather than degrade.
        alert_state:
          alertState && alertState !== ALERT_STATE_ALL && ALERT_STATE_OPTIONS.some((o) => o.value === alertState)
            ? alertState
            : undefined,
      });
      const list = response?.filings || response?.results || response?.data || [];
      const results = Array.isArray(list) ? list : [];
      setFilings(results);
      setTotalFilings(typeof response?.total === "number" ? response.total : results.length);
      // Selection addresses specific rows on this page -- a refetch (page
      // change, Apply, Clear, chip removal) may load an entirely different
      // set of rows, so stale selection is cleared rather than carried over.
      setSelectedFilingIds(new Set());
    } catch (error) {
      console.error("Failed to load activist campaign filings:", error);
      setFilings([]);
      setTotalFilings(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilings(1, "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced so a refetch fires once the typing settles, not per keystroke.
  // The guard against appliedSearch keeps this from re-firing the initial load
  // on mount, and from refetching when a keystroke leaves the trimmed query
  // unchanged (trailing space, then deleting it).
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === appliedSearch) return;

    const timer = setTimeout(() => {
      setAppliedSearch(trimmed);
      setPage(1);
      fetchFilings(1, selectedDateFrom, selectedDateTo, selectedAlertState, trimmed);
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchFilings(newPage, selectedDateFrom, selectedDateTo, selectedAlertState, appliedSearch);
  };

  // ─── Excel upload dropzone — mirrors src/components/UploadFile/index.tsx's
  // addedfile/error handling exactly. ───────────────────────────────────────
  useEffect(() => {
    const el = dropzoneRef.current;
    if (!el) return;

    const dz = el.dropzone;
    const handleAddedFile = (file: any) => {
      if (file?.status === "added") {
        const fileExtension = file?.name?.split(".").pop()?.toLowerCase();

        if (!fileExtension || fileExtension !== "xlsx") {
          toast.error("Only Excel files (.xlsx) are allowed!");
        } else {
          setUploadFile(file);
          setUploadErrors([]);
        }

        dz.removeFile(file);
      }

      if (file?.status === "error") {
        toast.error("Something went wrong during file upload!");
      }
    };

    dz.on("addedfile", handleAddedFile);
    return () => {
      dz.off("addedfile", handleAddedFile);
    };
  }, []);

  // NOTE: Status/Ticker/Filer/Filing Category filters below are client-side,
  // applied only to the currently-loaded page of filings -- the documented
  // backend contract for GET .../filings has no query params for exact
  // status/ticker/filer matching (only date_from/date_to, form_type,
  // in_activism_flow, and a single fuzzy `search`). This is a pre-existing
  // limitation carried over from before this change, just made more visible
  // now that the table is genuinely paginated -- flagged rather than
  // silently left, since it's the same "only filters the current page" trap
  // the date filter was explicitly required to avoid.
  const statusOptions = useMemo(
    () => Array.from(new Set(filings.map((f) => toTrimmedString(f.status)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [filings]
  );
  const tickerOptions = useMemo(
    () => Array.from(new Set(filings.map((f) => toTrimmedString(f.ticker)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [filings]
  );
  const filerOptions = useMemo(
    () => Array.from(new Set(filings.map((f) => toTrimmedString(f.filer)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [filings]
  );
  const filingCategoryOptions = useMemo(() => {
    const present = new Set(filings.map((f) => getFilingCategory(f.form_type)));
    // Fixed order (not alpha) so "Other" always trails the two named
    // buckets instead of sorting wherever "O" happens to land.
    return FILING_CATEGORY_ORDER.filter((category) => present.has(category));
  }, [filings]);

  const filteredFilings = useMemo(() => {
    return filings.filter((filing) => {
      const status = toTrimmedString(filing.status);
      const ticker = toTrimmedString(filing.ticker);
      const filer = toTrimmedString(filing.filer);
      const filingCategory = getFilingCategory(filing.form_type);

      if (selectedStatuses.length > 0 && !selectedStatuses.includes(status)) return false;
      if (selectedTickers.length > 0 && !selectedTickers.includes(ticker)) return false;
      if (selectedFilers.length > 0 && !selectedFilers.includes(filer)) return false;
      if (selectedFilingCategories.length > 0 && !selectedFilingCategories.includes(filingCategory)) return false;
      // Alert Status is deliberately absent here: it's applied by the backend
      // via alert_state, across every page, not just the one in memory.

      return true;
    });
  }, [filings, selectedStatuses, selectedTickers, selectedFilers, selectedFilingCategories]);

  const activeFiltersCount =
    selectedStatuses.length +
    selectedTickers.length +
    selectedFilers.length +
    selectedFilingCategories.length +
    (selectedAlertState !== ALERT_STATE_ALL ? 1 : 0) +
    (selectedDateFrom ? 1 : 0) +
    (selectedDateTo ? 1 : 0);

  const syncDraftFilters = useCallback(() => {
    setDraftStatuses(selectedStatuses);
    setDraftTickers(selectedTickers);
    setDraftFilers(selectedFilers);
    setDraftFilingCategories(selectedFilingCategories);
    setDraftAlertState(selectedAlertState);
    setDraftDateFrom(selectedDateFrom);
    setDraftDateTo(selectedDateTo);
  }, [selectedStatuses, selectedTickers, selectedFilers, selectedFilingCategories, selectedAlertState, selectedDateFrom, selectedDateTo]);

  const applyFilters = useCallback(
    (close?: () => void) => {
      setSelectedStatuses(draftStatuses);
      setSelectedTickers(draftTickers);
      setSelectedFilers(draftFilers);
      setSelectedFilingCategories(draftFilingCategories);
      setSelectedAlertState(draftAlertState);
      setSelectedDateFrom(draftDateFrom);
      setSelectedDateTo(draftDateTo);
      setPage(1);
      // date_from/date_to and alert_state are server-side and genuinely need
      // this refetch; the rest just re-narrow whatever page is already loaded.
      // Still safe/cheap to always refetch page 1 here since Apply is an
      // explicit, infrequent action, not something firing on every keystroke.
      fetchFilings(1, draftDateFrom, draftDateTo, draftAlertState, appliedSearch);
      close?.();
    },
    [draftStatuses, draftTickers, draftFilers, draftFilingCategories, draftAlertState, draftDateFrom, draftDateTo, appliedSearch, fetchFilings]
  );

  const clearFilters = useCallback(
    (close?: () => void) => {
      setDraftStatuses([]);
      setDraftTickers([]);
      setDraftFilers([]);
      setDraftFilingCategories([]);
      setDraftAlertState(ALERT_STATE_ALL);
      setDraftDateFrom("");
      setDraftDateTo("");
      setSelectedStatuses([]);
      setSelectedTickers([]);
      setSelectedFilers([]);
      setSelectedFilingCategories([]);
      setSelectedAlertState(ALERT_STATE_ALL);
      setSelectedDateFrom("");
      setSelectedDateTo("");
      setPage(1);
      // Deliberately keeps the search query: it lives in its own box outside
      // this popover, still visibly filled in, so clearing it from in here
      // would silently change something the user can't see from this panel.
      fetchFilings(1, "", "", ALERT_STATE_ALL, appliedSearch);
      close?.();
    },
    [appliedSearch, fetchFilings]
  );

  const handleRemoveChip = useCallback(
    (removeKey: string, removeValue: string | number) => {
      const value = String(removeValue);

      if (removeKey === "status") {
        setSelectedStatuses((prev) => prev.filter((item) => item !== value));
        setDraftStatuses((prev) => prev.filter((item) => item !== value));
        return;
      }
      if (removeKey === "ticker") {
        setSelectedTickers((prev) => prev.filter((item) => item !== value));
        setDraftTickers((prev) => prev.filter((item) => item !== value));
        return;
      }
      if (removeKey === "filer") {
        setSelectedFilers((prev) => prev.filter((item) => item !== value));
        setDraftFilers((prev) => prev.filter((item) => item !== value));
        return;
      }
      if (removeKey === "filing_category") {
        setSelectedFilingCategories((prev) => prev.filter((item) => item !== value));
        setDraftFilingCategories((prev) => prev.filter((item) => item !== value));
        return;
      }
      if (removeKey === "alert_state") {
        // Server-side, so removing this chip has to refetch -- unlike the
        // client-side chips above, which only re-narrow the loaded page.
        setSelectedAlertState(ALERT_STATE_ALL);
        setDraftAlertState(ALERT_STATE_ALL);
        setPage(1);
        fetchFilings(1, selectedDateFrom, selectedDateTo, ALERT_STATE_ALL, appliedSearch);
        return;
      }
      if (removeKey === "date_from") {
        setSelectedDateFrom("");
        setDraftDateFrom("");
        setPage(1);
        // Carries the current alert_state and search through: dropping a date
        // chip must not silently drop the other two along with it.
        fetchFilings(1, "", selectedDateTo, selectedAlertState, appliedSearch);
        return;
      }
      if (removeKey === "date_to") {
        setSelectedDateTo("");
        setDraftDateTo("");
        setPage(1);
        fetchFilings(1, selectedDateFrom, "", selectedAlertState, appliedSearch);
        return;
      }
      if (removeKey.startsWith("selected_filing_")) {
        // The id is encoded in the key (not the value, which is the display
        // name and can collide across rows) -- matched by string form since
        // ids can be numbers or strings and the key was stringified.
        const idStr = removeKey.slice("selected_filing_".length);
        setSelectedFilingIds((prev) => {
          const next = new Set(prev);
          for (const existingId of next) {
            if (String(existingId) === idStr) {
              next.delete(existingId);
              break;
            }
          }
          return next;
        });
      }
    },
    [fetchFilings, selectedDateFrom, selectedDateTo, selectedAlertState, appliedSearch]
  );

  const openEditModal = (filing: FilingItem) => {
    if (filing.campaign_id == null) return;
    setEditingFiling(filing);
    setEditStatus(toTrimmedString(filing.status).toLowerCase() === "closed" ? "closed" : "ongoing");
    setEditNotes(filing.notes || "");
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setEditingFiling(null);
  };

  const saveEdit = async () => {
    if (!editingFiling || editingFiling.campaign_id == null) return;
    const campaignId = editingFiling.campaign_id;
    setIsSavingEdit(true);
    try {
      await dashboardService.updateActivistCampaign(campaignId, {
        status: editStatus,
        notes: editNotes,
      });
      // Every filing row sharing this campaign_id reflects the same
      // underlying campaign, so all of them get the update, not just the
      // one row that was clicked.
      setFilings((prev) =>
        prev.map((f) => (f.campaign_id != null && f.campaign_id === campaignId ? { ...f, status: editStatus, notes: editNotes } : f))
      );
      toast.success("Campaign updated.");
      setEditingFiling(null);
    } catch (error) {
      console.error("Failed to update activist campaign:", error);
      toast.error("Failed to update the campaign.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openAlertConfirm = (filing: FilingItem) => {
    setAlertSendError(null);
    setAlertConfirmTarget(filing);
  };

  const closeAlertConfirm = () => {
    if (sendingAlertId != null) return;
    setAlertConfirmTarget(null);
    setAlertSendError(null);
  };

  const confirmSendAlert = async () => {
    if (!alertConfirmTarget) return;
    const target = alertConfirmTarget;
    setSendingAlertId(target.id);
    setAlertSendError(null);
    try {
      const response = await dashboardService.sendActivistCampaignFilingAlert(target.id);

      if (!response?.sent) {
        // A 2xx response that isn't actually a success (sent:false, or a
        // shape we don't recognize) -- treated exactly like a thrown error:
        // the row stays not-sent, and the server's own message is shown.
        setAlertSendError(response?.detail || response?.message || "Failed to send the alert.");
        return;
      }

      setFilings((prev) =>
        prev.map((f) =>
          f.id === target.id
            ? {
                ...f,
                alert_sent_at: response?.alert_sent_at ?? f.alert_sent_at,
                alert_sent_by: response?.alert_sent_by ?? f.alert_sent_by,
                // sent:true with alert_sent_at still null + a `warning` means
                // the email genuinely went out -- only the database write of
                // *when* it was sent failed. Cleared once a real
                // alert_sent_at comes back, so a later successful send
                // doesn't leave a stale warning on the row.
                alertSendWarning: response?.alert_sent_at ? null : response?.warning || null,
                // The manual override the hold exists to allow: it has now been
                // sent, so the row stops reading as held immediately, with no
                // reload. Cleared explicitly here as well as being derived in
                // isFilingHeld, so the chip goes even if the send response
                // carried no alert_sent_at of its own.
                alert_suppressed_at: null,
                alert_suppressed_rule: null,
                alert_suppressed_reason: null,
              }
            : f
        )
      );
      toast.success(
        response?.warning
          ? `Alert sent for ${target.company_name || "this filing"} — ${response.warning}`
          : `Alert sent for ${target.company_name || "this filing"}.`
      );
      setAlertConfirmTarget(null);
    } catch (error: any) {
      console.error("Failed to send alert:", error);
      // Never optimistically mark the row as sent -- on failure it's left
      // exactly as it was (still shows its previous alert_sent_at, if any).
      setAlertSendError(error?.response?.data?.detail || error?.message || "Failed to send the alert.");
    } finally {
      setSendingAlertId(null);
    }
  };

  const toggleFilingSelection = (id: string | number) => {
    setSelectedFilingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // "Currently displayed" = filteredFilings (post client-side filters), same
  // set the select-all checkbox and each row's own checkbox address.
  const allVisibleSelected = filteredFilings.length > 0 && filteredFilings.every((f) => selectedFilingIds.has(f.id));

  const toggleSelectAllVisible = () => {
    setSelectedFilingIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredFilings.forEach((f) => next.delete(f.id));
      } else {
        filteredFilings.forEach((f) => next.add(f.id));
      }
      return next;
    });
  };

  // Always derived from the live `filings` array (not a snapshot), so the
  // selected-chips bar and the bulk confirm dialog show current alert_sent_at
  // state, including updates made mid-bulk-run as each send returns.
  const selectedFilings = filings.filter((f) => selectedFilingIds.has(f.id));
  const alreadySentSelected = selectedFilings.filter((f) => f.alert_sent_at || f.alertSendWarning);

  const openBulkConfirm = () => {
    if (selectedFilings.length === 0) return;
    setBulkResults(null);
    setBulkProgress(null);
    bulkStopRequestedRef.current = false;
    setBulkStopRequested(false);
    setBulkConfirmOpen(true);
  };

  const closeBulkConfirm = () => {
    if (bulkSending) return; // dismiss only via Stop while a run is active
    setBulkConfirmOpen(false);
    setBulkResults(null);
    setBulkProgress(null);
  };

  const requestBulkStop = () => {
    // Checked between sends in the loop below -- never aborts a request
    // already in flight, since that email may still go out regardless.
    bulkStopRequestedRef.current = true;
    setBulkStopRequested(true);
  };

  const runBulkSend = async () => {
    const targets = selectedFilings.slice();
    if (targets.length === 0) return;

    setBulkSending(true);
    setBulkResults(null);
    bulkStopRequestedRef.current = false;
    setBulkStopRequested(false);

    const results: Array<{ filing: FilingItem; status: "sent" | "warning" | "failed"; message?: string }> = [];

    for (let i = 0; i < targets.length; i++) {
      // Only checked between iterations -- a request already in flight is
      // always allowed to finish, since the email may already be on its way.
      if (bulkStopRequestedRef.current) break;

      const target = targets[i];
      setBulkProgress({ index: i, total: targets.length, current: target });

      try {
        const response = await dashboardService.sendActivistCampaignFilingAlert(target.id);

        if (!response?.sent) {
          results.push({
            filing: target,
            status: "failed",
            message: response?.detail || response?.message || "Failed to send the alert.",
          });
          continue;
        }

        // Same interpretation as the single-row send: sent:true with
        // alert_sent_at still null + a warning means the email genuinely
        // went out -- only the database write of when failed.
        setFilings((prev) =>
          prev.map((f) =>
            f.id === target.id
              ? {
                  ...f,
                  alert_sent_at: response?.alert_sent_at ?? f.alert_sent_at,
                  alert_sent_by: response?.alert_sent_by ?? f.alert_sent_by,
                  alertSendWarning: response?.alert_sent_at ? null : response?.warning || null,
                }
              : f
          )
        );
        results.push({
          filing: target,
          status: response?.warning ? "warning" : "sent",
          message: response?.warning || undefined,
        });
      } catch (error: any) {
        console.error("Bulk send failed for filing", target.id, error);
        results.push({
          filing: target,
          status: "failed",
          message: error?.response?.data?.detail || error?.message || "Failed to send the alert.",
        });
      }
    }

    setBulkProgress(null);
    setBulkSending(false);
    setBulkResults(results);
    // These filings have now been acted on (sent, warned, or recorded as
    // failed in the summary below) -- clearing selection avoids the bar
    // reappearing with a stale, already-handled batch.
    setSelectedFilingIds(new Set());
  };

  const openPreview = async (filing: FilingItem) => {
    setPreviewFiling(filing);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const data = await dashboardService.getActivistCampaignFilingPreview(filing.id);
      setPreviewData(data);
    } catch (error: any) {
      console.error("Failed to load filing preview:", error);
      setPreviewError(error?.response?.data?.detail || error?.message || "Failed to load the filing preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFiling(null);
    setPreviewData(null);
    setPreviewError(null);
  };

  // The live row (not the possibly-stale snapshot captured when the modal
  // opened) -- so a send-alert from inside the modal, which updates
  // `filings` via the existing confirmSendAlert handler, is reflected here
  // immediately without a refetch.
  const currentPreviewFiling = previewFiling
    ? filings.find((f) => f.id === previewFiling.id) || previewFiling
    : null;
  const previewHeaderFiling = previewData?.filing || currentPreviewFiling;
  const previewSecUrl = previewData?.sec_url || currentPreviewFiling?.filing_url || "";

  const handleUpload = async () => {
    if (!uploadFile || isUploading) return;

    const formData = new FormData();
    formData.append("file", uploadFile);

    setIsUploading(true);
    setUploadErrors([]);
    try {
      const response = await dashboardService.uploadActivistCampaignsExcel(formData);
      const rowErrors: any[] = Array.isArray(response?.errors)
        ? response.errors
        : Array.isArray(response?.row_errors)
          ? response.row_errors
          : [];

      if (rowErrors.length > 0) {
        setUploadErrors(rowErrors.map((err) => (typeof err === "string" ? err : err?.message || JSON.stringify(err))));
        toast.error(`Upload completed with ${rowErrors.length} row error(s).`);
      } else {
        toast.success("Campaigns uploaded successfully.");
      }

      setUploadFile(null);
      await fetchFilings(page, selectedDateFrom, selectedDateTo);
    } catch (error: any) {
      console.error("Failed to upload activist campaigns Excel:", error);
      toast.error(error?.response?.data?.detail || error?.message || "Failed to upload the file.");
    } finally {
      setIsUploading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalFilings / PAGE_SIZE));

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="mt-3.5 relative">
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">Activist Campaigns</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Upload Campaigns (Excel)</h3>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-full max-w-md">
                {uploadFile ? (
                  <div className="flex items-center w-full relative px-3 py-2.5 rounded-[0.6rem] border border-slate-200/80 hover:bg-slate-50 transition sm:px-5 shadow-sm">
                    <Lucide icon="FileSpreadsheet" className="w-8 h-8 shrink-0 stroke-[1.7] stroke-slate-400/70" />
                    <div className="flex flex-col w-full ml-3 gap-y-1 overflow-hidden">
                      <p className="block font-medium truncate text-sm text-slate-700">{uploadFile.name}</p>
                    </div>
                    <Lucide
                      onClick={() => setUploadFile(null)}
                      icon="Trash2"
                      className="w-5 h-5 shrink-0 cursor-pointer stroke-[1.7] stroke-slate-400/70"
                    />
                  </div>
                ) : (
                  <Dropzone
                    ref={dropzoneRef}
                    options={{
                      url: "/",
                      autoProcessQueue: false,
                      clickable: true,
                      thumbnailWidth: 100,
                      maxFilesize: 5000,
                      maxFiles: 1,
                      acceptedFiles: ".xlsx",
                    }}
                    className="dropzone w-full flex flex-col justify-center items-center h-[110px]"
                  >
                    <div className="text-sm font-semibold text-gray-800 mb-1">Drop file here or click to upload.</div>
                    <div className="text-xs text-slate-500">
                      Only <span className="font-medium">.xlsx</span> files are allowed.
                    </div>
                  </Dropzone>
                )}
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                style={{
                  padding: "10px 18px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", color: "#fff",
                  background: THEME_MAROON,
                  opacity: !uploadFile || isUploading ? 0.5 : 1,
                  cursor: !uploadFile || isUploading ? "not-allowed" : "pointer",
                  height: "fit-content",
                }}
              >
                {isUploading ? "Uploading…" : "Upload"}
              </button>
            </div>

            {uploadErrors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs font-semibold text-red-700 mb-1.5">Some rows could not be processed:</p>
                <ul className="text-xs text-red-700 list-disc pl-4 space-y-0.5">
                  {uploadErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-slate-500">Count:</span>
                <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                  {totalFilings}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Searches server-side across every filing, not just the page
                    in memory -- the row being looked for is usually not on the
                    page currently loaded, which is the reason for the box. */}
                <div className="relative w-64 max-w-[45vw]">
                  <Lucide
                    icon="Search"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search company, ticker or filer..."
                    className="w-full text-sm border border-slate-300 rounded-md pl-9 pr-8 py-2 bg-white focus:border-primary focus:outline-none"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      title="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <Lucide icon="X" className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Popover className="inline-block">
                {({ close }) => (
                  <>
                    <Popover.Button
                      as={Button}
                      variant="outline-secondary"
                      className="w-full sm:w-auto"
                      onClick={syncDraftFilters}
                    >
                      <Lucide icon="Filter" className="stroke-[1.3] w-4 h-4 mr-2" />
                      Filter
                      <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100 text-slate-600">
                        {activeFiltersCount}
                      </div>
                    </Popover.Button>

                    <Popover.Panel className="w-[54rem] max-w-[90vw] p-5" placement="bottom-end">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
                          <p className="text-xs text-slate-500 mt-1">Filter the filings shown below.</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline-secondary" onClick={() => clearFilters(close)}>
                            Clear
                          </Button>
                          <Button type="button" variant="primary" onClick={() => applyFilters(close)}>
                            Apply
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <CampaignFilterPanel
                          label="Status"
                          icon="Flag"
                          options={statusOptions}
                          draft={draftStatuses}
                          onDraftChange={setDraftStatuses}
                          loading={loading}
                        />
                        <CampaignFilterPanel
                          label="Ticker"
                          icon="Tag"
                          options={tickerOptions}
                          draft={draftTickers}
                          onDraftChange={setDraftTickers}
                          loading={loading}
                        />
                        <CampaignFilterPanel
                          label="Filer"
                          icon="User"
                          options={filerOptions}
                          draft={draftFilers}
                          onDraftChange={setDraftFilers}
                          loading={loading}
                        />
                        <CampaignFilterPanel
                          label="Filing Category"
                          icon="Tags"
                          options={filingCategoryOptions}
                          draft={draftFilingCategories}
                          onDraftChange={setDraftFilingCategories}
                          loading={loading}
                        />
                        {/* Single-select, unlike the checkbox panels above it:
                            the backend's alert_state takes exactly one value,
                            so a multi-select would offer combinations ("sent"
                            AND "suppressed") that can't be expressed and would
                            have to be silently dropped or split into two
                            requests. The options are fixed rather than derived
                            from the loaded rows, so "Held by filter" stays
                            selectable on a page where nothing happens to be
                            held -- which is exactly when it's needed. */}
                        <AlertStateFilterPanel draft={draftAlertState} onDraftChange={setDraftAlertState} />
                        <DateRangeFilterPanel
                          draftFrom={draftDateFrom}
                          draftTo={draftDateTo}
                          onDraftFromChange={setDraftDateFrom}
                          onDraftToChange={setDraftDateTo}
                        />
                      </div>
                    </Popover.Panel>
                  </>
                )}
                </Popover>
              </div>
            </div>

            {selectedFilings.length > 0 && (
              <div className="mb-4 p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-slate-700 shrink-0">
                  {selectedFilings.length} selected
                </span>
                <div className="flex-1 min-w-0">
                  <FilterChips
                    filters={selectedFilings.slice(0, SELECTED_CHIPS_DISPLAY_CAP).map((f) => ({
                      key: `selected_filing_${f.id}`,
                      value: f.company_name || `Filing ${f.id}`,
                    }))}
                    onRemove={handleRemoveChip}
                  />
                </div>
                {selectedFilings.length > SELECTED_CHIPS_DISPLAY_CAP && (
                  <span className="text-xs text-slate-500 shrink-0">
                    +{selectedFilings.length - SELECTED_CHIPS_DISPLAY_CAP} more
                  </span>
                )}
                <Button
                  type="button"
                  variant="primary"
                  onClick={openBulkConfirm}
                  disabled={bulkSending}
                  className="shrink-0"
                >
                  Send Alerts
                </Button>
              </div>
            )}

            {activeFiltersCount > 0 && (
              <div className="-mx-1 mb-3">
                <FilterChips
                  filters={[
                    ...selectedStatuses.map((status) => ({ key: "status", value: status })),
                    ...selectedTickers.map((ticker) => ({ key: "ticker", value: ticker })),
                    ...selectedFilers.map((filer) => ({ key: "filer", value: filer })),
                    ...selectedFilingCategories.map((category) => ({ key: "filing_category", value: category })),
                    ...(selectedAlertState !== ALERT_STATE_ALL
                      ? [{ key: "alert_state", value: alertStateLabel(selectedAlertState) }]
                      : []),
                    ...(selectedDateFrom ? [{ key: "date_from", value: selectedDateFrom }] : []),
                    ...(selectedDateTo ? [{ key: "date_to", value: selectedDateTo }] : []),
                  ]}
                  onRemove={handleRemoveChip}
                />
              </div>
            )}

            <StandardizedTable isLoading={loading} skeletonRows={6} skeletonCols={14} maxHeight="68vh" className="table-fixed">
              <StandardizedTable.Header>
                <StandardizedTable.Cell isHeader width="4%">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={bulkSending}
                    title="Select all filings currently displayed"
                    className="w-4 h-4 cursor-pointer"
                    style={{ accentColor: THEME_MAROON }}
                  />
                </StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="10%">Company Name</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="5%">CIK</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="5%">Ticker</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="9%">Filer</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="8%">In Activism Flow</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="6%">Status</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="10%">Notes</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="6%">Filing Type</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">First Filed</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="6%">Last Updated</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="8%">Alert Sent</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">Send Alert</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="6%"> </StandardizedTable.Cell>
              </StandardizedTable.Header>
              <Table.Tbody>
                {filteredFilings.length > 0 ? (
                  filteredFilings.map((filing, index) => (
                    <StandardizedTable.Row key={filing.id ?? index} index={index}>
                      <StandardizedTable.Cell>
                        <input
                          type="checkbox"
                          checked={selectedFilingIds.has(filing.id)}
                          onChange={() => toggleFilingSelection(filing.id)}
                          disabled={bulkSending}
                          title="Select this filing"
                          className="w-4 h-4 cursor-pointer"
                          style={{ accentColor: THEME_MAROON }}
                        />
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm font-medium text-slate-700">{filing.company_name || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{filing.subject_cik || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{filing.ticker || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{filing.filer || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            filing.in_activism_flow ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {filing.in_activism_flow ? "Yes" : "No"}
                        </span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {filing.status ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              toTrimmedString(filing.status).toLowerCase() === "closed"
                                ? "bg-slate-200 text-slate-600"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {filing.status}
                          </span>
                        ) : null}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600 line-clamp-2">{filing.notes || ""}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{filing.form_type || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{formatDateOnly(filing.filed_at) || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {/* No field for a filing-level "last updated" timestamp
                            in the documented filings response -- left blank
                            rather than guessing a field name. Flagged in the
                            handoff; needs a decision (drop the column, or the
                            backend adds the field). */}
                        <span className="text-sm text-slate-600"></span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {filing.alert_sent_at ? (
                          <span className="text-sm text-slate-600">{formatDateTime(filing.alert_sent_at)}</span>
                        ) : filing.alertSendWarning ? (
                          <div className="flex items-start gap-1.5 text-xs text-amber-700">
                            <Lucide icon="AlertTriangle" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <span className="font-semibold">Sent, not recorded:</span> {filing.alertSendWarning}
                            </span>
                          </div>
                        ) : null}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {/* The send control is untouched and stays enabled on a
                            held row -- reviewing what was held and overriding it
                            is the point of the hold. The chip sits beside it
                            rather than in the Alert Sent column, which keeps
                            that column exactly as it was. */}
                        <div className="flex flex-col items-start gap-1.5">
                          <input
                            type="checkbox"
                            checked={!!(filing.alert_sent_at || filing.alertSendWarning)}
                            readOnly
                            disabled={sendingAlertId === filing.id}
                            onClick={(e) => {
                              e.preventDefault();
                              openAlertConfirm(filing);
                            }}
                            title={
                              filing.alert_sent_at
                                ? `Alert already sent ${formatDateTime(filing.alert_sent_at)} — click to send again`
                                : filing.alertSendWarning
                                ? `Alert already sent (not recorded: ${filing.alertSendWarning}) — click to send again`
                                : "Send an alert for this filing"
                            }
                            className="w-4 h-4 cursor-pointer"
                            style={{ accentColor: THEME_MAROON }}
                          />
                          {isFilingHeld(filing) && (
                            // Neutral slate, not red: being held is the filter
                            // working as intended, not a failure. The reason is
                            // the backend's own sentence, shown verbatim on
                            // hover; no title at all if it didn't send one,
                            // rather than wording invented here.
                            <span
                              title={toTrimmedString(filing.alert_suppressed_reason) || undefined}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 whitespace-nowrap"
                            >
                              <Lucide icon="PauseCircle" className="w-3 h-3 shrink-0" />
                              Held
                            </span>
                          )}
                        </div>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openPreview(filing)}
                            title="Preview filing"
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME_MAROON, padding: 4 }}
                          >
                            <Lucide icon="Eye" className="w-4 h-4" />
                          </button>
                          {filing.campaign_id != null && (
                            <button
                              type="button"
                              onClick={() => openEditModal(filing)}
                              title="Edit status / notes"
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME_MAROON, padding: 4 }}
                            >
                              <Lucide icon="Pencil" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </StandardizedTable.Cell>
                    </StandardizedTable.Row>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={14} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Lucide icon="FileSearch" className="w-10 h-10 opacity-40" />
                        <span className="text-sm font-medium text-slate-600">No filings found</span>
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
          </div>
        </div>
      </div>

      {editingFiling && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", padding: 28, borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <h2 style={{ margin: "0 0 20px", color: "#111827", fontSize: 17, fontWeight: 600 }}>
              Edit Campaign{editingFiling.company_name ? ` — ${editingFiling.company_name}` : ""}
            </h2>

            <label style={{ display: "block", marginBottom: 18, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Status
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                disabled={isSavingEdit}
                style={{
                  width: "100%", marginTop: 8, padding: "10px 14px", fontSize: 14,
                  borderRadius: 6, border: "1px solid #d1d5db", boxSizing: "border-box", background: "white",
                }}
              >
                <option value="ongoing">Ongoing</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <label style={{ display: "block", marginBottom: 24, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Notes
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={isSavingEdit}
                rows={4}
                style={{
                  width: "100%", marginTop: 8, padding: "10px 14px", fontSize: 14,
                  borderRadius: 6, border: "1px solid #d1d5db", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
                }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSavingEdit}
                style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: isSavingEdit ? "wait" : "pointer", fontWeight: 600, color: "#374151" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={isSavingEdit}
                style={{
                  padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6,
                  cursor: isSavingEdit ? "wait" : "pointer", fontWeight: 600, opacity: isSavingEdit ? 0.7 : 1,
                }}
              >
                {isSavingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewFiling && currentPreviewFiling && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closePreview();
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 720, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 600, color: "#111827" }}>
                  {previewHeaderFiling?.company_name || "-"}
                </h2>
                <div style={{ fontSize: 13, color: "#6b7280", display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                  <span><strong>Filer:</strong> {previewHeaderFiling?.filer || "-"}</span>
                  <span><strong>Form Type:</strong> {previewHeaderFiling?.form_type || "-"}</span>
                  <span><strong>Filed:</strong> {formatDateOnly(previewHeaderFiling?.filed_at) || "-"}</span>
                  <span><strong>Ticker:</strong> {previewHeaderFiling?.ticker || "-"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closePreview}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, flexShrink: 0 }}
              >
                <Lucide icon="X" className="w-5 h-5" />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {previewLoading && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "32px 0", color: "#6b7280" }}>
                  <div style={{ width: 16, height: 16, border: "2px solid #e5e7eb", borderTopColor: THEME_MAROON, borderRadius: "50%", animation: "acp-spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 13.5 }}>Loading filing preview…</span>
                  <style>{`@keyframes acp-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {!previewLoading && previewError && (
                <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, color: "#b91c1c", fontSize: 13.5 }}>
                  {previewError}
                </div>
              )}

              {!previewLoading && !previewError && previewData && (
                <>
                  {previewData.unavailable_reason ? (
                    <div style={{ padding: "12px 14px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 6, color: "#92400e", fontSize: 13.5 }}>
                      {previewData.unavailable_reason}
                    </div>
                  ) : previewData.item2_text || previewData.item4_text ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {previewData.item2_text && (
                        <div>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
                            Item 2 — Identity and Background
                          </h3>
                          <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                            {previewData.item2_text}
                          </div>
                        </div>
                      )}
                      {previewData.item4_text && (
                        <div>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
                            Item 4 — Purpose of Transaction
                          </h3>
                          <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                            {previewData.item4_text}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : hasPreviewText(previewData.background_of_solicitation) ||
                    hasPreviewText(previewData.reasons_for_solicitation) ? (
                    // Contested proxies (PREC14A / DEFC14A / DFAN14A / PRRN14A /
                    // DEFN14A). Its own branch, ahead of the blocks/body_text
                    // one below, for the same reason Item 2 / Item 4 has one:
                    // these are the substantive sections, so when the endpoint
                    // returns them they supersede the generic "opening of the
                    // document, may be truncated" preview rather than being
                    // printed alongside it. That also means this can't
                    // double-print a section that the backend happens to emit
                    // through `blocks` as well -- the branches are exclusive.
                    //
                    // Placed AFTER the item2/item4 branch so the 13D path keeps
                    // winning outright and is untouched by this.
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {hasPreviewText(previewData.background_of_solicitation) && (
                        <SolicitationSection
                          title="Background of the Solicitation"
                          text={previewData.background_of_solicitation}
                        />
                      )}
                      {hasPreviewText(previewData.reasons_for_solicitation) && (
                        <SolicitationSection
                          title="Reasons for the Solicitation"
                          text={previewData.reasons_for_solicitation}
                        />
                      )}
                    </div>
                  ) : (Array.isArray(previewData.blocks) && previewData.blocks.length > 0) || previewData.body_text ? (
                    <div>
                      <p style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", margin: "0 0 10px" }}>
                        This is the opening of the document and may be truncated.
                      </p>
                      {Array.isArray(previewData.blocks) && previewData.blocks.length > 0 ? (
                        <FilingPreviewBlocks blocks={previewData.blocks} />
                      ) : (
                        // Fallback, unchanged from before blocks existed --
                        // used only when blocks is missing/empty so a filing
                        // whose structure couldn't be parsed still reads.
                        <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                          {previewData.body_text}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13.5, color: "#6b7280", margin: 0 }}>No preview text is available for this filing.</p>
                  )}

                  {Array.isArray(previewData.exhibits) && previewData.exhibits.length > 0 && (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Exhibits</h3>
                      <ul style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 18, margin: 0 }}>
                        {previewData.exhibits.map((exhibit: { name?: string; url?: string }, i: number) => (
                          <li key={i} style={{ fontSize: 13 }}>
                            <a
                              href={exhibit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: THEME_MAROON, textDecoration: "underline" }}
                            >
                              {exhibit.name || exhibit.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {previewSecUrl ? (
                <a
                  href={previewSecUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13.5, fontWeight: 600, color: THEME_MAROON, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  Open on SEC.gov
                  <Lucide icon="ExternalLink" className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span />
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {(currentPreviewFiling.alert_sent_at || currentPreviewFiling.alertSendWarning) && (
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {currentPreviewFiling.alert_sent_at
                      ? `Sent ${formatDateTime(currentPreviewFiling.alert_sent_at)}`
                      : `Sent, not recorded: ${currentPreviewFiling.alertSendWarning}`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openAlertConfirm(currentPreviewFiling)}
                  disabled={sendingAlertId === currentPreviewFiling.id}
                  style={{
                    padding: "8px 16px", borderRadius: 6, fontWeight: 600, fontSize: 13.5, border: "none",
                    background: THEME_MAROON, color: "white",
                    cursor: sendingAlertId === currentPreviewFiling.id ? "wait" : "pointer",
                    opacity: sendingAlertId === currentPreviewFiling.id ? 0.7 : 1,
                  }}
                >
                  {sendingAlertId === currentPreviewFiling.id
                    ? "Sending…"
                    : currentPreviewFiling.alert_sent_at || currentPreviewFiling.alertSendWarning
                    ? "Send Again"
                    : "Send Alert"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {alertConfirmTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAlertConfirm();
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", padding: 28, borderRadius: 12, width: "100%", maxWidth: 460, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <h2 style={{ margin: "0 0 16px", color: "#111827", fontSize: 17, fontWeight: 600 }}>Send Alert?</h2>

            {(alertConfirmTarget.alert_sent_at || alertConfirmTarget.alertSendWarning) && (
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", marginBottom: 16, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6 }}>
                <span style={{ color: "#b91c1c", flexShrink: 0, lineHeight: 1 }}>⚠</span>
                <span style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.5 }}>
                  {alertConfirmTarget.alert_sent_at ? (
                    <>
                      An alert has <strong>already been sent</strong> for this filing, on{" "}
                      {formatDateTime(alertConfirmTarget.alert_sent_at)}.
                    </>
                  ) : (
                    <>
                      An alert has <strong>already been sent</strong> for this filing — it was not recorded
                      ({alertConfirmTarget.alertSendWarning}), but the email did go out.
                    </>
                  )}{" "}
                  Sending again will email the configured alert recipients a second time.
                </span>
              </div>
            )}

            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 16px" }}>
              Confirming will <strong>immediately email the configured alert recipients</strong> about this filing:
            </p>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13.5, color: "#111827", lineHeight: 1.7 }}>
              <div><strong>Company:</strong> {alertConfirmTarget.company_name || "-"}</div>
              <div><strong>Filer:</strong> {alertConfirmTarget.filer || "-"}</div>
              <div><strong>Form Type:</strong> {alertConfirmTarget.form_type || "-"}</div>
            </div>

            {alertSendError && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6 }}>
                <span style={{ flexShrink: 0, lineHeight: 1, color: "#b91c1c" }}>⚠</span>
                <span style={{ fontSize: 12.5, color: "#b91c1c", lineHeight: 1.5 }}>{alertSendError}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={closeAlertConfirm}
                disabled={sendingAlertId != null}
                style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: sendingAlertId != null ? "wait" : "pointer", fontWeight: 600, color: "#374151" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSendAlert}
                disabled={sendingAlertId != null}
                style={{
                  padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6,
                  cursor: sendingAlertId != null ? "wait" : "pointer", fontWeight: 600, opacity: sendingAlertId != null ? 0.7 : 1,
                }}
              >
                {sendingAlertId != null ? "Sending…" : "Confirm and Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirmOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBulkConfirm();
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <div style={{ padding: 28, paddingBottom: 0 }}>
              <h2 style={{ margin: "0 0 16px", color: "#111827", fontSize: 17, fontWeight: 600 }}>
                {bulkResults
                  ? "Send Complete"
                  : `Send ${selectedFilings.length} Alert${selectedFilings.length === 1 ? "" : "s"}?`}
              </h2>
            </div>

            <div style={{ padding: "0 28px", overflowY: "auto", flex: 1 }}>
              {/* ── Pre-send confirmation ── */}
              {!bulkSending && !bulkResults && (
                <>
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 16px" }}>
                    Confirming will <strong>immediately email the configured alert recipients</strong> for each
                    filing below.
                  </p>

                  {alreadySentSelected.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 14px", marginBottom: 16, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6 }}>
                      <span style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.5 }}>
                        <strong>{alreadySentSelected.length}</strong> of these already had an alert sent. Sending
                        again is allowed but will email them a second time:
                      </span>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#b91c1c" }}>
                        {alreadySentSelected.map((f) => (
                          <li key={f.id}>
                            {f.company_name || "-"} —{" "}
                            {f.alert_sent_at
                              ? `sent ${formatDateTime(f.alert_sent_at)}`
                              : `not recorded (${f.alertSendWarning})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex", gap: 10, padding: "10px 14px", marginBottom: 16, borderRadius: 6,
                      background: selectedFilings.length >= LARGE_SELECTION_COUNT_THRESHOLD ? "#fef3c7" : "#f3f4f6",
                      border: selectedFilings.length >= LARGE_SELECTION_COUNT_THRESHOLD ? "1px solid #fcd34d" : "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ fontSize: 13, color: selectedFilings.length >= LARGE_SELECTION_COUNT_THRESHOLD ? "#92400e" : "#4b5563", lineHeight: 1.5 }}>
                      Sends go out one at a time (never in parallel) at roughly {SECONDS_PER_SEND} seconds each —{" "}
                      <strong>{formatEstimatedDuration(selectedFilings.length)}</strong> total. Keep this tab open
                      until it finishes; you can stop between sends at any point.
                    </span>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 12.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 8px" }}>
                      Filings to send
                    </h3>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 220, overflowY: "auto" }}>
                      {selectedFilings.map((f, i) => (
                        <div
                          key={f.id}
                          style={{ padding: "8px 14px", fontSize: 13, color: "#111827", borderTop: i === 0 ? "none" : "1px solid #f3f4f6" }}
                        >
                          <strong>{f.company_name || "-"}</strong>
                          <span style={{ color: "#6b7280" }}> — {f.filer || "-"} — {f.form_type || "-"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── In progress ── */}
              {bulkSending && bulkProgress && (
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 16, height: 16, border: "2px solid #e5e7eb", borderTopColor: THEME_MAROON, borderRadius: "50%", animation: "acp-bulk-spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 13.5, color: "#374151" }}>
                      Sending {bulkProgress.index + 1} of {bulkProgress.total} — {bulkProgress.current.company_name || "this filing"}
                    </span>
                    <style>{`@keyframes acp-bulk-spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                    <div
                      style={{
                        height: "100%", borderRadius: 999, background: THEME_MAROON, transition: "width 0.3s ease",
                        width: `${Math.round(((bulkProgress.index + (bulkStopRequested ? 0 : 0.5)) / bulkProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {bulkStopRequested
                      ? "Stopping after this one finishes…"
                      : `${bulkProgress.total - bulkProgress.index - 1} remaining`}
                  </span>
                </div>
              )}

              {/* ── Summary ── */}
              {bulkResults && (
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>
                        {bulkResults.filter((r) => r.status === "sent" || r.status === "warning").length}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#166534" }}>Sent</div>
                    </div>
                    <div style={{ flex: 1, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>
                        {bulkResults.filter((r) => r.status === "failed").length}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#b91c1c" }}>Failed</div>
                    </div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 260, overflowY: "auto" }}>
                    {bulkResults.map((r, i) => (
                      <div
                        key={r.filing.id}
                        style={{ padding: "8px 14px", fontSize: 13, borderTop: i === 0 ? "none" : "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 2 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Lucide
                            icon={r.status === "failed" ? "XCircle" : "CheckCircle2"}
                            className="w-3.5 h-3.5"
                            style={{ color: r.status === "failed" ? "#dc2626" : "#16a34a", flexShrink: 0 }}
                          />
                          <strong style={{ color: "#111827" }}>{r.filing.company_name || "-"}</strong>
                        </div>
                        {r.status === "warning" && (
                          <span style={{ fontSize: 12, color: "#b45309", marginLeft: 22 }}>Sent, not recorded: {r.message}</span>
                        )}
                        {r.status === "failed" && (
                          <span style={{ fontSize: 12, color: "#b91c1c", marginLeft: 22 }}>{r.message}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 28, paddingTop: 16, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              {!bulkSending && !bulkResults && (
                <>
                  <button
                    type="button"
                    onClick={closeBulkConfirm}
                    style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#374151" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={runBulkSend}
                    style={{ padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                  >
                    Confirm and Send {selectedFilings.length} Alert{selectedFilings.length === 1 ? "" : "s"}
                  </button>
                </>
              )}

              {bulkSending && (
                <button
                  type="button"
                  onClick={requestBulkStop}
                  disabled={bulkStopRequested}
                  style={{
                    padding: "8px 16px", background: "white", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 6,
                    cursor: bulkStopRequested ? "wait" : "pointer", fontWeight: 600, opacity: bulkStopRequested ? 0.6 : 1,
                  }}
                >
                  {bulkStopRequested ? "Stopping…" : "Stop"}
                </button>
              )}

              {bulkResults && (
                <button
                  type="button"
                  onClick={closeBulkConfirm}
                  style={{ padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivistCampaigns;
