import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { dashboardService } from "@/services/dashboard";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { getCreatorEmail } from "@/utils/currentUser";

const THEME_MAROON = "#8b1828";

// ─── Suppression filters ────────────────────────────────────────────────────
// Phrase rules that hold a filing's alert instead of emailing it. This panel
// only manages the rules; how a held row is labelled on the table is already
// decided by isFilingHeld / getHeldChip on the page, and a rule created here
// lands on "Held by filter" there because its id is not one of the standing
// gates -- which is the intended label, so nothing on the page changes.
//
// The preview is the whole point of the form. A rule is replayed against the
// stored filings before it can be saved, and the save carries the preview's
// token, so what was reviewed is exactly what goes live. The UI makes the
// stale-preview state unreachable rather than relying on the server's 409:
// every edit to a rule field drops the preview and the save button with it.

type RuleFields = {
  rule_id: string;
  category: string;
  phrases: string[];
  stands_down_on_activist_language: boolean;
  requires_all_of: string[] | null;
  not_after: string[] | null;
};

type RuleEvent = {
  id: number | string;
  rule_id: string;
  action: "created" | "enabled" | "disabled";
  actor: string;
  note: string | null;
  at: string;
};

type PageRule = RuleFields & {
  id: number | string;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  source_note: string | null;
  source: "page";
  history: RuleEvent[];
};

type CodeRule = RuleFields & { source: "code"; editable: false };

type PreviewFiling = {
  accession_number: string;
  filing_id: number | string | null;
  company_name: string;
  filer: string;
  form_type: string;
  filed_at: string;
  filing_url: string;
  document_url: string;
  emailed: boolean;
  alert_sent_at: string | null;
  outcome: "sent" | "held" | "not_sent";
  held_by_rule: string | null;
  matched_phrase?: string;
  already_held_by?: string | null;
  activist_terms?: string[];
  item4_cut?: boolean;
  excerpt?: string;
};

type PreviewWarning = {
  level: "danger" | "warning" | "info";
  code: string;
  message: string;
  accession_numbers?: string[];
};

type ExpectedResult = {
  accession_number: string;
  status: "caught" | "held_back_by_activist_guard" | "not_caught" | "no_item4" | "unreadable" | "not_in_corpus";
  caught: boolean;
  detail: string | null;
  filing: PreviewFiling | null;
};

type PreviewResponse = {
  preview_token: string;
  previewed_at: string;
  expires_in_hours: number;
  rule: RuleFields;
  replay: {
    stored_filings: number;
    readable_item4: number;
    no_item4: number;
    unreadable: number;
    oldest_filed_at: string | null;
    newest_filed_at: string | null;
    other_rules_checked: number;
    window_days: number;
  };
  summary: {
    would_suppress: number;
    already_emailed: number;
    newly_silenced: number;
    already_held_by_other_rules: number;
    suppressed_with_activist_language: number;
    suppressed_with_cut_item4: number;
    held_back_by_activist_guard: number;
    expected_total: number;
    expected_caught: number;
    expected_missed: number;
  };
  requires_acknowledgement: boolean;
  warnings: PreviewWarning[];
  would_suppress: PreviewFiling[];
  held_back_by_activist_guard: PreviewFiling[];
  expected: ExpectedResult[];
};

// A preview is only ever shown against the exact inputs it was run on. `key`
// is those inputs serialised; the form's live key is compared against it, so
// a preview whose inputs no longer match the form can never be displayed or
// saved, whatever path the edit took.
type PreviewState = {
  key: string;
  ruleFields: RuleFields;
  response: PreviewResponse;
  receivedAt: number;
};

// ─── Errors ─────────────────────────────────────────────────────────────────
// Every error body is {"detail": {code, message, field?, ...extras}}. The
// message is the server's sentence for the user and is always shown; the code
// decides what the panel does next and adds the title and, where the server's
// sentence alone isn't enough to act on, a line of guidance.
type ApiError = {
  status: number | null;
  code: string;
  message: string;
  field?: string;
};

const parseApiError = (error: any): ApiError => {
  const response = error?.response;
  if (!response) {
    return {
      status: null,
      code: "network",
      message: "No response from the server. Check your connection and try again.",
    };
  }
  const detail = response.data?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    return {
      status: response.status,
      code: String(detail.code || "unknown"),
      message: String(detail.message || `The server returned ${response.status}.`),
      field: detail.field || undefined,
    };
  }
  // Request-shape validation can come back as FastAPI's own list of
  // {loc, msg} rather than the contract's object -- still shown, not dropped.
  if (Array.isArray(detail)) {
    return {
      status: response.status,
      code: "invalid_request",
      message: detail.map((d: any) => d?.msg || JSON.stringify(d)).join("; "),
    };
  }
  return {
    status: response.status,
    code: "unknown",
    message: typeof detail === "string" && detail ? detail : `The server returned ${response.status}.`,
  };
};

// Save failures that mean the preview on screen can no longer be saved. The
// preview is dropped, which takes the save button with it.
const STALE_PREVIEW_CODES = new Set(["preview_token_missing", "preview_token_mismatch", "preview_not_found"]);

// The three replay_* codes are the ways a preview can fail to run. None of
// them issues a token, so none says anything about whether the rule is safe:
// each title states the rule has NOT been checked, and the panel renders them
// in the same red box as any other failure, never as a clean result.
const ERROR_COPY: Record<string, { title: string; guidance?: string }> = {
  replay_corpus_too_small: {
    title: "The preview can't run yet. This rule has NOT been checked.",
    guidance:
      "This is not a problem with your rule. The preview replays a rule against the SEC filings already stored, " +
      "and there aren't enough stored yet, which is expected on a new environment until its filing store is seeded. " +
      "Until then no rule can be checked, so none can be saved. Ask the backend team to seed the filing store, then run the preview again.",
  },
  replay_unavailable: {
    title: "The preview failed. This rule has NOT been checked.",
    guidance:
      "The stored filings could not be read, so nothing was replayed and nothing can be saved. " +
      "Run the preview again in a minute; if it keeps failing, tell the backend team.",
  },
  replay_incomplete: {
    title: "The preview stopped part-way. This rule has NOT been checked.",
    guidance:
      "The replay did not get through every stored filing, so its result would be incomplete and was discarded. " +
      "Nothing can be saved from it. Run the preview again.",
  },
  preview_token_missing: { title: "This rule hasn't been previewed.", guidance: "Run the preview, review it, then save." },
  preview_token_mismatch: {
    title: "The rule changed after it was previewed.",
    guidance: "Run the preview again on the rule as it is now, then save.",
  },
  preview_not_found: {
    title: "The preview has expired.",
    guidance: "The server has no preview of this exact rule from the last 24 hours. Run the preview again, then save.",
  },
  acknowledgement_required: {
    title: "This preview needs your acknowledgement.",
    guidance: "Tick the acknowledgement beside the save button, then save.",
  },
  rule_id_taken: { title: "That rule ID is already used.", guidance: "Rule IDs are unique forever, even for disabled rules. Choose another." },
  rule_id_reserved: { title: "That rule ID belongs to a built-in rule.", guidance: "Choose another rule ID." },
  invalid_rule: { title: "The rule isn't valid." },
  rule_cannot_fire: { title: "This rule can never match anything." },
  actor_required: {
    title: "Couldn't tell who you are.",
    guidance: "The rule must be stamped with your email. Sign out and back in, then try again.",
  },
  database_error: { title: "The server couldn't save this." },
  rule_not_found: { title: "That filter no longer exists." },
  network: { title: "No response from the server." },
};

