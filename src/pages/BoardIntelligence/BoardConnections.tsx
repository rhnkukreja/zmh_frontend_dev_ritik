// ─── Board connections: who on a board already knows whom (/api/board-intel/connections) ─────
//
// The "Board network" pill under a director opens a window: the director in the middle, the boards
// they sit on now around them, and on each board the people they already know. Two kinds of link:
//   - together now: both sit on another board today (read from that board's own proxy);
//   - past workplace: both worked at, or sat on the board of, the same company at some time (read
//     from the career history in their proxy biographies -- the years are rarely printed).
// A board opens as a ring: everyone on it, and the companies two or more of them share.
// Only current boards and current directors are drawn; former boards are not.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, ExternalLink, Loader2, X } from "lucide-react";
import { AI_CHATBOT_API_BASE, getRequestHeaders } from "@/pages/AIChatbot/api";

const BASE = `${AI_CHATBOT_API_BASE}/api/board-intel`;
const BRAND = "#931638";
const C = {
  ink: "#111827", text: "#374151", muted: "#4b5563", dot: "#9aa5b1", line: "#e5e7eb",
  blue: "#1d6fb8", blueSoft: "#e7f0fa", blueMid: "#c9def3",
  violet: "#6d4aa8", violetSoft: "#f0ebf9",
  org: "#fdf8ee", orgInk: "#5c4718", brandSoft: "#f8eef1",
} as const;

// ─── The answer ─────────────────────────────────────────────────────────────────────────────

/** The proxy statement a fact was read from. */
type Source = { company: string | null; url: string | null; filed: string | null } | null;
type Kind = "now" | "worked";
/** What two people share: a board both sit on now, or a company both were at (any years). Roles and
 *  sources are the first person's, then the second's. */
export type Tie = { key: string; company: string; ticker: string | null; kind: Kind; roles?: string[]; sources?: Source[] };
type Fellow = { key: string; name: string; position?: string | null; home: string | null; ties: Tie[] };
type CircleBoard = {
  key: string; company: string; ticker: string | null; cik: string | null; ours: boolean; role: string;
  /** a board whose proxy we do not hold: only the people our proxies' biographies name on it */
  partial: boolean; members: Fellow[];
};
type Circle = { key: string; name: string; position?: string | null; boards: CircleBoard[] };
type Shared = { key: string; company: string; ticker: string | null; kind: Kind; people: { key: string; role: string; source?: Source }[] };
export type BoardConnectionsData = {
  cik: string; company: string; ticker: string | null;
  members: { key: string; name: string; position?: string | null; role?: string | null }[];
  shared: Shared[];
  people: Record<string, Circle>;
};

const RETRY_MS = 5000;
const TRIES = 36;                    // the server's first build after a restart: up to 3 minutes
const cache = new Map<string, Promise<BoardConnectionsData>>();

/** One board's connections. The server answers {building: true} while it builds the network after
 *  a restart: asked again every few seconds. */
export function loadConnections(cik: string): Promise<BoardConnectionsData> {
  if (!cache.has(cik)) {
    const ask = async (tries: number): Promise<BoardConnectionsData> => {
      const res = await fetch(`${BASE}/connections/${cik}`, { headers: getRequestHeaders() });
      if (!res.ok) throw new Error(res.statusText || `HTTP ${res.status}`);
      const body = await res.json();
      if (body.building) {
        if (tries <= 1) throw new Error("the board network is still being built");
        await new Promise((r) => window.setTimeout(r, RETRY_MS));
        return ask(tries - 1);
      }
      return body as BoardConnectionsData;
    };
    cache.set(cik, ask(TRIES).catch((e) => { cache.delete(cik); throw e; }));
  }
  return cache.get(cik)!;
}

/** This company's connections, for the table: null while loading, failed when they could not be read. */
export function useBoardConnections(cik: string) {
  const [state, setState] = useState<{ data: BoardConnectionsData | null; failed: boolean }>({ data: null, failed: false });
  useEffect(() => {
    let cancelled = false;
    setState({ data: null, failed: false });
    loadConnections(cik).then((data) => { if (!cancelled) setState({ data, failed: false }); },
                              () => { if (!cancelled) setState({ data: null, failed: true }); });
    return () => { cancelled = true; };
  }, [cik]);
  return state;
}

