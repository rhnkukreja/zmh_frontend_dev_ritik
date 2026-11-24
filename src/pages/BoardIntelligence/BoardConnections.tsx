// ─── Board connections: who on a board already knows whom (/api/board-intel/connections) ─────
//
// The "Board network" pill under a director opens a window: the director on the left, the boards
// they sit on now to their right, and beside each board the people there they already know. Two
// kinds of link, told apart by the line:
//   - together now (solid): both sit on another board today (read from that board's own proxy);
//   - past workplace (dashed): both worked at, or sat on the board of, the same company at some
//     time (read from the career history in their proxy biographies -- years are rarely printed).
// Each shared company has its own colour, the same in the picture and in the list beside it.
// A board opens as a ring: everyone on it, and the companies two or more of them share. Opened
// from a director, the ring highlights that director and the people they are linked to.
// Boards a director has left are listed apart from the ones they sit on now, in a dashed outline.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, ChevronRight, ExternalLink, Loader2, X } from "lucide-react";
import { baseURL } from "@/constant";

// the Django API, which passes the call to FastAPI. Asked unprompted when the board table is drawn, so it
// is a plain request with the login, not the shared service (that shows every failure as a toast).
const BASE = `${baseURL}/api/board-intel`;
const BRAND = "#931638";
const C = {
  ink: "#111827", text: "#374151", muted: "#4b5563", dot: "#9aa5b1", line: "#e5e7eb",
  slate: "#475569", slateSoft: "#e8edf3", brandSoft: "#f8eef1", former: "#fafafa",
} as const;

// One colour per shared company, handed out in this fixed order and never cycled: a ninth company
// in one picture is drawn in grey. Checked for colour-blind separation (worst adjacent pair ΔE 9.1)
// on white; three of them are light, so every company is always named beside its colour.
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"] as const;
const OTHER = "#6b7280";

// ─── The answer ─────────────────────────────────────────────────────────────────────────────

/** The proxy statement a fact was read from. */
type Source = { company: string | null; url: string | null; filed: string | null } | null;
type Kind = "now" | "worked";
/** What two people share: a board both sit on now, or a company both were at (any years). Roles and
 *  sources are the first person's, then the second's. */
export type Tie = { key: string; company: string; ticker: string | null; kind: Kind; roles?: string[]; sources?: Source[] };
/** `linkHidden`: they share a company with the director, but only of a kind of link switched off. */
type Fellow = { key: string; name: string; position?: string | null; home: string | null; ties: Tie[]; linkHidden?: boolean };
type CircleBoard = {
  key: string; company: string; ticker: string | null; cik: string | null; ours: boolean; role: string;
  /** a board whose proxy we do not hold: only the people our proxies' biographies name on it */
  partial: boolean; members: Fellow[];
  /** the support this director won at this board's last annual meeting (its 8-K Item 5.07) */
  support?: number | null; meeting_date?: string | null; vote_url?: string | null;
};
/** A board the director has left. */
type FormerBoard = {
  key: string; company: string; ticker: string | null; cik: string | null; ours: boolean;
  period?: string | null; left?: string | null; source?: Source;
};
type Circle = {
  key: string; name: string; position?: string | null; boards: CircleBoard[];
  /** the director's name as other proxies print it */
  aka?: string[]; former?: FormerBoard[];
};
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
function loadConnections(cik: string): Promise<BoardConnectionsData> {
  if (!cache.has(cik)) {
    const ask = async (tries: number): Promise<BoardConnectionsData> => {
      const res = await fetch(`${BASE}/connections/${cik}`, {
        headers: { Accept: "application/json", Authorization: `JWT ${localStorage.getItem("token") || ""}` },
      });
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
    if (!cik) return;                     // not shown to this user: nothing to load
    loadConnections(cik).then((data) => { if (!cancelled) setState({ data, failed: false }); },
                              () => { if (!cancelled) setState({ data: null, failed: true }); });
    return () => { cancelled = true; };
  }, [cik]);
  return state;
}

// ─── Colours: one per shared company ────────────────────────────────────────────────────────

type Paint = (companyKey: string) => string;

/** A colour for each company in this picture, in the order given. A company keeps the colour it had
 *  in an earlier picture of this window when that colour is free here; the ninth and later are
 *  grey. The colour follows the company, so hiding one kind of link never repaints the rest. */
function assignColours(keys: string[], memory: Map<string, number>): Paint {
  const slot = new Map<string, number>(), taken = new Set<number>();
  const unique = Array.from(new Set(keys));
  for (const k of unique) {
    const had = memory.get(k);
    if (had !== undefined && !taken.has(had)) { slot.set(k, had); taken.add(had); }
  }
  for (const k of unique) {
    if (slot.has(k)) continue;
    const free = SERIES.findIndex((_, i) => !taken.has(i));
    if (free < 0) continue;
    slot.set(k, free); taken.add(free); memory.set(k, free);
  }
  return (k) => (slot.has(k) ? SERIES[slot.get(k)!] : OTHER);
}
/** The colour as a faint background (8% strength). Pure. */
const soft = (hex: string) => `${hex}14`;
/** The colour darkened until it reads as text on white (contrast 4.5:1): the light colours of the set
 *  (yellow, green, pink) are lines and dots, too pale for a name. Pure. */
function textColour(hex: string) {
  const lum = (c: number[]) => {
    const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  let c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  while (1.05 / (lum(c) + 0.05) < 4.5) c = c.map((v) => Math.round(v * 0.9));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// ─── Words ──────────────────────────────────────────────────────────────────────────────────

const KIND = {
  // "now" is ANOTHER board: everyone on a board already sits on it together (measured: Schumacher, on
  // CrowdStrike with Austin, read as not "together now" under the old label)
  now: { label: "Also on another board now", long: "Also sit on another board together now", dash: undefined as string | undefined },
  worked: { label: "Worked together before", long: "Worked at the same company before (years not printed)", dash: "7 5" },
} as const;

/** "Carrier Global Corporation" -> "Carrier Global". Pure. */
const bare = (s: string) => s.replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Company|Co\.?|plc|Ltd\.?|LLP|L\.P\.|N\.V\.|S\.A\.)$/i, "")
  .replace(/,?\s+(Inc\.?|Corporation|Corp\.?|Company|Co\.?|Holdings)$/i, "").replace(/\s*&$/, "").trim() || s;
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

/** Up to `maxLines` lines of about `max` characters, the last one shortened when the text runs over. Pure. */
const wrapLines = (s: string, max: number, maxLines: number) => {
  const out: string[] = [];
  let cur = "";
  for (const w of s.split(" ")) {
    if ((`${cur} ${w}`).trim().length > max && cur) { out.push(cur); cur = w; } else cur = `${cur} ${w}`.trim();
  }
  if (cur) out.push(cur);
  if (out.length > maxLines) out[maxLines - 1] = `${out[maxLines - 1].slice(0, max - 1)}…`;
  return out.slice(0, maxLines);
};

const CHAR_WIDTH = 0.6;              // a bold character's width as a share of the font size
const LINE_HEIGHT = 1.15;

/** The largest font, from `sizes`, at which a name wraps into a circle of radius `r`, each line no wider
 *  than the circle at its height, leaving `below` pixels under the name for a second line of text. Pure. */
