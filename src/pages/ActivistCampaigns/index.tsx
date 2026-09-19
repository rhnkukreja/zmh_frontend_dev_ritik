import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dashboardService } from "@/services/dashboard";
import StandardizedTable from "@/components/StandardizedTable";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import Lucide, { AppIconName } from "@/components/Base/Lucide";
import Popover from "@/components/Base/Headless/Popover";
import Tippy from "@/components/Base/Tippy";
import { FormCheck } from "@/components/Base/Form";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import FilterChips from "@/components/FilterChips";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import CPagination from "@/components/Pagination";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import useCompanySearch from "@/hooks/useCompanySearch";

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
  // The company this filing was resolved to in our own database, or null when
  // the backend couldn't match it. Only a match WITH a non-empty symbol can be
  // linked: the Overview page is addressed by ticker, so a match without one
  // has nothing to navigate to. Absent on any deployment predating the match,
  // which reads the same as null -- plain text, exactly as before.
  company_match?: {
    id: number;
    name: string;
    symbol: string | null;
    matched_on: "cik" | "ticker" | "name";
  } | null;
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
  // Where the row came from: "SEC EDGAR", or a newswire ("PR Newswire",
  // "GlobeNewswire"). Absent on every row from a deployment predating
  // newswire capture -- absent must read as SEC, so today's rows render
  // exactly as they always have. See isPressRelease below.
  source?: string | null;
  // Newswire rows only; null on SEC rows. Read through getPressReleaseDetails,
  // never directly, so the field names live in one place.
  details?: Record<string, any> | null;
  // Local-only: set when send-alert returns sent:true with alert_sent_at
  // still null and a `warning` -- the email genuinely went out, only the
  // database write of when recording it failed. Never comes from a GET; only
  // ever set from a send-alert response, and never cleared by a refetch.
  alertSendWarning?: string | null;
  [key: string]: any;
};

const toTrimmedString = (value: unknown) => String(value ?? "").trim();

// ─── Table density ──────────────────────────────────────────────────────────
// The client's complaint was clutter and sideways scrolling, so the table went
// from 16 columns to 10 and got tighter. Padding and font size carry `!`
// because StandardizedTable.Cell hardcodes both -- py-2 px-3 in its class list
// and an inline font-size of 14px that a plain utility class can't override.
const HEADER_CELL_CLASS = "!px-2 !py-1.5 !text-[11px] uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis";
const BODY_CELL_CLASS = "!px-2 !py-1.5 !text-xs align-top";
// Company and Filer hold free text of any length (one filer name runs to a
// full sentence). The cell clips, and its content may shrink below the text's
// own width, so a long name can never widen the column.
const NAME_CELL_CLASS = `${BODY_CELL_CLASS} overflow-hidden`;
// Secondary line under a primary value (ticker, "Updated ...", a held label).
const SUB_VALUE_CLASS = "block truncate text-[11px] text-slate-400";

// `table-fixed` has to reach the <table> itself: StandardizedTable puts its
// className on the scroll wrapper, where table-layout does nothing -- which is
// how a long filer name used to stretch its column across the screen.
const TABLE_WRAPPER_CLASS = "[&>table]:table-fixed";

// Column widths, summing to 100% with and without Notes. Company and Filer are
// kept narrow enough that Remarks (alert icon or held label, plus the preview
// and edit buttons) fits at 1440px without horizontal scroll.
const COLUMN_WIDTHS = {
  withoutNotes: { select: "3%", company: "17%", filer: "13%", formType: "11%", proxyStatus: "10%", inFlow: "7%", status: "9%", notes: "0%", filed: "10%", remarks: "20%" },
  withNotes: { select: "3%", company: "15%", filer: "12%", formType: "11%", proxyStatus: "10%", inFlow: "7%", status: "9%", notes: "9%", filed: "10%", remarks: "14%" },
};

// One line, cut with an ellipsis; the full text in a Tippy rather than a
// native title. `clickable` also opens it on click/tap -- touch screens have
// no hover -- and is off for links, where a click must just follow the link.
const TruncatedName: React.FC<{
  text: string;
  className: string;
  clickable?: boolean;
  children: React.ReactElement | string;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}> = ({ text, className, clickable = true, children, href, onClick }) => {
  const classes = `block min-w-0 truncate ${className}`;
  const options = {
    theme: "light",
    trigger: clickable ? "mouseenter click" : "mouseenter",
    touch: clickable,
  };
  // Keyed on the text: Base/Tippy only initialises on mount, so a changed
  // name must remount rather than leave a stale tooltip behind.
  return href ? (
    <Tippy key={text} as="a" href={href} onClick={onClick} content={text} className={classes} options={options}>
      {children}
    </Tippy>
  ) : (
    <Tippy key={text} as="span" content={text} className={classes} options={options}>
      {children}
    </Tippy>
  );
};

// A row's Company Name is a link ONLY when the backend matched it to a company
// in our database AND that match carries a symbol -- the Company Overview page
// is addressed by ticker, so a match without one has nowhere to go. Everything
// else (no match, null/blank symbol, an older response with no company_match at
// all) renders as the plain text it always did.
const getLinkableCompanyMatch = (filing: FilingItem) => {
  const match = filing.company_match;
  if (!match) return null;
  const symbol = toTrimmedString(match.symbol);
  if (!symbol) return null;
  return { id: match.id, name: match.name, symbol };
};

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
  // Covers BOTH chip kinds, because alert_state has one value for them:
  // "suppressed". The label names both rather than borrowing one chip's wording,
  // which would have implied this option excluded the other kind. Splitting it
  // needs a backend value per group -- filter_held / not_campaign and every
  // other guess 400s today, and narrowing client-side would only filter the
  // page already loaded, hiding matches on later pages.
  { value: "suppressed", label: "Held or not a campaign" },
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

// alert_suppressed_rule carries ids from two sources, and they mean different
// things to a reviewer: a phrase rule held a filing that might still be worth
// sending, whereas the standing gate decided it isn't a campaign at all.
//
// Grouped on the rule ID, never on alert_suppressed_reason: the reason is prose
// written for a human and its wording will change, so matching on it would be a
// silent breakage waiting to happen.
// ─── Proxy Status ───────────────────────────────────────────────────────────
// Derived entirely on the client from form_type. A different axis from the
// Status column, which is the CAMPAIGN's own state -- deliberately not inferred
// from that, from in_activism_flow, or from whether an alert went out.
//
// Keyed on the form type with all whitespace removed, so "DEF 14A" and "DEF14A"
// reach the same entry. DEFA14A stays distinct from DEF14A once the spaces are
// gone, so the soliciting-material and definitive forms can't collide.
const PROXY_STATUS_BY_FORM: Record<string, string> = {
  PRE14A: "Preliminary",
  PRE14C: "Preliminary",
  PREC14A: "Preliminary",
  PRRN14A: "Preliminary",
  DEF14A: "Definitive",
  DEF14C: "Definitive",
  DEFC14A: "Definitive",
  DEFN14A: "Definitive",
  DEFA14A: "Soliciting material",
  DFAN14A: "Soliciting material",
};

