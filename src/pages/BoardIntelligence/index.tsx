import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  AlertTriangle, ChevronDown, ChevronRight, Download, ExternalLink, FileText, Info, Loader2, RefreshCw, Search, Users,
} from "lucide-react";
import * as XLSX from "xlsx";
// The FastAPI base URL lives in one place (the AI Assistant's environment switch).
import { AI_CHATBOT_API_BASE, getRequestHeaders } from "@/pages/AIChatbot/api";
import Button from "@/components/Base/Button";
import { baseURL } from "@/constant";
import { dashboardService } from "@/services/dashboard";
import { useAppSelector } from "@/stores/hooks";
import { createDynamicURL } from "@/utils/helper";

const BRAND = "#931638";
const POLL_MS = 4000;

// ─── In-memory caches ─────────────────────────────────────────────────────────────────────
// A result is 0.3-1 MB, too large for localStorage: kept in memory only, so switching back to a
// company within the TTL renders at once without a request.
const CACHE_TTL_MS = 30 * 60 * 1000;
const resultCache = new Map<string, { result: BoardResult; at: number }>();

const cachedResult = (cik: string) => {
  const hit = resultCache.get(cik);
  return hit && Date.now() - hit.at < CACHE_TTL_MS ? hit.result : null;
};
const cacheResult = (cik: string, result: BoardResult) => resultCache.set(cik, { result, at: Date.now() });

// ─── Formatting ───────────────────────────────────────────────────────────────────────────

/** One date format everywhere, American style: "2024-04-30" -> "April 30, 2024". A printed date
 *  ("Wednesday, May 25, 2022") keeps its words and loses only the weekday. */
const usDate = (s: string | null | undefined) => {
  if (!s) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!iso) return s.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/i, "");
  return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]))
    .toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
};

const SMALL_WORDS = new Set(["and", "of", "the", "for", "on", "to"]);

/** "nominees for director" -> "Nominees for Director": each word capitalised except the small words. */
const titleCase = (s: string) =>
  s.replace(/[A-Za-z][A-Za-z'’]*/g, (w: string, at: number) =>
    at > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1));

/** "Duke Energy Corporation (Independent Chair, corporate governance committee chair)" ->
 *  "... (Independent Chair, Corporate Governance Committee Chair)": the company name stays as
 *  printed; the role in parentheses is title-cased. */
const formatBoard = (board: string) => board.replace(/\(([^)]*)\)/g, (_, role: string) => `(${titleCase(role)})`);

