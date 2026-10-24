import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  AlertTriangle, ExternalLink, FileText, Globe, Loader2, RefreshCw, Search, Users,
} from "lucide-react";
// The FastAPI base URL lives in one place (the AI Assistant's environment switch).
import { AI_CHATBOT_API_BASE, getRequestHeaders } from "@/pages/AIChatbot/api";

const BRAND = "#931638";
const POLL_MS = 4000;

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

// ─── A proxy's own HTML, isolated from the app's Tailwind reset ──────────────────────────
// Rendered in a sandboxed iframe: no scripts run (no allow-scripts); allow-same-origin only so
// the height can be measured. Links open in a new tab.
function DocFrame({ html, title, extraCss = "" }: { html: string; title: string; extraCss?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  const srcDoc = useMemo(() => {
    const clean = DOMPurify.sanitize(absolutizeAssets(html), {
      FORBID_TAGS: ["script", "style", "iframe", "form", "input", "object", "embed"],
      ADD_ATTR: ["target"],
    });
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
      <style>body{margin:0;padding:8px;font-family:Arial,Helvetica,sans-serif;overflow-x:auto}${extraCss}</style>
      </head><body>${clean}<div style="clear:both"></div></body></html>`;
  }, [html, extraCss]);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | null = null;
    const measure = () => {
      const body = frame.contentDocument?.body;
      if (body) setHeight(Math.min(Math.max(body.scrollHeight + 16, 80), 4000));
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
  }, [srcDoc]);

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

function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "amber" | "red" | "brand" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-50 text-green-700 border border-green-200",
    amber: "bg-amber-50 text-amber-800 border border-amber-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    brand: "bg-[#931638]/10 text-[#931638] border border-[#931638]/20",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tones[tone]}`}>{children}</span>;
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

/** The three facts a reader looks for first, given their own highlighted boxes. */
function KeyFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#931638]/20 bg-[#931638]/[0.04] px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#931638]">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{children}</div>
    </div>
  );
}

function chips(items?: string[]) {
  if (!items || !items.length) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((x) => <span key={x} className="rounded bg-white border border-gray-200 px-1.5 py-0.5 text-xs">{x}</span>)}
    </div>
  );
}

const directorAnchor = (name: string) => `director-${name.replace(/[^A-Za-z0-9]+/g, "-")}`;

function DirectorCard({ d, proxyUrl, open, onToggle }: { d: Director; proxyUrl: string; open: boolean; onToggle: () => void }) {
  const f = d.facts || {};
  return (
    <div id={directorAnchor(d.name)} className="border border-gray-200 rounded-lg overflow-hidden scroll-mt-4">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-base mr-2">{d.name}</h3>
        {f.age != null && <Pill>Age {f.age}{f.age_source ? "*" : ""}</Pill>}
        {f.director_since && <Pill>Director since {f.director_since}{f.director_since_source ? "*" : ""}</Pill>}
        {f.independent === true && <Pill tone="green">Independent</Pill>}
        {f.independent === false && <Pill tone="amber">Not independent</Pill>}
        {(f.board_roles || []).map((r) => <Pill key={r} tone="brand">{r}</Pill>)}
        {f.designated_by && <Pill tone="amber">Designated by {f.designated_by}</Pill>}
        <button onClick={onToggle} className="ml-auto text-xs text-gray-600 hover:text-black">
          {open ? "Hide profile" : "Show profile as in proxy"}
        </button>
      </div>
      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <KeyFact label="Position">{f.current_position || <span className="text-gray-400">—</span>}</KeyFact>
        <KeyFact label="Committees">{chips(f.committees)}</KeyFact>
        <KeyFact label="Other public boards">{chips(f.other_public_boards)}</KeyFact>
        <div className="md:col-span-3 text-[11px] text-gray-400">
          
        </div>
      </div>
      {open && (d.bio_html
        ? <div className="border-t border-gray-100"><DocFrame html={d.bio_html} title={d.name} /></div>
        : <div className="px-4 py-3 text-sm text-amber-700">The profile HTML could not be cut from the proxy.</div>)}
      <div className="px-4 py-2 border-t border-gray-100"><SourceLink href={proxyUrl}>Source: proxy statement (SEC)</SourceLink></div>
    </div>
  );
}