// Blank for anything unlisted, every 13D form included. Blank rather than "-":
// this column is empty for most rows, and a dash there reads like a value.
const getProxyStatus = (formType: unknown): string =>
  PROXY_STATUS_BY_FORM[toTrimmedString(formType).toUpperCase().replace(/\s+/g, "")] || "";

const GATE_RULE_IDS = new Set(["routine_proxy_no_activist", "no_item4_no_activist"]);

// Anything not in that set -- including a rule id this build has never seen --
// falls to the phrase-rule label, so a rule added later renders as "Held by
// filter" rather than as a blank or unlabelled chip.
const isGateSuppressed = (filing: FilingItem): boolean =>
  GATE_RULE_IDS.has(toTrimmedString(filing.alert_suppressed_rule).toLowerCase());

// The newswire pipeline's own reasons for not alerting. Each gets its own label
// rather than "Held by filter", which would tell a reviewer a phrase rule fired
// when none did. Keyed on the rule id, same as GATE_RULE_IDS and for the same
// reason: the reason text is prose and will be reworded.
const NEWSWIRE_RULE_LABELS: Record<string, string> = {
  newswire_not_activism: "Not activism",
  newswire_below_threshold: "Low confidence",
  newswire_no_activist: "No activist named",
  newswire_duplicate: "Duplicate",
  newswire_before_start: "Before monitoring started",
};

// Which chip a held row shows. isFilingHeld decides WHETHER it shows; this only
// decides the label and icon. Newswire rules are standing decisions made by
// the pipeline, not phrase matches, so they share the gate's icon.
const getHeldChip = (filing: FilingItem): { label: string; icon: AppIconName } => {
  const newswireLabel = NEWSWIRE_RULE_LABELS[toTrimmedString(filing.alert_suppressed_rule).toLowerCase()];
  if (newswireLabel) return { label: newswireLabel, icon: "MinusCircle" };
  if (isGateSuppressed(filing)) return { label: "Not a campaign", icon: "MinusCircle" };
  return { label: "Held by filter", icon: "PauseCircle" };
};

// ─── Remarks ────────────────────────────────────────────────────────────────
// One icon per row, replacing the Alert Sent column, the Send Alert checkbox
// and the held chip. Every state is a real control: title + aria-label on all
// of them, and a button for the one that acts.
//
// The states are exactly the ones the data can express. "Sending" is this
// row's send being in flight (single or inside a bulk run); "needs attention"
// is either the backend's own sent-but-not-recorded warning or a failure from
// the bulk run in this session. There is no retry state in the API -- see the
// handoff note.
const RemarksIndicator: React.FC<{
  filing: FilingItem;
  isSending: boolean;
  failureMessage?: string;
  onSend: () => void;
}> = ({ filing, isSending, failureMessage, onSend }) => {
  if (isSending) {
    return (
      <span
        className="inline-flex items-center text-slate-500"
        title="Sending this alert…"
        aria-label="Sending this alert"
      >
        <Lucide icon="Loader" className="w-4 h-4 shrink-0 animate-spin" />
      </span>
    );
  }

  if (filing.alert_sent_at) {
    const sentAt = `Alert sent ${formatDateTime(filing.alert_sent_at)}`;
    return (
      <span className="inline-flex items-center text-emerald-600" title={sentAt} aria-label={sentAt}>
        <Lucide icon="CheckCircle2" className="w-4 h-4 shrink-0" />
      </span>
    );
  }

  // Sent, but the write recording when failed -- the email did go out, so this
  // is deliberately not the "not sent yet" state.
  if (filing.alertSendWarning) {
    const warning = `Sent, not recorded: ${filing.alertSendWarning}`;
    return (
      <span className="inline-flex items-center text-amber-600" title={warning} aria-label={warning}>
        <Lucide icon="AlertTriangle" className="w-4 h-4 shrink-0" />
      </span>
    );
  }

  if (failureMessage) {
    const failed = `Alert failed: ${failureMessage}`;
    return (
      <span className="inline-flex items-center text-red-600" title={failed} aria-label={failed}>
        <Lucide icon="AlertTriangle" className="w-4 h-4 shrink-0" />
      </span>
    );
  }

  if (isFilingHeld(filing)) {
    // getHeldChip is untouched: same rule-id mapping, same labels, same icons.
    // The backend's reason sentence stays the tooltip, verbatim.
    const chip = getHeldChip(filing);
    const reason = toTrimmedString(filing.alert_suppressed_reason);
    return (
      <span
        className="inline-flex items-center gap-1 min-w-0 text-slate-600"
        title={reason || chip.label}
        aria-label={reason ? `${chip.label}: ${reason}` : chip.label}
      >
        <Lucide icon={chip.icon} className="w-4 h-4 shrink-0 text-slate-500" />
        <span className="truncate text-xs text-slate-700">{chip.label}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onSend}
      title="Send an alert for this filing"
      aria-label="Send an alert for this filing"
      className="inline-flex items-center rounded p-0.5 text-slate-400 hover:text-primary"
    >
      <Lucide icon="Mail" className="w-4 h-4 shrink-0" />
    </button>
  );
};

// ─── Source: SEC filing vs newswire press release ──────────────────────────
// A closed list, matched case- and space-insensitively. Deliberately NOT "any
// source other than SEC EDGAR": an SEC row whose source came back spelled some
// other way must still render as SEC, since nothing may change for SEC rows.
// The cost is that a wire added later renders as SEC until it's listed here.
const NEWSWIRE_SOURCES = new Set(["PR NEWSWIRE", "GLOBENEWSWIRE"]);

const normalizeSource = (value: unknown) => toTrimmedString(value).toUpperCase().replace(/\s+/g, " ");

// No source field at all means SEC -- that's every row until the backend
// change deploys.
const isPressRelease = (filing: FilingItem | null | undefined): boolean =>
  !!filing && NEWSWIRE_SOURCES.has(normalizeSource(filing.source));

// The badge text: "SEC" for SEC EDGAR, otherwise the source as the backend
// sent it (the wire's own name). Empty when the row has no source, so today's
// rows get no badge and the Filing Type cell is unchanged until the backend
// actually reports a source.
const getSourceBadgeLabel = (filing: FilingItem): string => {
  const source = toTrimmedString(filing.source);
  if (!source) return "";
  return normalizeSource(source) === "SEC EDGAR" ? "SEC" : source;
};

// Server-side, like alert_state: the backend's `source` param takes one of
// these values. Omitted entirely for "all", so an unfiltered request is
// byte-identical to what it was before this param existed.
const SOURCE_ALL = "all";
const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: SOURCE_ALL, label: "All" },
  { value: "sec", label: "SEC filings" },
  { value: "newswire", label: "Press releases" },
];