/** "retired Chief Executive Officer" -> "Retired Chief Executive Officer": a position copied from
 *  the middle of a proxy sentence starts lower-case. */
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Year-on-year vote support (the dashboard's Django /voting_report_8k/) ────────────────

type YearRow = Record<string, string | number | null | undefined>;
type YearOnYear = { years: string[]; nominees: YearRow[]; proposals: YearRow[] };

/** The last three years' support per nominee and proposal, from the same request (and request
 *  cache) the dashboard's AGM card makes. Only on the dashboard: the standalone page has no id. */
function useYearOnYear(companyId?: number | string) {
  const totalYears = useAppSelector((s) => s.dashboard.agmSummaryDetails?.total_year);
  const [data, setData] = useState<{ raw: { total_year?: unknown; nominees: YearRow[]; proposals: YearRow[] } | null; loading: boolean }>(
    { raw: null, loading: false });

  useEffect(() => {
    if (!companyId) { setData({ raw: null, loading: false }); return; }
    let cancelled = false;
    setData({ raw: null, loading: true });
    dashboardService
      .fetchAGMSummaryDashboard(createDynamicURL(`${baseURL}/voting_report_8k/`, {
        company_id: companyId,
        include_all_years_data: "true",
      }))
      .then((response) => {
        if (cancelled) return;
        const y = response?.results?.meeting_details_years_data;
        setData({
          raw: y ? { total_year: response.results.total_year, nominees: y.nominees || [], proposals: y.proposals || [] } : null,
          loading: false,
        });
      })
      .catch(() => { if (!cancelled) setData({ raw: null, loading: false }); });
    return () => { cancelled = true; };
  }, [companyId]);

  const yoy = useMemo<YearOnYear | null>(() => {
    const raw = data.raw;
    if (!raw || (!raw.nominees.length && !raw.proposals.length)) return null;
    // this response's own years first: the store's copy can still be the previous company's
    const listed = Array.isArray(raw.total_year) && raw.total_year.length ? raw.total_year
      : Array.isArray(totalYears) && totalYears.length ? totalYears
      : [...raw.nominees, ...raw.proposals].flatMap((r) => Object.keys(r).filter((k) => /^\d{4}$/.test(k)));
    const years = Array.from(new Set(listed.map(String))).sort((a, b) => Number(b) - Number(a)).slice(0, 3);
    return years.length ? { years, nominees: raw.nominees, proposals: raw.proposals } : null;
  }, [data.raw, totalYears]);

  return { yoy, loading: data.loading };
}

const supportText = (v: YearRow[string]) =>
  v == null || v === "" ? <span className="text-gray-400">—</span> : String(v);

/** Boxed sub-tabs, as the dashboard's AGM card shows "Latest" / "Year-on-Year Comparison". */
function BoxedTabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(([key, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)}
                className={`whitespace-nowrap rounded-[0.6rem] px-4 py-1.5 text-sm font-medium border ${
                  value === key ? "bg-red-800 border-red-800 text-white" : "text-primary bg-primary/10 border-primary/10"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Backend: /api/board-intel ─────────────────────────────────────────────────────────────

const BASE = `${AI_CHATBOT_API_BASE}/api/board-intel`;

export type CompanyHit = { cik: string; ticker: string; name: string };

type Check = { check: string; status: "ok" | "warn"; detail: string };

type DirectorFacts = {
  current_position?: string | null;
  age?: number | null;
  age_source?: string;
  director_since?: string | null;
  director_since_year?: number | null;
  director_since_source?: string;
  independent?: boolean | null;
  board_roles?: string[];
  committees?: string[];
  committee_chairs?: string[];
  other_public_boards?: string[];
  former_public_boards?: string[];
  designated_by?: string | null;
  error?: string;
};

type Director = {
  name: string;
  bio_html: string;
  bio_text: string;
  facts: DirectorFacts;
  recovered_by_surname?: boolean;
  /** not in the proxy: joined the board after it was filed, by the 8-K Item 5.02 named here */
  joined_after_proxy?: { form: string; filing_date: string; effective_date: string; url: string; website_url?: string } | null;
  /** in the proxy, but has left the board since, as the 8-K named here says */
  left_after_proxy?: { date: string; how?: string | null; form: string; filing_date: string; url: string } | null;
};

type Matrix = {
  directors: string[];
  rows: { label: string; label_full: string; directors: string[] }[];
  unmatched_headers: string[];
  html: string;
  /** "image" when the proxy prints the matrix only as a picture and it was read from it */
  source?: "table" | "image";
  image_url?: string;
  /** every column's marks equal the totals the picture (or table) prints */
  totals_checked?: boolean;
  /** "ai" when the table's layout was read by AI and every mark checked against its cells */
  read_by?: "ai";
};

type Person = {
  name: string;
  role: string;
  action: string;
  position?: string | null;
  effective_date?: string | null;
};

type Exhibit = { type: string; description?: string; name: string; url: string; is_press_release?: boolean };

type Filing502 = {
  accession: string;
  form: string;
  filing_date: string;
  items: string[];
  url: string | null;
  index_url: string;
  primary_document: string | null;
  exhibits: Exhibit[];
  item_502_text: string | null;
  press_release_text: string | null;
  people: Person[];
  label: string;
  summary: string | null;
  error?: string;
};

type Appointment = {
  name: string;
  position?: string | null;
  effective_date?: string | null;
  announced?: string | null;
  director_since?: string | null;
  source_type: string;
  source: {
    accession?: string;
    filing_date?: string;
    url?: string | null;
    index_url?: string;
    press_release?: { name: string; url: string } | null;
    summary?: string | null;
    title?: string | null;
    date?: string | null;
    verified?: boolean;
    note?: string | null;
  } | null;
  related_filings: { accession: string; filing_date: string; url: string | null }[];
  in_proxy?: boolean;
  on_website?: boolean | null;
  note?: string;
};

/** A whole section of the proxy, cut from its own HTML ("as in proxy"). */
type ProxySection = {
  title: string;
  found: boolean;
  heading: string | null;
  html: string;
  end_estimated: boolean;
  /** "located" (pointed at by the reader) or "heading search" (found by its heading alone) */
  found_by?: string | null;
};

type PeerCompany = { name: string; ticker: string | null; exchange: string | null; cik: string | null };

type Committee = {
  name: string;
  /** the grid's column heading ("LDC") when read from a table */
  header: string | null;
  chair: string | null;
  members: string[];
  meetings: string | null;
  /** set when this list is itself one the proxy says takes effect later */
  effective: string | null;
  /** a later membership the proxy states; members null = only the chair changes */
  after_change: { effective: string | null; chair: string | null; members: string[] | null } | null;
};

type BoardCommittees = {
  source: "table" | "lists" | null;
  committees: Committee[];
  leadership: { chair_of_board?: string | null; lead_independent_director?: string | null; ceo?: string | null };
  /** committee members who are not among this proxy's nominees -- usually retiring at the meeting */
  not_nominees: string[];
  disagreements: { director: string; bio_says: string; committee_list: string[] }[];
  html: string;
};

type PeerGroups = {
  found: boolean;
  groups: {
    name: string;
    purpose: string | null;
    companies: PeerCompany[];
    stated_count: number | null;
    partial: boolean;
    added: string[];
    removed: string[];
  }[];
  excluded: { name: string; reason: string }[];
  html: string;
};

type VoteRow = {
  nominee: string | null;
  for: string | null;
  against: string | null;
  abstain: string | null;
  withheld: string | null;
  broker_non_votes: string | null;
  verified: boolean;
  support: { percent: number; formula: string; level: "ok" | "watch" | "low" | "info" } | null;
};

type VotingResults = {
  found: boolean;
  note: string | null;
  filing_date?: string;
  form?: string;
  accession?: string;
  url?: string;
  index_url?: string;
  primary_document?: string;
  meeting_date?: string | null;
  /** "the previous meeting" while the meeting this proxy is for has not been reported */
  meeting_scope?: string;
  support_formula?: string;
  proposals?: { number: string | null; title: string | null; kind: string; outcome: string | null; rows: VoteRow[] }[];
  html?: string;
};

type RefreshEvent = {
  name: string;
  date: string | null;
  date_note: string | null;
  how: string;
  source: { label: string; url: string | null; filing_date: string; summary?: string | null };
  on_board_now?: boolean;
};

type Refreshment = {
  window_start?: string;
  joined_count?: number;
  departed_count?: number;
  board_size_start?: number | null;
  board_size_start_date?: string | null;
  board_size_now?: number | null;
  net_change?: number | null;
  joined: RefreshEvent[];
  departed: RefreshEvent[];
  timeline: {
    meeting_date: string | null;
    meeting_iso: string;
    /** false when the 8-K prints no usable meeting date: meeting_iso is then only its filing date */
    meeting_date_known?: boolean;
    url: string;
    filing_date: string;
    elected_count: number;
    stated_count?: number | null;
    count_mismatch?: boolean;
    elected: string[];
    new_on_slate: string[];
    left_slate: string[];
  }[];
  note: string | null;
};

type BoardResult = {
  company: { cik: string; name: string; tickers: string[]; edgar_url: string };
  generated_at: string;
  duration_seconds: number;
  proxy: {
    accession: string;
    filing_date: string;
    url: string;
    index_url: string;
    directors: Director[];
    matrices: Matrix[];
    statements: Record<string, string | null>;
    /** nominees / proposals / qa -- absent on results generated before sections existed */
    sections?: Record<string, ProxySection>;
    /** compensation peer groups -- absent on results generated before peers existed */
    peers?: PeerGroups;
    /** board committees + leadership -- absent on results generated before committees existed */
    committees?: BoardCommittees;
    named_without_biography: string[];
    checks: Check[];
    skipped: string[];
  };
  website: {
    url: string | null;
    verified: boolean;
    /** bio_html: the member's profile cut from the website page (photo included); "" when the page has none */
    members: { name: string; title?: string | null; committees: string[]; bio_html?: string; bio_text?: string }[];
    compare: { both: string[]; proxy_only: string[]; website_only: string[] } | null;
    attempts: { url: string; final_url?: string; error?: string | null; proxy_directors_named?: number }[];
    note: string | null;
  };
  filings_502: { since: string; items: Filing502[]; counts: Record<string, number> };
  filings_502_five_years: { since: string; count: number; counts: Record<string, number> };
  appointments: { window_start: string; items: Appointment[] };
  /** 8-K Item 5.07 results of the meeting this proxy was for -- absent on older results */
  voting?: VotingResults;
  /** joins / departures / slates over the period -- absent on older results */
  refreshment?: Refreshment;
};

type RunStatus = {
  cik: string;
  state: "running" | "done" | "failed";
  stage?: string | null;
  stages?: { stage: string; at: number }[];
  error?: string;
  already_running?: boolean;
};

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: getRequestHeaders(), ...init });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail || detail;
    } catch {
      /* not JSON */
    }
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const searchCompanies = (q: string) =>
  getJson<{ results: CompanyHit[] }>(`${BASE}/companies?q=${encodeURIComponent(q)}`).then((r) => r.results);

const startRun = (cik: string) =>
  getJson<RunStatus>(`${BASE}/runs`, { method: "POST", body: JSON.stringify({ cik }) });

const getRunStatus = (cik: string) => getJson<RunStatus>(`${BASE}/runs/${cik}`);

const getResult = (cik: string) => getJson<BoardResult>(`${BASE}/results/${cik}`);

/** Our stored, sanitised copy of an SEC document (8-K, press release). */
const documentViewerUrl = (cik: string, accession: string, name: string) =>
  `${BASE}/documents/${cik}/${accession.replace(/\D/g, "")}/${encodeURIComponent(name)}`;

/** Image paths in stored HTML are relative to the API ("/api/board-intel/assets/..."). */
const absolutizeAssets = (html: string) =>
  html.replace(/(src=["'])(\/api\/board-intel\/)/g, `$1${AI_CHATBOT_API_BASE}$2`);

type Tab = "board" | "nominees" | "matrix" | "peers" | "refresh" | "website" | "filings" | "appointments" | "meeting";

// A website profile arrives without the site's stylesheet: keep its photo portrait-sized and
// let the text wrap beside it, as the site shows it.
const WEBSITE_PROFILE_CSS =
  "img{float:left;width:180px;max-width:40%;height:auto;margin:0 20px 12px 0}" +
  "body{font-size:15px;line-height:1.6;color:#222}h1,h2,h3,h4{color:#0b4a8b;margin:0 0 12px}";

// A proxy profile starts right under its card's header row: no frame padding or first-block
// margin above it.
/* A picture in a table cell keeps the width the proxy prints for it: a sidebar cell is often printed
 * "width:1%" and held open only by its photo, which max-width:100% lets shrink to a sliver (Delta 2026).
 * Pictures printed without a width still fit their cell. */
const PROXY_PROFILE_CSS = "body{padding-top:0}body>:first-child{margin-top:0!important}td img[style*=width]{max-width:none}";

/** Where a document's content really starts and ends, in px as drawn now. A proxy laid out as
 *  printed pages (Oracle, Walmart, United, Target) wraps each profile in a box one page tall, so
 *  the document is a page tall however short the profile, and the profile can sit well down that
 *  page (Target). These are the top of the first and the bottom of the last text, picture,
 *  coloured or ruled box instead. A picture or box at least 6in x 8in is the page's own border or
 *  background (Oracle's, United's), not content, so it does not count; a narrower page-tall
 *  picture (Walmart's career column) does. */
function contentBounds(doc: Document) {
  const view = doc.defaultView;
  if (!view) return null;
  let top = Infinity, bottom = 0;
  const take = (t: number, b: number) => { top = Math.min(top, t); bottom = Math.max(bottom, b); };
  const range = doc.createRange();
  const texts = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  while (texts.nextNode()) {
    if (!texts.currentNode.textContent?.trim()) continue;
    range.selectNodeContents(texts.currentNode);
    const r = range.getBoundingClientRect();
    if (r.height) take(r.top, r.bottom);
  }
  doc.body.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    // nothing drawn, or the page's own border or background (6in x 8in or more)
    if (!r.width || !r.height || (r.width >= 576 && r.height >= 768)) return;
    if (el.tagName === "IMG") {
      take(r.top, r.bottom);
      return;
    }
    const cs = view.getComputedStyle(el);
    const bg = cs.backgroundColor;
    const painted = bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "rgb(255, 255, 255)";
    const ruled = (side: "Top" | "Bottom") => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== "none"
      && cs[`border${side}Color`] !== "rgba(0, 0, 0, 0)";
    // a box drawn round the profile (United's) ends at its bottom border; one ruled across its top
    // (Wells Fargo's yellow line) starts there
    if (painted || ruled("Bottom") || ruled("Top")) take(r.top, r.bottom);
  });
  return top === Infinity ? null : { top: top + view.scrollY, bottom: bottom + view.scrollY };
}

// ─── A proxy's own HTML, isolated from the app's Tailwind reset ──────────────────────────
// Rendered in a sandboxed iframe: no scripts run (no allow-scripts); allow-same-origin only so
// the height can be measured. Links open in a new tab. `fit` starts and ends the frame where the
// content does (contentBounds) rather than at the edges of a page-tall box.
function DocFrame({ html, title, extraCss = "", fit = false }: { html: string; title: string; extraCss?: string; fit?: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  const srcDoc = useMemo(() => {
    const clean = DOMPurify.sanitize(absolutizeAssets(html), {
      FORBID_TAGS: ["script", "style", "iframe", "form", "input", "object", "embed"],
      ADD_ATTR: ["target"],
    });
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
      <style>body{margin:0;padding:8px;font-family:Arial,Helvetica,sans-serif;overflow-x:auto}img{max-width:100%;height:auto}${fit ? "html{overflow-y:hidden}" : ""}${extraCss}</style>
      </head><body>${clean}<div style="clear:both"></div></body></html>`;
  }, [html, extraCss, fit]);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | null = null;
    const measure = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      let h = doc.body.scrollHeight;
      const bounds = fit ? contentBounds(doc) : null;
      if (bounds) {
        // the page is moved up past any empty top; bounds are read as drawn, so add back the
        // shift already applied before working out the new one
        const applied = Number(doc.body.dataset.shift || 0);
        const top = bounds.top + applied, bottom = bounds.bottom + applied;
        const shift = top > 40 ? Math.floor(top - 8) : 0;
        doc.body.style.transform = shift ? `translateY(-${shift}px)` : "";
        doc.body.dataset.shift = String(shift);
        h = Math.min(doc.body.scrollHeight, Math.ceil(bottom)) - shift;
      }
      setHeight(Math.min(Math.max(h + 16, 80), 4000));
    };
    const onLoad = () => {
      measure();
      const body = frame.contentDocument?.body;
      if (body && "ResizeObserver" in window) {
        observer = new ResizeObserver(measure);
        observer.observe(body);
      }
    };
    frame.addEventListener("load", onLoad);
    return () => {
      frame.removeEventListener("load", onLoad);
      observer?.disconnect();
    };
  }, [srcDoc, fit]);

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="w-full border-0 bg-white"
      style={{ height }}
    />
  );
}