function fitInCircle(name: string, r: number, sizes: number[], below = 0) {
  for (const fs of sizes) {
    const maxChars = Math.floor((2 * r * 0.84) / (fs * CHAR_WIDTH));
    for (const n of [1, 2, 3]) {
      const lines = wrapLines(name, maxChars, n);
      if (lines.join(" ").length < name.length && n < 3) continue;
      const block = lines.length * fs * LINE_HEIGHT;
      const top = -(block + below) / 2;
      const fits = lines.every((l, j) => {
        const y = Math.max(Math.abs(top + j * fs * LINE_HEIGHT), Math.abs(top + (j + 1) * fs * LINE_HEIGHT));
        const chord = 2 * Math.sqrt(Math.max(r * r - y * y, 0)) * 0.9;
        return l.length * fs * CHAR_WIDTH <= chord;
      });
      if (fits) return { lines, fs, top };
    }
  }
  const fs = sizes[sizes.length - 1];
  const lines = wrapLines(name, Math.floor((2 * r * 0.84) / (fs * CHAR_WIDTH)), 3);
  return { lines, fs, top: -(lines.length * fs * LINE_HEIGHT + below) / 2 };
}

/** A shared company's card in the ring: its name lines and size. Pure. */
function cardOf(company: string) {
  const lines = wrap(bare(company), 16);
  return { lines, w: Math.max(96, Math.max(...lines.map((l) => l.length)) * 8.6 + 28), h: lines.length * 18 + 24 };
}

const CARD_GAP = 24;                 // space kept between two cards
const RING_MARGIN = 34;              // a card keeps this far inside the ring, clear of the directors' circles
const LINE_PAD = 6;                  // a line closer than this to a card runs under it
const CROSS_COST = 400;              // a line crossing another card's line, counted as this many pixels of line
const UNDER_COST = 600;              // a line running under a card
const ROTATIONS = 24;                // turns of the slot pattern tried
const MAX_EXACT = 5;                 // up to this many cards every assignment to the slots is tried; more: one by one
const SEPARATE_STEPS = 200;          // the last passes: two cards still touching are pushed apart

type Pt = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };

/** Two segments cross (meeting at a shared end, a director, is not a crossing). Pure. */
function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt) {
  const same = (p: Pt, q: Pt) => Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5;
  if (same(a, c) || same(a, d) || same(b, c) || same(b, d)) return false;
  const turn = (p: Pt, q: Pt, r: Pt) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0;
}

/** A segment passes through a box grown by `pad` on every side (Liang-Barsky clipping). Pure. */
function segmentHitsBox(a: Pt, b: Pt, box: Box, pad: number) {
  const x0 = box.x - box.w / 2 - pad, x1 = box.x + box.w / 2 + pad, y0 = box.y - box.h / 2 - pad, y1 = box.y + box.h / 2 + pad;
  const dx = b.x - a.x, dy = b.y - a.y;
  let lo = 0, hi = 1;
  for (const [p, q] of [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]] as const) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
    if (lo > hi) return false;
  }
  return true;
}

/** Slots spread evenly over the inside of the ring for `k` cards: one in the middle and the rest evenly round
 *  an inner circle of radius `r` (two cards: either side of the middle), the pattern turned by `turn`. Pure. */
function slotsFor(k: number, r: number, turn: number): Pt[] {
  if (k === 1) return [{ x: 0, y: 0 }];
  const round = k <= 5 ? k : k - 1;
  const ring = Array.from({ length: round }, (_, i) => {
    const a = turn + (i * 2 * Math.PI) / round;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
  return k <= 5 ? ring : [{ x: 0, y: 0 }, ...ring];
}

/** What an arrangement costs: its lines' length, and a great deal for each line crossing another card's
 *  line or running under another card. Pure. */
function arrangementCost(at: Pt[], sizes: { w: number; h: number }[], ends: Pt[][]) {
  const lines = at.flatMap((p, i) => (ends[i] || []).map((e) => ({ i, a: p, b: e })));
  let cost = lines.reduce((s, l) => s + Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y), 0);
  for (let m = 0; m < lines.length; m++) {
    for (let n = m + 1; n < lines.length; n++) {
      if (lines[m].i !== lines[n].i && segmentsCross(lines[m].a, lines[m].b, lines[n].a, lines[n].b)) cost += CROSS_COST;
    }
    at.forEach((p, k) => {
      if (k !== lines[m].i && segmentHitsBox(lines[m].a, lines[m].b, { ...p, ...sizes[k] }, LINE_PAD)) cost += UNDER_COST;
    });
  }
  return cost;
}

/** Every order of 0..n-1 (n small). Pure. */
function orders(n: number): number[][] {
  if (n <= 1) return [Array.from({ length: n }, (_, i) => i)];
  return orders(n - 1).flatMap((o) => Array.from({ length: n }, (_, k) => [...o.slice(0, k), n - 1, ...o.slice(k)]));
}

/** Where each shared company's card sits inside a ring of radius `ringR` (relative to its centre). The cards
 *  fill the ring evenly: one slot in the middle and the rest evenly round an inner circle (slotsFor), so no
 *  part of the ring is left empty while the cards bunch in another (measured: CrowdStrike, all three cards
 *  in its top half). The pattern is tried at ROTATIONS turns and, up to MAX_EXACT cards, with every
 *  assignment of cards to slots; the arrangement with the shortest lines to each card's directors (`ends`)
 *  and the fewest crossing lines and lines under cards is kept. More cards are placed one by one, each in
 *  the cheapest free slot. Two cards still touching are then pushed apart. `starts` is unused for the
 *  layout and kept for the caller's signature. Deterministic: the same board always draws the same way. Pure. */
function placeCards(starts: Pt[], sizes: { w: number; h: number }[], ringR: number, ends: Pt[][] = []) {
  const k = sizes.length;
  if (!k) return [];
  const limit = ringR - RING_MARGIN;
  const halfDiag = Math.max(...sizes.map((s) => Math.hypot(s.w, s.h) / 2));
  const widest = Math.max(...sizes.map((s) => s.w));
  const round = k <= 5 ? k : k - 1;
  const spacing = round > 1 ? (widest + CARD_GAP) / (2 * Math.sin(Math.PI / round)) : 0;
  const r = Math.max(0, Math.min(limit - halfDiag, Math.max(0.65 * limit, spacing)));
  let best: { at: Pt[]; cost: number } | null = null;
  for (let t = 0; t < ROTATIONS; t++) {
    const slots = slotsFor(k, r, (t * 2 * Math.PI) / ROTATIONS);
    if (k <= MAX_EXACT) {
      for (const o of orders(k)) {
        const at = o.map((s) => slots[s]);
        const cost = arrangementCost(at, sizes, ends);
        if (!best || cost < best.cost) best = { at, cost };
      }
    } else {
      // most directors first, each to the free slot that costs least with the cards already placed
      const order = sizes.map((_, i) => i).sort((i, j) => (ends[j]?.length || 0) - (ends[i]?.length || 0) || i - j);
      const at: Pt[] = starts.map((s) => ({ ...s }));
      const free = new Set(slots.map((_, i) => i));
      const done: number[] = [];
      for (const i of order) {
        let pick = -1, pickCost = Infinity;
        for (const s of free) {
          at[i] = slots[s];
          const c = arrangementCost([...done, i].map((j) => at[j]), [...done, i].map((j) => sizes[j]), [...done, i].map((j) => ends[j] || []));
          if (c < pickCost) { pick = s; pickCost = c; }
        }
        at[i] = slots[pick];
        free.delete(pick);
        done.push(i);
      }
      const cost = arrangementCost(at, sizes, ends);
      if (!best || cost < best.cost) best = { at, cost };
    }
  }
  const p = best!.at.map((q) => ({ ...q }));
  for (let step = 0; step < SEPARATE_STEPS; step++) {
    let moved = false;
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const dx = p[j].x - p[i].x, dy = p[j].y - p[i].y;
        const ox = (sizes[i].w + sizes[j].w) / 2 + CARD_GAP - Math.abs(dx);
        const oy = (sizes[i].h + sizes[j].h) / 2 + CARD_GAP - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) { const push = (ox / 2) * (dx >= 0 ? 1 : -1); p[i].x -= push; p[j].x += push; }
        else { const push = (oy / 2) * (dy >= 0 ? 1 : -1); p[i].y -= push; p[j].y += push; }
      }
    }
    p.forEach((q, i) => {
      const lim = Math.max(limit - Math.hypot(sizes[i].w, sizes[i].h) / 2, 0), d = Math.hypot(q.x, q.y);
      if (d > lim) { q.x *= lim / d; q.y *= lim / d; }
    });
    if (!moved) break;
  }
  return p;
}