const ErrorBox: React.FC<{ error: ApiError; className?: string }> = ({ error, className = "" }) => {
  const copy = ERROR_COPY[error.code];
  return (
    <div role="alert" className={`flex gap-2.5 rounded-md border border-red-300 bg-red-50 px-3.5 py-3 ${className}`}>
      <Lucide icon="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
      <div className="min-w-0 text-[13px] leading-relaxed text-red-800">
        {copy && <p className="font-semibold">{copy.title}</p>}
        <p>{error.message}</p>
        {copy?.guidance && <p className="mt-1">{copy.guidance}</p>}
      </div>
    </div>
  );
};

// ─── Small helpers ──────────────────────────────────────────────────────────
const toLines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

// One filing reference -> its accession number, or null. Analysts work from
// SEC links, so a pasted URL is read as well as a bare number: the dashed form
// (0000950170-26-012345) wherever it appears, else the 18-digit folder name in
// an /Archives/edgar/data/<cik>/<accession>/ path, re-dashed 10-2-6. A CIK is
// at most 10 digits, so it can't be mistaken for the folder.
const extractAccession = (reference: string): string | null => {
  const dashed = reference.match(/\d{10}-\d{2}-\d{6}/);
  if (dashed) return dashed[0];
  const folder = reference.match(/(?:^|\D)(\d{18})(?:\D|$)/);
  if (folder) return `${folder[1].slice(0, 10)}-${folder[1].slice(10, 12)}-${folder[1].slice(12)}`;
  return null;
};

// Any run of commas, spaces or newlines separates references (URLs carry
// none of those). Ones with no accession in them are reported, not sent.
const parseFilingReferences = (text: string): { accessions: string[]; unparsed: string[] } => {
  const accessions: string[] = [];
  const unparsed: string[] = [];
  text
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((reference) => {
      const accession = extractAccession(reference);
      if (!accession) unparsed.push(reference);
      else if (!accessions.includes(accession)) accessions.push(accession);
    });
  return { accessions, unparsed };
};