/** One neutral style for every pill: no green / amber / red status colours on this page. `tone`
 *  is still accepted from callers but no longer changes the colour. */
function Pill({ children }: { children: React.ReactNode; tone?: "gray" | "green" | "amber" | "red" | "brand" }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{children}</span>;
}

function SourceLink({ href, children }: { href?: string | null; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-center gap-1 text-xs text-[#931638] hover:underline">
      {children} <ExternalLink size={12} />
    </a>
  );
}

const labelTone = (label: string) =>
  label === "Director change" ? "brand" : label === "Officer change" ? "amber" : "gray";

// ─── Sections ─────────────────────────────────────────────────────────────────────────────

const directorAnchor = (name: string) => `director-${name.replace(/[^A-Za-z0-9]+/g, "-")}`;

/** A profile card; its whole header row opens and closes it. Age, tenure, independence, roles,
 *  position, committees and other boards are in the Board at a Glance table above, so the card
 *  shows the biography only. */
function DirectorCard({ d, open, onToggle }: { d: Director; open: boolean; onToggle: () => void }) {
  const f = d.facts || {};
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div id={directorAnchor(d.name)} className="border border-gray-200 rounded-lg overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open}
              className="w-full flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-left hover:bg-gray-100">
        <Chevron size={16} className="text-gray-700 shrink-0" />
        <span className="font-semibold text-base text-gray-900 mr-2">{d.name}</span>
        {/* only what the table above does not show */}
        {f.designated_by && <Pill>Designated By {f.designated_by}</Pill>}
      </button>
      {open && (d.bio_html
        ? <DocFrame html={d.bio_html} title={d.name} extraCss={PROXY_PROFILE_CSS} fit />
        : <div className="px-4 py-3 text-sm text-gray-800">The profile HTML could not be cut from the proxy.</div>)}
    </div>
  );
}

/** Board at a Glance column widths, the same for every company: a wide Director column (a name
 *  on one line), then Position, Committees and Other Public Boards at one equal width. */
const GLANCE_COLS = ["21%", "5%", "5.5%", "5.5%", "8%", "18.33%", "18.33%", "18.34%"];

/** The "i" next to a director whose row the proxy does not tell in full: hovering (or focusing)
 *  it opens a card with the title and source links given. The card is fixed to the window,
 *  so the table's scroll box does not clip it, and stays open while the pointer is on it. */
function InfoCard({ label, title, links, note }: {
  label: string; title: string; links: { href?: string | null; text: string }[]; note?: string;
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const hideTimer = useRef<number>();
  const show = (e: React.SyntheticEvent<HTMLElement>) => {
    window.clearTimeout(hideTimer.current);
    const r = e.currentTarget.getBoundingClientRect();
    setAt({ x: Math.min(r.left, window.innerWidth - 336), y: r.bottom + 6 });
  };
  const hide = () => { hideTimer.current = window.setTimeout(() => setAt(null), 150); };
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [at]);
  return (
    <>
      <button type="button" aria-label={label}
              onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
              className="shrink-0 rounded p-0.5 text-gray-500 hover:text-[#931638] hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#931638]/40">
        <Info size={15} />
      </button>
      {at && (
        <div role="tooltip" style={{ position: "fixed", left: at.x, top: at.y }}
             onMouseEnter={() => window.clearTimeout(hideTimer.current)} onMouseLeave={hide}
             className="z-50 w-80 rounded-lg border border-gray-200 bg-white p-3 text-left text-xs text-gray-800 shadow-lg">
          <div className="mb-2 text-sm font-semibold text-gray-900">{title}</div>
          {note && <p className="mb-2 text-gray-700">{note}</p>}
          <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2">
            {links.map((l) => <SourceLink key={l.text} href={l.href}>{l.text}</SourceLink>)}
          </div>
        </div>
      )}
    </>
  );
}

/** A director who joined after the proxy: the 8-K that appointed them and their website biography. */
function JoinedAfterProxy({ j }: { j: NonNullable<Director["joined_after_proxy"]> }) {
  return (
    <InfoCard label="Not in the proxy: where this director's details come from" title="Not in the Proxy Statement"
              links={[{ href: j.url, text: `${j.form}, filed ${usDate(j.filing_date)}` },
                      { href: j.website_url, text: "Biography on the Company Website" }]} />
  );
}

/** A proxy director who has since left the board: the 8-K that said so (the reason and date are
 *  printed under the name). */
function LeftAfterProxy({ l }: { l: NonNullable<Director["left_after_proxy"]> }) {
  return (
    <InfoCard label="Left the board after the proxy: the 8-K" title="Left the Board"
              links={[{ href: l.url, text: `${l.form}, filed ${usDate(l.filing_date)}` }]} />
  );
}

/** Surname and first initial: "Lynn V. Radakovich" and "Lynn Radakovich" are one person. */
const personKey = (name: string) => {
  const words = name.replace(/,?\s+(Jr|Sr|II|III|IV|M\.D|Ph\.D)\.?$/i, "").replace(/[.,]/g, " ").trim().split(/\s+/);
  return `${(words[words.length - 1] || "").toLowerCase()}|${(words[0] || "").charAt(0).toLowerCase()}`;
};

/** A proxy director the company's website does not list: where to check why -- the 8-K about
 *  them (their departure, else their latest board change), the website's board page, the proxy. */
function NotOnWebsite({ d, result }: { d: Director; result: BoardResult }) {
  const key = personKey(d.name);
  const event = [...(result.refreshment?.departed || []), ...(result.refreshment?.joined || [])]
    .filter((e) => personKey(e.name) === key && e.source?.url)
    .sort((a, b) => (b.source.filing_date || "").localeCompare(a.source.filing_date || ""))[0];
  const eightK = d.left_after_proxy
    ? { href: d.left_after_proxy.url, text: `${d.left_after_proxy.form}, filed ${usDate(d.left_after_proxy.filing_date)}` }
    : event ? { href: event.source.url, text: event.source.label } : null;
  const note = d.left_after_proxy
    ? `${d.left_after_proxy.how || "Left the board"} ${usDate(d.left_after_proxy.date)}.`
    : event ? `${event.how}${event.date ? ` ${usDate(event.date)}` : ""}.`
    : "No 8-K about this director's board seat was found since the proxy.";
  return (
    <InfoCard label="Not on the company website: the filings" title="Not on the Company Website" note={note}
              links={[...(eightK ? [eightK] : []),
                      { href: result.website?.url, text: "Company Board Page" },
                      { href: result.proxy.url, text: "Proxy Statement" }]} />
  );
}