function Tag({ kind, children }: { kind: "grey" | "brand"; children: React.ReactNode }) {
  const s = kind === "brand" ? { color: BRAND, background: C.brandSoft } : { color: C.muted, background: "#eef0f3" };
  return <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={s}>{children}</span>;
}

/** A short piece of the line a link is drawn with: its company's colour, solid (now) or dashed (past). */
function LineSample({ color, kind, width = 22 }: { color: string; kind: Kind; width?: number }) {
  return (
    <svg width={width} height="8" aria-hidden="true" className="shrink-0">
      <path d={`M1 4 H${width - 1}`} stroke={color} strokeWidth="2.6" strokeDasharray={kind === "worked" ? "5 3" : undefined} strokeLinecap="round" />
    </svg>
  );
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

/** One link, spelt out: what they share, and where we read it. In neutral grey: on a director's page the
 *  colour belongs to the person, and the line says only now (solid) or past (dashed). */
function TieDetail({ t }: { t: Tie }) {
  return (
    <div className="mt-1 rounded-md bg-gray-50 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900"><LineSample color={C.slate} kind={t.kind} width={18} />{why(t)}</div>
      {t.sources && <SourceLink sources={t.sources} />}
    </div>
  );
}

// ─── One director: on the left, their boards to the right ───────────────────────────────────

const MAP_KNOWN = 8;                 // people they know drawn beside one board; the rest are in the list
const MAP_ALL = 14;                  // the same, when the other members are shown too
const MAP_FORMER = 6;                // former boards drawn; the rest are in the list

/** The director on the left, an arrow to each board they sit on now, and beside each board the
 *  people there they already know, each with how. The other members of a board are a count unless
 *  asked for (showAll). Boards they have left sit below, in a dashed outline. */
function PersonMap({ circle, thisCik, showAll, paint, onPerson, onBoard }: {
  circle: Circle; thisCik: string; showAll: boolean; paint: Paint; onPerson: (f: Fellow) => void; onBoard: (cik: string) => void;
}) {
  const W = 960, PX = 112, PR = 62, BX = 410, BR = 58, FX = 606, TOP = 26;
  const rowH = (f: Fellow) => (f.ties.length ? 26 + 17 * Math.min(f.ties.length, 2) : 24);
  const rows = circle.boards.map((b) => {
    // the people they know, and those whose link is of a kind switched off (drawn in grey)
    const known = b.members.filter((f) => f.ties.length || f.linkHidden);
    // a board not in coverage: only the people it links them to; its other members are only
    // whoever our proxies happen to name on it (Figma: 2 of its 9), so they are never listed
    const all = showAll && !b.partial;
    const list = (all ? [...known, ...b.members.filter((f) => !f.ties.length && !f.linkHidden)] : known).slice(0, all ? MAP_ALL : MAP_KNOWN);
    const height = list.reduce((s, f) => s + rowH(f), 0);
    const more = (all ? b.members.length : known.length) - list.length;
    return { list, height, more, band: Math.max(168, height + (more > 0 ? 22 : 0) + 44) };
  });
  const tops = rows.map((_, i) => TOP + rows.slice(0, i).reduce((s, r) => s + r.band, 0));
  const boardsH = rows.reduce((s, r) => s + r.band, 0);
  const former = (circle.former || []).slice(0, MAP_FORMER), formerMore = (circle.former || []).length - former.length;
  const formerTop = TOP + boardsH + 34, FH = 46;
  const H = Math.max(440, TOP + boardsH + (former.length ? 34 + former.length * FH + (formerMore > 0 ? 22 : 0) : 0) + 24);
  const py = Math.max(TOP + PR + 8, TOP + boardsH / 2);
  // a smooth line from left to right that leaves and arrives level
  const curve = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} C${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${circle.name}: boards now, and the people they know there`}>
      <defs>
        <marker id="bc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={BRAND} />
        </marker>
      </defs>

      {/* the boards they have left: dashed, grey, no arrow */}
      {!!former.length && (
        <g>
          <text x={BX} y={formerTop - 12} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={C.muted} letterSpacing="0.06em">FORMER BOARDS</text>
          {/* one dashed line down to the group, then a short stub to each: not a line per board,
              which ran together beside the director */}
          <path d={curve(PX + PR * 0.55, py + PR * 0.84, BX - 122, formerTop + (former.length * FH) / 2 - 4)} fill="none" stroke={C.dot} strokeWidth={1.6} strokeDasharray="4 5" />
          {former.length > 1 && (
            <path d={`M${BX - 122} ${formerTop + FH / 2 - 4} V${formerTop + (former.length - 1) * FH + FH / 2 - 4}`} stroke={C.dot} strokeWidth={1.6} strokeDasharray="4 5" />
          )}
          {former.map((b, i) => {
            const y = formerTop + i * FH + FH / 2 - 4;
            return (
              <g key={b.key}>
                <title>{`${b.company}: a board ${surname(circle.name)} has left${b.period ? ` (${b.period})` : ""}`}</title>
                <path d={`M${BX - 122} ${y} H${BX - 102}`} stroke={C.dot} strokeWidth={1.6} strokeDasharray="4 5" />
                <rect x={BX - 100} y={y - 18} width={200} height={36} rx={18} fill={C.former} stroke={C.dot} strokeWidth={1.6} strokeDasharray="5 4" />
                <text x={BX} y={y + (b.period ? -1 : 5)} textAnchor="middle" fontSize={13} fontWeight={600} fill={C.muted}>{short(bare(b.company), 24)}</text>
                {b.period && <text x={BX} y={y + 13} textAnchor="middle" fontSize={11} fill={C.muted}>{short(b.period, 28)}</text>}
              </g>
            );
          })}
          {formerMore > 0 && (
            <text x={BX} y={formerTop + former.length * FH + 10} textAnchor="middle" fontSize={12.5} fill={C.muted}>+{formerMore} more in the list</text>
          )}
        </g>
      )}

      {circle.boards.map((b, i) => {
        const by = tops[i] + rows[i].band / 2, { list, height, more } = rows[i];
        const here = b.cik === thisCik, open = b.ours && !!b.cik;
        const others = b.members.length, knows = b.members.filter((f) => f.ties.length).length;
        const subLines = b.partial && knows > 0 ? 2 : 1;
        const label = fitInCircle(bare(b.company), BR, [15, 14, 13, 12, 11], subLines * 16 + 4);
        const nameBottom = by + label.top + label.lines.length * label.fs * LINE_HEIGHT;
        let y0 = by - height / 2;
        return (
          <g key={b.key}>
            <path d={curve(PX + PR + 2, py, BX - BR - 7, by)} fill="none" stroke={BRAND} strokeOpacity={0.55} strokeWidth={2.4} markerEnd="url(#bc-arrow)" />

            {list.map((f) => {
              const top = y0, y = top + 12;
              y0 += rowH(f);
              // the person's own colour, the same on every board: their name is what is clicked
              const k = f.ties.length > 0, color = k ? paint(f.key) : C.dot;
              const solid = f.ties.some((t) => t.kind === "now");
              return (
                <g key={f.key} className={f.home ? "group cursor-pointer" : undefined} onClick={f.home ? () => onPerson(f) : undefined}>
                  <title>{k ? `${f.name}: ${f.ties.map(why).join("; ")}` : f.name}</title>
                  <path d={curve(BX + BR, by, FX - 9, y)} fill="none" stroke={k ? color : C.line} strokeWidth={k ? 2.3 : 1.3}
                        strokeDasharray={k && !solid ? KIND.worked.dash : undefined} strokeLinecap="round" />
                  <circle cx={FX} cy={y} r={k ? 7 : 4.5} fill={color} stroke="#fff" strokeWidth={k ? 2 : 0} />
                  <text x={FX + 14} y={y + 5} fontSize={k ? 15 : 13.5} fontWeight={k ? 700 : 400} fill={k ? textColour(color) : C.muted}
                        className={f.home ? "group-hover:underline" : undefined}>
                    {short(f.name, 30)}
                  </text>
                  {f.ties.slice(0, 2).map((t, j) => (
                    <g key={t.key}>
                      <path d={`M${FX + 15} ${y + 18 + j * 17} H${FX + 31}`} stroke={C.slate} strokeWidth={2.2} strokeLinecap="round"
                            strokeDasharray={t.kind === "worked" ? "5 3" : undefined} />
                      <text x={FX + 37} y={y + 22 + j * 17} fontSize={12.5} fill={C.text}>
                        {short(how(t), 34)}{j === 1 && f.ties.length > 2 ? `  +${f.ties.length - 2} more` : ""}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
            {more > 0 && <text x={FX + 14} y={by + height / 2 + 18} fontSize={12.5} fill={C.muted}>+{more} more in the list</text>}

            <g className={open ? "group cursor-pointer" : undefined} onClick={open ? () => onBoard(b.cik!) : undefined}>
              <title>{open ? `Open ${b.company}'s board` : `${b.company}: not in coverage, so only the directors our proxies name on it are known`}</title>
              <circle cx={BX} cy={by} r={BR} fill={here ? C.brandSoft : "#fff"} stroke={here ? BRAND : b.ours ? C.slate : C.dot} strokeWidth={2.5}
                      strokeDasharray={b.ours ? undefined : "5 4"} className={open ? "transition-[stroke-width] group-hover:[stroke-width:4.5]" : undefined} />
              {label.lines.map((l, j) => (
                <text key={j} x={BX} y={by + label.top + (j + 1) * label.fs * LINE_HEIGHT - label.fs * 0.22}
                      textAnchor="middle" fontSize={label.fs} fontWeight={700} fill={C.ink}>{l}</text>
              ))}
              {/* a board not in coverage: how many we do not know, so no count of "others" */}
              {b.partial ? (
                <>
                  {knows > 0 && <text x={BX} y={nameBottom + 16} textAnchor="middle" fontSize={12.5} fill={C.text}>knows {knows}</text>}
                  <text x={BX} y={nameBottom + (knows > 0 ? 32 : 16)} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={C.muted}>not in coverage</text>
                </>
              ) : (
                <text x={BX} y={nameBottom + 16} textAnchor="middle" fontSize={12.5} fill={C.text}>
                  {knows ? `knows ${knows} of ${others}` : plural(others, "other")}
                </text>
              )}
            </g>
          </g>
        );
      })}

      {/* the director the window is about */}
      <circle cx={PX} cy={py} r={PR + 6} fill="none" stroke={BRAND} strokeOpacity={0.25} strokeWidth={2} />
      <circle cx={PX} cy={py} r={PR} fill={BRAND} />
      {(() => {
        const label = fitInCircle(circle.name, PR, [16, 15, 14, 13, 12]);
        return label.lines.map((l, j) => (
          <text key={j} x={PX} y={py + label.top + (j + 1) * label.fs * LINE_HEIGHT - label.fs * 0.22}
                textAnchor="middle" fontSize={label.fs} fontWeight={700} fill="#fff">{l}</text>
        ));
      })()}
    </svg>
  );
}