/** How many other boards a director sits on now, for the pill under their name; null while loading. */
export const otherBoardsNow = (data: BoardConnectionsData | null, name: string): number | null => {
  if (!data) return null;
  const m = data.members.find((x) => x.name === name);
  return m ? (data.people[m.key]?.boards.length || 1) - 1 : 0;
};

// ─── Words ──────────────────────────────────────────────────────────────────────────────────

const KIND = {
  now: { label: "Together now", long: "Sit on another board together now", color: C.blue, soft: C.blueSoft, dash: undefined as string | undefined },
  worked: { label: "Past workplace", long: "Past workplace in common (years not printed)", color: C.violet, soft: C.violetSoft, dash: "7 5" },
} as const;

/** "Carrier Global Corporation" -> "Carrier Global". Pure. */
const bare = (s: string) => s.replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Company|Co\.?|plc|Ltd\.?|LLP|L\.P\.|N\.V\.|S\.A\.)$/i, "")
  .replace(/,?\s+(Inc\.?|Corporation|Corp\.?|Company|Co\.?|Holdings)$/i, "").trim() || s;
/** The sentence for one link: "Both on Amgen's board now", "Both worked at PricewaterhouseCoopers". Pure. */
const why = (t: Tie) => (t.kind === "now" ? `Both on ${bare(t.company)}'s board now` : `Both worked at ${bare(t.company)}`);
/** The same, short enough to sit under a name on the map. Pure. */
const how = (t: Tie) => (t.kind === "now" ? `Now: ${bare(t.company)} board` : `Past: ${bare(t.company)}`);
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/** "Charles M. Holley, Jr." -> "Holley". Pure. */
const surname = (name: string) => {
  const w = name.replace(/["“”(].*?["“”)]/g, " ").replace(/,.*$/, "").trim().split(/\s+/);
  return w[w.length - 1] || name;
};
/** "Charles M. Holley, Jr." -> "CH". Pure. */
const initials = (name: string) => {
  const w = name.replace(/["“”(].*?["“”)]/g, " ").replace(/,.*$/, "").split(/\s+/).filter((x) => /^[A-Z]/.test(x) && !/^[A-Z]\.?$/.test(x));
  return ((w[0]?.[0] || name[0] || "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};
/** Up to two lines of about `max` characters. Pure. */
const wrap = (s: string, max: number) => {
  const out: string[] = [];
  let cur = "";
  for (const w of s.split(" ")) {
    if ((`${cur} ${w}`).trim().length > max && cur) { out.push(cur); cur = w; } else cur = `${cur} ${w}`.trim();
  }
  if (cur) out.push(cur);
  if (out.length > 2) out[1] = `${out[1].slice(0, max - 1)}…`;
  return out.slice(0, 2);
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Tag({ kind, children }: { kind: Kind | "grey" | "brand"; children: React.ReactNode }) {
  const s = kind === "now" || kind === "worked" ? { color: KIND[kind].color, background: KIND[kind].soft }
    : kind === "brand" ? { color: BRAND, background: C.brandSoft } : { color: C.muted, background: "#eef0f3" };
  return <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={s}>{children}</span>;
}

/** "Carrier Global 2026 proxy", linked to the filing. */
function SourceLink({ sources }: { sources: Source[] }) {
  const seen = new Set<string>();
  const list = sources.filter((s): s is NonNullable<Source> => !!s?.url && !seen.has(s.url) && !!seen.add(s.url));
  if (!list.length) return null;
  return (
    <div className="text-[12px] text-gray-500">
      Source:{" "}
      {list.map((s, i) => (
        <span key={s.url!}>{i > 0 && ", "}
          <a href={s.url!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-gray-600 underline decoration-gray-300 hover:text-[#931638]">
            {bare(s.company || "proxy")} {s.filed?.slice(0, 4)} proxy<ExternalLink size={10} />
          </a>
        </span>
      ))}
    </div>
  );
}

/** One link, spelt out: what they share, each one's role there, and where we read it. */
function TieDetail({ t, a, b }: { t: Tie; a: string; b: string }) {
  return (
    <div className="mt-1 rounded-md px-2.5 py-1.5" style={{ background: KIND[t.kind].soft }}>
      <div className="text-[13px] font-semibold" style={{ color: KIND[t.kind].color }}>{why(t)}</div>
      {t.roles && (
        <div className="text-[12.5px] text-gray-700">
          {surname(a)}: {t.roles[0] || "—"} · {surname(b)}: {t.roles[1] || "—"}
        </div>
      )}
      {t.sources && <SourceLink sources={t.sources} />}
    </div>
  );
}

// ─── The director in the middle ─────────────────────────────────────────────────────────────

/** The director in the middle, their boards now around them, and on each board the people they
 *  already know, each with how. The others on a board are a count unless asked for (showAll). */
function CircleMap({ circle, thisCik, showAll, onPerson, onBoard }: {
  circle: Circle; thisCik: string; showAll: boolean; onPerson: (f: Fellow) => void; onBoard: (cik: string) => void;
}) {
  const W = 960, H = 640, cx = W / 2, cy = H / 2;
  const boards = circle.boards, n = boards.length;
  const R = n > 1 ? 170 : 0;
  const pts = boards.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(n, 1);
    return n === 1 ? { x: cx, y: cy - 160, a: -Math.PI / 2 } : { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${circle.name}: boards now`}>
      {pts.map((p, i) => <line key={`l${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={BRAND} strokeOpacity={0.4} strokeWidth={2.5} />)}
      {boards.map((b, i) => {
        const p = pts[i];
        const known = b.members.filter((f) => f.ties.length);
        const list = (showAll ? [...known, ...b.members.filter((f) => !f.ties.length)] : known).slice(0, showAll ? 12 : 6);
        const m = list.length, more = (showAll ? b.members.length : known.length) - m;
        const spread = Math.min(1.6, 0.5 * (m - 1));
        return (
          <g key={`f${i}`}>
            {list.map((f, j) => {
              // the people they know fan out from the board; a board above or below the middle
              // splits them right and left, so the names (which run sideways) never meet
              let a = p.a + (m > 1 ? -spread / 2 + (spread * j) / (m - 1) : 0);
              if (Math.abs(Math.sin(p.a)) > 0.7 && m > 2) {
                const side = j % 2, idx = Math.floor(j / 2), cnt = side ? Math.floor(m / 2) : Math.ceil(m / 2);
                const tilt = Math.sin(p.a) < 0 ? -0.35 : 0.35, sp = Math.min(1.2, 0.55 * (cnt - 1));
                a = (side ? Math.PI - tilt : tilt) + (cnt > 1 ? -sp / 2 + (sp * idx) / (cnt - 1) : 0);
              }
              let x = p.x + 105 * Math.cos(a), y = p.y + 105 * Math.sin(a), right = Math.cos(a) >= -0.05;
              if (showAll) {
                // everyone: straight columns beside the board (two for a board above or below)
                const vertical = Math.abs(Math.sin(p.a)) > 0.7;
                const side = vertical ? j % 2 : Math.cos(p.a) >= 0 ? 0 : 1;
                const idx = vertical ? Math.floor(j / 2) : j;
                const cnt = vertical ? (side ? Math.floor(m / 2) : Math.ceil(m / 2)) : m;
                x = p.x + (side ? -1 : 1) * (vertical ? 100 : 108);
                y = p.y + (idx - (cnt - 1) / 2) * 24;
                right = side === 0;
              }
              const k = f.ties.length > 0, solid = f.ties.some((t) => t.kind === "now"), tx = x + (right ? 13 : -13);
              return (
                <g key={f.key} className={f.home ? "cursor-pointer" : undefined} onClick={f.home ? () => onPerson(f) : undefined}>
                  <title>{k ? `${f.name}: ${f.ties.map(why).join("; ")}` : f.name}</title>
                  <line x1={p.x} y1={p.y} x2={x} y2={y} stroke={k ? (solid ? C.blue : C.violet) : C.line} strokeWidth={k ? 2.2 : 1.3}
                        strokeDasharray={k && !solid ? KIND.worked.dash : undefined} />
                  <circle cx={x} cy={y} r={k ? 7 : 4.5} fill={k ? (solid ? C.blue : C.violet) : C.dot} stroke="#fff" strokeWidth={k ? 2 : 0} />
                  <text x={tx} y={y + (k && !showAll ? -1 : 5)} textAnchor={right ? "start" : "end"}
                        fontSize={k ? 15 : 13.5} fontWeight={k ? 700 : 400} fill={k ? C.ink : C.muted}>
                    {short(f.name, 24)}
                  </text>
                  {k && !showAll && (
                    <text x={tx} y={y + 16} textAnchor={right ? "start" : "end"} fontSize={13} fontWeight={500} fill={KIND[f.ties[0].kind].color}>
                      {short(how(f.ties[0]), 28)}{f.ties.length > 1 ? `  +${f.ties.length - 1}` : ""}
                    </text>
                  )}
                </g>
              );
            })}
            {showAll && more > 0 && (
              <text x={p.x} y={p.y + 80} textAnchor="middle" fontSize={12.5} fill={C.muted}>+{more} more in the list</text>
            )}
          </g>
        );
      })}
      {boards.map((b, i) => {
        const p = pts[i], here = b.cik === thisCik, open = b.ours && b.cik;
        const others = b.members.length, knows = b.members.filter((f) => f.ties.length).length;
        const lines = wrap(bare(b.company), 14);
        return (
          <g key={`b${i}`} className={open ? "cursor-pointer" : undefined} onClick={open ? () => onBoard(b.cik!) : undefined}>
            <title>{`${b.company}${b.partial ? " (its proxy is not in our data)" : ""}`}</title>
            <circle cx={p.x} cy={p.y} r={62} fill={here ? C.brandSoft : "#fff"} stroke={here ? BRAND : b.ours ? C.blue : C.dot} strokeWidth={2.5} />
            {lines.map((l, j) => (
              <text key={j} x={p.x} y={p.y - 10 - (lines.length - 1) * 8 + j * 17} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>{l}</text>
            ))}
            <text x={p.x} y={p.y + 20} textAnchor="middle" fontSize={12.5} fill={C.text}>
              {b.partial && !others ? "members unknown" : knows ? `knows ${knows} of ${others}` : `${others} others`}
            </text>
            <text x={p.x} y={p.y + 37} textAnchor="middle" fontSize={12} fontWeight={600} fill={here ? BRAND : C.blue}>
              {here ? "this company" : open ? "open board ›" : ""}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={64} fill={BRAND} />
      {wrap(circle.name, 13).map((l, j, arr) => (
        <text key={j} x={cx} y={cy + 6 - (arr.length - 1) * 9 + j * 18} textAnchor="middle" fontSize={16.5} fontWeight={700} fill="#fff">{l}</text>
      ))}
    </svg>
  );
}

function CircleList({ circle, thisCik, showAll, onPerson, onBoard }: {
  circle: Circle; thisCik: string; showAll: boolean; onPerson: (f: Fellow) => void; onBoard: (cik: string) => void;
}) {
  return (
    <>
      {circle.boards.map((b) => {
        const known = b.members.filter((f) => f.ties.length), rest = b.members.filter((f) => !f.ties.length);
        return (
          <section key={b.key} className="border-b border-gray-200 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {b.ours && b.cik
                ? <button type="button" onClick={() => onBoard(b.cik!)} className="text-left text-[15px] font-semibold text-gray-900 hover:text-[#931638] hover:underline">{b.company}</button>
                : <span className="text-[15px] font-semibold text-gray-900">{b.company}</span>}
              {b.cik === thisCik && <Tag kind="brand">this company</Tag>}
              {b.partial && <Tag kind="grey">{b.members.length ? "partly known" : "members unknown"}</Tag>}
            </div>
            <div className="text-[13px] text-gray-600">{circle.name}: {b.role}</div>
            {!!known.length && (
              <ul className="mt-2 space-y-2.5">
                {known.map((f) => (
                  <li key={f.key}>
                    <PersonName f={f} onPerson={onPerson} strong />
                    {f.ties.map((t) => <TieDetail key={t.key} t={t} a={circle.name} b={f.name} />)}
                  </li>
                ))}
              </ul>
            )}
            {showAll && !!rest.length && (
              <ul className="mt-2 space-y-0.5">
                {rest.map((f) => <li key={f.key}><PersonName f={f} onPerson={onPerson} /></li>)}
              </ul>
            )}
            {!showAll && !!rest.length && (
              <p className="mt-2 text-[13px] text-gray-500">
                {known.length ? "+ " : ""}{plural(rest.length, "other member")} with no shared company
              </p>
            )}
            {!b.members.length && (
              <p className="mt-2 text-[13px] text-gray-500">
                {b.partial ? `${b.company}'s proxy is not in our data, so only ${circle.name}'s seat is known.` : "No one else is listed."}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}

function PersonName({ f, onPerson, strong }: { f: Fellow; onPerson: (f: Fellow) => void; strong?: boolean }) {
  const cls = strong ? "text-[14px] font-semibold text-gray-900" : "text-[13.5px] text-gray-700";
  return f.home
    ? <button type="button" onClick={() => onPerson(f)} className={`text-left hover:text-[#931638] hover:underline ${cls}`}>{f.name}</button>
    : <span className={cls}>{f.name}</span>;
}

// ─── One whole board ────────────────────────────────────────────────────────────────────────

function RingMap({ data, onPerson }: { data: BoardConnectionsData; onPerson: (key: string) => void }) {
  const [hot, setHot] = useState<Set<number> | null>(null);
  const W = 960, H = 660, cx = W / 2, cy = H / 2, R = 235;
  const n = data.members.length;
  const pos = useMemo(() => new Map(data.members.map((m, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(n, 1);
    return [m.key, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a }];
  })), [data.members, n, cx, cy]);
  // each shared company on an inner ring, at the angle of its people, a fixed gap apart
  const boxes = useMemo(() => {
    const ang = data.shared.map((g) => {
      const ps = g.people.map((p) => pos.get(p.key)!).filter(Boolean);
      return Math.atan2(ps.reduce((s, p) => s + p.y - cy, 0), ps.reduce((s, p) => s + p.x - cx, 0));
    });
    const k = data.shared.length, Ri = Math.max(R * 0.42, (k * 124) / (2 * Math.PI)), gap = Math.min(124 / Ri, (2 * Math.PI) / Math.max(k, 1));
    const order = ang.map((_, i) => i).sort((i, j) => ang[i] - ang[j]);
    const placed: number[] = [];
    order.forEach((i, j) => placed.push(j ? Math.max(ang[i], placed[j - 1] + gap) : ang[i]));
    const shift = (order.reduce((s, i) => s + ang[i], 0) - placed.reduce((s, a) => s + a, 0)) / Math.max(k, 1);
    const out = new Array<{ x: number; y: number }>(k);
    order.forEach((i, j) => { const a = placed[j] + shift; out[i] = { x: cx + Ri * Math.cos(a), y: cy + Ri * Math.sin(a) }; });
    return out;
  }, [data.shared, pos, cx, cy]);
  const linked = new Set(data.shared.flatMap((g) => g.people.map((p) => p.key)));
  const lit = (i: number) => !hot || hot.has(i);
  const personLit = (key: string) => !hot || data.shared.some((g, i) => hot.has(i) && g.people.some((p) => p.key === key));
  const groupsOf = (key: string) => new Set(data.shared.map((g, i) => (g.people.some((p) => p.key === key) ? i : -1)).filter((i) => i >= 0));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${data.company}: who knows whom`}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.line} strokeWidth={1.5} />
      {data.shared.map((g, i) => g.people.map((p) => {
        const a = pos.get(p.key);
        return a && <line key={`${i}-${p.key}`} x1={a.x} y1={a.y} x2={boxes[i].x} y2={boxes[i].y} stroke={KIND[g.kind].color}
                          strokeWidth={hot && lit(i) ? 3 : 2.2} strokeDasharray={KIND[g.kind].dash} strokeLinecap="round"
                          opacity={lit(i) ? 1 : 0.12} />;
      }))}
      {data.shared.map((g, i) => {
        const lines = wrap(bare(g.company), 16), w = Math.max(96, Math.max(...lines.map((l) => l.length)) * 8.6 + 28), h = lines.length * 18 + 24;
        return (
          <g key={`g${i}`} opacity={lit(i) ? 1 : 0.25} onMouseEnter={() => setHot(new Set([i]))} onMouseLeave={() => setHot(null)}>
            <title>{`${g.company}: ${g.people.length} directors`}</title>
            <rect x={boxes[i].x - w / 2} y={boxes[i].y - h / 2} width={w} height={h} rx={9} fill={C.org} stroke={KIND[g.kind].color} strokeWidth={1.8} />
            {lines.map((l, j) => (
              <text key={j} x={boxes[i].x} y={boxes[i].y - h / 2 + 19 + j * 18} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.orgInk}>{l}</text>
            ))}
            <text x={boxes[i].x} y={boxes[i].y + h / 2 - 7} textAnchor="middle" fontSize={11.5} fill={C.text}>{g.people.length} directors</text>
          </g>
        );
      })}
      {data.members.map((m) => {
        const q = pos.get(m.key)!, on = linked.has(m.key);
        const right = Math.cos(q.a) > 0.25, left = Math.cos(q.a) < -0.25;
        const tx = right ? q.x + 30 : left ? q.x - 30 : q.x, anchor = right ? "start" : left ? "end" : "middle";
        const ty = !right && !left ? (Math.sin(q.a) < 0 ? q.y - 38 : q.y + 42) : q.y - 2;
        return (
          <g key={m.key} className="cursor-pointer" opacity={personLit(m.key) ? 1 : 0.25} onClick={() => onPerson(m.key)}
             onMouseEnter={() => { const s = groupsOf(m.key); if (s.size) setHot(s); }} onMouseLeave={() => setHot(null)}>
            <circle cx={q.x} cy={q.y} r={23} fill={on ? C.blueMid : "#fff"} stroke={on ? C.blue : C.dot} strokeWidth={2} />
            <text x={q.x} y={q.y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={on ? C.blue : C.muted}>{initials(m.name)}</text>
            <text x={tx} y={ty} textAnchor={anchor} fontSize={14} fontWeight={on ? 700 : 500} fill={on ? C.ink : C.muted}>{short(m.name, 26)}</text>
            {m.role && m.role !== "Director" && <text x={tx} y={ty + 16} textAnchor={anchor} fontSize={12} fill={C.text}>{short(m.role, 30)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function RingList({ data, onPerson }: { data: BoardConnectionsData; onPerson: (key: string) => void }) {
  const name = new Map(data.members.map((m) => [m.key, m.name]));
  const linked = new Set(data.shared.flatMap((g) => g.people.map((p) => p.key)));
  const alone = data.members.filter((m) => !linked.has(m.key));
  return (
    <>
      {!data.shared.length && <p className="px-5 py-4 text-sm text-gray-700">No two directors of {data.company} share another company in our data.</p>}
      {data.shared.map((g) => (
        <section key={g.key} className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-gray-900">{g.company}<Tag kind={g.kind}>{KIND[g.kind].label}</Tag></div>
          <div className="text-[13px] text-gray-600">{g.kind === "now" ? `All sit on ${bare(g.company)}'s board now` : `All worked at ${bare(g.company)} at some time`}</div>
          <ul className="mt-2 space-y-1">
            {g.people.map((p) => (
              <li key={p.key} className="text-[13.5px] text-gray-700">
                <button type="button" onClick={() => onPerson(p.key)} className="font-semibold text-gray-900 hover:text-[#931638] hover:underline">{name.get(p.key)}</button>
                {p.role && <> · {p.role}</>}
              </li>
            ))}
          </ul>
          <div className="mt-1.5"><SourceLink sources={g.people.map((p) => p.source || null)} /></div>
        </section>
      ))}
      {!!alone.length && (
        <section className="px-5 py-4 text-[13.5px] text-gray-700">
          <div className="mb-1 font-semibold text-gray-700">No shared company ({alone.length})</div>
          {alone.map((m, i) => (
            <span key={m.key}>{i > 0 && ", "}
              <button type="button" onClick={() => onPerson(m.key)} className="hover:text-[#931638] hover:underline">{m.name}</button></span>
          ))}
        </section>
      )}
    </>
  );
}

// ─── Filters ────────────────────────────────────────────────────────────────────────────────

type Kinds = Record<Kind, boolean>;
const keepTies = (ties: Tie[], kinds: Kinds) => ties.filter((t) => kinds[t.kind]);
const filterCircle = (c: Circle, kinds: Kinds): Circle => ({
  ...c, boards: c.boards.map((b) => ({ ...b, members: b.members.map((f) => ({ ...f, ties: keepTies(f.ties, kinds) }))
    .sort((x, y) => Number(!x.ties.length) - Number(!y.ties.length)) })),
});
const filterBoard = (d: BoardConnectionsData, kinds: Kinds): BoardConnectionsData => ({ ...d, shared: d.shared.filter((g) => kinds[g.kind]) });

// ─── The window ─────────────────────────────────────────────────────────────────────────────

/** A director (their circle, read from one board's answer) or a whole board. */
export type ConnectionsFocus = { kind: "person"; key: string; cik: string } | { kind: "board"; cik: string };

export function BoardConnectionsModal({ start, startName, thisCik, onClose, onProfile }: {
  start: ConnectionsFocus;
  /** the director the window opened on, as this proxy prints them (for the title while loading) */
  startName?: string;
  thisCik: string; onClose: () => void; onProfile?: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);
  const [trail, setTrail] = useState<ConnectionsFocus[]>([start]);
  const [boards, setBoards] = useState<Record<string, BoardConnectionsData>>({});
  const [failed, setFailed] = useState<string | null>(null);
  // the other members of each board, besides the people the director knows: hidden by default
  const [showAll, setShowAll] = useState(false);
  // which links count: sitting together now, a past workplace in common
  const [kinds, setKinds] = useState<Kinds>({ now: true, worked: true });
  const focus = trail[trail.length - 1];

  useEffect(() => {
    closeButton.current?.focus();
    const frame = window.requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // the board whose answer the focus is read from
  useEffect(() => {
    if (boards[focus.cik]) return;
    let cancelled = false;
    setFailed(null);
    loadConnections(focus.cik).then((d) => { if (!cancelled) setBoards((b) => ({ ...b, [focus.cik]: d })); },
                                    (e) => { if (!cancelled) setFailed(String(e?.message || e)); });
    return () => { cancelled = true; };
  }, [focus.cik, boards]);

  const raw = boards[focus.cik];
  // the window may open before the answer is in: the director is then found by name
  const keyOf = (f: ConnectionsFocus) => (f.kind !== "person" ? "" : f.key
    || boards[f.cik]?.members.find((m) => m.name === startName)?.key || "");
  const rawCircle = raw && focus.kind === "person" ? raw.people[keyOf(focus)] : undefined;
  const circle = rawCircle && filterCircle(rawCircle, kinds);
  const data = raw && filterBoard(raw, kinds);
  const go = (f: ConnectionsFocus) => {
    const same = focus.kind === f.kind && focus.cik === f.cik && (f.kind === "board" || (focus.kind === "person" && keyOf(focus) === f.key));
    if (!same) setTrail((t) => [...t, f]);
  };
  const toPerson = (f: Fellow) => f.home && go({ kind: "person", key: f.key, cik: f.home });
  const toBoard = (cik: string) => go({ kind: "board", cik });
  const label = (f: ConnectionsFocus) => {
    const d = boards[f.cik];
    if (f.kind === "board") return d ? `${bare(d.company)} board` : "Board";
    return d?.people[keyOf(f)]?.name || startName || "Director";
  };

  // how many links of each kind there are here, for the filter buttons
  const counts: Record<Kind, number> = { now: 0, worked: 0 };
  if (rawCircle && focus.kind === "person") {
    rawCircle.boards.forEach((b) => b.members.forEach((f) => (["now", "worked"] as Kind[]).forEach((k) => {
      if (f.ties.some((t) => t.kind === k)) counts[k] += 1;
    })));
  } else if (raw) {
    raw.shared.forEach((g) => { counts[g.kind] += 1; });
  }

  let title = "", summary = "";
  if (data && focus.kind === "board") {
    const linked = new Set(data.shared.flatMap((g) => g.people.map((p) => p.key))).size;
    title = `${data.company} — current board`;
    summary = data.shared.length
      ? `${linked} of ${data.members.length} directors on this board already know each other, through ${plural(data.shared.length, "shared company", "shared companies")}.`
      : `No two of the ${data.members.length} directors on this board share another company${kinds.now && kinds.worked ? "" : " of this kind"}.`;
  } else if (circle) {
    const known = circle.boards.reduce((s, b) => s + b.members.filter((f) => f.ties.length).length, 0);
    title = circle.name;
    summary = `${circle.name} sits on ${plural(circle.boards.length, "board")} now. On ${circle.boards.length === 1 ? "it" : "them"}, `
      + (known ? `${surname(circle.name)} already knows ${plural(known, "director")}.` : `${surname(circle.name)} shares no company with the other directors${kinds.now && kinds.worked ? "" : " of this kind"}.`);
  } else {
    title = startName || "Board connections";
  }

  const chip = (k: Kind) => (
    <button key={k} type="button" aria-pressed={kinds[k]}
            onClick={() => setKinds((s) => (s[k] && !s[k === "now" ? "worked" : "now"] ? s : { ...s, [k]: !s[k] }))}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition"
            style={kinds[k] ? { borderColor: KIND[k].color, background: KIND[k].soft, color: KIND[k].color } : { borderColor: "#e5e7eb", color: "#6b7280" }}>
      <svg width="22" height="8" aria-hidden="true"><path d="M1 4 H21" stroke={kinds[k] ? KIND[k].color : "#9ca3af"} strokeWidth="2.4" strokeDasharray={KIND[k].dash} /></svg>
      {KIND[k].label} ({counts[k]})
    </button>
  );

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-colors duration-200 ${shown ? "bg-black/30" : "bg-black/0"}`}
         onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${title}: board connections`} onClick={(e) => e.stopPropagation()}
           className={`flex h-[92vh] w-full max-w-[1320px] flex-col overflow-hidden rounded-xl bg-white text-gray-900 shadow-2xl transition duration-200 ${shown ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"}`}>
        <div className="flex items-start gap-3 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            {circle?.position && focus.kind === "person" && <div className="text-[13.5px] text-gray-600">{circle.position}</div>}
            {summary && <p className="mt-1 text-[14px] text-gray-800">{summary}</p>}
          </div>
          <button ref={closeButton} type="button" aria-label="Close" onClick={onClose}
                  className="ml-auto rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-[#931638] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#931638]/40">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-6 py-2.5 text-[13px] text-gray-600">
          {trail.length > 1 && (
            <>
              <button type="button" onClick={() => setTrail((t) => t.slice(0, -1))}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-gray-700 hover:border-[#931638]/40 hover:text-[#931638]">
                <ArrowLeft size={13} /> Back
              </button>
              <nav aria-label="Path" className="flex min-w-0 flex-wrap items-center gap-1">
                {trail.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
                    {i === trail.length - 1
                      ? <span className="font-semibold text-gray-900">{label(f)}</span>
                      : <button type="button" onClick={() => setTrail((t) => t.slice(0, i + 1))} className="hover:text-[#931638] hover:underline">{label(f)}</button>}
                  </span>
                ))}
              </nav>
            </>
          )}
          {raw && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-gray-500">Show links:</span>
              {chip("now")}{chip("worked")}
              {focus.kind === "person" && circle && (
                <button type="button" onClick={() => setShowAll((v) => !v)} aria-pressed={showAll}
                        className={`rounded-full border px-3 py-1 text-[13px] font-medium ${showAll ? "border-gray-700 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-700 hover:border-gray-400"}`}>
                  {showAll ? "Hide other members" : "Show other members"}
                </button>
              )}
            </div>
          )}
        </div>

        {!data ? (
          <div className="flex-1 px-6 py-6 text-sm text-gray-700">
            {failed
              ? <p>The board connections could not be loaded ({failed}).</p>
              : <span className="inline-flex items-center gap-2" role="status"><Loader2 size={16} className="animate-spin" style={{ color: BRAND }} /> Loading connections…</span>}
          </div>
        ) : focus.kind === "person" && !circle ? (
          <div className="flex-1 px-6 py-6 text-sm text-gray-700">
            {startName || "This director"} is not on {data.company}'s current board (they have left it), so there are no current connections to show.
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-h-0 overflow-y-auto px-3 py-1">
              {focus.kind === "board"
                ? <RingMap key={focus.cik} data={data} onPerson={(key) => go({ kind: "person", key, cik: focus.cik })} />
                : <CircleMap circle={circle!} thisCik={thisCik} showAll={showAll} onPerson={toPerson} onBoard={toBoard} />}
            </div>
            <aside className="min-h-0 overflow-y-auto border-t border-gray-200 bg-gray-50/70 lg:border-l lg:border-t-0">
              <div className="border-b border-gray-200 px-5 py-3">
                <h4 className="text-[15px] font-semibold text-gray-900">
                  {focus.kind === "board" ? "Who knows whom, and how" : `Where ${surname(circle!.name)} sits now, and who they know`}
                </h4>
              </div>
              {focus.kind === "board"
                ? <RingList data={data} onPerson={(key) => go({ kind: "person", key, cik: focus.cik })} />
                : <CircleList circle={circle!} thisCik={thisCik} showAll={showAll} onPerson={toPerson} onBoard={toBoard} />}
            </aside>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-gray-200 bg-gray-50/70 px-6 py-3 text-[12.5px] text-gray-600">
          <span className="inline-flex items-center gap-1.5"><svg width="26" height="8" aria-hidden="true"><path d="M1 4 H25" stroke={C.blue} strokeWidth="2.4" /></svg>{KIND.now.long}</span>
          <span className="inline-flex items-center gap-1.5"><svg width="26" height="8" aria-hidden="true"><path d="M1 4 H25" stroke={C.violet} strokeWidth="2.4" strokeDasharray={KIND.worked.dash} /></svg>{KIND.worked.long}</span>
          <span className="text-gray-500">Current boards and directors only. Read from each company's latest proxy statement.</span>
          {onProfile && focus.kind === "person" && trail.length === 1 && (
            <button type="button" onClick={() => { onClose(); onProfile(); }} className="ml-auto shrink-0 font-medium text-[#931638] hover:underline">
              Full profile
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