/** The whole board in one table, readable in one go; a name jumps to that director's profile. */
function BoardAtAGlance({ directors, onOpen, result }: { directors: Director[]; onOpen: (name: string) => void; result: BoardResult }) {
  const notOnSite = new Set(result.website?.compare?.proxy_only || []);
  const thisYear = new Date().getFullYear();
  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="text-sm w-full min-w-[1000px] table-fixed text-gray-900">
        <colgroup>{GLANCE_COLS.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
        <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
          <tr>
            <th className="p-2">Director</th><th className="p-2">Age</th><th className="p-2">Since</th><th className="p-2">Tenure</th>
            <th className="p-2">Independent</th>
            <th className="p-2">Position</th><th className="p-2">Committees</th><th className="p-2">Other Public Boards</th>
          </tr>
        </thead>
        <tbody>
          {directors.map((d) => {
            const f = d.facts || {};
            return (
              <tr key={d.name} className="border-t border-gray-100 align-top">
                <td className="p-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    {/* one line: a name longer than the column ends in "…", the whole name on hover */}
                    <button onClick={() => onOpen(d.name)} title={d.name}
                            className="font-medium text-left text-[#931638] hover:underline truncate min-w-0">{d.name}</button>
                    {d.joined_after_proxy && <JoinedAfterProxy j={d.joined_after_proxy} />}
                    {notOnSite.has(d.name)
                      ? <NotOnWebsite d={d} result={result} />
                      : d.left_after_proxy && <LeftAfterProxy l={d.left_after_proxy} />}
                  </span>
                  {!!(f.board_roles || []).length && <div className="text-xs text-gray-900">{(f.board_roles || []).join(", ")}</div>}
                  {d.left_after_proxy && (
                    <div className="text-xs text-gray-600">Left the board · {d.left_after_proxy.how || "Left"} {usDate(d.left_after_proxy.date)}</div>
                  )}
                </td>
                <td className="p-2 whitespace-nowrap">{f.age ?? <span className="text-gray-400">—</span>}</td>
                <td className="p-2 whitespace-nowrap">{f.director_since_year || f.director_since || <span className="text-gray-400">—</span>}</td>
                <td className="p-2 whitespace-nowrap">
                  {/* joined this year: "New", not "0 yr" */}
                  {f.director_since_year
                    ? (thisYear - f.director_since_year < 1 ? "New" : `${thisYear - f.director_since_year} yr`)
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="p-2">{f.independent === true ? "Yes" : f.independent === false ? "No" : <span className="text-gray-400">—</span>}</td>
                <td className="p-2">{f.current_position ? capFirst(f.current_position) : <span className="text-gray-400">—</span>}</td>
                <td className="p-2">{(f.committees || []).join("; ") || <span className="text-gray-400">—</span>}</td>
                <td className="p-2">
                  {(f.other_public_boards || []).length
                    ? (f.other_public_boards || []).map((b) => <div key={b}>{formatBoard(b)}</div>)
                    : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type ProfileView = "proxy" | "website";

function BoardTab({ result }: { result: BoardResult }) {
  // alphabetical by the name as shown, in the table and the profiles alike
  const directors = useMemo(
    () => [...result.proxy.directors].sort((a, b) => a.name.localeCompare(b.name)), [result.proxy.directors]);
  const members = result.website?.members || [];
  const hasWebsite = members.length > 0;
  const [view, setView] = useState<ProfileView>("proxy");
  // Proxy profiles start open; Collapse all closes them.
  const [openNames, setOpenNames] = useState<Set<string>>(() => new Set(result.proxy.directors.map((d) => d.name)));
  // Website profiles start open too.
  const [openSite, setOpenSite] = useState<Set<string>>(
    () => new Set((result.website?.members || []).filter((m) => m.bio_html).map((m) => m.name)));

  const names = view === "proxy" ? directors.map((d) => d.name) : members.filter((m) => m.bio_html).map((m) => m.name);
  const openSet = view === "proxy" ? openNames : openSite;
  const setOpenSet = view === "proxy" ? setOpenNames : setOpenSite;
  const allOpen = names.length > 0 && names.every((n) => openSet.has(n));
  const toggleIn = (set: typeof setOpenNames) => (name: string) => set((s) => {
    const n = new Set(s);
    if (n.has(name)) n.delete(name); else n.add(name);
    return n;
  });
  const openAndJump = (name: string) => {
    setView("proxy");
    setOpenNames((s) => new Set(s).add(name));
    window.setTimeout(() => {
      const card = document.getElementById(directorAnchor(name));
      if (!card) return;
      // the dashboard's sticky headers (the company bar and the "Company > Board Intelligence" bar,
      // both .header-card) cover the top of the window: the card stops just below the lower one
      const covered = Math.max(0, ...Array.from(document.querySelectorAll(".header-card"), (el) => el.getBoundingClientRect().bottom));
      card.style.scrollMarginTop = `${covered + 12}px`;
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  return (
    <div className="space-y-4">
      {!!result.proxy.named_without_biography.length && (
        <p className="text-sm text-gray-800">Named in the proxy without a biography: {result.proxy.named_without_biography.join(", ")}</p>
      )}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">The Board at a Glance</h3>
        <BoardAtAGlance directors={directors} onOpen={openAndJump} result={result} />
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <BoxedTabs<ProfileView>
          tabs={hasWebsite ? [["proxy", "Full Profiles (Proxy)"], ["website", "Website Comparison"]] : [["proxy", "Full Profiles (Proxy)"]]}
          value={view} onChange={setView} />
        {!!names.length && (
          <Button variant="primary" size="sm" className="ml-auto bg-red-800 hover:bg-red-900 text-white"
                  onClick={() => setOpenSet(allOpen ? new Set() : new Set(names))}>
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        )}
      </div>
      {view === "proxy" && directors.map((d) => (
        <DirectorCard key={d.name} d={d} open={openNames.has(d.name)} onToggle={() => toggleIn(setOpenNames)(d.name)} />
      ))}
      {view === "website" && hasWebsite && <WebsiteSection result={result} open={openSite} onToggle={toggleIn(setOpenSite)} />}
    </div>
  );
}

/** A committee's latest membership: the change the proxy states once its date has passed,
 *  otherwise today's list (whose members not standing again are retiring). */
function latestMembership(c: Committee) {
  const ac = c.after_change;
  const effectiveAt = ac?.effective ? Date.parse(ac.effective) : NaN;
  if (ac && !Number.isNaN(effectiveAt) && effectiveAt <= Date.now()) {
    return { chair: ac.chair ?? c.chair, members: ac.members ?? c.members, effective: ac.effective, changed: true };
  }
  return { chair: c.chair, members: c.members, effective: c.effective, changed: false };
}

/** Board committees: who chairs each, who serves, how often it met -- and the board's leadership. */
function CommitteesSection({ data, proxyUrl }: { data?: BoardCommittees; proxyUrl: string }) {
  const [showDoc, setShowDoc] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  if (!data) return <p className="text-sm text-gray-700">Board committees: not read for this result yet.</p>;
  const lead = data.leadership || {};
  const leaving = new Set(data.not_nominees || []);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold text-gray-900">Board Committees</h3>
        <span className="ml-auto"><SourceLink href={proxyUrl}>Source: Proxy Statement (SEC)</SourceLink></span>
      </div>

      <div className="text-sm text-gray-900 space-y-0.5">
        <div><span className="font-semibold">Chair of the Board:</span> {lead.chair_of_board || <span className="text-gray-400">—</span>}</div>
        <div><span className="font-semibold">Lead Independent Director:</span> {lead.lead_independent_director || "None named"}</div>
        <div><span className="font-semibold">CEO:</span> {lead.ceo || <span className="text-gray-400">—</span>}</div>
      </div>

      {!data.committees.length ? (
        <p className="text-sm text-gray-700">No committee membership could be read from this proxy.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="text-sm w-full text-gray-900">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
              <tr><th className="p-2">Committee</th><th className="p-2">Chair</th><th className="p-2">Members</th><th className="p-2 whitespace-nowrap">Meetings Last Year</th></tr>
            </thead>
            <tbody>
              {data.committees.map((c) => {
                const m = latestMembership(c);
                // retiring applies to today's list only: a change already in effect has replaced it
                const named = (n: string) => `${n}${!m.changed && leaving.has(n) ? " (retiring)" : ""}`;
                const others = m.members.filter((n) => n !== m.chair);
                return (
                  <tr key={c.name} className="border-t border-gray-100 align-top">
                    <td className="p-2">
                      <div className="font-medium">{c.name}</div>
                      {m.effective && <div className="text-xs text-gray-600">Effective {usDate(m.effective)}</div>}
                    </td>
                    <td className="p-2">{m.chair ? named(m.chair) : <span className="text-gray-400">—</span>}</td>
                    <td className="p-2">{others.length ? others.map((n) => <div key={n}>{named(n)}</div>) : <span className="text-gray-400">—</span>}</td>
                    <td className="p-2">{c.meetings || <span className="text-gray-400">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {data.html && (
          <button onClick={() => setShowDoc(!showDoc)} className="text-xs text-[#931638] hover:underline">
            {showDoc ? "Hide the proxy's committee table" : "Show the proxy's committee table"}
          </button>
        )}
        {!!data.disagreements.length && (
          <button onClick={() => setShowNotes(!showNotes)} className="text-xs text-[#931638] hover:underline">
            {showNotes ? "Hide" : "Show"} {data.disagreements.length} biography {data.disagreements.length === 1 ? "note" : "notes"} that differ from the lists
          </button>
        )}
      </div>
      {showDoc && data.html && <div className="border border-gray-200 rounded-lg"><DocFrame html={data.html} title="Committee table" /></div>}
      {showNotes && (
        <ul className="text-xs text-gray-700 list-disc pl-5 space-y-0.5">
          {data.disagreements.map((d, i) => (
            <li key={i}>{d.director}'s biography names <span className="font-medium">{d.bio_says}</span>; the committee lists place them on {d.committee_list.length ? d.committee_list.join(", ") : "no committee"}.</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Compensation peer groups: a clean list per group, and the proxy's own section beneath. */
function PeersSection({ peers, proxyUrl }: { peers?: PeerGroups; proxyUrl: string }) {
  const [showDoc, setShowDoc] = useState(false);
  if (!peers) return <p className="text-sm text-gray-600">Compensation peers: not read for this result yet.</p>;
  if (!peers.found) return <p className="text-sm text-gray-600">No compensation peer group was found in this proxy.</p>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600">
          The peer companies this company uses to set executive pay, as its proxy names them. Every company listed is printed in the proxy.
        </p>
        <span className="ml-auto"><SourceLink href={proxyUrl}>Source: Proxy Statement (SEC)</SourceLink></span>
      </div>
      {peers.groups.map((g) => (
        <div key={g.name} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{titleCase(g.name)}</h3>
            <Pill>{g.companies.length} companies</Pill>
            {g.partial && (
              <Pill tone="amber">The proxy says {g.stated_count} companies; {g.companies.length} are printed as text — the rest may be in an image</Pill>
            )}
          </div>
          {g.purpose && <p className="px-4 pt-3 text-sm text-gray-700">Used for: {g.purpose}</p>}
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {g.companies.map((c) => (
              <div key={c.name} className="text-sm text-gray-900 py-1 border-b border-gray-100">
                {c.name}
                {c.ticker && <span className="ml-2 text-xs font-mono text-gray-600">{c.exchange ? `${c.exchange}: ` : ""}{c.ticker}</span>}
              </div>
            ))}
          </div>
          {(!!g.added.length || !!g.removed.length) && (
            <div className="px-4 pb-3 text-xs text-gray-900 space-y-1">
              {!!g.added.length && <div><span className="font-semibold">Added this year: </span>{g.added.join("; ")}</div>}
              {!!g.removed.length && <div><span className="font-semibold">Removed this year: </span>{g.removed.join("; ")}</div>}
            </div>
          )}
        </div>
      ))}
      {peers.html && (
        <div>
          <button onClick={() => setShowDoc(!showDoc)} className="text-xs text-[#931638] hover:underline">
            {showDoc ? "Hide the proxy's own section" : "Show the proxy's own section"}
          </button>
          {showDoc && <div className="mt-2 border border-gray-200 rounded-lg"><DocFrame html={peers.html} title="Compensation peers" /></div>}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="border border-gray-200 rounded-lg px-4 py-3">
      <div className="text-xs uppercase tracking-wide font-semibold text-gray-700">{label}</div>
      <div className="text-2xl font-semibold mt-1 text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

/** An ISO date as "April 30, 2024"; with no date, the note as the source gives it. */
const fmtDate = (iso: string | null, note?: string | null) => (iso ? usDate(iso) : note || "—");

/** Newest first; a join or departure without its own date sorts by its source's filing date. */
const byNewest = (a: RefreshEvent, b: RefreshEvent) =>
  (b.date || b.source.filing_date || "").localeCompare(a.date || a.source.filing_date || "");

/** "2026": the meeting's year, or the 8-K's filing year when it prints no meeting date. */
const meetingLabel = (t: Refreshment["timeline"][number]) =>
  (t.meeting_date_known === false ? t.filing_date : t.meeting_iso).slice(0, 4);

/** How the board changed over the period: totals, each annual meeting's slate, every join and departure with its source. */
function RefreshmentSection({ r }: { r?: Refreshment }) {
  if (!r) return <p className="text-sm text-gray-700">Board refreshment: not read for this result yet.</p>;
  if (r.note && !r.timeline.length) return <p className="text-sm text-gray-700">{r.note}</p>;
  const net = r.net_change ?? 0;
  // each slate is compared with the meeting before; shown newest first
  const oldestFirst = [...r.timeline].sort((a, b) => a.meeting_iso.localeCompare(b.meeting_iso));
  const rows = oldestFirst.map((t, i) => ({ t, prev: i > 0 ? oldestFirst[i - 1] : null })).reverse();
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-700">
        Board changes since {usDate(r.window_start)}, from SEC filings only: 8-K Item 5.02 (appointments and departures) and each annual
        meeting's 8-K Item 5.07 (the slate of directors elected). A joining or departure no 5.02 announced is found by comparing one
        meeting's slate with the next.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Directors Joined" value={r.joined_count ?? 0} />
        <StatCard label="Directors Departed" value={r.departed_count ?? 0} />
        <StatCard label="Board Size" value={`${r.board_size_start ?? "—"} → ${r.board_size_now ?? "—"}`}
                  sub={r.board_size_start_date ? `at the ${usDate(r.board_size_start_date)} meeting → now` : undefined} />
        <StatCard label="Net Change" value={`${net > 0 ? "+" : ""}${net}`} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Annual Board Composition</h3>
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="text-sm w-full text-gray-900">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
              <tr><th className="p-2">Annual Meeting</th><th className="p-2">Directors Elected</th><th className="p-2">New on the Slate</th><th className="p-2">No Longer on the Slate</th><th className="p-2">Source</th></tr>
            </thead>
            <tbody>
              {rows.map(({ t, prev }) => (
                <tr key={t.url || t.meeting_iso} className="border-t border-gray-100 align-top">
                  <td className="p-2 whitespace-nowrap"
                      title={t.meeting_date_known === false ? "The 8-K prints no meeting date: the year is the 8-K's filing year" : undefined}>
                    {meetingLabel(t)}
                  </td>
                  <td className="p-2 font-semibold">{t.elected_count}</td>
                  {/* the first meeting of the period has no meeting before it to compare with */}
                  <td className="p-2">{!prev ? "" : t.new_on_slate.join("; ") || <span className="text-gray-400">—</span>}</td>
                  <td className="p-2">{!prev ? "" : t.left_slate.join("; ") || <span className="text-gray-400">—</span>}</td>
                  <td className="p-2 whitespace-nowrap"><SourceLink href={t.url}>8-K Item 5.07, {usDate(t.filing_date)}</SourceLink></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(["joined", "departed"] as const).map((kind) => {
        const list = [...(kind === "joined" ? r.joined : r.departed)].sort(byNewest);
        return (
          <div key={kind}>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">{kind === "joined" ? `Directors Who Joined (${list.length})` : `Directors Who Departed (${list.length})`}</h3>
            {!list.length ? <p className="text-sm text-gray-700">None in the period.</p> : (
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="text-sm w-full text-gray-900">
                  <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
                    <tr><th className="p-2">Director</th><th className="p-2">{kind === "joined" ? "Joined" : "Departed"}</th><th className="p-2">How</th><th className="p-2">Source</th></tr>
                  </thead>
                  <tbody>
                    {list.map((e, i) => (
                      <tr key={i} className="border-t border-gray-100 align-top">
                        <td className="p-2">
                          <span className="font-medium">{e.name}</span>
                          {kind === "joined" && e.on_board_now === false && <span className="ml-2 text-xs text-gray-600">(has since left)</span>}
                        </td>
                        <td className="p-2 whitespace-nowrap">{fmtDate(e.date, e.date_note)}</td>
                        <td className="p-2">{e.how}</td>
                        <td className="p-2"><SourceLink href={e.source.url}>{e.source.label}</SourceLink></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Support at each of the last three annual meetings, per nominee and per proposal. */
function YearOnYearTable({ yoy }: { yoy: YearOnYear }) {
  // Nominees and proposals side by side on a wide screen, each half-width with its years right
  // after the names, so neither table stretches a short name across the page.
  const table = (label: string, key: "nominee" | "proposal", rows: YearRow[]) => !!rows.length && (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="text-sm w-full table-fixed text-gray-900">
        <colgroup><col />{yoy.years.map((y) => <col key={y} style={{ width: "6.5rem" }} />)}</colgroup>
        <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
          <tr><th className="p-2">{label}</th>{yoy.years.map((y) => <th key={y} className="p-2">{y}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-100 align-top">
              <td className="p-2 font-medium">{r[key] ?? ""}</td>
              {yoy.years.map((y) => <td key={y} className="p-2 whitespace-nowrap">{supportText(r[y])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-base text-gray-900">Year-on-Year Support</h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {table("Nominee", "nominee", yoy.nominees)}
        {table("Proposal", "proposal", yoy.proposals)}
      </div>
    </div>
  );
}

/** The annual meeting's results from 8-K Item 5.07, every count checked against the filing. */
function VotingResultsSection({ voting, cik }: { voting?: VotingResults; cik: string }) {
  const [showDoc, setShowDoc] = useState(false);
  if (!voting) return <p className="text-sm text-gray-700">Voting results: not read for this result yet.</p>;
  if (!voting.found) return (
    <div><h3 className="font-semibold text-base text-gray-900 mb-1">Voting Results</h3><p className="text-sm text-gray-700">{voting.note}</p></div>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-base text-gray-900">Voting Results{voting.meeting_date ? ` — Annual Meeting of ${usDate(voting.meeting_date)}` : ""}</h3>
        <span className="ml-auto flex gap-4">
          <SourceLink href={voting.url}>{voting.form} filed {usDate(voting.filing_date)} (Item 5.07) on SEC</SourceLink>
          {voting.primary_document && voting.accession &&
            <SourceLink href={documentViewerUrl(cik, voting.accession, voting.primary_document)}>Stored copy</SourceLink>}
        </span>
      </div>
      <p className="text-xs text-gray-600">
        Counts are copied from the 8-K and each row is checked against its place in the filing. Support is calculated here as {voting.support_formula};
        the 8-K itself prints counts only.
      </p>
      {voting.note && <p className="text-sm text-gray-800">{voting.note}</p>}
      {(voting.proposals || []).map((p, i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-x-auto">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="font-medium text-sm text-gray-900">{p.number ? `${p.number.replace(/[.:)\s]+$/, "")}. ` : ""}{p.title}</span>
            <Pill>{p.kind.replace(/_/g, " ")}</Pill>
            {p.outcome && <Pill>{p.outcome}</Pill>}
          </div>
          <table className="text-sm w-full text-gray-900">
            <thead className="text-xs font-semibold text-gray-700 text-right">
              <tr>
                <th className="p-2 text-left">{p.kind === "director_election" ? "Nominee" : ""}</th>
                <th className="p-2">For</th><th className="p-2">Against</th><th className="p-2">Abstain</th>
                {p.rows.some((r) => r.withheld) && <th className="p-2">Withheld</th>}
                <th className="p-2">Broker Non-Votes</th><th className="p-2">Support</th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map((r, j) => (
                <tr key={j} className="border-t border-gray-100 text-right">
                  <td className="p-2 text-left">
                    {r.nominee || ""}
                  </td>
                  <td className="p-2 font-mono">{r.for ?? "—"}</td>
                  <td className="p-2 font-mono">{r.against ?? "—"}</td>
                  <td className="p-2 font-mono">{r.abstain ?? "—"}</td>
                  {p.rows.some((x) => x.withheld) && <td className="p-2 font-mono">{r.withheld ?? "—"}</td>}
                  <td className="p-2 font-mono">{r.broker_non_votes ?? "—"}</td>
                  <td className="p-2">
                    {r.support
                      ? <span title={r.support.formula}>{r.support.percent.toFixed(2)}%</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {voting.html && (
        <div>
          <button onClick={() => setShowDoc(!showDoc)} className="text-xs text-[#931638] hover:underline">
            {showDoc ? "Hide the 8-K's own table" : "Show the 8-K's own table"}
          </button>
          {showDoc && <div className="mt-2 border border-gray-200 rounded-lg"><DocFrame html={voting.html} title="Item 5.07" /></div>}
        </div>
      )}
    </div>
  );
}

/** One whole section of the proxy, shown as the document shows it. */
function ProxySectionView({ section, proxyUrl, fallbackTitle }: { section?: ProxySection; proxyUrl: string; fallbackTitle: string }) {
  if (!section) {
    return <p className="text-sm text-gray-700">{fallbackTitle}: not read for this result yet.</p>;
  }
  if (!section.found || !section.html) {
    return <p className="text-sm text-gray-700">{section.title}: this proxy has no such section, or it could not be located.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-base text-gray-900">{titleCase(section.heading || section.title)}</h3>
        <span className="ml-auto"><SourceLink href={proxyUrl}>Source: Proxy Statement (SEC)</SourceLink></span>
      </div>
      <div className="border border-gray-200 rounded-lg"><DocFrame html={section.html} title={section.title} /></div>
    </div>
  );
}

/** "Theodore F. Craver, Jr." -> "Craver": how a matrix header usually prints a director. */
const surname = (name: string) => name.replace(/,?\s+(Jr|Sr|II|III|IV)\.?$/i, "").trim().split(/\s+/).pop() || name;

/** Whether the proxy prints this matrix with one director per row and the skills across the top
 *  (Wells Fargo, NVIDIA), read from the matrix's own table: then no row names more than one
 *  director. A matrix printed as a picture has no names to read and keeps directors across. */
function directorsDown(m: Matrix) {
  const doc = new DOMParser().parseFromString(m.html || "", "text/html");
  const names = m.directors.map((n) => new RegExp(`\\b${surname(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));
  let rowsNaming = 0, most = 0;
  doc.querySelectorAll("tr").forEach((tr) => {
    if (tr.querySelector("tr")) return; // a row holding a nested table is not one line of the matrix
    // matched cell by cell: Mastercard's dots are the letter "l" in a symbol font, so the row's
    // joined text reads "Janowlllll" and the name has no word boundary
    const cells = Array.from(tr.children, (td) => td.textContent || "");
    const k = names.filter((re) => cells.some((c) => re.test(c))).length;
    if (k) rowsNaming++;
    most = Math.max(most, k);
  });
  return most === 1 && rowsNaming >= 2;
}

/** The matrix as a grid in the proxy's own layout and order: directors down the side when the
 *  proxy prints them so, skills down the side otherwise. */
function matrixGrid(m: Matrix) {
  const skills = m.rows.map((r) => ({ text: r.label, full: r.label_full || r.label }));
  const people = m.directors.map((n) => ({ text: n, full: n }));
  return directorsDown(m)
    ? { corner: "Director", cols: skills,
        lines: m.directors.map((n, i) => ({ ...people[i], marks: m.rows.map((r) => r.directors.includes(n)) })) }
    : { corner: "Skill", cols: people,
        lines: m.rows.map((r, i) => ({ ...skills[i], marks: m.directors.map((n) => r.directors.includes(n)) })) };
}

/** Some proxies print the matrix at 4-7pt, unreadable on screen: that type is raised to 8pt (11px).
 *  Larger type keeps its size, and so do the 0-2pt spacers proxies use for thin lines. */
const readableType = (html: string) =>
  html.replace(/font-size:\s*([\d.]+)(pt|px)/gi, (all: string, n: string, unit: string) => {
    const [floor, min] = unit.toLowerCase() === "pt" ? [3, 8] : [4, 11];
    const size = parseFloat(n);
    return size >= floor && size < min ? `font-size:${min}${unit}` : all;
  });

/** The extracted matrices as an Excel file: one sheet per matrix, laid out as on the page. */
function downloadMatrices(result: BoardResult) {
  const wb = XLSX.utils.book_new();
  result.proxy.matrices.forEach((m, i) => {
    const g = matrixGrid(m);
    const rows = [[g.corner, ...g.cols.map((c) => c.full)], ...g.lines.map((l) => [l.full, ...l.marks.map((x) => (x ? "✓" : ""))])];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: g.corner === "Skill" ? 45 : 28 }, ...g.cols.map((c) => ({ wch: Math.min(30, Math.max(10, c.full.length + 2)) }))];
    XLSX.utils.book_append_sheet(wb, ws, result.proxy.matrices.length > 1 ? `Skills Matrix ${i + 1}` : "Skills Matrix");
  });
  XLSX.writeFile(wb, `${result.company.tickers[0] || result.company.cik} Skills Matrix.xlsx`);
}

function MatrixSection({ result }: { result: BoardResult }) {
  const [view, setView] = useState<"document" | "table">("document");
  const ms = result.proxy.matrices;
  const grids = useMemo(() => ms.map(matrixGrid), [ms]);
  if (!ms.length)
    return <p className="text-sm text-gray-700">No per-director skills matrix was found in this proxy, as a table or as a picture that could be read and checked. Each director's skills are in their profile.</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <BoxedTabs<"document" | "table"> tabs={[["document", "As in Proxy"], ["table", "Extracted Data"]]} value={view} onChange={setView} />
        {view === "table" && (
          <Button variant="primary" size="sm" className="bg-red-800 hover:bg-red-900 text-white" onClick={() => downloadMatrices(result)}>
            <Download size={14} className="mr-1.5" /> Download Extracted Data (Excel)
          </Button>
        )}
        <span className="ml-auto"><SourceLink href={result.proxy.url}>Source: Proxy Statement (SEC)</SourceLink></span>
      </div>
      {ms.map((m, i) => view === "document" ? (
        <div key={i} className="border border-gray-200 rounded-lg"><DocFrame html={readableType(m.html)} title={`Skills matrix ${i + 1}`} /></div>
      ) : (
        <div key={i} className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="text-xs w-full text-gray-900">
            <thead className="text-gray-700">
              <tr className="bg-gray-50">
                <th className="text-left p-2 sticky left-0 bg-gray-50 font-semibold align-bottom">{grids[i].corner}</th>
                {grids[i].cols.map((c, j) => (
                  <th key={j} title={c.full}
                      className={`p-2 font-semibold align-bottom ${grids[i].corner === "Skill" ? "whitespace-nowrap" : "min-w-[6rem]"}`}>{c.text}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grids[i].lines.map((l, j) => (
                <tr key={j} className="border-t border-gray-100">
                  <td className={`p-2 sticky left-0 bg-white ${grids[i].corner === "Director" ? "whitespace-nowrap font-medium" : ""}`} title={l.full}>{l.text}</td>
                  {l.marks.map((x, k) => <td key={k} className="p-2 text-center">{x ? "✓" : ""}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/** A website profile card; like a proxy profile, its whole header row opens and closes it. */
function WebsiteMemberCard({ m, websiteOnly, open, onToggle }: {
  m: BoardResult["website"]["members"][number]; websiteOnly: boolean; open: boolean; onToggle: () => void;
}) {
  const Chevron = open ? ChevronDown : ChevronRight;
  const header = (
    <>
      {m.bio_html && <Chevron size={16} className="text-gray-700 shrink-0" />}
      <span className="font-semibold text-gray-900">{m.name}</span>
      {m.title && <Pill>{m.title}</Pill>}
      {websiteOnly && <Pill>Website Only — Not in the Proxy</Pill>}
      {!!m.committees?.length && <span className="text-xs text-gray-700">Committees: {m.committees.join("; ")}</span>}
      {!m.bio_html && <span className="ml-auto text-xs text-gray-600">No profile on this page</span>}
    </>
  );
  const headerClass = "w-full flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-left";
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {m.bio_html
        ? <button type="button" onClick={onToggle} aria-expanded={open} className={`${headerClass} hover:bg-gray-100`}>{header}</button>
        : <div className={headerClass}>{header}</div>}
      {/* the section's "Company Board Page" link is the source: not repeated under each profile */}
      {open && m.bio_html && <DocFrame html={m.bio_html} title={m.name} extraCss={WEBSITE_PROFILE_CSS} />}
    </div>
  );
}

/** The company website's board compared with the proxy's; shown inside Current Board, whose
 *  Expand all / Collapse all opens these cards. */
function WebsiteSection({ result, open, onToggle }: { result: BoardResult; open: Set<string>; onToggle: (name: string) => void }) {
  const w = result.website;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {w.url ? <SourceLink href={w.url}>Company Board Page</SourceLink> : <span className="text-gray-700">No Board Page Found</span>}
        {w.url && !!w.members.length && !w.verified && <Pill>Not Verified Against the Page</Pill>}
      </div>
      {w.note && <p className="text-sm text-gray-800">{w.note}</p>}
      {!w.members.length && !w.note && <p className="text-sm text-gray-800">No board members could be read from the company's website.</p>}
      {/* Hidden for now: the three proxy-vs-website name columns (w.compare). A website-only
          director is still marked on their profile card. */}
      {!!w.members.length && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Profiles on the Company Website</h3>
          {w.members.map((m) => (
            <WebsiteMemberCard key={m.name} m={m}
                               websiteOnly={!!w.compare?.website_only.includes(m.name)}
                               open={open.has(m.name)} onToggle={() => onToggle(m.name)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilingRow({ f, cik }: { f: Filing502; cik: string }) {
  const [open, setOpen] = useState(false);
  const pr = f.exhibits.find((e) => e.is_press_release);
  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-sm font-mono">{f.filing_date}</span>
        <Pill>{f.form}</Pill>
        <Pill tone={labelTone(f.label) as "brand" | "amber" | "gray"}>{f.label}</Pill>
        <span className="text-sm flex-1 min-w-[200px]">
          {f.summary || f.error || ""}
        </span>
        <button onClick={() => setOpen(!open)} className="text-xs text-gray-600 hover:text-black">{open ? "Less" : "More"}</button>
      </div>
      <div className="px-4 pb-3 flex flex-wrap gap-4">
        <SourceLink href={f.url}>8-K on SEC</SourceLink>
        {f.primary_document && <SourceLink href={documentViewerUrl(cik, f.accession, f.primary_document)}>8-K (stored copy)</SourceLink>}
        {pr && <SourceLink href={pr.url}>Press release ({pr.type}) on SEC</SourceLink>}
        {pr && <SourceLink href={documentViewerUrl(cik, f.accession, pr.name)}>Press release (stored copy)</SourceLink>}
        <SourceLink href={f.index_url}>All exhibits</SourceLink>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {!!f.people.length && (
            <div className="text-[11px] text-gray-500">
              Read from the 8-K by AI. Each person's name is checked against the filing; role, action, position and
              dates are the AI's reading, not checked word for word.
            </div>
          )}
          {!!f.people.length && (
            <table className="text-xs w-full [&_td]:pr-4 [&_th]:pr-4 [&_td]:align-top">
              <thead><tr className="text-gray-500"><th className="text-left">Person</th><th className="text-left">Role</th><th className="text-left">Action</th><th className="text-left">Position</th><th className="text-left">Effective</th></tr></thead>
              <tbody>{f.people.map((p, i) => (
                <tr key={i}><td className="py-1">{p.name}</td><td>{p.role.replace(/_/g, " ")}</td><td>{p.action.replace(/_/g, " ")}</td><td>{p.position || ""}</td><td>{p.effective_date || ""}</td></tr>
              ))}</tbody>
            </table>
          )}
          {f.item_502_text && <div><div className="text-xs text-gray-500 mb-1">Item 5.02 text — word for word from the SEC filing</div><p className="text-xs text-gray-700 whitespace-pre-wrap max-h-64 overflow-auto bg-gray-50 p-2 rounded">{f.item_502_text}</p></div>}
        </div>
      )}
    </div>
  );
}

function FilingsSection({ result }: { result: BoardResult }) {
  const fl = result.filings_502;
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Every 8-K carrying Item 5.02 filed since the proxy ({fl.since}): {fl.items.length}.
        {" "}{Object.entries(fl.counts).map(([k, v]) => `${k}: ${v}`).join(" · ")}
        {" "}<span className="text-gray-400">(Five years: {result.filings_502_five_years.count}.)</span>
      </p>
      {fl.items.map((f) => <FilingRow key={f.accession} f={f} cik={result.company.cik} />)}
      {!fl.items.length && <p className="text-sm text-gray-500">None since the proxy.</p>}
    </div>
  );
}

function AppointmentsSection({ result }: { result: BoardResult }) {
  const a = result.appointments;
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Director appointments since {a.window_start}, each with the source that announced it.</p>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="text-sm w-full">
          <thead className="bg-gray-50"><tr>
            <th className="text-left p-2">Director</th><th className="text-left p-2">Announced</th><th className="text-left p-2">Source</th>
            <th className="text-left p-2">Links</th><th className="text-left p-2">In proxy</th>
            {/* Website comparison switched off for now: <th className="text-left p-2">On website</th> */}
          </tr></thead>
          <tbody>{a.items.map((it, i) => (
            <tr key={i} className="border-t border-gray-100 align-top">
              <td className="p-2"><div className="font-medium">{it.name}</div>{it.position && <div className="text-xs text-gray-500">{it.position}</div>}</td>
              <td className="p-2 whitespace-nowrap">{it.announced || it.source?.date || (it.director_since ? `since ${it.director_since}` : "—")}</td>
              <td className="p-2">{it.source_type === "No 8-K found" ? "—" : (<>
                <span className="whitespace-nowrap"><Pill tone={it.source_type.startsWith("8-K") ? "brand" : it.source?.verified ? "green" : "amber"}>{it.source_type}</Pill></span>
                {it.note && <div className="text-xs text-gray-500 mt-1 max-w-sm">{it.note}</div>}
              </>)}</td>
              <td className="p-2 space-y-1 whitespace-nowrap">
                <div><SourceLink href={it.source?.url}>{it.source_type.startsWith("8-K") ? "8-K" : it.source?.title || "Announcement"}</SourceLink></div>
                {it.source?.press_release && <div><SourceLink href={it.source.press_release.url}>Press release</SourceLink></div>}
                {it.related_filings.map((r) => <div key={r.accession}><SourceLink href={r.url}>Related 8-K {r.filing_date}</SourceLink></div>)}
              </td>
              <td className="p-2">{it.in_proxy ? "Yes" : "No"}</td>
              {/* Website comparison switched off for now:
              <td className="p-2">{it.on_website == null ? "—" : it.on_website ? "Yes" : "No"}</td> */}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── One company's board intelligence ─────────────────────────────────────────────────────

type MeetingView = "voting" | "proposals";

/** Loads a company's saved result. A run (it costs money) starts only when the user presses
 *  Generate -- never by opening a company; autoStart stays for a caller that wants it.
 *  Used by the standalone page and by the dashboard's Board Intelligence tab. */
export function BoardIntelPanel({ company, autoStart, companyId }: {
  company: CompanyHit; autoStart: boolean;
  /** the dashboard's own company id: adds the year-on-year vote support (absent on the standalone page) */
  companyId?: number | string;
}) {
  const [result, setResult] = useState<BoardResult | null>(null);
  const [run, setRun] = useState<RunStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  // no saved result and no run going: offer Generate
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>("board");
  const [meetingView, setMeetingView] = useState<MeetingView>("voting");
  const [loading, setLoading] = useState(true);
  const { yoy, loading: yoyLoading } = useYearOnYear(companyId);
  const pollRef = useRef<number | null>(null);
  // The latest company wins: a slower reply for a company shown earlier is ignored.
  const selectionRef = useRef(0);

  const stopPolling = () => { if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; } };

  useEffect(() => () => { selectionRef.current++; stopPolling(); }, []);

  const poll = (cik: string) => {
    stopPolling();
    const selection = selectionRef.current;
    pollRef.current = window.setInterval(async () => {
      try {
        const s = await getRunStatus(cik);
        if (selection !== selectionRef.current) return;  // another company was shown meanwhile
        setRun(s);
        if (s.state === "done") {
          stopPolling();
          const r = await getResult(cik);
          cacheResult(cik, r);
          if (selection === selectionRef.current) setResult(r);
        }
        if (s.state === "failed") { stopPolling(); setError(s.error || "The run failed."); }
      } catch (e) { /* transient; keep polling */ }
    }, POLL_MS);
  };

  const generate = async (cik: string) => {
    const selection = selectionRef.current;
    setError(null); setMissing(false);
    try {
      const s = await startRun(cik);
      if (selection !== selectionRef.current) return;
      setRun(s);
      poll(cik);
    } catch (e) {
      if (selection === selectionRef.current) setError((e as Error).message);
    }
  };

  useEffect(() => {
    stopPolling();
    const selection = ++selectionRef.current;
    setRun(null); setError(null); setMissing(false); setTab("board"); setMeetingView("voting");
    const cached = cachedResult(company.cik);
    if (cached) { setResult(cached); setLoading(false); return; }
    setResult(null); setLoading(true);
    (async () => {
      try {
        const r = await getResult(company.cik);
        cacheResult(company.cik, r);
        if (selection === selectionRef.current) setResult(r);
      } catch (e) {
        if (selection !== selectionRef.current) return;
        if ((e as { status?: number }).status === 404) {
          try {
            const s = await getRunStatus(company.cik);
            if (selection !== selectionRef.current) return;
            if (s.state === "running") { setRun(s); poll(company.cik); return; }
          } catch { /* no run yet */ }
          if (selection !== selectionRef.current) return;
          if (autoStart) generate(company.cik); else setMissing(true);
        } else setError((e as Error).message);
      } finally {
        if (selection === selectionRef.current) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.cik]);

  const running = run?.state === "running";

  return (
    <div className="space-y-6">
      {error && <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3"><AlertTriangle size={16} />{error}</div>}

      {loading && !running && (
        <div className="border border-gray-200 rounded-lg p-6 flex items-center gap-3" role="status">
          <Loader2 size={20} className="animate-spin" style={{ color: BRAND }} />
          <div>
            <div className="text-sm font-medium">Please wait — loading {company.name}…</div>
            <div className="text-xs text-gray-600">Fetching the saved board data.</div>
          </div>
        </div>
      )}

      {missing && !running && (
        <div className="border border-gray-200 rounded-lg p-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[260px]">
            <div className="text-sm font-medium">No board intelligence has been generated for {company.name} yet.</div>
            <div className="text-xs text-gray-600 mt-1">
              Generating reads the latest proxy statement, every 8-K Item 5.02 of the last five years and the annual
              meeting results from SEC. It takes a few minutes.
            </div>
          </div>
          <button onClick={() => generate(company.cik)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white" style={{ background: BRAND }}>
            <RefreshCw size={14} /> Generate
          </button>
        </div>
      )}

      {running && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium"><Loader2 size={16} className="animate-spin" style={{ color: BRAND }} />{run?.stage || "Working"}…</div>
          <p className="text-xs text-gray-600">Reading the proxy, every 8-K Item 5.02 of the last five years, and the company's website takes a few minutes.</p>
          <ul className="text-xs text-gray-600 space-y-0.5">{(run?.stages || []).map((s, i) => <li key={i}>{s.at}s — {s.stage}</li>)}</ul>
        </div>
      )}

      {result && (
        <>
          {/* No header block: the dashboard's top bar already names the company, and the proxy,
              EDGAR and board-page links live with the sections that use them. */}
          <div className="flex flex-wrap items-end gap-1 border-b border-gray-200">
            {([
              ["board", `Current Board (${result.proxy.directors.length})`, Users],
              ["refresh", "Board Refreshment", RefreshCw],
              ["nominees", "Board Committees", Users],
              ["matrix", "Skills Matrix", FileText],
              ["meeting", "Annual Meeting", FileText],
              ["peers", "Compensation Peers", Users],
              // Hidden for now: "Website comparison" (now a sub-tab of Current Board),
              // "8-K 5.02 since proxy" and "Appointments, 5 years".
              // ["website", "Website comparison", Globe],
              // ["filings", `8-K 5.02 since proxy (${result.filings_502.items.length})`, FileText],
              // ["appointments", `Appointments, 5 years (${result.appointments.items.length})`, Users],
            ] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key as Tab)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px ${tab === key ? "border-[#931638] text-[#931638] font-medium" : "border-transparent text-gray-700 hover:text-black"}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {tab === "board" && <BoardTab key={result.company.cik} result={result} />}
          {tab === "nominees" && (
            <div className="space-y-8">
              <CommitteesSection data={result.proxy.committees} proxyUrl={result.proxy.url} />
              <ProxySectionView section={result.proxy.sections?.nominees} proxyUrl={result.proxy.url} fallbackTitle="Director nominees" />
            </div>
          )}
          {tab === "matrix" && <MatrixSection result={result} />}
          {tab === "peers" && <PeersSection peers={result.proxy.peers} proxyUrl={result.proxy.url} />}
          {tab === "refresh" && <RefreshmentSection r={result.refreshment} />}
          {/* hidden for now: no tab opens these (see the tab row) */}
          {tab === "filings" && <FilingsSection result={result} />}
          {tab === "appointments" && <AppointmentsSection result={result} />}
          {tab === "meeting" && (
            <div className="space-y-6">
              <BoxedTabs<MeetingView>
                tabs={[["voting", "Voting"], ["proposals", "Stockholder Proposals & Director Nominees"]]}
                value={meetingView} onChange={setMeetingView} />
              {meetingView === "voting" && (
                <div className="space-y-8">
                  {yoyLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-700" role="status">
                      <Loader2 size={16} className="animate-spin" style={{ color: BRAND }} /> Loading year-on-year support…
                    </div>
                  )}
                  {yoy && <YearOnYearTable yoy={yoy} />}
                  {/* the dashboard's year-on-year data already carries the latest meeting: our own
                      8-K reading is shown only when it is not there (e.g. the standalone page) */}
                  {!yoy && !yoyLoading && <VotingResultsSection voting={result.voting} cik={result.company.cik} />}
                </div>
              )}
              {/* only the proxy's section on next year's stockholder proposals and director
                  nominations; the general meeting Q&A (sections.qa) is not shown */}
              {meetingView === "proposals" && (
                <ProxySectionView section={result.proxy.sections?.proposals} proxyUrl={result.proxy.url}
                                  fallbackTitle="Stockholder proposals and director nominees for next year's annual meeting" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────────────────

export default function BoardIntelligencePage() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CompanyHit[]>([]);
  const [company, setCompany] = useState<CompanyHit | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim() || company?.name === query) { setHits([]); setSearching(false); return; }
    setSearching(true);
    const t = window.setTimeout(() => {
      searchCompanies(query).then(setHits).catch(() => setHits([])).finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [query, company]);

  const choose = (c: CompanyHit) => { setCompany(c); setQuery(c.name); setHits([]); };

  return (
    <div className="min-h-screen bg-white text-black">
    <header className="border-b border-gray-200 px-6 md:px-16 py-4 flex items-center gap-3">
      <Users size={22} style={{ color: BRAND }} />
      <div>
        <h1 className="text-lg font-semibold leading-tight">Board Intelligence</h1>
        <p className="text-xs text-gray-500">A company's board from its proxy statement, its website and its 8-K Item 5.02 filings</p>
      </div>
    </header>
    <div className="px-6 md:px-16 py-6 space-y-6">
      <div className="relative max-w-2xl">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:border-[#931638]">
          <Search size={18} className="text-gray-400" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setCompany(null); }}
                 placeholder="Company name, ticker or CIK (e.g. Albertsons, CVX)"
                 className="flex-1 outline-none border-0 focus:ring-0 text-sm" />
          {searching && <Loader2 size={16} className="animate-spin text-gray-400" aria-label="Searching" />}
        </div>
        {!!hits.length && (
          <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto">
            {hits.map((h) => (
              <li key={h.cik}>
                <button onClick={() => choose(h)} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex gap-3">
                  <span className="font-mono text-[#931638] w-14">{h.ticker}</span><span className="flex-1">{h.name}</span>
                  <span className="text-gray-400 text-xs">CIK {h.cik}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* the standalone page has always started a run for a company with no result */}
      {company && <BoardIntelPanel company={company} autoStart={false} />}
    </div>
    </div>
  );
}