function PersonList({ circle, thisCik, showAll, paint, onPerson, onBoard }: {
  circle: Circle; thisCik: string; showAll: boolean; paint: Paint; onPerson: (f: Fellow) => void; onBoard: (cik: string) => void;
}) {
  return (
    <>
      {circle.boards.map((b) => {
        const known = b.members.filter((f) => f.ties.length), rest = b.members.filter((f) => !f.ties.length && !f.linkHidden);
        const hidden = b.members.filter((f) => f.linkHidden);
        const here = b.cik === thisCik;
        // each board one container, all alike: its name and the director's seat in a tinted header, the
        // people there inside; this company is told apart by its tag
        return (
          <section key={b.key} className="mx-3 my-3 overflow-hidden rounded-xl border border-[#931638]/40 bg-white shadow-sm">
            <div className="border-b border-[#931638]/20 bg-[#f8eef1] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                {b.ours && b.cik
                  ? <button type="button" onClick={() => onBoard(b.cik!)} title={`Open ${b.company}'s board`} className="text-left text-[15px] font-semibold text-gray-900 hover:text-[#931638] hover:underline">{b.company}</button>
                  : <span className="text-[15px] font-semibold text-gray-900">{b.company}</span>}
                {here && <Tag kind="brand">this company</Tag>}
                {b.partial && <Tag kind="grey">Not in coverage</Tag>}
              </div>
              {b.support != null && (
                <div className="mt-0.5 text-[13px] text-gray-700">
                  Shareholder vote: <span className="font-semibold text-gray-900">{b.support.toFixed(2)}% support</span>
                  {b.meeting_date ? ` at the ${b.meeting_date} annual meeting` : " at the last annual meeting"}
                  {b.vote_url && (
                    <> · <a href={b.vote_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline decoration-gray-300 hover:text-[#931638]">8-K vote results<ExternalLink size={10} /></a></>
                  )}
                </div>
              )}
            </div>
            <div className="px-4 py-3">
            {!!known.length && (
              <ul className="space-y-3">
                {known.map((f) => (
                  // the person's own colour, the same as their line and dot in the picture
                  <li key={f.key} className="border-l-[3px] pl-2.5" style={{ borderColor: paint(f.key) }}>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: paint(f.key) }} aria-hidden="true" />
                      <PersonName f={f} onPerson={onPerson} strong color={textColour(paint(f.key))} />
                    </div>
                    {f.ties.map((t) => <TieDetail key={t.key} t={t} />)}
                  </li>
                ))}
              </ul>
            )}
            {/* linked only by a kind switched off: still on this board with the director, named in grey */}
            {!!hidden.length && (
              <ul className={`${known.length ? "mt-3" : ""} space-y-1`}>
                {hidden.map((f) => (
                  <li key={f.key} className="border-l-[3px] border-gray-200 pl-2.5 text-[13px] text-gray-500">
                    <PersonName f={f} onPerson={onPerson} /> · link hidden by the filter above
                  </li>
                ))}
              </ul>
            )}
            {/* a board not in coverage: its other members are only whoever our proxies happen to
                name on it, so they are neither listed nor counted */}
            {showAll && !b.partial && !!rest.length && (
              <ul className="mt-2 space-y-0.5">
                {rest.map((f) => <li key={f.key}><PersonName f={f} onPerson={onPerson} /></li>)}
              </ul>
            )}
            {b.partial && !known.length && (
              <p className="mt-2 text-[13px] text-gray-500">{bare(b.company)}'s own board list has not been read, so its other directors are not shown.</p>
            )}
            {!b.partial && !b.members.length && <p className="mt-2 text-[13px] text-gray-500">No one else is listed.</p>}
            </div>
          </section>
        );
      })}
      {!!circle.former?.length && (
        <section className="px-5 py-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">Former boards<Tag kind="grey">{circle.former.length}</Tag></div>
          <div className="text-[13px] text-gray-600">Boards {surname(circle.name)} has left. They are not part of the current network.</div>
          <ul className="mt-2 space-y-1.5">
            {circle.former.map((b) => (
              <li key={b.key} className="rounded-md border border-dashed border-gray-300 bg-white px-2.5 py-1.5 text-[13.5px] text-gray-700">
                <span className="font-semibold text-gray-800">{b.company}</span>
                {(b.period || b.left) && <span className="text-gray-600"> · {b.period || `left ${b.left}`}</span>}
                {b.source && <SourceLink sources={[b.source]} />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** A person's name, opening their page when they sit on one of our boards; `color`: the person's own. */
function PersonName({ f, onPerson, strong, color }: { f: Fellow; onPerson: (f: Fellow) => void; strong?: boolean; color?: string }) {
  const cls = strong ? "text-[14.5px] font-bold text-gray-900" : "text-[13.5px] text-gray-700";
  const style = color ? { color } : undefined;
  return f.home
    ? <button type="button" onClick={() => onPerson(f)} style={style} className={`text-left hover:underline ${color ? "" : "hover:text-[#931638]"} ${cls}`}>{f.name}</button>
    : <span style={style} className={cls}>{f.name}</span>;
}

// ─── One whole board ────────────────────────────────────────────────────────────────────────

/** The directors of a board in a ring, and inside it the companies two or more of them share. Opened
 *  from a director (`selected`), that director is drawn in the brand colour; the window hands in
 *  the whole board, or -- narrowed -- only that director and the people they are linked to. */
function RingMap({ data, selected, paint, onPerson }: {
  data: BoardConnectionsData; selected?: string; paint: Paint; onPerson: (key: string) => void;
}) {
  const [hot, setHot] = useState<Set<number> | null>(null);
  
  // Animation states for both Nodes and Connections
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(() => new Set(data.members.map(m => m.key)));
  const [visibleLinks, setVisibleLinks] = useState<Set<string>>(() => new Set(data.shared.map(g => g.key)));

  // Track previous members to calculate exactly who needs to be animated in
  const prevMembersRef = useRef(data.members.map(m => m.key));

  const W = 960, H = 690, cx = W / 2, cy = H / 2, R = 232;
  const n = data.members.length;
  
  const pos = useMemo(() => new Map(data.members.map((m, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(n, 1);
    return [m.key, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a }];
  })), [data.members, n, cx, cy]);

  useEffect(() => {
    const currentKeys = data.members.map(m => m.key);
    const currentShared = data.shared.map(g => g.key);
    const prevKeys = prevMembersRef.current;
    const newKeys = currentKeys.filter(k => !prevKeys.includes(k));
    
    prevMembersRef.current = currentKeys;

    let nodesTimer: number;
    let linksTimer: number;

    if (newKeys.length > 0) {
      // while the new directors come in, only the selected director's own links stay drawn; the
      // rest of the board's links follow, one by one, once everyone is in place
      const own = new Set(data.shared.filter((g) => !!selected && g.people.some((p) => p.key === selected)).map((g) => g.key));
      setVisibleLinks(own);

      let i = 0;
      // Sequence 1: Animate Nodes
      nodesTimer = window.setInterval(() => {
        if (i < newKeys.length) {
          const keyToAdd = newKeys[i];
          setVisibleNodes(curr => new Set([...curr, keyToAdd]));
          i++;
        } else {
          window.clearInterval(nodesTimer);
          
          // Sequence 2: Animate connection lines and boxes one by one
          const rest = currentShared.filter((k) => !own.has(k));
          let j = 0;
          linksTimer = window.setInterval(() => {
            if (j < rest.length) {
              const linkToAdd = rest[j];
              setVisibleLinks(curr => new Set([...curr, linkToAdd]));
              j++;
            } else {
              window.clearInterval(linksTimer);
            }
          }, 120);
        }
      }, 100); 
    } else {
      // Instantly show everything when shrinking/loading initially
      setVisibleNodes(new Set(currentKeys));
      setVisibleLinks(new Set(currentShared));
    }
    
    return () => {
      window.clearInterval(nodesTimer);
      window.clearInterval(linksTimer);
    };
  }, [data.members, data.shared, selected]);

  const cards = useMemo(() => data.shared.map((g) => cardOf(g.company)), [data.shared]);

  const boxes = useMemo(() => {
    const k = data.shared.length;
    const starts = data.shared.map((g, i) => {
      const ps = g.people.map((p) => pos.get(p.key)).filter(Boolean) as { x: number; y: number }[];
      const x = ps.reduce((s, p) => s + p.x - cx, 0) / Math.max(ps.length, 1);
      const y = ps.reduce((s, p) => s + p.y - cy, 0) / Math.max(ps.length, 1);
      if (Math.hypot(x, y) > 12 || k === 1) return { x, y };
      // directors facing each other across the ring: no side to lean to, so spread round the middle
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / k;
      return { x: Math.cos(a) * R * 0.3, y: Math.sin(a) * R * 0.3 };
    });
    const ends = data.shared.map((g) => g.people.map((p) => pos.get(p.key)).filter(Boolean)
      .map((q) => ({ x: q!.x - cx, y: q!.y - cy })));
    return placeCards(starts, cards, R, ends).map((p) => ({ x: cx + p.x, y: cy + p.y }));
  }, [data.shared, cards, pos, cx, cy]);

  const linked = new Set(data.shared.flatMap((g) => g.people.map((p) => p.key)));
  const groupsOf = (key: string) => new Set(data.shared.map((g, i) => (g.people.some((p) => p.key === key) ? i : -1)).filter((i) => i >= 0));
  const who = selected ? data.members.find((m) => m.key === selected) : undefined;
  
  const active = hot;
  const lit = (i: number) => !active || active.has(i);
  const personLit = (key: string) => !active || data.shared.some((g, i) => active.has(i) && g.people.some((p) => p.key === key));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${data.company}: who knows whom`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.line} strokeWidth={1.5} />
        {who && data.members.length === 1 && (
          <text x={cx} y={cy} textAnchor="middle" fontSize={14.5} fill={C.muted}>
            <tspan x={cx} dy="-0.3em">No shared company with the</tspan>
            <tspan x={cx} dy="1.4em">other directors on this board</tspan>
          </text>
        )}
        {data.shared.map((g, i) => g.people.map((p) => {
          const a = pos.get(p.key);
          const isVisible = visibleLinks.has(g.key) && visibleNodes.has(p.key);
          return a && <line key={`${i}-${p.key}`} x1={a.x} y1={a.y} x2={boxes[i].x} y2={boxes[i].y} stroke={paint(g.key)}
                            strokeWidth={active && lit(i) ? 3 : 2.3} strokeDasharray={KIND[g.kind].dash} strokeLinecap="round"
                            style={{ opacity: isVisible ? (lit(i) ? 1 : 0.1) : 0, transition: "opacity 0.66s ease" }} />;
        }))}
        {data.shared.map((g, i) => {
          const { lines, w, h } = cards[i];
          const color = paint(g.key);
          const isVisible = visibleLinks.has(g.key);
          return (
            <g key={`g${i}`} style={{ opacity: isVisible ? (lit(i) ? 1 : 0.22) : 0, transition: "opacity 0.66s ease", pointerEvents: isVisible ? "auto" : "none" }} 
               onMouseEnter={() => setHot(new Set([i]))} onMouseLeave={() => setHot(null)}>
              <title>{`${g.company}: ${g.people.length} directors (${KIND[g.kind].label.toLowerCase()})`}</title>
              <rect x={boxes[i].x - w / 2} y={boxes[i].y - h / 2} width={w} height={h} rx={9} fill="#fff" />
              <rect x={boxes[i].x - w / 2} y={boxes[i].y - h / 2} width={w} height={h} rx={9} fill={soft(color)} stroke={color} strokeWidth={2.2} />
              {lines.map((l, j) => (
                <text key={j} x={boxes[i].x} y={boxes[i].y - h / 2 + 19 + j * 18} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>{l}</text>
              ))}
              <text x={boxes[i].x} y={boxes[i].y + h / 2 - 7} textAnchor="middle" fontSize={11.5} fill={C.text}>{g.people.length} directors</text>
            </g>
          );
        })}
        {data.members.map((m) => {
          const q = pos.get(m.key)!, on = linked.has(m.key), me = m.key === who?.key;
          const isNodeVisible = visibleNodes.has(m.key);
          
          const c = Math.cos(q.a), s = Math.sin(q.a), side = c > 0.05 ? 1 : c < -0.05 ? -1 : 0;
          const r = me ? 27 : 23;
          const tx = q.x + side * (r + 8), anchor = side > 0 ? "start" : side < 0 ? "end" : "middle";
          const hasRole = !!m.role && m.role !== "Director";
          const ty = side ? q.y - 2 : s < 0 ? q.y - r - (hasRole ? 26 : 12) : q.y + r + 20;
          
          return (
            <g key={m.key} className="cursor-pointer transition-opacity duration-300" 
               style={{ opacity: isNodeVisible ? (personLit(m.key) ? 1 : 0.25) : 0, pointerEvents: isNodeVisible ? 'auto' : 'none' }} 
               onClick={() => onPerson(m.key)}
               onMouseEnter={() => { const g = groupsOf(m.key); if (g.size) setHot(g); }} onMouseLeave={() => setHot(null)}>
              <title>{`${m.name}: open their board network`}</title>
              {me && <circle cx={q.x} cy={q.y} r={r + 5} fill="none" stroke={BRAND} strokeOpacity={0.3} strokeWidth={2} />}
              <circle cx={q.x} cy={q.y} r={r} fill={me ? BRAND : on ? C.slateSoft : "#fff"} stroke={me ? BRAND : on ? C.slate : C.dot} strokeWidth={2} />
              <text x={q.x} y={q.y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={me ? "#fff" : on ? C.slate : C.muted}>{initials(m.name)}</text>
              <text x={tx} y={ty} textAnchor={anchor} fontSize={14} fontWeight={on || me ? 700 : 500} fill={on || me ? C.ink : C.muted}>{short(m.name, 26)}</text>
              {hasRole && <text x={tx} y={ty + 16} textAnchor={anchor} fontSize={12} fill={C.text}>{short(m.role!, 30)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RingList({ data, selected, paint, onPerson }: {
  data: BoardConnectionsData; selected?: string; paint: Paint; onPerson: (key: string) => void;
}) {
  const name = new Map(data.members.map((m) => [m.key, m.name]));
  const linked = new Set(data.shared.flatMap((g) => g.people.map((p) => p.key)));
  const alone = data.members.filter((m) => !linked.has(m.key));
  const theirs = (g: Shared) => !!selected && g.people.some((p) => p.key === selected);
  // the selected director's companies first
  const shared = [...data.shared].sort((a, b) => Number(theirs(b)) - Number(theirs(a)));
  // the selected director shown alone: linked to no one else on this board
  if (selected && data.members.length === 1) return (
    <p className="px-5 py-4 text-sm text-gray-700">
      {data.members[0].name} shares no company with the other directors of {data.company} in our data.
    </p>
  );
  return (
    <>
      {!data.shared.length && <p className="px-5 py-4 text-sm text-gray-700">No two directors of {data.company} share another company in our data.</p>}
      {shared.map((g) => {
        const color = paint(g.key);
        // each shared company one container, in its own colour (the same as its card and lines in the
        // ring): its name and how they share it in a tinted header, the directors inside
        return (
          <section key={g.key} className="mx-3 my-3 overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: `${color}66` }}>
            <div className="border-b px-4 py-3" style={{ background: soft(color), borderColor: `${color}33` }}>
              <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-gray-900">
                <LineSample color={color} kind={g.kind} />{g.company}<Tag kind="grey">{KIND[g.kind].label}</Tag>
              </div>
              <div className="text-[13px] text-gray-600">{g.kind === "now" ? `All sit on ${bare(g.company)}'s board now` : `All worked at ${bare(g.company)} at some time`}</div>
            </div>
            <div className="px-4 py-3">
              <ul className="space-y-1">
                {g.people.map((p) => (
                  <li key={p.key} className="text-[13.5px] text-gray-700">
                    <button type="button" onClick={() => onPerson(p.key)}
                            className={`font-semibold hover:text-[#931638] hover:underline ${p.key === selected ? "text-[#931638]" : "text-gray-900"}`}>{name.get(p.key)}</button>
                    {p.role && <> · {p.role}</>}
                  </li>
                ))}
              </ul>
              <div className="mt-1.5"><SourceLink sources={g.people.map((p) => p.source || null)} /></div>
            </div>
          </section>
        );
      })}
      {!!alone.length && (
        <section className="mx-3 my-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-[15px] font-semibold text-gray-900">No shared company ({alone.length})</div>
          <div className="px-4 py-3 text-[13.5px] text-gray-700">
            {alone.map((m, i) => (
              <span key={m.key}>{i > 0 && ", "}
                <button type="button" onClick={() => onPerson(m.key)} className="hover:text-[#931638] hover:underline">{m.name}</button></span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ─── Filters ────────────────────────────────────────────────────────────────────────────────

type Kinds = Record<Kind, boolean>;
const keepTies = (ties: Tie[], kinds: Kinds) => ties.filter((t) => kinds[t.kind]);
// a kind switched off hides its LINES, never the people: one linked only that way stays, drawn in grey
const filterCircle = (c: Circle, kinds: Kinds): Circle => ({
  ...c, boards: c.boards.map((b) => ({ ...b, members: b.members.map((f) => {
    const ties = keepTies(f.ties, kinds);
    return { ...f, ties, linkHidden: !ties.length && f.ties.length > 0 };
  }).sort((x, y) => Number(!x.ties.length) - Number(!y.ties.length) || Number(!x.linkHidden) - Number(!y.linkHidden)) })),
});
const filterBoard = (d: BoardConnectionsData, kinds: Kinds): BoardConnectionsData => ({ ...d, shared: d.shared.filter((g) => kinds[g.kind]) });

// ─── The window ─────────────────────────────────────────────────────────────────────────────

/** A director (their boards, read from one board's answer) or a whole board. */
export type ConnectionsFocus = { kind: "person"; key: string; cik: string } | { kind: "board"; cik: string };

export function BoardConnectionsModal({ start, startName, thisCik, onClose, onProfile }: {
  start: ConnectionsFocus;
  /** the director the window opened on, as this proxy prints them (for the title while loading) */
  startName?: string;
  thisCik: string; onClose: () => void; onProfile?: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);
  // the pages visited, and which one is open: the arrows step back and forward through them
  const [nav, setNav] = useState<{ trail: ConnectionsFocus[]; at: number }>({ trail: [start], at: 0 });
  const [boards, setBoards] = useState<Record<string, BoardConnectionsData>>({});
  const [failed, setFailed] = useState<string | null>(null);
  // the other members of each board, besides the people the director knows: hidden by default
  const [showAll, setShowAll] = useState(false);
  // which links count: sitting together now, a past workplace in common
  const [kinds, setKinds] = useState<Kinds>({ now: true, worked: true });
  // the page (its place in the trail) on which a board opened from a director was narrowed to that
  // director's own connections; a board opens whole
  const [onlyAt, setOnlyAt] = useState<number | null>(null);
  // the colour each company was given earlier in this window, so it keeps it from page to page
  const colours = useRef(new Map<string, number>());
  // the same for each person on a director's page
  const personColours = useRef(new Map<string, number>());
  const { trail, at } = nav;
  const focus = trail[at];

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
  // kept the same object between renders: the ring animates when its members change, and a new
  // object on every render would restart (and cut short) that animation
  const data = useMemo(() => raw && filterBoard(raw, kinds), [raw, kinds]);
  // every move to another page starts it as first drawn: the whole board, and no other members beside
  // a director's boards (back, forward, a breadcrumb or a click)
  const moveTo = (next: { trail: ConnectionsFocus[]; at: number }) => {
    if (next.at === at && next.trail === trail) return;
    setNav(next);
    setOnlyAt(null);
    setShowAll(false);
  };
  const go = (f: ConnectionsFocus) => {
    const same = focus.kind === f.kind && focus.cik === f.cik && (f.kind === "board" || (focus.kind === "person" && keyOf(focus) === f.key));
    if (!same) moveTo({ trail: [...trail.slice(0, at + 1), f], at: at + 1 });
  };
  const step = (by: number) => moveTo({ trail, at: Math.min(trail.length - 1, Math.max(0, at + by)) });
  const toPerson = (f: Fellow) => f.home && go({ kind: "person", key: f.key, cik: f.home });
  const toBoard = (cik: string) => go({ kind: "board", cik });
  const label = (f: ConnectionsFocus) => {
    const d = boards[f.cik];
    if (f.kind === "board") return d ? `${bare(d.company)} board` : "Board";
    return d?.people[keyOf(f)]?.name || startName || "Director";
  };
  // a board opened from a director highlights that director: the last director visited before it
  const selected = (() => {
    if (focus.kind !== "board" || !raw) return undefined;
    for (let i = at - 1; i >= 0; i -= 1) {
      const f = trail[i];
      if (f.kind === "person") return raw.members.some((m) => m.key === keyOf(f)) ? keyOf(f) : undefined;
    }
    return undefined;
  })();

  // a board opened from a director shows the whole board with that director highlighted; narrowed (on
  // that page only) it shows only the director, the people they are linked to and the companies between
  const whole = onlyAt !== at;
  const linksOf = (d: BoardConnectionsData) => (selected ? d.shared.filter((g) => g.people.some((p) => p.key === selected)) : []);
  const hasLinks = !!raw && linksOf(raw).length > 0;
  const narrowed = !!selected && !whole;
  const board = useMemo(() => {
    if (!data || !selected) return data;
    // the selected director first, so they sit at the top of the ring, whole board or not
    const first = (members: BoardConnectionsData["members"]) =>
      [...members.filter((m) => m.key === selected), ...members.filter((m) => m.key !== selected)];
    if (!narrowed) return { ...data, members: first(data.members) };
    const shared = data.shared.filter((g) => g.people.some((p) => p.key === selected));
    const keep = new Set([selected, ...shared.flatMap((g) => g.people.map((p) => p.key))]);
    return { ...data, shared, members: first(data.members.filter((m) => keep.has(m.key))) };
  }, [data, selected, narrowed]);

  const selectedName = selected ? raw?.members.find((m) => m.key === selected)?.name : undefined;

  // the colours in this picture, from the whole answer (not the filtered one), so hiding a kind of link
  // never repaints what stays: on a director's page one per PERSON they know (the same person the same
  // colour on every board), on a board's ring one per shared company
  const paint = useMemo<Paint>(() => (focus.kind === "person"
    ? assignColours((rawCircle?.boards || []).flatMap((b) => b.members.filter((f) => f.ties.length).map((f) => f.key)), personColours.current)
    : assignColours((raw?.shared || []).map((g) => g.key), colours.current)), [raw, rawCircle, focus.kind]);

  // how many links of each kind there are here, for the filter buttons
  const counts: Record<Kind, number> = { now: 0, worked: 0 };
  if (rawCircle && focus.kind === "person") {
    rawCircle.boards.forEach((b) => b.members.forEach((f) => (["now", "worked"] as Kind[]).forEach((k) => {
      if (f.ties.some((t) => t.kind === k)) counts[k] += 1;
    })));
  } else if (raw) {
    (narrowed ? linksOf(raw) : raw.shared).forEach((g) => { counts[g.kind] += 1; });
  }

  let title = "", summary = "";
  if (data && board && focus.kind === "board") {
    const linked = new Set(data.shared.flatMap((g) => g.people.map((p) => p.key))).size;
    title = `${data.company} — current board`;
    summary = narrowed
      ? (board.shared.length
        ? `${selectedName} already knows ${plural(board.members.length - 1, "director")} of the other ${data.members.length - 1} on this board, through ${plural(board.shared.length, "shared company", "shared companies")}.`
        : `${selectedName} shares no company${hasLinks ? " of this kind" : ""} with the other ${plural(data.members.length - 1, "director")} on this board.`)
      : data.shared.length
        ? `${linked} of ${data.members.length} directors on this board already know each other, through ${plural(data.shared.length, "shared company", "shared companies")}.`
        : `No two of the ${data.members.length} directors on this board share another company${kinds.now && kinds.worked ? "" : " of this kind"}.`;
  } else if (circle) {
    const known = circle.boards.reduce((s, b) => s + b.members.filter((f) => f.ties.length).length, 0);
    const left = circle.former?.length || 0;
    title = circle.name;
    summary = `${circle.name} sits on ${plural(circle.boards.length, "board")} now${left ? ` and has left ${plural(left, "other")}` : ""}. On ${circle.boards.length === 1 ? "the current one" : "the current ones"}, `
      + (known ? `${surname(circle.name)} already knows ${plural(known, "director")}.` : `${surname(circle.name)} shares no company with the other directors${kinds.now && kinds.worked ? "" : " of this kind"}.`);
  } else {
    title = startName || "Board connections";
  }

  const chip = (k: Kind) => (
    <button key={k} type="button" aria-pressed={kinds[k]}
            onClick={() => setKinds((s) => (s[k] && !s[k === "now" ? "worked" : "now"] ? s : { ...s, [k]: !s[k] }))}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition ${
              kinds[k] ? "border-gray-700 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-500"}`}>
      <LineSample color={kinds[k] ? C.ink : "#9ca3af"} kind={k} />
      {KIND[k].label} ({counts[k]})
    </button>
  );
  const arrow = (by: -1 | 1) => {
    const off = by < 0 ? at === 0 : at === trail.length - 1;
    const to = off ? "" : label(trail[at + by]);
    return (
      <button type="button" onClick={() => step(by)} disabled={off}
              aria-label={by < 0 ? `Back${to ? ` to ${to}` : ""}` : `Forward${to ? ` to ${to}` : ""}`} title={by < 0 ? `Back${to ? ` to ${to}` : ""}` : `Forward${to ? ` to ${to}` : ""}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-[#931638]/50 hover:bg-[#931638]/5 hover:text-[#931638] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#931638]/40 disabled:cursor-default disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent">
        {by < 0 ? <ArrowLeft size={17} /> : <ArrowRight size={17} />}
      </button>
    );
  };

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-colors duration-200 ${shown ? "bg-black/30" : "bg-black/0"}`}
         onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${title}: board connections`} onClick={(e) => e.stopPropagation()}
           className={`flex h-[92vh] w-full max-w-[1320px] flex-col overflow-hidden rounded-xl bg-white text-gray-900 shadow-2xl transition duration-200 ${shown ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"}`}>
        <div className="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
          {/* back and forward through the pages visited, on the left */}
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">{arrow(-1)}{arrow(1)}</div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            {focus.kind === "person" && !!circle?.aka?.length && (
              <div className="text-[12.5px] text-gray-500">Also printed as {circle.aka.join(", ")}</div>
            )}
            {circle?.position && focus.kind === "person" && <div className="text-[13.5px] text-gray-600">{circle.position}</div>}
            {summary && <p className="mt-1 text-[14px] text-gray-800">{summary}</p>}
          </div>
          <button ref={closeButton} type="button" aria-label="Close" onClick={onClose}
                  className="ml-auto rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-[#931638] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#931638]/40">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-2.5 text-[13px] text-gray-600">
          {trail.length > 1 && (
            <nav aria-label="Pages visited" className="flex min-w-0 flex-wrap items-center gap-1">
              {trail.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
                  {i === at
                    ? <span className="font-semibold text-gray-900">{label(f)}</span>
                    : <button type="button" onClick={() => moveTo({ trail, at: i })}
                              className={`hover:text-[#931638] hover:underline ${i > at ? "text-gray-400" : ""}`}>{label(f)}</button>}
                </span>
              ))}
            </nav>
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
              {focus.kind === "board" && selectedName && (
                <div className="flex flex-wrap items-center gap-2 px-3 pt-3 text-[13px] text-gray-700">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: BRAND }} aria-hidden="true" />
                  <span className="font-semibold text-gray-900">
                    {!narrowed
                      ? `${selectedName}: Showing the Whole Board`
                      : hasLinks
                        ? `${selectedName}: Showing Only Their Connections on This Board`
                        : `${selectedName}: Shares No Company With the Other Directors on This Board`}
                  </span>
                  <button type="button" onClick={() => setOnlyAt(whole ? at : null)} aria-pressed={!whole}
                          className="rounded-full border border-gray-300 px-2.5 py-0.5 text-[12.5px] font-medium text-gray-700 hover:border-[#931638]/50 hover:text-[#931638]">
                    {narrowed ? "Show Other Board Members" : hasLinks ? `Show Only ${surname(selectedName)}'s Connections` : `Show Only ${surname(selectedName)}`}
                  </button>
                </div>
              )}
              {focus.kind === "board"
                // the key leaves out whether the board is narrowed: the ring stays mounted and
                // animates the other members in, instead of being drawn afresh
                ? <RingMap key={`${focus.cik}:${selected || ""}`} data={board!} selected={selected} paint={paint} onPerson={(key) => go({ kind: "person", key, cik: focus.cik })} />
                : <PersonMap circle={circle!} thisCik={thisCik} showAll={showAll} paint={paint} onPerson={toPerson} onBoard={toBoard} />}
            </div>
            <aside className="min-h-0 overflow-y-auto border-t border-gray-200 bg-gray-50/70 lg:border-l lg:border-t-0">
              <div className="border-b border-gray-200 px-5 py-3">
                <h4 className="text-[15px] font-semibold text-gray-900">
                  {focus.kind === "board" ? "Who knows whom, and how" : `Where ${surname(circle!.name)} sits now, and who they know`}
                </h4>
              </div>
              {focus.kind === "board"
                ? <RingList data={board!} selected={selected} paint={paint} onPerson={(key) => go({ kind: "person", key, cik: focus.cik })} />
                : <PersonList circle={circle!} thisCik={thisCik} showAll={showAll} paint={paint} onPerson={toPerson} onBoard={toBoard} />}
            </aside>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-gray-200 bg-gray-50/70 px-6 py-3 text-[12.5px] text-gray-600">
          {focus.kind === "person" && (
            <span className="inline-flex items-center gap-1.5">
              <svg width="28" height="10" aria-hidden="true">
                <path d="M1 5 H20" stroke={BRAND} strokeOpacity={0.55} strokeWidth="2.4" />
                <path d="M19 1 L27 5 L19 9 z" fill={BRAND} />
              </svg>
              Sits on this board now
            </span>
          )}
          <span className="inline-flex items-center gap-1.5"><LineSample color={C.ink} kind="now" width={26} />{KIND.now.long}</span>
          <span className="inline-flex items-center gap-1.5"><LineSample color={C.ink} kind="worked" width={26} />{KIND.worked.long}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex gap-0.5" aria-hidden="true">
              {SERIES.slice(0, 4).map((c) => <span key={c} className={`inline-block h-2.5 w-2.5 ${focus.kind === "person" ? "rounded-full" : "rounded-sm"}`} style={{ background: c }} />)}
            </span>
            {focus.kind === "person" ? "One colour per person" : "One colour per shared company"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke={C.dot} strokeWidth="1.8" strokeDasharray="3 2.5" /></svg>
            Dashed outline: a former board, or one not in coverage
          </span>
          {onProfile && focus.kind === "person" && at === 0 && (
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