// The rule ID, derived from the category so nobody has to invent one:
// "passive investment" -> passive_investment. Shaped to the server's
// ^[a-z][a-z0-9_]{2,63}$: lower-cased, spaces to underscores, anything outside
// [a-z0-9_] stripped, repeated underscores collapsed, and leading characters
// that aren't a letter dropped. Too short for the pattern -> "_filter" added.
//
// `taken` is every ID the list endpoint returned -- page rules (disabled ones
// included, since an ID is unique forever) and built-ins -- so a clash is
// avoided before the preview with _2, _3, ... rather than discovered at save.
const deriveRuleId = (category: string, taken: Set<string>): string => {
  let base = category
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^[^a-z]+/, "")
    .replace(/_+$/, "")
    .slice(0, 58);
  if (!base) return "";
  if (base.length < 3) base = `${base}_filter`;
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}_${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return base;
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The server lower-cases and whitespace-normalises phrases, while the excerpt
// is the filing's own text -- so the match is case-insensitive and any run of
// whitespace in the phrase matches any run in the excerpt.
const HighlightedExcerpt: React.FC<{ text: string; phrase?: string }> = ({ text, phrase }) => {
  const words = (phrase || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join("\\s+")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-amber-200 px-0.5 text-slate-900">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

// A preview stays saveable for expires_in_hours on the server. Measured from
// when this browser received it, on this browser's clock, so a skewed client
// clock can't make an expired preview look live; the margin keeps a save
// fired in the final minutes from reaching the server just after it lapsed.
const PREVIEW_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

const PhraseChips: React.FC<{ phrases: string[] | null | undefined; tone?: "default" | "muted" }> = ({ phrases, tone = "default" }) => (
  <div className="flex flex-wrap gap-1">
    {(phrases || []).map((phrase, i) => (
      <span
        key={`${phrase}-${i}`}
        className={`rounded border px-1.5 py-0.5 font-mono text-[11.5px] ${
          tone === "muted" ? "border-slate-200 bg-slate-50 text-slate-500" : "border-slate-300 bg-white text-slate-700"
        }`}
      >
        {phrase}
      </span>
    ))}
  </div>
);

const RuleDetailRows: React.FC<{ rule: RuleFields; muted?: boolean }> = ({ rule, muted }) => (
  <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
    <dt className="text-slate-500">Phrases</dt>
    <dd><PhraseChips phrases={rule.phrases} tone={muted ? "muted" : "default"} /></dd>
    <dt className="text-slate-500">Activist guard</dt>
    <dd>
      {rule.stands_down_on_activist_language ? (
        <span className="text-slate-700">On: stands down when the filing talks about directors or demands</span>
      ) : (
        <span className="font-semibold text-red-700">OFF: fires even on filings with activist language</span>
      )}
    </dd>
    {rule.requires_all_of && rule.requires_all_of.length > 0 && (
      <>
        <dt className="text-slate-500">Also requires</dt>
        <dd><PhraseChips phrases={rule.requires_all_of} tone={muted ? "muted" : "default"} /></dd>
      </>
    )}
    {rule.not_after && rule.not_after.length > 0 && (
      <>
        <dt className="text-slate-500">Cancelled after</dt>
        <dd><PhraseChips phrases={rule.not_after} tone={muted ? "muted" : "default"} /></dd>
      </>
    )}
  </dl>
);

// ─── Preview result pieces ─────────────────────────────────────────────────
const OUTCOME_LABELS: Record<PreviewFiling["outcome"], string> = {
  sent: "Alert sent",
  held: "Already held",
  not_sent: "No alert sent",
};

const PreviewFilingCard: React.FC<{ filing: PreviewFiling }> = ({ filing }) => {
  const activistTerms = filing.activist_terms || [];
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <span className="font-semibold text-slate-900">{filing.company_name || "Unknown company"}</span>
          <span className="text-slate-500"> · filed by </span>
          <span className="text-slate-800">{filing.filer || "unknown filer"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[12px] text-slate-500">
          <span>{filing.form_type}</span>
          <span>·</span>
          <span>{formatDate(filing.filed_at)}</span>
          {filing.filing_url && (
            <a href={filing.filing_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: THEME_MAROON }}>
              SEC filing
            </a>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
        {filing.emailed ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
            Already emailed{filing.alert_sent_at ? ` ${formatDateTime(filing.alert_sent_at)}` : ""}
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
            {OUTCOME_LABELS[filing.outcome] || filing.outcome}
            {filing.outcome === "held" && filing.held_by_rule ? ` by ${filing.held_by_rule}` : ""}
          </span>
        )}
        {filing.already_held_by && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
            Already held by <span className="font-mono">{filing.already_held_by}</span>
          </span>
        )}
        {activistTerms.length > 0 && (
          <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-800">
            Activist language: {activistTerms.join(", ")}
          </span>
        )}
        {filing.item4_cut && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
            Item 4 was cut off: the rule saw only part of it
          </span>
        )}
        <span className="font-mono text-slate-400">{filing.accession_number}</span>
      </div>

      {filing.excerpt && (
        <p className="mt-2 whitespace-pre-wrap rounded border border-slate-100 bg-slate-50 px-2.5 py-2 text-[12.5px] leading-relaxed text-slate-700">
          <HighlightedExcerpt text={filing.excerpt} phrase={filing.matched_phrase} />
        </p>
      )}
      {filing.matched_phrase && (
        <p className="mt-1 text-[11.5px] text-slate-500">
          Matched phrase: <span className="font-mono text-slate-700">{filing.matched_phrase}</span>
        </p>
      )}
    </li>
  );
};

const EXPECTED_STATUS_LABELS: Record<ExpectedResult["status"], string> = {
  caught: "Caught",
  held_back_by_activist_guard: "Matched, but the activist guard saves it",
  not_caught: "Not caught",
  no_item4: "Not caught: the filing has no Item 4",
  unreadable: "Not caught: the filing couldn't be read",
  not_in_corpus: "Not caught: not among the stored filings",
};

const WARNING_STYLES: Record<string, string> = {
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

// Danger warnings: red, and rendered by the panel OUTSIDE its scrolling body,
// so they stay on screen however far down the results the user scrolls. They
// are never collapsed or truncated -- activist_language_suppressed means the
// rule is about to silence a real campaign, the one outcome this feature
// exists to prevent.
const DangerWarnings: React.FC<{ warnings: PreviewWarning[]; filingsByAccession: Map<string, PreviewFiling> }> = ({
  warnings,
  filingsByAccession,
}) => (
  <div role="alert" className="flex flex-col gap-2 border-b-2 border-red-600 bg-red-50 px-6 py-3">
    {warnings.map((warning, i) => (
      <div key={`${warning.code}-${i}`} className="flex gap-2.5">
        <Lucide icon="ShieldAlert" className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
        <div className="min-w-0 text-[13.5px] leading-relaxed text-red-900">
          <p className="font-bold">{warning.message}</p>
          {(warning.accession_numbers || []).length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-[12.5px]">
              {(warning.accession_numbers || []).map((accession) => {
                const filing = filingsByAccession.get(accession);
                return (
                  <li key={accession}>
                    {filing ? (
                      <>
                        <span className="font-semibold">{filing.company_name}</span> · {filing.filer} · {filing.form_type} ·{" "}
                        {formatDate(filing.filed_at)} <span className="font-mono text-red-700">({accession})</span>
                      </>
                    ) : (
                      <span className="font-mono">{accession}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    ))}
  </div>
);

const SectionHeading: React.FC<{ title: string; count?: number; subtitle?: string }> = ({ title, count, subtitle }) => (
  <div className="mb-2">
    <h3 className="text-sm font-bold text-slate-800">
      {title}
      {typeof count === "number" && <span className="ml-1.5 font-semibold text-slate-500">({count})</span>}
    </h3>
    {subtitle && <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">{subtitle}</p>}
  </div>
);

const PreviewResults: React.FC<{ preview: PreviewResponse; guardOn: boolean }> = ({ preview, guardOn }) => {
  const { summary, replay } = preview;
  const otherWarnings = preview.warnings.filter((w) => w.level !== "danger");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[14px] text-slate-900">
          This rule would silence <strong>{summary.would_suppress}</strong> filing{summary.would_suppress === 1 ? "" : "s"}:{" "}
          {summary.newly_silenced} not held by anything today, {summary.already_held_by_other_rules} already held by other
          rules, and <strong>{summary.already_emailed}</strong> we already emailed.
        </p>
        <p className="mt-1 text-[12px] text-slate-500">
          Replayed over the last {replay.window_days} days: {replay.readable_item4} filings with a readable Item 4 out of{" "}
          {replay.stored_filings} stored ({replay.no_item4} without an Item 4, {replay.unreadable} unreadable)
          {replay.oldest_filed_at && replay.newest_filed_at
            ? `, filed ${formatDate(replay.oldest_filed_at)} to ${formatDate(replay.newest_filed_at)}`
            : ""}
          , alongside the {replay.other_rules_checked} existing rules. Previewed {formatDateTime(preview.previewed_at)}.
        </p>
      </div>

      {otherWarnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {otherWarnings.map((warning, i) => (
            <div
              key={`${warning.code}-${i}`}
              className={`flex gap-2.5 rounded-md border px-3.5 py-2.5 text-[13px] leading-relaxed ${WARNING_STYLES[warning.level] || WARNING_STYLES.info}`}
            >
              <Lucide icon={warning.level === "warning" ? "AlertTriangle" : "Info"} className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p>{warning.message}</p>
                {(warning.accession_numbers || []).length > 0 && (
                  <p className="mt-0.5 font-mono text-[11.5px] opacity-80">{(warning.accession_numbers || []).join(", ")}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <section>
        <SectionHeading
          title="Filings this rule would silence"
          count={preview.would_suppress.length}
          subtitle="Every stored filing in the window that this rule matches. Once saved, filings like these are held instead of emailed."
        />
        {preview.would_suppress.length === 0 ? (
          <p className="text-[13px] text-slate-500">None. This rule matches no stored filing in the window.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {preview.would_suppress.map((filing) => (
              <PreviewFilingCard key={filing.accession_number} filing={filing} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading
          title="Matched, but saved by the activist guard: these would be silenced too if the guard were off"
          count={preview.held_back_by_activist_guard.length}
          subtitle={
            guardOn
              ? "The rule's phrases match these filings, but each one also talks about directors or demands, so the guard keeps the alert going out. Turning the guard off silences every one of them."
              : "The guard is off for this rule, so nothing is saved by it."
          }
        />
        {preview.held_back_by_activist_guard.length === 0 ? (
          <p className="text-[13px] text-slate-500">None.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {preview.held_back_by_activist_guard.map((filing) => (
              <PreviewFilingCard key={filing.accession_number} filing={filing} />
            ))}
          </ul>
        )}
      </section>

      {preview.expected.length > 0 && (
        <section>
          <SectionHeading
            title="Filings you expected it to catch"
            count={preview.expected.length}
            subtitle={`${summary.expected_caught} caught, ${summary.expected_missed} missed.`}
          />
          <ul className="flex flex-col gap-1.5">
            {preview.expected.map((result) => (
              <li
                key={result.accession_number}
                className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-md border px-3 py-2 text-[12.5px] ${
                  result.caught ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"
                }`}
              >
                <Lucide
                  icon={result.caught ? "CheckCircle2" : "XCircle"}
                  className={`h-4 w-4 shrink-0 self-center ${result.caught ? "text-emerald-600" : "text-amber-700"}`}
                />
                <span className="font-mono text-slate-700">{result.accession_number}</span>
                <span className="font-semibold text-slate-800">{EXPECTED_STATUS_LABELS[result.status] || result.status}</span>
                {result.filing && (
                  <span className="text-slate-600">
                    {result.filing.company_name} · {result.filing.filer} · {result.filing.form_type} · {formatDate(result.filing.filed_at)}
                  </span>
                )}
                {result.detail && <span className="w-full text-slate-600">{result.detail}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

// ─── Modal shell, for the two small confirmations ───────────────────────────
const ConfirmDialog: React.FC<{ children: React.ReactNode; onBackdrop: () => void; maxWidth?: number }> = ({
  children,
  onBackdrop,
  maxWidth = 480,
}) => (
  <div
    onClick={(e) => {
      if (e.target === e.currentTarget) onBackdrop();
    }}
    style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ background: "white", padding: 24, borderRadius: 12, width: "100%", maxWidth, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)" }}
    >
      {children}
    </div>
  </div>
);

// Disabled is grey, not a faded maroon: on a white panel 50% maroon and full
// maroon are too close to tell a blocked form from a ready one.
const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none",
  color: disabled ? "#64748b" : "#fff",
  background: disabled ? "#cbd5e1" : THEME_MAROON,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
});

const secondaryButtonStyle: React.CSSProperties = {
  padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none",
  background: "#f3f4f6", color: "#374151", cursor: "pointer",
};

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none disabled:bg-slate-50 disabled:text-slate-500";

// ─── The panel ──────────────────────────────────────────────────────────────
interface SuppressionFiltersPanelProps {
  onClose: () => void;
}

const SuppressionFiltersPanel: React.FC<SuppressionFiltersPanelProps> = ({ onClose }) => {
  const { user } = useAppSelector((state: RootState) => state.authentiction);

  const [tab, setTab] = useState<"rules" | "add">("rules");

  // ── List ──
  const [rules, setRules] = useState<PageRule[]>([]);
  const [codeRules, setCodeRules] = useState<CodeRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<ApiError | null>(null);
  const [openHistory, setOpenHistory] = useState<Set<string>>(new Set());

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const data = await dashboardService.listSuppressionRules();
      setRules(Array.isArray(data?.rules) ? data.rules : []);
      setCodeRules(Array.isArray(data?.code_rules) ? data.code_rules : []);
    } catch (error) {
      console.error("Failed to load suppression rules:", error);
      setRulesError(parseApiError(error));
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // ── Enable / disable ──
  const [toggleTarget, setToggleTarget] = useState<PageRule | null>(null);
  const [toggleNote, setToggleNote] = useState("");
  const [toggleSaving, setToggleSaving] = useState(false);
  const [toggleError, setToggleError] = useState<ApiError | null>(null);

  const openToggle = (rule: PageRule) => {
    setToggleTarget(rule);
    setToggleNote("");
    setToggleError(null);
  };

  const closeToggle = () => {
    if (toggleSaving) return;
    setToggleTarget(null);
  };

  // One request per click; a failure is shown in the dialog and never retried
  // behind the user's back.
  const confirmToggle = async () => {
    if (!toggleTarget) return;
    const enabling = !toggleTarget.enabled;
    setToggleSaving(true);
    setToggleError(null);
    try {
      const response = await dashboardService.setSuppressionRuleEnabled(toggleTarget.rule_id, enabling, {
        updated_by: getCreatorEmail(user),
        note: toggleNote.trim() || undefined,
      });
      if (response?.changed === false) {
        toast.info(`${toggleTarget.rule_id} was already ${enabling ? "on" : "off"}. Nothing changed.`);
      } else {
        toast.success(
          `${toggleTarget.rule_id} is now ${enabling ? "on" : "off"}. The monitor picks this up within about 20 seconds.`
        );
      }
      setToggleTarget(null);
      await loadRules();
    } catch (error) {
      console.error("Failed to change suppression rule state:", error);
      setToggleError(parseApiError(error));
    } finally {
      setToggleSaving(false);
    }
  };

  // ── Add form ──
  // null = use the ID generated from the category. Set only from Advanced.
  const [ruleIdOverride, setRuleIdOverride] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // IDs the server reported taken at save that the list didn't know about
  // (someone created one between list load and save).
  const [extraTakenIds, setExtraTakenIds] = useState<string[]>([]);
  // A rule_id_taken at save picks the next free ID once; a second one is
  // surfaced as-is.
  const [ruleIdBumped, setRuleIdBumped] = useState(false);
  const [ruleIdNotice, setRuleIdNotice] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [phrasesText, setPhrasesText] = useState("");
  const [guardOn, setGuardOn] = useState(true);
  const [requiresAllText, setRequiresAllText] = useState("");
  const [notAfterText, setNotAfterText] = useState("");
  const [expectedText, setExpectedText] = useState("");
  const [windowDays, setWindowDays] = useState("");
  // Not a rule field: it isn't part of the preview, so editing it leaves the
  // preview standing.
  const [sourceNote, setSourceNote] = useState("");
  const [guardConfirmOpen, setGuardConfirmOpen] = useState(false);

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [previewError, setPreviewError] = useState<ApiError | null>(null);
  const [pendingSeconds, setPendingSeconds] = useState(0);
  // Bumped by every edit and every new preview. A preview response is applied
  // only if the counter hasn't moved since it was requested, so a reply to an
  // older version of the rule can never land on screen.
  const previewSeqRef = useRef(0);

  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const takenRuleIds = useMemo(
    () => new Set([...rules.map((r) => r.rule_id), ...codeRules.map((r) => r.rule_id), ...extraTakenIds]),
    [rules, codeRules, extraTakenIds]
  );
  const generatedRuleId = useMemo(() => deriveRuleId(category, takenRuleIds), [category, takenRuleIds]);

  // Every category already in use, built-in and page-created, offered as
  // suggestions so the same kind of filter gets the same name.
  const categorySuggestions = useMemo(
    () =>
      Array.from(new Set([...codeRules, ...rules].map((r) => (r.category || "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [codeRules, rules]
  );

  const filingRefs = useMemo(() => parseFilingReferences(expectedText), [expectedText]);

  // The rule exactly as it would be sent: what the preview is keyed on, and
  // what the save sends (from the preview's own copy, never re-read from the
  // form).
  const ruleFields: RuleFields = useMemo(() => {
    const requiresAll = toLines(requiresAllText);
    const notAfter = toLines(notAfterText);
    return {
      // A blank (or whitespace-only) Rule ID box means "use the generated
      // one", exactly like never having touched it -- otherwise clearing the
      // box inside the collapsed Advanced section would leave Run preview
      // dead with nothing visible to explain it.
      rule_id: ruleIdOverride?.trim() || generatedRuleId,
      category: category.trim(),
      phrases: toLines(phrasesText),
      stands_down_on_activist_language: guardOn,
      requires_all_of: requiresAll.length > 0 ? requiresAll : null,
      not_after: notAfter.length > 0 ? notAfter : null,
    };
  }, [ruleIdOverride, generatedRuleId, category, phrasesText, guardOn, requiresAllText, notAfterText]);

  const previewParams = useMemo(() => {
    const days = parseInt(windowDays, 10);
    return {
      expected_accessions: filingRefs.accessions.length > 0 ? filingRefs.accessions : undefined,
      window_days: windowDays.trim() && Number.isFinite(days) ? days : undefined,
    };
  }, [filingRefs, windowDays]);

  // Expected accessions and the window aren't rule fields, but they change
  // what the preview shows, so they're in the key: a result computed for
  // other inputs is never left on screen beside the new ones.
  const currentKey = useMemo(() => JSON.stringify({ ...ruleFields, ...previewParams }), [ruleFields, previewParams]);

  // Every field setter goes through this. Dropping the preview drops the save
  // button, which only renders against a current preview.
  const invalidatePreview = () => {
    previewSeqRef.current += 1;
    setPreview(null);
    setPreviewError(null);
    setPreviewPending(false);
    setAcknowledged(false);
    setSaveError(null);
    setRuleIdNotice(null);
  };

  const editField = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    invalidatePreview();
  };

  // Turning the guard OFF needs a confirmation; turning it back on doesn't.
  const handleGuardChange = (checked: boolean) => {
    if (checked) {
      editField(setGuardOn)(true);
    } else {
      setGuardConfirmOpen(true);
    }
  };

  const isPreviewCurrent = !!preview && preview.key === currentKey;
  const previewExpiresAt = preview
    ? preview.receivedAt + preview.response.expires_in_hours * 3600 * 1000 - PREVIEW_EXPIRY_MARGIN_MS
    : 0;
  const isPreviewExpired = isPreviewCurrent && now >= previewExpiresAt;
  const canShowSave = isPreviewCurrent && !isPreviewExpired;
  const needsAcknowledgement = canShowSave && preview.response.requires_acknowledgement;
  const canSave = canShowSave && (!needsAcknowledgement || acknowledged) && !saving;

  // Re-checked every 30s while a preview exists, so one left open past its
  // expiry loses its save button without the user having to touch anything.
  useEffect(() => {
    if (!preview) return;
    const timer = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(timer);
  }, [preview]);

  useEffect(() => {
    if (!previewPending) return;
    setPendingSeconds(0);
    const started = Date.now();
    const timer = setInterval(() => setPendingSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [previewPending]);

  const canPreview =
    !previewPending && !saving && ruleFields.rule_id !== "" && ruleFields.category !== "" && ruleFields.phrases.length > 0;

  // Why Run preview is disabled, in plain words, shown beside it. Only for a
  // missing input -- never while a preview or save is in flight, which has
  // its own visible state. The rule ID case names Advanced options, so the
  // blocking field is never hidden in a collapsed section without saying so.
  const previewBlockedReason = (() => {
    if (previewPending || saving) return null;
    const missing = [
      ruleFields.phrases.length === 0 ? "a phrase" : null,
      ruleFields.category === "" ? "a category" : null,
    ].filter(Boolean);
    if (missing.length > 0) return `Add ${missing.join(" and ")} to preview.`;
    if (ruleFields.rule_id === "") {
      return "The category needs at least one letter to make a rule ID, or set one under Advanced options.";
    }
    return null;
  })();

  const runPreview = async () => {
    if (!canPreview) return;
    const seq = ++previewSeqRef.current;
    const key = currentKey;
    const fields = ruleFields;
    setPreview(null);
    setPreviewError(null);
    setSaveError(null);
    setAcknowledged(false);
    setPreviewPending(true);
    try {
      const response: PreviewResponse = await dashboardService.previewSuppressionRule({
        ...fields,
        ...previewParams,
        requested_by: getCreatorEmail(user),
      });
      if (seq !== previewSeqRef.current) return;
      // Anything without a token is not a preview that can be saved, however
      // the rest of the body reads.
      if (!response?.preview_token) {
        setPreviewError({
          status: 200,
          code: "unknown",
          message: "The server returned a preview without a preview token, so this rule cannot be saved. Run the preview again.",
        });
        return;
      }
      setPreview({
        key,
        ruleFields: fields,
        response: {
          ...response,
          warnings: Array.isArray(response.warnings) ? response.warnings : [],
          would_suppress: Array.isArray(response.would_suppress) ? response.would_suppress : [],
          held_back_by_activist_guard: Array.isArray(response.held_back_by_activist_guard)
            ? response.held_back_by_activist_guard
            : [],
          expected: Array.isArray(response.expected) ? response.expected : [],
        },
        receivedAt: Date.now(),
      });
      setNow(Date.now());
    } catch (error) {
      if (seq !== previewSeqRef.current) return;
      console.error("Suppression rule preview failed:", error);
      setPreviewError(parseApiError(error));
    } finally {
      if (seq === previewSeqRef.current) setPreviewPending(false);
    }
  };

  const resetForm = () => {
    setRuleIdOverride(null);
    setAdvancedOpen(false);
    setRuleIdBumped(false);
    setCategory("");
    setPhrasesText("");
    setGuardOn(true);
    setRequiresAllText("");
    setNotAfterText("");
    setExpectedText("");
    setWindowDays("");
    setSourceNote("");
    invalidatePreview();
  };

  // Sends the preview's own copy of the rule, so the rule saved is byte for
  // byte the rule that was previewed. One request per click, never retried.
  const saveRule = async () => {
    if (!canSave || !preview) return;
    setSaving(true);
    setSaveError(null);
    try {
      const rule = await dashboardService.createSuppressionRule({
        ...preview.ruleFields,
        preview_token: preview.response.preview_token,
        created_by: getCreatorEmail(user),
        source_note: sourceNote.trim() || undefined,
        acknowledge_risks: preview.response.requires_acknowledgement ? acknowledged : undefined,
      });
      toast.success(
        `Filter ${rule?.rule_id || preview.ruleFields.rule_id} saved. The monitor picks it up within about 20 seconds.`
      );
      resetForm();
      setTab("rules");
      await loadRules();
    } catch (error) {
      console.error("Failed to save suppression rule:", error);
      const parsed = parseApiError(error);
      setSaveError(parsed);
      if (STALE_PREVIEW_CODES.has(parsed.code)) {
        // The preview on screen can't be saved any more: drop it, and the
        // save button with it, so the only way forward is a fresh preview.
        previewSeqRef.current += 1;
        setPreview(null);
        setAcknowledged(false);
      } else if (parsed.code === "acknowledgement_required") {
        setAcknowledged(false);
      } else if (parsed.code === "rule_id_taken" && ruleIdOverride === null && !ruleIdBumped) {
        // Someone took the generated ID after the list loaded. Move to the
        // next free one, once. It can't be saved straight away: the preview
        // token covers the rule ID, so the server would answer
        // preview_token_mismatch -- and re-previewing behind the user's back
        // would put a result on screen she never ran. So the preview is
        // dropped and she runs it again on the new ID. A second clash is
        // shown as it is.
        const takenId = preview.ruleFields.rule_id;
        const nextId = deriveRuleId(category, new Set([...takenRuleIds, takenId]));
        setExtraTakenIds((prev) => [...prev, takenId]);
        setRuleIdBumped(true);
        previewSeqRef.current += 1;
        setPreview(null);
        setAcknowledged(false);
        setRuleIdNotice(`"Saved as" has been changed to ${nextId}. Run the preview again, then save.`);
      }
    } finally {
      setSaving(false);
    }
  };

  // An error naming a field that lives in Advanced opens it, so the message
  // never points at something hidden. (A rule_id error needn't: it shows
  // under "Saved as", outside Advanced.)
  useEffect(() => {
    const field = (saveError || previewError)?.field;
    if (field && ["requires_all_of", "not_after", "window_days"].includes(field)) setAdvancedOpen(true);
  }, [saveError, previewError]);

  const dangerWarnings = isPreviewCurrent ? preview.response.warnings.filter((w) => w.level === "danger") : [];
  const filingsByAccession = useMemo(() => {
    const map = new Map<string, PreviewFiling>();
    if (preview) {
      [...preview.response.would_suppress, ...preview.response.held_back_by_activist_guard].forEach((filing) => {
        if (filing?.accession_number) map.set(filing.accession_number, filing);
      });
    }
    return map;
  }, [preview]);

  const fieldError = (name: string): string | null => {
    const error = saveError || previewError;
    return error?.field === name ? error.message : null;
  };

  const busy = saving;
  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    // No close on backdrop click: a half-written rule and its preview would be
    // lost to a stray click. The X and Close are the only ways out.
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div
        style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 1080, height: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden" }}
      >
        {/* Header: title, tabs, close. Never scrolls. */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 pt-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800">Suppression filters</h2>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              A filing that matches an enabled filter is held instead of emailed, and shows as "Held by filter" in the table.
            </p>
            <div className="mt-3 flex gap-1">
              {(["rules", "add"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-t-md border-b-2 px-3 py-2 text-[13px] font-semibold ${
                    tab === key ? "border-current text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                  style={tab === key ? { color: THEME_MAROON } : undefined}
                >
                  {key === "rules" ? "Filters" : "Add a filter"}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            title="Close"
            aria-label="Close"
            className="self-start text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <Lucide icon="X" className="h-5 w-5" />
          </button>
        </div>

        {/* Danger warnings live here, between the header and the scrolling
            body, so no amount of scrolling through the results moves them. */}
        {tab === "add" && dangerWarnings.length > 0 && (
          <div className="shrink-0">
            <DangerWarnings warnings={dangerWarnings} filingsByAccession={filingsByAccession} />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === "rules" ? (
            <div className="flex flex-col gap-8">
              {rulesError && (
                <div>
                  <ErrorBox error={rulesError} />
                  <button type="button" onClick={loadRules} className="mt-2 text-[13px] font-semibold underline" style={{ color: THEME_MAROON }}>
                    Try again
                  </button>
                </div>
              )}

              {rulesLoading && !rulesError ? (
                <div className="flex items-center gap-2 text-[13px] text-slate-500">
                  <Lucide icon="Loader" className="h-4 w-4 animate-spin" />
                  Loading filters…
                </div>
              ) : (
                !rulesError && (
                  <>
                    <section>
                      <SectionHeading
                        title="Filters added on this page"
                        count={rules.length}
                        subtitle={`${enabledCount} on, ${rules.length - enabledCount} off. Filters are never deleted: switching one off stops it, and it can be switched back on.`}
                      />
                      {rules.length === 0 ? (
                        <p className="text-[13px] text-slate-500">
                          None yet. Use "Add a filter" to create one; it has to be previewed before it can be saved.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {rules.map((rule) => {
                            const historyOpen = openHistory.has(rule.rule_id);
                            const history = Array.isArray(rule.history) ? rule.history : [];
                            return (
                              <li
                                key={rule.rule_id}
                                className={`rounded-lg border p-4 ${rule.enabled ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"}`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`font-mono text-[13.5px] font-semibold ${rule.enabled ? "text-slate-900" : "text-slate-500"}`}>
                                        {rule.rule_id}
                                      </span>
                                      {rule.enabled ? (
                                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-emerald-800">On</span>
                                      ) : (
                                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-slate-600">Off</span>
                                      )}
                                    </div>
                                    <p className={`mt-0.5 text-[13px] ${rule.enabled ? "text-slate-700" : "text-slate-500"}`}>{rule.category}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openToggle(rule)}
                                    className={`shrink-0 rounded-md border px-3 py-1.5 text-[12.5px] font-semibold ${
                                      rule.enabled
                                        ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                        : "border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50"
                                    }`}
                                  >
                                    {rule.enabled ? "Switch off" : "Switch on"}
                                  </button>
                                </div>

                                <div className="mt-3">
                                  <RuleDetailRows rule={rule} muted={!rule.enabled} />
                                </div>

                                <div className="mt-3 text-[12px] text-slate-500">
                                  Created by {rule.created_by} on {formatDateTime(rule.created_at)}
                                  {rule.updated_at && rule.updated_at !== rule.created_at && rule.updated_by
                                    ? ` · last changed by ${rule.updated_by} on ${formatDateTime(rule.updated_at)}`
                                    : ""}
                                </div>
                                {rule.source_note && (
                                  <p className="mt-1 text-[12.5px] text-slate-600">
                                    <span className="text-slate-500">Source note: </span>
                                    {rule.source_note}
                                  </p>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenHistory((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(rule.rule_id)) next.delete(rule.rule_id);
                                      else next.add(rule.rule_id);
                                      return next;
                                    })
                                  }
                                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700"
                                >
                                  <Lucide icon="History" className="h-3.5 w-3.5" />
                                  {historyOpen ? "Hide history" : `History (${history.length})`}
                                </button>
                                {historyOpen && (
                                  <ol className="mt-2 flex flex-col gap-1 border-l-2 border-slate-200 pl-3">
                                    {history.map((event) => (
                                      <li key={event.id} className="text-[12px] text-slate-600">
                                        <span className="font-semibold capitalize text-slate-800">{event.action}</span> by {event.actor} on{" "}
                                        {formatDateTime(event.at)}
                                        {event.note ? <span className="text-slate-500">: {event.note}</span> : null}
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>

                    <section>
                      <SectionHeading
                        title="Built-in rules"
                        count={codeRules.length}
                        subtitle="Part of the monitor's code. They always apply and can't be changed or switched off here; listed so the whole picture is in one place."
                      />
                      <ul className="flex flex-col gap-2">
                        {codeRules.map((rule) => (
                          <li key={rule.rule_id} className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[13px] font-semibold text-slate-700">{rule.rule_id}</span>
                              <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                                <Lucide icon="Lock" className="h-3 w-3" />
                                Built-in
                              </span>
                              <span className="text-[12.5px] text-slate-600">{rule.category}</span>
                            </div>
                            <div className="mt-2">
                              <RuleDetailRows rule={rule} muted />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </>
                )
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* The four fields an analyst fills in: phrases, the filing that
                  prompted it, category and the guard -- plus the source note,
                  which is outside the fieldset because it isn't a rule field and
                  editing it leaves the preview standing. Everything else is in
                  Advanced, collapsed, and has a working default. */}
              <fieldset disabled={previewPending || saving} className="flex flex-col gap-5">
                <label className="block">
                  <span className="mb-1 block text-[15px] font-bold text-slate-800">
                    Words from the filing. Paste the sentence you want excluded — one per line.
                  </span>
                  <textarea
                    value={phrasesText}
                    onChange={(e) => editField(setPhrasesText)(e.target.value)}
                    rows={5}
                    placeholder="acquired as an investment and not with the intent of acquiring control"
                    className={`${inputClass} !px-3 !py-2.5 !text-[14.5px] leading-relaxed`}
                  />
                  <span className="mt-1 block text-[12px] text-slate-500">
                    A filing is held when its Item 4 contains one of these lines. Each line at least two words; up to 20 lines.
                  </span>
                  {fieldError("phrases") && <span className="mt-1 block text-[12px] text-red-700">{fieldError("phrases")}</span>}
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">The filing that prompted this (optional)</span>
                  <textarea
                    value={expectedText}
                    onChange={(e) => editField(setExpectedText)(e.target.value)}
                    rows={2}
                    placeholder="Paste the SEC link, or the accession number"
                    className={inputClass}
                  />
                  <span className="mt-1 block text-[11.5px] text-slate-500">
                    The preview then tells you whether this filter catches it. A link or an accession number both work; one per line for several.
                  </span>
                  {filingRefs.accessions.length > 0 && (
                    <span className="mt-1 block text-[11.5px] text-slate-600">
                      Will check: <span className="font-mono">{filingRefs.accessions.join(", ")}</span>
                    </span>
                  )}
                  {filingRefs.unparsed.length > 0 && (
                    <span className="mt-1 block text-[12px] text-amber-700">
                      No accession number found in: {filingRefs.unparsed.join(", ")}. That line won't be checked.
                    </span>
                  )}
                  {fieldError("expected_accessions") && (
                    <span className="mt-1 block text-[12px] text-red-700">{fieldError("expected_accessions")}</span>
                  )}
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Category</span>
                  <input
                    value={category}
                    onChange={(e) => editField(setCategory)(e.target.value)}
                    list="suppression-category-suggestions"
                    placeholder="Pick an existing category or type a new one"
                    maxLength={80}
                    className={inputClass}
                  />
                  <datalist id="suppression-category-suggestions">
                    {categorySuggestions.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                  <span className="mt-1 block text-[11.5px] text-slate-500">
                    Shown in the held reason: Not sent — Item 4 contains "…" ({category.trim() || "category"}).
                  </span>
                  {fieldError("category") && <span className="mt-1 block text-[12px] text-red-700">{fieldError("category")}</span>}
                  {ruleFields.rule_id && (
                    <span className="mt-1 block text-[11.5px] text-slate-500">
                      Saved as: <span className="font-mono text-slate-700">{ruleFields.rule_id}</span>
                    </span>
                  )}
                  {fieldError("rule_id") && <span className="mt-1 block text-[12px] text-red-700">{fieldError("rule_id")}</span>}
                </label>

                <div className="rounded-md border border-slate-200 bg-slate-50/60 px-3.5 py-3">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={guardOn}
                      onChange={(e) => handleGuardChange(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-[13px] leading-relaxed text-slate-700">
                      <span className="font-semibold">Activist guard (recommended)</span>: stand down on any filing that talks about
                      nominating or removing directors, or making demands, so a real campaign is never silenced by this filter.
                    </span>
                  </label>
                  {!guardOn && (
                    <p className="mt-2 text-[12.5px] font-semibold text-red-700">
                      The guard is OFF. This filter will also silence filings that talk about directors or demands.
                    </p>
                  )}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Source note (optional)</span>
                <textarea
                  value={sourceNote}
                  onChange={(e) => setSourceNote(e.target.value)}
                  disabled={saving}
                  rows={2}
                  placeholder="Who asked and why, e.g. Cassidy, 5 Oct, Constitution Capital"
                  className={inputClass}
                />
                <span className="mt-1 block text-[11.5px] text-slate-500">Kept with the filter, so anyone can see later why it exists.</span>
              </label>

              <div className="rounded-md border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((open) => !open)}
                  aria-expanded={advancedOpen}
                  className="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-slate-600 hover:text-slate-800"
                >
                  <Lucide icon={advancedOpen ? "ChevronDown" : "ChevronRight"} className="h-4 w-4" />
                  Advanced options
                  {!advancedOpen && <span className="font-normal text-slate-400">: rule ID, extra conditions, replay window</span>}
                </button>
                {advancedOpen && (
              <fieldset disabled={previewPending || saving} className="grid grid-cols-1 gap-4 border-t border-slate-200 px-3.5 py-3.5 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Rule ID</span>
                  <input
                    // The box shows what was typed, so it can be cleared; a
                    // cleared box falls back to the generated id, shown as
                    // the placeholder and on the "Saved as" line.
                    value={ruleIdOverride ?? generatedRuleId}
                    placeholder={generatedRuleId}
                    onChange={(e) => editField(setRuleIdOverride)(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                  <span className="mt-1 block text-[11.5px] text-slate-500">
                    Generated from the category. Lower-case letters, digits and underscores, starting with a letter. Permanent: it can never be reused.
                    {!!ruleIdOverride?.trim() && (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => editField(setRuleIdOverride)(null)}
                          className="font-semibold underline"
                          style={{ color: THEME_MAROON }}
                        >
                          Use the generated ID
                        </button>
                      </>
                    )}
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Also requires, one per line (optional)</span>
                  <textarea
                    value={requiresAllText}
                    onChange={(e) => editField(setRequiresAllText)(e.target.value)}
                    rows={3}
                    className={`${inputClass} font-mono`}
                  />
                  <span className="mt-1 block text-[11.5px] text-slate-500">Every one of these must also appear in Item 4. Up to 10.</span>
                  {fieldError("requires_all_of") && <span className="mt-1 block text-[12px] text-red-700">{fieldError("requires_all_of")}</span>}
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Cancelled when right after, one per line (optional)</span>
                  <textarea
                    value={notAfterText}
                    onChange={(e) => editField(setNotAfterText)(e.target.value)}
                    rows={3}
                    placeholder="will be"
                    className={`${inputClass} font-mono`}
                  />
                  <span className="mt-1 block text-[11.5px] text-slate-500">
                    Words that cancel a phrase match when they come right before it. Up to 10.
                  </span>
                  {fieldError("not_after") && <span className="mt-1 block text-[12px] text-red-700">{fieldError("not_after")}</span>}
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Replay window, days (optional)</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={windowDays}
                    onChange={(e) => editField(setWindowDays)(e.target.value)}
                    placeholder="120"
                    className={inputClass}
                  />
                  <span className="mt-1 block text-[11.5px] text-slate-500">How far back the preview looks. 1 to 365; 120 if left blank.</span>
                  {fieldError("window_days") && <span className="mt-1 block text-[12px] text-red-700">{fieldError("window_days")}</span>}
                </label>
              </fieldset>
                )}
              </div>

              {/* The preview area. Exactly one of: pending, failure, a current
                  result, an expired result, or the prompt to run one. */}
              <div className="border-t border-slate-200 pt-5">
                {previewPending ? (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-[13.5px] text-slate-700">
                    <Lucide icon="Loader" className="h-5 w-5 shrink-0 animate-spin" style={{ color: THEME_MAROON }} />
                    <span>
                      Replaying this rule against the stored filings… {pendingSeconds > 0 ? `${pendingSeconds}s` : ""}
                      <span className="block text-[12px] text-slate-500">This usually takes a few seconds. The form is locked until it finishes.</span>
                    </span>
                  </div>
                ) : previewError ? (
                  <ErrorBox error={previewError} />
                ) : isPreviewCurrent && isPreviewExpired ? (
                  <div className="flex gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-900">
                    <Lucide icon="Clock" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      This preview is more than {preview.response.expires_in_hours} hours old and can no longer be saved. Run the preview
                      again to see what the rule would do now.
                    </span>
                  </div>
                ) : isPreviewCurrent ? (
                  <PreviewResults preview={preview.response} guardOn={preview.ruleFields.stands_down_on_activist_language} />
                ) : (
                  <p className="text-[13px] text-slate-500">
                    Run the preview to see every filing this rule would silence. The save button appears only after a preview, and
                    any change to the rule clears it.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer for the Add tab: never scrolls, so the acknowledgement and
            the save button are always where the user can see them. */}
        {tab === "add" && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3">
            {saveError && <ErrorBox error={saveError} className="mb-3" />}
            {ruleIdNotice && <p className="-mt-1 mb-3 text-[13px] font-semibold text-slate-700">{ruleIdNotice}</p>}

            {needsAcknowledgement && (
              <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded-md border border-red-300 bg-red-50 px-3.5 py-2.5">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  disabled={saving}
                  className="mt-0.5"
                />
                <span className="text-[13px] leading-relaxed text-red-900">
                  I have read the warnings above and every filing listed, and I accept that saving this filter will silence them.
                </span>
              </label>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {previewBlockedReason && (
                <span role="status" className="mr-auto inline-flex items-center gap-1.5 text-[12.5px] text-slate-600">
                  <Lucide icon="Info" className="h-4 w-4 shrink-0 text-slate-400" />
                  {previewBlockedReason}
                </span>
              )}
              <button type="button" onClick={handleClose} disabled={busy} style={secondaryButtonStyle}>
                Close
              </button>
              <button
                type="button"
                onClick={runPreview}
                disabled={!canPreview}
                style={canShowSave ? { ...secondaryButtonStyle, opacity: canPreview ? 1 : 0.5, cursor: canPreview ? "pointer" : "not-allowed" } : primaryButtonStyle(!canPreview)}
              >
                {previewPending && <Lucide icon="Loader" className="h-4 w-4 animate-spin" />}
                {previewPending ? "Previewing…" : isPreviewCurrent || previewError ? "Run preview again" : "Run preview"}
              </button>
              {/* Not disabled-until-ready: absent until a current, unexpired
                  preview is on screen. */}
              {canShowSave && (
                <button type="button" onClick={saveRule} disabled={!canSave} style={primaryButtonStyle(!canSave)}>
                  {saving && <Lucide icon="Loader" className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving…" : "Save filter"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {guardConfirmOpen && (
        <ConfirmDialog onBackdrop={() => setGuardConfirmOpen(false)} maxWidth={500}>
          <h3 className="mb-3 text-[16px] font-bold text-slate-900">Turn off the activist guard?</h3>
          <p className="mb-3 text-[13.5px] leading-relaxed text-slate-700">
            The guard stops this filter from firing on any filing that talks about <strong>nominating or removing directors</strong>,
            or <strong>making demands</strong> of the company. Those are the signs of a real activist campaign.
          </p>
          <p className="mb-5 text-[13.5px] leading-relaxed text-red-800">
            With the guard off, this filter will silence those filings too. A genuine campaign could be held back and nobody emailed
            about it. The preview will list every filing the guard is currently saving.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setGuardConfirmOpen(false);
                editField(setGuardOn)(false);
              }}
              style={{ ...secondaryButtonStyle, color: "#b91c1c" }}
            >
              Turn the guard off
            </button>
            <button type="button" onClick={() => setGuardConfirmOpen(false)} style={primaryButtonStyle(false)}>
              Keep the guard on
            </button>
          </div>
        </ConfirmDialog>
      )}

      {toggleTarget && (
        <ConfirmDialog onBackdrop={closeToggle}>
          <h3 className="mb-3 text-[16px] font-bold text-slate-900">
            {toggleTarget.enabled ? "Switch off" : "Switch on"} <span className="font-mono">{toggleTarget.rule_id}</span>?
          </h3>
          <p className="mb-4 text-[13.5px] leading-relaxed text-slate-700">
            {toggleTarget.enabled
              ? "Filings matching it will be emailed again from the monitor's next check, about 20 seconds from now. It stays listed and can be switched back on."
              : "Filings matching it will be held instead of emailed from the monitor's next check, about 20 seconds from now. It goes live as it was previewed when created."}
          </p>
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Note (optional, kept in the history)</span>
            <input value={toggleNote} onChange={(e) => setToggleNote(e.target.value)} disabled={toggleSaving} className={inputClass} />
          </label>
          {toggleError && <ErrorBox error={toggleError} className="mb-4" />}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeToggle} disabled={toggleSaving} style={secondaryButtonStyle}>
              Cancel
            </button>
            <button type="button" onClick={confirmToggle} disabled={toggleSaving} style={primaryButtonStyle(toggleSaving)}>
              {toggleSaving && <Lucide icon="Loader" className="h-4 w-4 animate-spin" />}
              {toggleSaving ? "Saving…" : toggleTarget.enabled ? "Switch off" : "Switch on"}
            </button>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default SuppressionFiltersPanel;