/** The whole board in one table, readable in one go; a name jumps to that director's profile. */
function BoardAtAGlance({ directors, onOpen }: { directors: Director[]; onOpen: (name: string) => void }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="text-sm w-full">
        <thead className="bg-gray-50 text-left text-xs text-gray-600">
          <tr>
            <th className="p-2">Director</th><th className="p-2">Age</th><th className="p-2">Since</th><th className="p-2">Independent</th>
            <th className="p-2 text-[#931638]">Position</th><th className="p-2 text-[#931638]">Committees</th>
            <th className="p-2 text-[#931638]">Other public boards</th>
          </tr>
        </thead>
        <tbody>
          {directors.map((d) => {
            const f = d.facts || {};
            return (
              <tr key={d.name} className="border-t border-gray-100 align-top">
                <td className="p-2">
                  <button onClick={() => onOpen(d.name)} className="font-medium text-left hover:text-[#931638] hover:underline">{d.name}</button>
                  {!!(f.board_roles || []).length && <div className="text-xs text-[#931638]">{(f.board_roles || []).join(", ")}</div>}
                </td>
                <td className="p-2 whitespace-nowrap">{f.age ?? "—"}{f.age != null && f.age_source ? "*" : ""}</td>
                <td className="p-2 whitespace-nowrap">{f.director_since || "—"}{f.director_since && f.director_since_source ? "*" : ""}</td>
                <td className="p-2">{f.independent === true ? "Yes" : f.independent === false ? "No" : "—"}</td>
                <td className="p-2">{f.current_position || "—"}</td>
                <td className="p-2">{(f.committees || []).join("; ") || "—"}</td>
                <td className="p-2">{(f.other_public_boards || []).join("; ") || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BoardTab({ result }: { result: BoardResult }) {
  // Profiles start closed so the board reads in one go from the table; each opens on demand.
  const [openNames, setOpenNames] = useState<Set<string>>(new Set());
  const directors = result.proxy.directors;
  const allOpen = directors.length > 0 && openNames.size === directors.length;
  const toggle = (name: string) => setOpenNames((s) => {
    const n = new Set(s);
    if (n.has(name)) n.delete(name); else n.add(name);
    return n;
  });
  const openAndJump = (name: string) => {
    setOpenNames((s) => new Set(s).add(name));
    window.setTimeout(() => document.getElementById(directorAnchor(name))?.scrollIntoView({ behavior: "smooth" }), 50);
  };
  return (
    <div className="space-y-4">
      {!!result.proxy.named_without_biography.length && (
        <p className="text-sm text-amber-700">Named in the proxy without a biography: {result.proxy.named_without_biography.join(", ")}</p>
      )}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">The board at a glance</h3>
        <BoardAtAGlance directors={directors} onOpen={openAndJump} />
        <p className="text-xs text-gray-500 mt-1">* not printed as text in the biography: taken from the proxy's nominee summary table, or read from the profile's own image (some proxies print the age and tenure only in a picture). Click a name to open that profile.</p>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <h3 className="text-sm font-semibold text-gray-700">Full profiles as in the proxy</h3>
        <button onClick={() => setOpenNames(allOpen ? new Set() : new Set(directors.map((d) => d.name)))}
                className="text-xs text-[#931638] hover:underline">
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      {directors.map((d) => (
        <DirectorCard key={d.name} d={d} proxyUrl={result.proxy.url} open={openNames.has(d.name)} onToggle={() => toggle(d.name)} />
      ))}
    </div>
  );
}

/** Board committees: who chairs each, who serves, how often it met -- and the board's leadership. */
function CommitteesSection({ data, proxyUrl }: { data?: BoardCommittees; proxyUrl: string }) {
  const [showDoc, setShowDoc] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  if (!data) return <p className="text-sm text-gray-600">Board committees: not read for this result yet — press Refresh to read them.</p>;
  const lead = data.leadership || {};
  const leaving = new Set(data.not_nominees || []);
  const person = (n: string) => (
    <span key={n} className={`rounded border px-1.5 py-0.5 text-xs ${leaving.has(n) ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-white border-gray-200"}`}>
      {n}{leaving.has(n) ? " †" : ""}
    </span>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold">Board committees</h3>
        {data.source && <Pill>{data.source === "table" ? "Read from the proxy's committee table" : "Read from the proxy's committee lists"}</Pill>}
        <span className="ml-auto"><SourceLink href={proxyUrl}>Source: proxy statement (SEC)</SourceLink></span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KeyFact label="Chair of the Board">{lead.chair_of_board || <span className="text-gray-400">—</span>}</KeyFact>
        <KeyFact label="Lead Independent Director">{lead.lead_independent_director || <span className="text-gray-400">None named</span>}</KeyFact>
        <KeyFact label="CEO">{lead.ceo || <span className="text-gray-400">—</span>}</KeyFact>
      </div>

      {!data.committees.length ? (
        <p className="text-sm text-gray-600">No committee membership could be read from this proxy.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.committees.map((c) => (
            <div key={c.name} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <h4 className="font-semibold text-sm">{c.name}</h4>
                {c.header && c.header !== c.name && <span className="text-xs text-gray-500">({c.header})</span>}
                <span className="ml-auto flex gap-1">
                  {c.meetings && <Pill>Met {c.meetings} times last year</Pill>}
                  <Pill>{c.members.length} members</Pill>
                </span>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm">
                {c.effective && <div className="text-xs text-amber-700">Membership as the proxy states it from {c.effective}</div>}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#931638] mr-2">Chair</span>
                  {c.chair ? <span className="font-medium">{c.chair}{leaving.has(c.chair) ? " †" : ""}</span> : <span className="text-gray-400">Not marked in the proxy</span>}
                </div>
                <div className="flex flex-wrap gap-1">{c.members.filter((m) => m !== c.chair).map(person)}</div>
                {c.after_change && (
                  <div className="mt-1 rounded border border-[#931638]/20 bg-[#931638]/[0.04] px-3 py-2 text-xs">
                    <div className="font-semibold text-[#931638] mb-1">
                      {c.after_change.effective ? `From ${c.after_change.effective}` : "Later"}, as the proxy states
                    </div>
                    {c.after_change.members === null ? (
                      <div>{c.after_change.chair} becomes chair.</div>
                    ) : (
                      <>
                        <div className="mb-1">Chair: <span className="font-medium">{c.after_change.chair || "not stated"}</span></div>
                        <div className="flex flex-wrap gap-1">{c.after_change.members.filter((m) => m !== c.after_change?.chair).map(person)}</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>Every name and count is printed in the proxy; chairs are as the proxy marks them.</p>
        {!!leaving.size && <p>† Not among this year's nominees (usually retiring at the meeting): {Array.from(leaving).join(", ")}.</p>}
      </div>

      <div className="flex flex-wrap gap-4">
        {data.html && (
          <button onClick={() => setShowDoc(!showDoc)} className="text-xs text-[#931638] hover:underline">
            {showDoc ? "Hide the proxy's committee table" : "Show the proxy's committee table"}
          </button>
        )}
        {!!data.disagreements.length && (
          <button onClick={() => setShowNotes(!showNotes)} className="text-xs text-amber-700 hover:underline">
            {showNotes ? "Hide" : "Show"} {data.disagreements.length} biography {data.disagreements.length === 1 ? "note" : "notes"} that differ from the lists
          </button>
        )}
      </div>
      {showDoc && data.html && <div className="border border-gray-200 rounded-lg"><DocFrame html={data.html} title="Committee table" /></div>}
      {showNotes && (
        <ul className="text-xs text-gray-600 list-disc pl-5 space-y-0.5">
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
  if (!peers) return <p className="text-sm text-gray-600">Compensation peers: not read for this result yet — press Refresh to read them.</p>;
  if (!peers.found) return <p className="text-sm text-gray-600">No compensation peer group was found in this proxy.</p>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600">
          The peer companies this company uses to set executive pay, as its proxy names them. Every company listed is printed in the proxy.
        </p>
        <span className="ml-auto"><SourceLink href={proxyUrl}>Source: proxy statement (SEC)</SourceLink></span>
      </div>
      {peers.groups.map((g) => (
        <div key={g.name} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold">{g.name}</h3>
            <Pill>{g.companies.length} companies</Pill>
            {g.partial && (
              <Pill tone="amber">The proxy says {g.stated_count} companies; {g.companies.length} are printed as text — the rest may be in an image</Pill>
            )}
          </div>
          {g.purpose && <p className="px-4 pt-3 text-sm text-gray-600">Used for: {g.purpose}</p>}
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {g.companies.map((c) => (
              <div key={c.name} className="text-sm py-1 border-b border-gray-100">
                {c.name}
                {c.ticker && <span className="ml-2 text-xs font-mono text-[#931638]">{c.exchange ? `${c.exchange}: ` : ""}{c.ticker}</span>}
              </div>
            ))}
          </div>
          {(!!g.added.length || !!g.removed.length) && (
            <div className="px-4 pb-3 text-xs space-y-1">
              {!!g.added.length && <div><span className="font-semibold text-green-700">Added this year: </span>{g.added.join("; ")}</div>}
              {!!g.removed.length && <div><span className="font-semibold text-amber-700">Removed this year: </span>{g.removed.join("; ")}</div>}
            </div>
          )}
        </div>
      ))}
      {!!peers.excluded.length && (
        <p className="text-xs text-gray-500">
          Not peer lists, so left out: {peers.excluded.map((e) => `${e.name}${e.reason ? ` (${e.reason})` : ""}`).join("; ")}
        </p>
      )}
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

function StatCard({ label, value, sub, tone = "gray" }: { label: string; value: React.ReactNode; sub?: string; tone?: "gray" | "green" | "amber" | "brand" }) {
  const tones = { gray: "text-gray-900", green: "text-green-700", amber: "text-amber-700", brand: "text-[#931638]" };
  return (
    <div className="border border-gray-200 rounded-lg px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

const fmtDate = (iso: string | null, note?: string | null) => iso || note || "—";

/** How the board changed over the period: totals, each annual meeting's slate, every join and departure with its source. */
function RefreshmentSection({ r }: { r?: Refreshment }) {
  if (!r) return <p className="text-sm text-gray-600">Board refreshment: not read for this result yet — press Refresh to read it.</p>;
  if (r.note && !r.timeline.length) return <p className="text-sm text-gray-600">{r.note}</p>;
  const net = r.net_change ?? 0;
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Board changes since {r.window_start}, from SEC filings only: 8-K Item 5.02 (appointments and departures) and each annual
        meeting's 8-K Item 5.07 (the slate of directors elected). A joining or departure no 5.02 announced is found by comparing one
        meeting's slate with the next.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Directors joined" value={r.joined_count ?? 0} tone="green" />
        <StatCard label="Directors departed" value={r.departed_count ?? 0} tone="amber" />
        <StatCard label="Board size" value={`${r.board_size_start ?? "—"} → ${r.board_size_now ?? "—"}`}
                  sub={r.board_size_start_date ? `at the ${r.board_size_start_date} meeting → now` : undefined} />
        <StatCard label="Net change" value={`${net > 0 ? "+" : ""}${net}`} tone={net > 0 ? "green" : net < 0 ? "amber" : "gray"} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Annual board composition</h3>
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="text-sm w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-600">
              <tr><th className="p-2">Annual meeting</th><th className="p-2">Directors elected</th><th className="p-2">New on the slate</th><th className="p-2">No longer on the slate</th><th className="p-2">Source</th></tr>
            </thead>
            <tbody>
              {r.timeline.map((t, i) => (
                <tr key={i} className="border-t border-gray-100 align-top">
                  <td className="p-2 whitespace-nowrap">
                    {t.meeting_date_known === false
                      ? <span className="text-gray-500" title="The 8-K prints no usable meeting date; it is not replaced by the filing date">date not printed (8-K filed {t.filing_date})</span>
                      : (t.meeting_date || t.meeting_iso)}
                  </td>
                  <td className="p-2">
                    <span className="font-semibold">{t.elected_count}</span>
                    {i > 0 && t.elected_count !== r.timeline[i - 1].elected_count && (
                      <span className={`ml-2 text-xs ${t.elected_count > r.timeline[i - 1].elected_count ? "text-green-700" : "text-amber-700"}`}>
                        ({t.elected_count > r.timeline[i - 1].elected_count ? "+" : ""}{t.elected_count - r.timeline[i - 1].elected_count})
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-green-800">{i === 0 ? <span className="text-gray-400">start of the period</span> : t.new_on_slate.join("; ") || "—"}</td>
                  <td className="p-2 text-amber-800">{i === 0 ? "" : t.left_slate.join("; ") || "—"}</td>
                  <td className="p-2 whitespace-nowrap"><SourceLink href={t.url}>8-K Item 5.07, {t.filing_date}</SourceLink></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(["joined", "departed"] as const).map((kind) => {
        const list = kind === "joined" ? r.joined : r.departed;
        return (
          <div key={kind}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{kind === "joined" ? `Directors who joined (${list.length})` : `Directors who departed (${list.length})`}</h3>
            {!list.length ? <p className="text-sm text-gray-500">None in the period.</p> : (
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="text-sm w-full">
                  <thead className="bg-gray-50 text-left text-xs text-gray-600">
                    <tr><th className="p-2">Director</th><th className="p-2">{kind === "joined" ? "Joined" : "Departed"}</th><th className="p-2">How</th><th className="p-2">Source</th></tr>
                  </thead>
                  <tbody>
                    {list.map((e, i) => (
                      <tr key={i} className="border-t border-gray-100 align-top">
                        <td className="p-2">
                          <span className="font-medium">{e.name}</span>
                          {kind === "joined" && e.on_board_now === false && <span className="ml-2 text-xs text-gray-500">(has since left)</span>}
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

const SUPPORT_TONE: Record<string, string> = {
  low: "bg-red-50 text-red-700 border border-red-200",
  watch: "bg-amber-50 text-amber-800 border border-amber-200",
  ok: "bg-green-50 text-green-700 border border-green-200",
  info: "bg-gray-100 text-gray-700",
};

/** The annual meeting's results from 8-K Item 5.07, every count checked against the filing. */
function VotingResultsSection({ voting, cik }: { voting?: VotingResults; cik: string }) {
  const [showDoc, setShowDoc] = useState(false);
  if (!voting) return <p className="text-sm text-gray-600">Voting results: not read for this result yet — press Refresh to read them.</p>;
  if (!voting.found) return (
    <div><h3 className="font-semibold text-base mb-1">Voting results</h3><p className="text-sm text-gray-600">{voting.note}</p></div>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-base">Voting results{voting.meeting_date ? ` — annual meeting of ${voting.meeting_date}` : ""}</h3>
        <span className="ml-auto flex gap-4">
          <SourceLink href={voting.url}>{voting.form} filed {voting.filing_date} (Item 5.07) on SEC</SourceLink>
          {voting.primary_document && voting.accession &&
            <SourceLink href={documentViewerUrl(cik, voting.accession, voting.primary_document)}>Stored copy</SourceLink>}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        Counts are copied from the 8-K and each row is checked against its place in the filing. Support is calculated here as {voting.support_formula};
        the 8-K itself prints counts only. Below 80% is marked red, below 90% amber; shareholder proposals are not marked.
      </p>
      {voting.note && <p className="text-sm text-amber-700">{voting.note}</p>}
      {(voting.proposals || []).map((p, i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-x-auto">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="font-medium text-sm">{p.number ? `${p.number.replace(/[.:)\s]+$/, "")}. ` : ""}{p.title}</span>
            <Pill>{p.kind.replace(/_/g, " ")}</Pill>
            {p.outcome && <Pill tone={/not|fail|reject/i.test(p.outcome) ? "amber" : "green"}>{p.outcome}</Pill>}
          </div>
          <table className="text-sm w-full">
            <thead className="text-xs text-gray-500 text-right">
              <tr>
                <th className="p-2 text-left">{p.kind === "director_election" ? "Nominee" : ""}</th>
                <th className="p-2">For</th><th className="p-2">Against</th><th className="p-2">Abstain</th>
                {p.rows.some((r) => r.withheld) && <th className="p-2">Withheld</th>}
                <th className="p-2">Broker non-votes</th><th className="p-2">Support</th>
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
                      ? <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${SUPPORT_TONE[r.support.level]}`} title={r.support.formula}>{r.support.percent.toFixed(2)}%</span>
                      : "—"}
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
    return <p className="text-sm text-gray-600">{fallbackTitle}: not read for this result yet — press Refresh to read it.</p>;
  }
  if (!section.found || !section.html) {
    return <p className="text-sm text-gray-600">{section.title}: this proxy has no such section, or it could not be located.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-base">{section.heading || section.title}</h3>
        <span className="ml-auto"><SourceLink href={proxyUrl}>Source: proxy statement (SEC)</SourceLink></span>
      </div>
      <div className="border border-gray-200 rounded-lg"><DocFrame html={section.html} title={section.title} /></div>
    </div>
  );
}

function MatrixSection({ result }: { result: BoardResult }) {
  const [view, setView] = useState<"document" | "table">("document");
  const ms = result.proxy.matrices;
  if (!ms.length)
    return <p className="text-sm text-gray-600">No per-director skills matrix was found in this proxy, as a table or as a picture that could be read and checked. Each director's skills are in their profile.</p>;
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["document", "table"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded text-sm ${view === v ? "bg-[#931638] text-white" : "bg-gray-100 text-gray-700"}`}>
            {v === "document" ? "As in proxy" : "Extracted data"}
          </button>
        ))}
        <span className="ml-auto"><SourceLink href={result.proxy.url}>Source: proxy statement (SEC)</SourceLink></span>
      </div>
      {ms.map((m, i) => view === "document" ? (
        <div key={i} className="border border-gray-200 rounded-lg"><DocFrame html={m.html} title={`Skills matrix ${i + 1}`} /></div>
      ) : (
        <div key={i} className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 sticky left-0 bg-gray-50">Skill</th>
                {m.directors.map((n) => <th key={n} className="p-2 font-medium whitespace-nowrap">{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {m.rows.map((r) => (
                <tr key={r.label_full} className="border-t border-gray-100">
                  <td className="p-2 sticky left-0 bg-white" title={r.label_full}>{r.label}</td>
                  {m.directors.map((n) => (
                    <td key={n} className="p-2 text-center">{r.directors.includes(n) ? <span style={{ color: BRAND }}>✓</span> : ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function WebsiteMemberCard({ m, siteUrl, websiteOnly }: {
  m: BoardResult["website"]["members"][number]; siteUrl: string | null; websiteOnly: boolean;
}) {
  // A director who is not in the proxy has no other profile on this page: shown open.
  const [open, setOpen] = useState(websiteOnly);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className="font-semibold">{m.name}</span>
        {m.title && <Pill>{m.title}</Pill>}
        {websiteOnly && <Pill tone="brand">Website only — not in the proxy</Pill>}
        {!!m.committees.length && <span className="text-xs text-gray-600">Committees: {m.committees.join("; ")}</span>}
        {m.bio_html
          ? <button onClick={() => setOpen(!open)} className="ml-auto text-xs text-gray-600 hover:text-black">
              {open ? "Hide profile" : "Show profile as on website"}
            </button>
          : <span className="ml-auto text-xs text-gray-400">No profile on this page</span>}
      </div>
      {open && m.bio_html && <DocFrame html={m.bio_html} title={m.name} extraCss={WEBSITE_PROFILE_CSS} />}
      {open && m.bio_html && <div className="px-4 py-2 border-t border-gray-100"><SourceLink href={siteUrl}>Source: company website</SourceLink></div>}
    </div>
  );
}

function WebsiteSection({ result }: { result: BoardResult }) {
  const w = result.website;
  const col = (title: string, names: string[], tone: "green" | "amber" | "brand") => (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2"><Pill tone={tone}>{names.length}</Pill><span className="text-sm font-medium">{title}</span></div>
      <ul className="text-sm space-y-1">{names.map((n) => <li key={n}>{n}</li>)}{!names.length && <li className="text-gray-400">None</li>}</ul>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {w.url ? <SourceLink href={w.url}>Company board page</SourceLink> : <span className="text-gray-500">No board page found</span>}
        {w.url && !!w.members.length && (w.verified ? <Pill tone="green">Read from the page</Pill> : <Pill tone="amber">Not verified against the page</Pill>)}
      </div>
      {w.note && <p className="text-sm text-amber-700">{w.note}</p>}
      {!w.members.length && !w.note && <p className="text-sm text-amber-700">No board members could be read from the company's website.</p>}
      {w.compare && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {col("On both the proxy and the website", w.compare.both, "green")}
          {col("In the proxy only (left since?)", w.compare.proxy_only, "amber")}
          {col("On the website only (joined since the proxy?)", w.compare.website_only, "brand")}
        </div>
      )}
      {!!w.members.length && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Profiles on the company website</h3>
          {w.members.map((m) => (
            <WebsiteMemberCard key={m.name} m={m} siteUrl={w.url}
                               websiteOnly={!!w.compare?.website_only.includes(m.name)} />
          ))}
        </div>
      )}
      {!!w.attempts.length && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Pages tried ({w.attempts.length})</summary>
          <ul className="mt-2 space-y-1">{w.attempts.map((a) => (
            <li key={a.url}><a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{a.url}</a>
              {a.error ? ` — ${a.error}` : ` — names ${a.proxy_directors_named ?? 0} proxy directors`}</li>
          ))}</ul>
        </details>
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

/** Loads a company's saved result. A run (it costs money) starts only when the user presses Generate or
 *  Refresh -- never by opening a company; autoStart stays for a caller that wants it.
 *  Used by the standalone page and by the dashboard's Board Intel tab. */
export function BoardIntelPanel({ company, autoStart }: { company: CompanyHit; autoStart: boolean }) {
  const [result, setResult] = useState<BoardResult | null>(null);
  const [run, setRun] = useState<RunStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  // no saved result and no run going: offer Generate
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>("board");
  const [loading, setLoading] = useState(true);
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
    setResult(null); setRun(null); setError(null); setMissing(false); setTab("board"); setLoading(true);
    (async () => {
      try {
        const r = await getResult(company.cik);
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
            <div className="text-xs text-gray-500">Fetching the saved board data.</div>
          </div>
        </div>
      )}

      {missing && !running && (
        <div className="border border-gray-200 rounded-lg p-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[260px]">
            <div className="text-sm font-medium">No board intelligence has been generated for {company.name} yet.</div>
            <div className="text-xs text-gray-500 mt-1">
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
          <p className="text-xs text-gray-500">Reading the proxy, every 8-K Item 5.02 of the last five years, and the company's website takes a few minutes.</p>
          <ul className="text-xs text-gray-500 space-y-0.5">{(run?.stages || []).map((s, i) => <li key={i}>{s.at}s — {s.stage}</li>)}</ul>
        </div>
      )}

      {result && (
        <>
          <div className="flex flex-wrap items-start gap-4 border-b border-gray-200 pb-4">
            <div className="flex-1 min-w-[280px]">
              <h1 className="text-xl font-semibold">{result.company.name} <span className="text-gray-400 text-base">{result.company.tickers.join(", ")}</span></h1>
              <div className="flex flex-wrap gap-4 mt-1">
                <SourceLink href={result.proxy.url}>Proxy statement filed {result.proxy.filing_date}</SourceLink>
                <SourceLink href={result.company.edgar_url}>EDGAR filings</SourceLink>
                {/* Website comparison switched off for now.
                {result.website.url && <SourceLink href={result.website.url}>Board page on website</SourceLink>} */}
              </div>
            </div>
            <button disabled={running} onClick={() => generate(result.company.cik)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ background: BRAND }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div>
            <div className="space-y-1 text-sm text-gray-700">
              {/* one sentence can answer two questions (size and nominees): quoted once */}
              {Array.from(new Set(Object.values(result.proxy.statements).filter(Boolean) as string[])).map((v) => (
                <blockquote key={v} className="border-l-2 border-[#931638] pl-3 italic">“{v}”</blockquote>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-gray-200">
            {([
              ["board", `Current Board (${result.proxy.directors.length})`, Users],
              ["nominees", "Board committees", Users],
              ["matrix", "Skills matrix", FileText],
              ["peers", "Compensation peers", Users],
              ["refresh", "Board refreshment", RefreshCw],
              // Website comparison is switched off for now (SEC data only, no web search). The
              // tab, its section and WebsiteSection below are kept; uncomment to bring it back.
              // ["website", "Website comparison", Globe],
              ["filings", `8-K 5.02 since proxy (${result.filings_502.items.length})`, FileText],
              ["appointments", `Appointments, 5 years (${result.appointments.items.length})`, Users],
              ["meeting", "Annual meeting", FileText],
            ] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key as Tab)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px ${tab === key ? "border-[#931638] text-[#931638] font-medium" : "border-transparent text-gray-600 hover:text-black"}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {tab === "board" && <BoardTab result={result} />}
          {tab === "nominees" && (
            <div className="space-y-8">
              <CommitteesSection data={result.proxy.committees} proxyUrl={result.proxy.url} />
              <ProxySectionView section={result.proxy.sections?.nominees} proxyUrl={result.proxy.url} fallbackTitle="Director nominees" />
            </div>
          )}
          {tab === "matrix" && <MatrixSection result={result} />}
          {tab === "peers" && <PeersSection peers={result.proxy.peers} proxyUrl={result.proxy.url} />}
          {tab === "refresh" && <RefreshmentSection r={result.refreshment} />}
          {/* Website comparison switched off for now -- see the tab list above.
          {tab === "website" && <WebsiteSection result={result} />} */}
          {tab === "filings" && <FilingsSection result={result} />}
          {tab === "appointments" && <AppointmentsSection result={result} />}
          {tab === "meeting" && (
            <div className="space-y-8">
              <VotingResultsSection voting={result.voting} cik={result.company.cik} />
              <ProxySectionView section={result.proxy.sections?.proposals} proxyUrl={result.proxy.url}
                                fallbackTitle="Shareholder proposals for next year's annual meeting" />
              <ProxySectionView section={result.proxy.sections?.qa} proxyUrl={result.proxy.url}
                                fallbackTitle="Questions and answers about the annual meeting and voting" />
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