const sourceLabel = (value: string): string =>
  SOURCE_OPTIONS.find((option) => option.value === value)?.label || value;

// SEC forms offered in the type dropdown beside the search bar, sent verbatim
// as the backend's `form_type` param -- so these are the exact strings it
// stores, spaces included ("DEF 14A", "SCHEDULE 13D/A"). The same forms
// PROXY_STATUS_BY_FORM and the Filing Category buckets already cover.
const SEC_FORM_TYPE_OPTIONS = [
  "SCHEDULE 13D",
  "SCHEDULE 13D/A",
  "PREC14A",
  "DEFC14A",
  "DFAN14A",
  "PRRN14A",
  "DEFN14A",
  "PRE 14A",
  "DEF 14A",
  "DEFA14A",
  "PRE 14C",
  "DEF 14C",
];

// The dropdown is one control over two server-side params, so its value
// encodes which one it sets: "all", "source:<source>" or "form:<form type>".
// A form type implies SEC, so picking one resets source to all rather than
// sending both.
const TYPE_ALL = "all";

const toTypeValue = (source: string, formType: string): string =>
  formType ? `form:${formType}` : source !== SOURCE_ALL ? `source:${source}` : TYPE_ALL;

// Anything not in the closed lists reads as "all", never passed through.
const parseTypeValue = (value: string): { source: string; formType: string } => {
  if (value.startsWith("form:")) {
    const formType = value.slice("form:".length);
    return { source: SOURCE_ALL, formType: SEC_FORM_TYPE_OPTIONS.includes(formType) ? formType : "" };
  }
  if (value.startsWith("source:")) {
    const source = value.slice("source:".length);
    return { source: SOURCE_OPTIONS.some((o) => o.value === source) ? source : SOURCE_ALL, formType: "" };
  }
  return { source: SOURCE_ALL, formType: "" };
};

// The single read of `details`. Every field is independently optional: a
// missing one is left out of the preview rather than rendered as a blank.
type PressReleaseDetails = {
  headline: string;
  initiatingParty: string;
  formalProxyContest: boolean | null;
  keyDemands: string[];
  summary: string;
  secMatch: { formType: string; filedAt: string; filingUrl: string } | null;
};

// initiating_party_type arrives lower-case ("activist", "target company",
// "third party"); shown with its first letter capitalised.
const capitalizeFirst = (value: string): string => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

// Accepts a real boolean, and "yes"/"no"/"true"/"false" in case the flag
// arrives as text. Anything else is unknown (null), shown as "-", never
// guessed as No.
const toYesNo = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  const text = toTrimmedString(value).toLowerCase();
  if (text === "yes" || text === "true") return true;
  if (text === "no" || text === "false") return false;
  return null;
};

const getPressReleaseDetails = (filing: FilingItem): PressReleaseDetails => {
  const details = filing.details && typeof filing.details === "object" ? filing.details : {};
  const rawDemands = details.key_demands;
  const demandList = Array.isArray(rawDemands) ? rawDemands : rawDemands ? [rawDemands] : [];
  // sec_match is on every press-release row: {"text": "no", "verdict": "no"}
  // when nothing matched. It counts as a match only when verdict is "yes" AND
  // it names a form type.
  const rawSecMatch = details.sec_match && typeof details.sec_match === "object" ? details.sec_match : null;
  const secMatchFormType = toTrimmedString(rawSecMatch?.form_type);
  const isSecMatch = toTrimmedString(rawSecMatch?.verdict).toLowerCase() === "yes" && !!secMatchFormType;

  return {
    headline: toTrimmedString(details.headline),
    initiatingParty: capitalizeFirst(toTrimmedString(details.initiating_party_type)),
    formalProxyContest: toYesNo(details.is_formal_proxy_contest),
    keyDemands: demandList.map(toTrimmedString).filter(Boolean),
    summary: toTrimmedString(details.one_line_summary),
    secMatch: isSecMatch
      ? {
          formType: secMatchFormType,
          filedAt: toTrimmedString(rawSecMatch.filed_at),
          filingUrl: toTrimmedString(rawSecMatch.filing_url),
        }
      : null,
  };
};


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

// Alert Status and Source filters. Same container treatment as
// DateRangeFilterPanel above so they read as filter panels, but a native
// single-select rather than the checkbox lists, because alert_state and source
// each accept exactly one value.
const SingleSelectFilterPanel = ({
  label,
  icon,
  options,
  draft,
  onDraftChange,
}: {
  label: string;
  icon: AppIconName;
  options: Array<{ value: string; label: string }>;
  draft: string;
  onDraftChange: (value: string) => void;
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
    <div className="flex items-center gap-2 text-slate-600 font-semibold mb-3">
      <Lucide icon={icon} className="w-4 h-4 text-slate-400" />
      {label}
    </div>

    <select
      value={draft}
      onChange={(e) => onDraftChange(e.target.value)}
      className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none"
    >
      {options.map((option) => (
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

// Press-release preview body. Everything comes from the row itself (filer =
// the activist, company/ticker = the target, `details` for the rest), so it
// needs no preview fetch. The Item 2 / Item 4, solicitation and Exhibits
// blocks are SEC-document concepts and are never rendered here.
const PressReleasePreview: React.FC<{ filing: FilingItem }> = ({ filing }) => {
  const details = getPressReleaseDetails(filing);
  const target = toTrimmedString(filing.company_name);
  const ticker = toTrimmedString(filing.ticker);
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.02em" };
  const valueStyle: React.CSSProperties = { fontSize: 13.5, color: "#111827", lineHeight: 1.5 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 16px", alignItems: "baseline" }}>
        <span style={labelStyle}>Activist → Target</span>
        <span style={valueStyle}>
          {toTrimmedString(filing.filer) || "-"} → {target || "-"}
          {ticker ? ` (${ticker})` : ""}
        </span>

        <span style={labelStyle}>Initiating party</span>
        <span style={valueStyle}>{details.initiatingParty || "-"}</span>

        <span style={labelStyle}>Formal proxy contest</span>
        <span style={valueStyle}>
          {details.formalProxyContest === null ? "-" : details.formalProxyContest ? "Yes" : "No"}
        </span>
      </div>

      {details.keyDemands.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Key demands</h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4, listStyleType: "disc" }}>
            {details.keyDemands.map((demand, i) => (
              <li key={i} style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6 }}>
                {demand}
              </li>
            ))}
          </ul>
        </div>
      )}

      {details.summary && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Summary</h3>
          <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, maxWidth: "70ch", margin: 0, whiteSpace: "pre-wrap" }}>
            {details.summary}
          </p>
        </div>
      )}

      {details.secMatch && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, color: "#374151" }}>
          <Lucide icon="FileText" className="w-4 h-4 shrink-0 text-slate-400" />
          <span>
            <strong>Also filed with the SEC:</strong>{" "}
            {details.secMatch.filingUrl ? (
              <a
                href={details.secMatch.filingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: THEME_MAROON, textDecoration: "underline" }}
              >
                {details.secMatch.formType}
              </a>
            ) : (
              details.secMatch.formType
            )}
            {details.secMatch.filedAt ? ` on ${formatDateOnly(details.secMatch.filedAt)}` : ""}
          </span>
        </div>
      )}
    </div>
  );
};

