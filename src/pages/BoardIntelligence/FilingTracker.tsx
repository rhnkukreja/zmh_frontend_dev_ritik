// ─── Board Filing Tracker (/board-filing-tracker, Admins only) ──────────────────────────────
//
// Every 8-K Item 5.02 / 5.07 and proxy statement the filing tracker has recorded for the companies with
// Board Intelligence, and whether each board was updated from it. A page of its own, outside the
// dashboard. Status tiles count the filings and filter by status; a search and a filing-type filter
// narrow the table.

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink, FileText, Inbox, MinusCircle, RefreshCw, Search, XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AI_CHATBOT_API_BASE, getRequestHeaders } from "@/pages/AIChatbot/api";
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";

type FilingRow = {
  company: string;
  ticker: string;
  kind: string;
  filed: string;
  says: string;
  status: string;
  updated_at: string | null;
  url: string;
  detail: string;
};

type TrackerState = { checked_at: string | null; rows: FilingRow[] };

const BRAND = "#931638";

/** Each status: its icon, and the colours of its tile and pill. */
const STATUS: Record<string, { icon: LucideIcon; pill: string; tile: string }> = {
  "Updated": { icon: CheckCircle2, pill: "bg-green-50 text-green-700 ring-green-200", tile: "bg-green-50 text-green-700" },
  "Not updated (in queue)": { icon: Clock, pill: "bg-blue-50 text-blue-700 ring-blue-200", tile: "bg-blue-50 text-blue-700" },
  "No board change": { icon: MinusCircle, pill: "bg-slate-50 text-slate-600 ring-slate-200", tile: "bg-slate-100 text-slate-600" },
  "Needs review": { icon: AlertTriangle, pill: "bg-amber-50 text-amber-800 ring-amber-200", tile: "bg-amber-50 text-amber-700" },
  "Failed": { icon: XCircle, pill: "bg-red-50 text-red-700 ring-red-200", tile: "bg-red-50 text-red-700" },
};
const STATUSES = Object.keys(STATUS);

/** The filing filters: by the item a filing reports, or a proxy statement. */
const FILING_TYPES = [
  { key: "all", label: "All filings", test: () => true },
  { key: "502", label: "Item 5.02 · board & officers", test: (r: FilingRow) => r.kind.includes("5.02") },
  { key: "507", label: "Item 5.07 · vote results", test: (r: FilingRow) => r.kind.includes("5.07") },
  { key: "proxy", label: "Proxy statements", test: (r: FilingRow) => r.kind === "Proxy" },
] as const;

const day = (iso: string | null) => {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m
    ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
        .toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })
    : iso;
};

const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";

/** "8-K/A 5.02, 5.07" -> form "8-K/A", items ["5.02", "5.07"]; "Proxy" -> form "DEF 14A". Pure. */
const filingParts = (kind: string) => {
  if (kind === "Proxy") return { form: "DEF 14A", items: [] as string[] };
  const [form, ...rest] = kind.split(" ");
  return { form, items: rest.join(" ").split(",").map((s) => s.trim()).filter(Boolean) };
};

async function getFilings(userType: string): Promise<TrackerState> {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/api/board-intel/admin/filings`, {
    headers: { ...getRequestHeaders(), "X-User-Type": userType },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail || detail;
    } catch {
      /* not JSON */
    }
    throw new Error(detail);
  }
  return res.json();
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS[status];
  const Icon = s?.icon || Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s?.pill || ""}`}>
      <Icon size={13} aria-hidden="true" />{status}
    </span>
  );
}

function StatusTile({ label, count, icon: Icon, tone, on, onClick }: {
  label: string; count: number; icon: LucideIcon; tone: string; on: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
            className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow ${
              on ? "border-[#931638] ring-2 ring-[#931638]/20" : "border-gray-200"}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={18} aria-hidden="true" /></span>
      <span className="min-w-0">
        <span className="block text-2xl font-semibold leading-none text-gray-900">{count}</span>
        <span className="mt-1 block text-[12.5px] text-gray-600">{label}</span>
      </span>
    </button>
  );
}