function ActivistCampaigns() {
  // Same hook the global search box uses, so a company opened from this table
  // lands in exactly the state a search for it would produce.
  const navigate = useNavigate();
  const { companySearchAndUpdate } = useCompanySearch();

  // Plain left click only: ctrl/cmd/shift/alt-click (and middle click, which
  // never reaches onClick) are left to the browser so the real href opens a new
  // tab or window. stopPropagation on every click so the anchor can't also
  // reach any row-level handler -- selection or a row preview.
  const handleCompanyLinkClick = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    company: { id: number; name: string; symbol: string }
  ) => {
    event.stopPropagation();
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();

    try {
      // Sets the selected company in the store (and syncs ?ticker= on THIS
      // page). Awaited: it's what makes the Overview render this company, so
      // navigating before it resolves would show the previous one.
      await companySearchAndUpdate(company);
      // Same address as the href, so the URL after a left click matches what
      // the link advertises -- companySearchAndUpdate's own sync writes the
      // ticker onto the current path, not the Overview one.
      navigate(`/?ticker=${encodeURIComponent(company.symbol)}`);
    } catch (error) {
      // The axios interceptor already toasts; staying put is deliberate --
      // without the store update the Overview would render a different company.
      console.error("Failed to open company overview from Activist Campaigns:", error);
    }
  };

  const [loading, setLoading] = useState(false);
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [totalFilings, setTotalFilings] = useState(0);
  const [page, setPage] = useState(1);

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedFilers, setSelectedFilers] = useState<string[]>([]);
  const [selectedFilingCategories, setSelectedFilingCategories] = useState<string[]>([]);
  const [selectedAlertState, setSelectedAlertState] = useState<string>(ALERT_STATE_ALL);
  const [selectedSource, setSelectedSource] = useState<string>(SOURCE_ALL);
  // Set only from the type dropdown beside the search bar; no draft, because
  // that dropdown applies immediately rather than through the Filter popover.
  const [selectedFormType, setSelectedFormType] = useState("");
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
  const [draftSource, setDraftSource] = useState<string>(SOURCE_ALL);
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
    Array<{ filing: FilingItem; status: "sent" | "warning" | "failed" | "skipped"; message?: string }> | null
  >(null);
  const bulkStopRequestedRef = useRef(false);
  // Skip selected filings that already had an alert sent. On by default -- a
  // duplicate email is the mistake to prevent, so re-sending has to be a
  // deliberate un-tick. Reset to on every time the dialog opens.
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);

  const [editingFiling, setEditingFiling] = useState<FilingItem | null>(null);
  const [editStatus, setEditStatus] = useState("ongoing");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const dropzoneRef = useRef<DropzoneElement>(null);
  // The upload UI now lives in a modal instead of a card above the table.
  // Nothing about the upload itself changed -- same validation, same call.
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Server-side pagination + date filtering, per the backend contract --
  // never fetch everything and paginate/filter dates in the browser, since
  // this table will hold thousands of rows.
  const fetchFilings = useCallback(async (targetPage: number, dateFrom: string, dateTo: string, alertState: string = ALERT_STATE_ALL, search: string = "", source: string = SOURCE_ALL, formType: string = "") => {
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
        // Same treatment as alert_state: omitted for "all", and only ever one
        // of the closed list.
        source:
          source && source !== SOURCE_ALL && SOURCE_OPTIONS.some((o) => o.value === source) ? source : undefined,
        // Likewise omitted unless it's one of the listed forms.
        form_type: formType && SEC_FORM_TYPE_OPTIONS.includes(formType) ? formType : undefined,
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
      fetchFilings(1, selectedDateFrom, selectedDateTo, selectedAlertState, trimmed, selectedSource, selectedFormType);
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchFilings(newPage, selectedDateFrom, selectedDateTo, selectedAlertState, appliedSearch, selectedSource, selectedFormType);
  };

  // The type dropdown beside the search bar. Applies at once, like the search
  // box, and writes the same source state the Filter popover's Source panel
  // edits, so the two can never disagree.
  const handleTypeChange = (value: string) => {
    const { source, formType } = parseTypeValue(value);
    setSelectedSource(source);
    setDraftSource(source);
    setSelectedFormType(formType);
    setPage(1);
    fetchFilings(1, selectedDateFrom, selectedDateTo, selectedAlertState, appliedSearch, source, formType);
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
    // Re-runs whenever the drop zone is mounted or remounted: it now lives in a
    // modal (so it doesn't exist at page mount at all), and it is also swapped
    // out for the selected-file view whenever a file is chosen. Each remount is
    // a NEW dropzone instance, and the handler has to be attached to that one.
  }, [uploadModalOpen, uploadFile]);

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
      // Alert Status and Source are deliberately absent here: they're applied
      // by the backend (alert_state / source), across every page, not just the
      // one in memory.

      return true;
    });
  }, [filings, selectedStatuses, selectedTickers, selectedFilers, selectedFilingCategories]);

  // Notes is empty on every campaign today, so its column only renders once a
  // loaded row actually has one -- it comes back on its own when an analyst
  // writes a note. Checked against `filings`, not `filteredFilings`, so a
  // client-side filter doesn't make the column flicker in and out.
  const showNotesColumn = useMemo(
    () => filings.some((filing) => toTrimmedString(filing.notes) !== ""),
    [filings]
  );
  const columnWidths = showNotesColumn ? COLUMN_WIDTHS.withNotes : COLUMN_WIDTHS.withoutNotes;

  const activeFiltersCount =
    selectedStatuses.length +
    selectedTickers.length +
    selectedFilers.length +
    selectedFilingCategories.length +
    (selectedAlertState !== ALERT_STATE_ALL ? 1 : 0) +
    (selectedSource !== SOURCE_ALL ? 1 : 0) +
    (selectedFormType ? 1 : 0) +
    (selectedDateFrom ? 1 : 0) +
    (selectedDateTo ? 1 : 0);

  const syncDraftFilters = useCallback(() => {
    setDraftStatuses(selectedStatuses);
    setDraftTickers(selectedTickers);
    setDraftFilers(selectedFilers);
    setDraftFilingCategories(selectedFilingCategories);
    setDraftAlertState(selectedAlertState);
    setDraftSource(selectedSource);
    setDraftDateFrom(selectedDateFrom);
    setDraftDateTo(selectedDateTo);
  }, [selectedStatuses, selectedTickers, selectedFilers, selectedFilingCategories, selectedAlertState, selectedSource, selectedDateFrom, selectedDateTo]);

  const applyFilters = useCallback(
    (close?: () => void) => {
      setSelectedStatuses(draftStatuses);
      setSelectedTickers(draftTickers);
      setSelectedFilers(draftFilers);
      setSelectedFilingCategories(draftFilingCategories);
      setSelectedAlertState(draftAlertState);
      setSelectedSource(draftSource);
      // A press release has no SEC form type, so choosing Press releases here
      // drops a form type picked in the dropdown rather than sending a
      // combination that can only ever come back empty.
      const nextFormType = draftSource === "newswire" ? "" : selectedFormType;
      setSelectedFormType(nextFormType);
      setSelectedDateFrom(draftDateFrom);
      setSelectedDateTo(draftDateTo);
      setPage(1);
      // date_from/date_to, alert_state and source are server-side and
      // genuinely need this refetch; the rest just re-narrow whatever page is
      // already loaded. Still safe/cheap to always refetch page 1 here since
      // Apply is an explicit, infrequent action, not something firing on every
      // keystroke.
      fetchFilings(1, draftDateFrom, draftDateTo, draftAlertState, appliedSearch, draftSource, nextFormType);
      close?.();
    },
    [draftStatuses, draftTickers, draftFilers, draftFilingCategories, draftAlertState, draftSource, draftDateFrom, draftDateTo, appliedSearch, selectedFormType, fetchFilings]
  );

  const clearFilters = useCallback(
    (close?: () => void) => {
      setDraftStatuses([]);
      setDraftTickers([]);
      setDraftFilers([]);
      setDraftFilingCategories([]);
      setDraftAlertState(ALERT_STATE_ALL);
      setDraftSource(SOURCE_ALL);
      setDraftDateFrom("");
      setDraftDateTo("");
      setSelectedStatuses([]);
      setSelectedTickers([]);
      setSelectedFilers([]);
      setSelectedFilingCategories([]);
      setSelectedAlertState(ALERT_STATE_ALL);
      setSelectedSource(SOURCE_ALL);
      // Cleared along with Source: the dropdown is one view of both, so
      // leaving the form type behind would leave it showing a filter the
      // popover just said it cleared.
      setSelectedFormType("");
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
        fetchFilings(1, selectedDateFrom, selectedDateTo, ALERT_STATE_ALL, appliedSearch, selectedSource, selectedFormType);
        return;
      }
      if (removeKey === "source") {
        // Server-side, same as alert_state above.
        setSelectedSource(SOURCE_ALL);
        setDraftSource(SOURCE_ALL);
        setPage(1);
        fetchFilings(1, selectedDateFrom, selectedDateTo, selectedAlertState, appliedSearch, SOURCE_ALL, selectedFormType);
        return;
      }
      if (removeKey === "form_type") {
        setSelectedFormType("");
        setPage(1);
        fetchFilings(1, selectedDateFrom, selectedDateTo, selectedAlertState, appliedSearch, selectedSource, "");
        return;
      }
      if (removeKey === "date_from") {
        setSelectedDateFrom("");
        setDraftDateFrom("");
        setPage(1);
        // Carries the current alert_state, search and source through:
        // dropping a date chip must not silently drop the others with it.
        fetchFilings(1, "", selectedDateTo, selectedAlertState, appliedSearch, selectedSource, selectedFormType);
        return;
      }
      if (removeKey === "date_to") {
        setSelectedDateTo("");
        setDraftDateTo("");
        setPage(1);
        fetchFilings(1, selectedDateFrom, "", selectedAlertState, appliedSearch, selectedSource, selectedFormType);
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
    [fetchFilings, selectedDateFrom, selectedDateTo, selectedAlertState, appliedSearch, selectedSource, selectedFormType]
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
  // Rows whose send failed during the last bulk run in THIS session -- the only
  // failure state the app knows about, since the filings response carries no
  // failure field of its own. Cleared whenever a new run starts (setBulkResults
  // (null)), exactly like the results panel it comes from.
  const bulkFailureById = useMemo(() => {
    const failures = new Map<string | number, string>();
    (bulkResults || []).forEach((result) => {
      if (result.status === "failed") {
        failures.set(result.filing.id, result.message || "The alert could not be sent.");
      }
    });
    return failures;
  }, [bulkResults]);

  const selectedFilings = filings.filter((f) => selectedFilingIds.has(f.id));
  // "Already sent" is the same test the dialog's red warning uses: a recorded
  // alert_sent_at, or a send this session that went out but wasn't recorded.
  const isAlreadySent = (f: FilingItem) => !!(f.alert_sent_at || f.alertSendWarning);
  const alreadySentSelected = selectedFilings.filter(isAlreadySent);
  // Only meaningful when something selected was already sent; otherwise the
  // checkbox isn't shown and everything selected is sent, as before.
  const isSkippingAlreadySent = skipAlreadySent && alreadySentSelected.length > 0;
  // The single source for what a run will send -- the dialog's counts and the
  // send loop both read it, so what's shown is what's sent.
  const getBulkSendTargets = () =>
    isSkippingAlreadySent ? selectedFilings.filter((f) => !isAlreadySent(f)) : selectedFilings.slice();
  const bulkSendCount = getBulkSendTargets().length;

  const openBulkConfirm = () => {
    if (selectedFilings.length === 0) return;
    setSkipAlreadySent(true);
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
    // Snapshotted before the first send: rows turn "already sent" as the run
    // progresses, and that must not change what this run sends or skips.
    const targets = getBulkSendTargets();
    const skipped = isSkippingAlreadySent ? selectedFilings.filter(isAlreadySent) : [];
    // Everything selected was already sent (the button is disabled then too):
    // no request fires.
    if (targets.length === 0) return;

    setBulkSending(true);
    setBulkResults(null);
    bulkStopRequestedRef.current = false;
    setBulkStopRequested(false);

    const results: Array<{ filing: FilingItem; status: "sent" | "warning" | "failed" | "skipped"; message?: string }> = [];

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
    setBulkResults([...results, ...skipped.map((filing) => ({ filing, status: "skipped" as const }))]);
    // These filings have now been acted on (sent, warned, or recorded as
    // failed in the summary below) -- clearing selection avoids the bar
    // reappearing with a stale, already-handled batch. Skipped filings were
    // not acted on, so they stay selected.
    setSelectedFilingIds(new Set(skipped.map((f) => f.id)));
  };

  const openPreview = async (filing: FilingItem) => {
    setPreviewFiling(filing);
    setPreviewData(null);
    setPreviewError(null);
    // A press release's preview is built entirely from the row (see
    // PressReleasePreview), so it doesn't call the SEC preview endpoint,
    // which exists to extract text from an SEC document.
    if (isPressRelease(filing)) {
      setPreviewLoading(false);
      return;
    }
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
  const previewIsPressRelease = isPressRelease(currentPreviewFiling);
  const previewPressDetails =
    previewIsPressRelease && currentPreviewFiling ? getPressReleaseDetails(currentPreviewFiling) : null;

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
          {/* Upload moved off the page and behind this button: the drop zone
              was the largest thing on a screen whose job is the table, for an
              action taken rarely. The modal below holds the same UI verbatim. */}
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">Activist Campaigns</h2>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => setUploadModalOpen(true)}
              className="shrink-0"
            >
              <Lucide icon="Upload" className="stroke-[1.3] w-4 h-4 mr-2" />
              Upload Excel
            </Button>
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

                {/* One click to press releases, all SEC filings, or a single
                    SEC form. Server-side (source / form_type), so it narrows
                    every page, not just the one loaded. */}
                <select
                  value={toTypeValue(selectedSource, selectedFormType)}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  title="Show press releases, SEC filings, or one SEC form"
                  className="text-sm border border-slate-300 rounded-md px-2.5 py-2 bg-white focus:border-primary focus:outline-none"
                >
                  <option value={TYPE_ALL}>All types</option>
                  {SOURCE_OPTIONS.filter((option) => option.value !== SOURCE_ALL).map((option) => (
                    <option key={option.value} value={`source:${option.value}`}>
                      {option.label}
                    </option>
                  ))}
                  <optgroup label="SEC form">
                    {SEC_FORM_TYPE_OPTIONS.map((formType) => (
                      <option key={formType} value={`form:${formType}`}>
                        {formType}
                      </option>
                    ))}
                  </optgroup>
                </select>

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
                        <SingleSelectFilterPanel
                          label="Alert Status"
                          icon="BellRing"
                          options={ALERT_STATE_OPTIONS}
                          draft={draftAlertState}
                          onDraftChange={setDraftAlertState}
                        />
                        {/* Server-side for the same reason as Alert Status:
                            press releases are scattered through every page. */}
                        <SingleSelectFilterPanel
                          label="Source"
                          icon="Radio"
                          options={SOURCE_OPTIONS}
                          draft={draftSource}
                          onDraftChange={setDraftSource}
                        />
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
                    ...(selectedSource !== SOURCE_ALL ? [{ key: "source", value: sourceLabel(selectedSource) }] : []),
                    ...(selectedFormType ? [{ key: "form_type", value: selectedFormType }] : []),
                    ...(selectedDateFrom ? [{ key: "date_from", value: selectedDateFrom }] : []),
                    ...(selectedDateTo ? [{ key: "date_to", value: selectedDateTo }] : []),
                  ]}
                  onRemove={handleRemoveChip}
                />
              </div>
            )}

            <StandardizedTable isLoading={loading} skeletonRows={6} skeletonCols={showNotesColumn ? 10 : 9} maxHeight="68vh" className={TABLE_WRAPPER_CLASS}>
              <StandardizedTable.Header>
                <StandardizedTable.Cell isHeader width={columnWidths.select} className={HEADER_CELL_CLASS}>
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
                {/* Both CIK columns are gone: they're reference numbers nobody
                    reads across a row, so each sits in brackets on a muted line
                    under the name it belongs to (subject_cik under Company,
                    filer_cik under Filer). */}
                <StandardizedTable.Cell isHeader width={columnWidths.company} className={HEADER_CELL_CLASS}>Company</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width={columnWidths.filer} className={HEADER_CELL_CLASS}>Filer</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width={columnWidths.formType} className={HEADER_CELL_CLASS}>Filing Type</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width={columnWidths.proxyStatus} className={HEADER_CELL_CLASS}>Proxy Status</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width={columnWidths.inFlow} className={HEADER_CELL_CLASS}>In Flow</StandardizedTable.Cell>
                {/* The CAMPAIGN's state. Proxy Status is a separate axis derived
                    from form_type; neither feeds the other. */}
                <StandardizedTable.Cell isHeader width={columnWidths.status} className={HEADER_CELL_CLASS}>Status</StandardizedTable.Cell>
                {showNotesColumn && (
                  <StandardizedTable.Cell isHeader width={columnWidths.notes} className={HEADER_CELL_CLASS}>Notes</StandardizedTable.Cell>
                )}
                <StandardizedTable.Cell isHeader width={columnWidths.filed} className={HEADER_CELL_CLASS}>Filed</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width={columnWidths.remarks} className={HEADER_CELL_CLASS}>Remarks</StandardizedTable.Cell>
              </StandardizedTable.Header>
              <Table.Tbody>
                {filteredFilings.length > 0 ? (
                  filteredFilings.map((filing, index) => (
                    <StandardizedTable.Row key={filing.id ?? index} index={index}>
                      <StandardizedTable.Cell className={BODY_CELL_CLASS}>
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
                      <StandardizedTable.Cell className={NAME_CELL_CLASS}>
                        {(() => {
                          const linkTarget = getLinkableCompanyMatch(filing);
                          // The row's own company name either way -- the link
                          // never relabels the row with the matched name.
                          const label = toTrimmedString(filing.company_name) || "-";
                          // "<TICKER> (<CIK>)"; either half alone when the other
                          // is missing (press releases have no CIK), nothing when
                          // neither is there.
                          const ticker = toTrimmedString(filing.ticker);
                          const subjectCik = toTrimmedString(filing.subject_cik);
                          const subLine = [ticker, subjectCik ? `(${subjectCik})` : ""].filter(Boolean).join(" ");

                          return (
                            <>
                              {linkTarget ? (
                                <TruncatedName
                                  text={label}
                                  href={`/?ticker=${encodeURIComponent(linkTarget.symbol)}`}
                                  onClick={(event) => handleCompanyLinkClick(event, linkTarget)}
                                  clickable={false}
                                  className="text-[13px] font-medium text-primary hover:underline"
                                >
                                  {label}
                                </TruncatedName>
                              ) : (
                                <TruncatedName text={label} className="text-[13px] font-medium text-slate-700">
                                  {label}
                                </TruncatedName>
                              )}
                              {subLine && <span className={`${SUB_VALUE_CLASS} min-w-0 tabular-nums`}>{subLine}</span>}
                            </>
                          );
                        })()}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell className={NAME_CELL_CLASS}>
                        {(() => {
                          const filer = toTrimmedString(filing.filer) || "-";
                          const filerCik = toTrimmedString(filing.filer_cik);
                          return (
                            <>
                              <TruncatedName text={filer} className="font-semibold text-slate-700">
                                {filer}
                              </TruncatedName>
                              {filerCik && <span className={`${SUB_VALUE_CLASS} min-w-0 tabular-nums`}>({filerCik})</span>}
                            </>
                          );
                        })()}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell className={BODY_CELL_CLASS}>
                        <span className="block truncate text-slate-600" title={toTrimmedString(filing.form_type) || undefined}>
                          {filing.form_type || "-"}
                        </span>
                        {/* Source badge, under the form type rather than in a
                            column of its own. Only rendered once the backend
                            reports a source, so until then this cell is exactly
                            what it was. Violet for press releases -- a colour
                            nothing else on this page uses -- and the same
                            neutral slate as the other quiet chips for SEC. */}
                        {getSourceBadgeLabel(filing) && (
                          <div className="mt-1">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                isPressRelease(filing) ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {getSourceBadgeLabel(filing)}
                            </span>
                          </div>
                        )}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell className={BODY_CELL_CLASS}>
                        {/* Blank for every form the mapping doesn't cover (all
                            13Ds) -- a dash there would read like a value. */}
                        <span className="block truncate text-slate-600" title={getProxyStatus(filing.form_type) || undefined}>
                          {getProxyStatus(filing.form_type)}
                        </span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell className={BODY_CELL_CLASS}>
                        <span
                          className={`inline-flex rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                            filing.in_activism_flow ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {filing.in_activism_flow ? "Yes" : "No"}
                        </span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell className={BODY_CELL_CLASS}>
                        {filing.status ? (
                          <span
                            className={`inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                              toTrimmedString(filing.status).toLowerCase() === "closed"
                                ? "bg-slate-200 text-slate-600"
                                : "bg-primary/10 text-primary"
                            }`}
                            title={toTrimmedString(filing.status)}
                          >
                            {filing.status}
                          </span>
                        ) : null}
                      </StandardizedTable.Cell>
                      {showNotesColumn && (
                        <StandardizedTable.Cell className={BODY_CELL_CLASS}>
                          <span className="block truncate text-slate-600" title={toTrimmedString(filing.notes) || undefined}>
                            {filing.notes || ""}
                          </span>
                        </StandardizedTable.Cell>
                      )}
                      <StandardizedTable.Cell className={`${BODY_CELL_CLASS} tabular-nums`}>
                        <span className="block truncate text-slate-600">{formatDateOnly(filing.filed_at) || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell className={BODY_CELL_CLASS}>
                        {/* One icon for the alert state, and the row's actions at
                            the right edge. The send path is unchanged: the same
                            openAlertConfirm the checkbox called, so the same
                            confirm dialog and the same API call. */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <RemarksIndicator
                              filing={filing}
                              isSending={sendingAlertId === filing.id || bulkProgress?.current?.id === filing.id}
                              failureMessage={bulkFailureById.get(filing.id)}
                              onSend={() => openAlertConfirm(filing)}
                            />
                          </div>
                          <div className="flex shrink-0 items-center">
                            <button
                              type="button"
                              onClick={() => openPreview(filing)}
                              title={isPressRelease(filing) ? "Preview press release" : "Preview filing"}
                              aria-label={isPressRelease(filing) ? "Preview press release" : "Preview filing"}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME_MAROON, padding: 2 }}
                            >
                              <Lucide icon="Eye" className="w-4 h-4" />
                            </button>
                            {filing.campaign_id != null && (
                              <button
                                type="button"
                                onClick={() => openEditModal(filing)}
                                title="Edit status / notes"
                                aria-label="Edit status and notes"
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME_MAROON, padding: 2 }}
                              >
                                <Lucide icon="Pencil" className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </StandardizedTable.Cell>
                    </StandardizedTable.Row>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={showNotesColumn ? 10 : 9} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Lucide icon="FileSearch" className="w-10 h-10 opacity-40" />
                        <span className="text-sm font-medium text-slate-600">No filings found</span>
                      </div>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </StandardizedTable>

            {/* Legend for the Remarks column -- one line, muted, so the icons
                don't need a column of prose beside them. */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Lucide icon="CheckCircle2" className="w-3.5 h-3.5 text-emerald-600" />
                Alert sent
              </span>
              <span className="inline-flex items-center gap-1">
                <Lucide icon="PauseCircle" className="w-3.5 h-3.5 text-slate-500" />
                Held — not sent
              </span>
              <span className="inline-flex items-center gap-1">
                <Lucide icon="Loader" className="w-3.5 h-3.5 text-slate-500" />
                Sending
              </span>
              <span className="inline-flex items-center gap-1">
                <Lucide icon="AlertTriangle" className="w-3.5 h-3.5 text-amber-600" />
                Needs attention
              </span>
              <span className="inline-flex items-center gap-1">
                <Lucide icon="Mail" className="w-3.5 h-3.5 text-slate-400" />
                Send alert
              </span>
              <span className="text-slate-400">hover an icon for the reason</span>
            </div>

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

      {/* Upload, moved off the page. The drop zone, the selected-file view, the
          Upload button and the row-error list are the same markup that was in
          the card above the table -- only their container changed. */}
      {uploadModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUploading) setUploadModalOpen(false);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", padding: 24, borderRadius: 12, width: "100%", maxWidth: 520, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-slate-800">Upload Campaigns (Excel)</h2>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                disabled={isUploading}
                title="Close"
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                <Lucide icon="X" className="w-4 h-4" />
              </button>
            </div>

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

            {uploadErrors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-red-700 mb-1.5">Some rows could not be processed:</p>
                <ul className="text-xs text-red-700 list-disc pl-4 space-y-0.5">
                  {uploadErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setUploadModalOpen(false)}
                disabled={isUploading}
              >
                Close
              </Button>
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
          </div>
        </div>
      )}

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
              {previewPressDetails ? (
                // Press release: the headline is the title (the target's name
                // if none came through), then the wire and the release date.
                <div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>
                    {previewPressDetails.headline || currentPreviewFiling.company_name || "-"}
                  </h2>
                  <div style={{ fontSize: 13, color: "#6b7280", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px" }}>
                    <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-violet-100 text-violet-700">
                      {getSourceBadgeLabel(currentPreviewFiling)}
                    </span>
                    <span>{formatDateOnly(currentPreviewFiling.filed_at) || "-"}</span>
                  </div>
                </div>
              ) : (
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
              )}
              <button
                type="button"
                onClick={closePreview}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, flexShrink: 0 }}
              >
                <Lucide icon="X" className="w-5 h-5" />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {/* Press releases never fetch. The SEC branches below (Item 2 /
                  Item 4, solicitation, document text, Exhibits) are also gated
                  on the row not being one, so a slow SEC preview that lands
                  after the modal has moved on to a press release can't render
                  under it. Always true for SEC rows. */}
              {previewIsPressRelease && <PressReleasePreview filing={currentPreviewFiling} />}

              {!previewIsPressRelease && previewLoading && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "32px 0", color: "#6b7280" }}>
                  <div style={{ width: 16, height: 16, border: "2px solid #e5e7eb", borderTopColor: THEME_MAROON, borderRadius: "50%", animation: "acp-spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 13.5 }}>Loading filing preview…</span>
                  <style>{`@keyframes acp-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {!previewIsPressRelease && !previewLoading && previewError && (
                <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, color: "#b91c1c", fontSize: 13.5 }}>
                  {previewError}
                </div>
              )}

              {!previewIsPressRelease && !previewLoading && !previewError && previewData && (
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
                        {previewData.exhibits.map(
                          (
                            exhibit: {
                              name?: string;
                              url?: string;
                              // Added by the backend in parallel with this, and
                              // each independently absent -- roughly a third of
                              // exhibits are PDFs that yield none of them. Every
                              // one is rendered only when it actually has text,
                              // so with all three missing this <li> contains the
                              // link and nothing else: byte-identical to what it
                              // rendered before these fields existed. That
                              // matters because the backend may deploy after
                              // this does.
                              title?: string | null;
                              category?: string | null;
                              description?: string | null;
                            },
                            i: number
                          ) => {
                            const category = toTrimmedString(exhibit.category);
                            const title = toTrimmedString(exhibit.title);
                            const description = toTrimmedString(exhibit.description);

                            return (
                              <li key={i} style={{ fontSize: 13 }}>
                                <a
                                  href={exhibit.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: THEME_MAROON, textDecoration: "underline" }}
                                >
                                  {exhibit.name || exhibit.url}
                                </a>
                                {category && (
                                  <span
                                    style={{
                                      marginLeft: 8, fontSize: 11, color: "#6b7280", background: "#f3f4f6",
                                      border: "1px solid #e5e7eb", borderRadius: 999, padding: "1px 8px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {category}
                                  </span>
                                )}
                                {title && (
                                  <div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
                                    {title}
                                  </div>
                                )}
                                {description && (
                                  <div style={{ marginTop: 2, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                                    {description}
                                  </div>
                                )}
                              </li>
                            );
                          }
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {previewIsPressRelease ? (
                currentPreviewFiling.filing_url ? (
                  <a
                    href={currentPreviewFiling.filing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13.5, fontWeight: 600, color: THEME_MAROON, display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    Read the full release
                    <Lucide icon="ExternalLink" className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span />
                )
              ) : previewSecUrl ? (
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
                  : (() => {
                      // Mid-run, rows turn "already sent" one by one; the run's
                      // own total keeps the title from counting down.
                      const count = bulkSending && bulkProgress ? bulkProgress.total : bulkSendCount;
                      return `Send ${count} Alert${count === 1 ? "" : "s"}?`;
                    })()}
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
                        {isSkippingAlreadySent ? (
                          <>
                            <strong>{alreadySentSelected.length}</strong> of these already had an alert sent. They will
                            be skipped, not emailed a second time:
                          </>
                        ) : (
                          <>
                            <strong>{alreadySentSelected.length}</strong> of these already had an alert sent. Sending
                            again is allowed but will email them a second time:
                          </>
                        )}
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
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4, fontSize: 13, color: "#7f1d1d", fontWeight: 600, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={skipAlreadySent}
                          onChange={(e) => setSkipAlreadySent(e.target.checked)}
                          className="w-4 h-4 cursor-pointer"
                          style={{ accentColor: THEME_MAROON, marginTop: 2, flexShrink: 0 }}
                        />
                        <span>
                          Skip the {alreadySentSelected.length} already sent — send only the{" "}
                          {selectedFilings.length - alreadySentSelected.length} new one
                          {selectedFilings.length - alreadySentSelected.length === 1 ? "" : "s"}
                        </span>
                      </label>
                    </div>
                  )}

                  {bulkSendCount === 0 ? (
                    <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 6, background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                      <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, fontWeight: 600 }}>
                        Nothing to send — all {selectedFilings.length} already had an alert
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex", gap: 10, padding: "10px 14px", marginBottom: 16, borderRadius: 6,
                        background: bulkSendCount >= LARGE_SELECTION_COUNT_THRESHOLD ? "#fef3c7" : "#f3f4f6",
                        border: bulkSendCount >= LARGE_SELECTION_COUNT_THRESHOLD ? "1px solid #fcd34d" : "1px solid #e5e7eb",
                      }}
                    >
                      <span style={{ fontSize: 13, color: bulkSendCount >= LARGE_SELECTION_COUNT_THRESHOLD ? "#92400e" : "#4b5563", lineHeight: 1.5 }}>
                        {/* The run lives in this page, so closing it stops the
                            remaining sends -- the "keep open" line must stay. */}
                        This takes <strong>{formatEstimatedDuration(bulkSendCount)}</strong>. Please keep this window
                        open until all alerts are sent.
                      </span>
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 12.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 8px" }}>
                      Filings to send
                    </h3>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 220, overflowY: "auto" }}>
                      {selectedFilings.map((f, i) => {
                        // Skipped rows stay in the list, struck through, so the
                        // selection reads the same with the box ticked or not.
                        const skippedRow = isSkippingAlreadySent && isAlreadySent(f);
                        return (
                          <div
                            key={f.id}
                            style={{ padding: "8px 14px", fontSize: 13, color: skippedRow ? "#9ca3af" : "#111827", borderTop: i === 0 ? "none" : "1px solid #f3f4f6" }}
                          >
                            <span style={{ textDecoration: skippedRow ? "line-through" : "none" }}>
                              <strong>{f.company_name || "-"}</strong>
                              <span style={{ color: skippedRow ? "#9ca3af" : "#6b7280" }}> — {f.filer || "-"} — {f.form_type || "-"}</span>
                            </span>
                            {skippedRow && (
                              <span style={{ marginLeft: 8, fontSize: 11.5, fontStyle: "italic", color: "#6b7280" }}>skipped — already sent</span>
                            )}
                          </div>
                        );
                      })}
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
                    {/* Only when the run skipped something, so a run without
                        skips summarises exactly as before. */}
                    {bulkResults.some((r) => r.status === "skipped") && (
                      <div style={{ flex: 1, padding: "10px 14px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#4b5563" }}>
                          {bulkResults.filter((r) => r.status === "skipped").length}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#4b5563" }}>Skipped</div>
                      </div>
                    )}
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 260, overflowY: "auto" }}>
                    {bulkResults.map((r, i) => (
                      <div
                        key={r.filing.id}
                        style={{ padding: "8px 14px", fontSize: 13, borderTop: i === 0 ? "none" : "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 2 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Lucide
                            icon={r.status === "failed" ? "XCircle" : r.status === "skipped" ? "MinusCircle" : "CheckCircle2"}
                            className="w-3.5 h-3.5"
                            style={{ color: r.status === "failed" ? "#dc2626" : r.status === "skipped" ? "#6b7280" : "#16a34a", flexShrink: 0 }}
                          />
                          <strong style={{ color: "#111827" }}>{r.filing.company_name || "-"}</strong>
                        </div>
                        {r.status === "skipped" && (
                          <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 22 }}>skipped (already sent)</span>
                        )}
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
                    disabled={bulkSendCount === 0}
                    style={{
                      padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, fontWeight: 600,
                      cursor: bulkSendCount === 0 ? "not-allowed" : "pointer", opacity: bulkSendCount === 0 ? 0.5 : 1,
                    }}
                  >
                    Confirm and Send {bulkSendCount} Alert{bulkSendCount === 1 ? "" : "s"}
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