export default function FilingTracker() {
  const { user } = useAppSelector((state: RootState) => state.authentiction);
  const userType = (user?.user_type || "").trim();
  const isAdmin = userType.toLowerCase() === "admin";
  const [data, setData] = useState<TrackerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [type, setType] = useState<(typeof FILING_TYPES)[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    getFilings(userType)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of data?.rows || []) out[r.status] = (out[r.status] || 0) + 1;
    return out;
  }, [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const test = FILING_TYPES.find((t) => t.key === type)!.test;
    return (data?.rows || []).filter((r) => (!status || r.status === status) && test(r)
      && (!q || r.company.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q)));
  }, [data, status, type, query]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-sm text-gray-600">
        This page is for Admins only.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: BRAND }}>
            <FileText size={20} aria-hidden="true" />
          </span>
          <div className="min-w-[240px] flex-1">
            <h1 className="text-xl font-semibold">Board Filing Tracker</h1>
            <p className="text-[13px] text-gray-600">
              8-K Item 5.02 / 5.07 filings and proxy statements of the companies with Board Intelligence, and whether each
              board was updated from them.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data?.checked_at && <span className="text-[12.5px] text-gray-500">Last checked {dateTime(data.checked_at)}</span>}
            <button type="button" onClick={load} disabled={loading}
                    className="flex items-center gap-2 rounded-lg border border-[#931638]/30 bg-white px-3 py-2 text-sm font-medium text-[#931638] hover:bg-[#931638]/5 disabled:opacity-50">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" /> Reload
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatusTile label="All filings" count={data?.rows.length || 0} icon={Inbox} tone="bg-[#931638]/10 text-[#931638]"
                      on={!status} onClick={() => setStatus(null)} />
          {STATUSES.map((s) => (
            <StatusTile key={s} label={s} count={counts[s] || 0} icon={STATUS[s].icon} tone={STATUS[s].tile}
                        on={status === s} onClick={() => setStatus(status === s ? null : s)} />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company or ticker"
                   aria-label="Search company or ticker"
                   className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#931638]/50 focus:outline-none focus:ring-2 focus:ring-[#931638]/15" />
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {FILING_TYPES.map((t) => (
              <button key={t.key} type="button" onClick={() => setType(t.key)} aria-pressed={type === t.key}
                      className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                        type === t.key ? "bg-[#931638] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[13px] text-gray-500">{rows.length} of {data?.rows.length || 0} filings</span>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="max-h-[calc(100vh-330px)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-[12px] uppercase tracking-wide text-gray-500">
                <tr>
                  {["Company", "Filing", "Filed on", "What it says", "Status", "Updated on", ""].map((h, i) => (
                    <th key={i} className="whitespace-nowrap border-b border-gray-200 px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const { form, items } = filingParts(r.kind);
                  return (
                    <tr key={`${r.url}-${r.kind}`} className="align-top transition hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{r.company}</div>
                        {r.ticker && (
                          <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-gray-700">{r.ticker}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[12px] font-semibold text-gray-800">{form}</span>
                        {items.map((it) => (
                          <span key={it} className="ml-1 rounded-md bg-[#931638]/10 px-2 py-0.5 text-[12px] font-semibold text-[#931638]">{it}</span>
                        ))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{day(r.filed)}</td>
                      <td className="min-w-[280px] px-4 py-3 text-gray-700">{r.says}</td>
                      <td className="min-w-[170px] px-4 py-3">
                        <StatusPill status={r.status} />
                        {(r.status === "Needs review" || r.status === "Failed") && r.detail && (
                          <div className="mt-1.5 max-w-[320px] text-xs text-gray-600">{r.detail}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{dateTime(r.updated_at) || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" title="Open the filing on SEC.gov"
                           className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[12.5px] font-medium text-[#931638] hover:border-[#931638]/40 hover:bg-[#931638]/5">
                          SEC <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-gray-500">
                      {loading ? "Loading…" : data?.rows.length ? "No filings match these filters." : "No filings recorded yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
