import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AI_CHATBOT_API_BASE, IS_LOCAL_ENV, generateWhaleWisdomId, mergeBasicProfiles } from '@/pages/AIChatbot/api';
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import BasicProfilePanel from "@/pages/AIChatbot/BasicProfilePanel";
import ActivistFilingsTable from "@/pages/AIChatbot/ActivistFilingsTable";
import { DeleteConfirmationModal } from "@/components/DeleteModal";
import { WhaleWisdomFilerPickerModal, WhaleWisdomFiler } from "@/components/WhaleWisdomFilerPickerModal";

// ─── Module-level cache (survives tab switches, clears on page refresh) ───────
const PROFILES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let _profilesCache: { data: Record<string, any>; ts: number } | null = null;

// ─── Constants ────────────────────────────────────────────────────────────────

const THEME_MAROON = "#8b1828";

// Exactly two. The merge endpoint takes slug_a and slug_b, so the picker caps
// selection there rather than letting a third tick silently do nothing.
const MERGE_PAIR_SIZE = 2;

// ⚠️ TEMPORARY — dev testing only.  The backend only sends the "profile ready"
// email when the /generate request carries a creator_email (see the
// `if creator_email:` guard in app/api/activist_intelligence.py), so leaving
// this false suppresses the mail entirely without any backend change.
// SET BACK TO true BEFORE MERGING.
const SEND_GENERATION_EMAIL = `True`;

// Every generation runs the enhanced pipeline (extra SEC EDGAR research pass
// before writing the profile). This is deliberately a constant and not state:
// the "Normal" mode produced noticeably weaker profiles, so there must be no
// code path — not a picker, not a modal reset — that can send anything else.
const GENERATE_MODE = "enhanced" as const;

// Deliberate product decision (not a bug, not scaffolding): publishing a
// Basic profile never auto-chains into Advanced generation. Advanced is a
// real ~20-25 min, non-resumable job, so it only ever starts from an
// explicit user action — "Generate Activist Profile" in the page header,
// which opens the Generate modal (handleStartGeneration).

// The pipeline writes free-text statuses — "ongoing (second episode) -
// cooperation period filings", "closed - 13d engagement", "exited (position
// liquidated)" — so every consumer keys off the FIRST word, never the whole
// string. "ongoing" is by far the most common live status and was missing
// here, which both hid those campaigns from the Active/Open count and made
// StatusBadge fall through to printing the entire sentence.
const STATUS_COLOR_MAP = {
  open: "#f59e0b",
  ongoing: "#f59e0b",
  active: "#3b82f6",
  settled: "#10b981",
  closed: "#6b7280",
  exited: "#6b7280",
  undisclosed: "#6b7280",
};

const STATUS_LABEL_MAP = {
  open: "Open",
  ongoing: "Ongoing",
  active: "Active",
  settled: "Settled",
  closed: "Closed",
  exited: "Exited",
  undisclosed: "Undisclosed",
};

/** Statuses meaning "this campaign has not concluded". */
const LIVE_STATUS_KEYS = ["open", "ongoing", "active"];

/**
 * Display names for the profile-view toggle. The underlying ids stay
 * "basic"/"advanced" — the API routes, cache keys and every branch on
 * effectiveProfileView key off those, so only the visible label changes here.
 */
const PROFILE_VIEW_LABELS = {
  basic: "Condensed",
  advanced: "Comprehensive",
} as const;

/** A single in-flight generation job, as returned by GET /generate/active */
type ActiveGenerationJob = {
  slug: string;
  investor_name: string;
  step?: string;
  progress_pct?: number;
  mode?: string;
};

/** "elliott-management" and "elliott-management-profile" both refer to the
 * same investor — the /generate/active job slug and the published S3 key
 * aren't guaranteed to use the same suffix convention, so match both forms. */
const slugMatches = (a: string, b: string) =>
  !!a && !!b && (a === b || `${a}-profile` === b || a === `${b}-profile`);

/** "elliott-management-profile" -> "elliott-management". has_basic/has_advanced
 * and the basic-profile endpoints are keyed by this base slug, while
 * investorKeys/activeInvestorKey stay on the published "{slug}-profile" form. */
const toBaseSlug = (key: string) => (key || "").replace(/[-_]profile$/i, "");

/** "ongoing (second episode) - cooperation period filings" -> "ongoing" */
const statusKey = (status: any) =>
  String(status || "closed").toLowerCase().trim().split(/[/\s(]/)[0];

// ─── Investor selector: fuzzy search ───────────────────────────────────────────

/** Trailing legal-entity suffix only — deliberately narrow. Activist fund
 * names routinely differ on words like "Capital"/"Management"/"Partners"
 * (e.g. "Elliott Investment Management" vs "Elliott Capital"), so those stay
 * significant; only the bare corporate-form suffix is stripped. */
const LEGAL_SUFFIX_RE = /\s+(inc|incorporated|corp|corporation|co|company|llc|llp|lp|ltd|limited|plc|gp)$/;

/** lowercase, strip punctuation, collapse whitespace, drop a trailing
 * legal-entity suffix — so "Elliott Mgmt, LLC." and "elliott mgmt llc" line
 * up as the same search key. */
const normalizeForMatch = (text: string): string => {
  const collapsed = (text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return collapsed.replace(LEGAL_SUFFIX_RE, "").trim();
};

/** Scores `label` against `query` (higher = better), or null if it isn't a
 * match at all. Exact/prefix/substring matches on the normalized strings win
 * outright; otherwise every whitespace-separated query token must appear
 * somewhere in the label (in any order), so "mgmt elliott" still finds
 * "Elliott Investment Management". */
const scoreInvestorMatch = (label: string, query: string): number | null => {
  const normQuery = normalizeForMatch(query);
  if (!normQuery) return 0;
  const normLabel = normalizeForMatch(label);
  if (normLabel === normQuery) return 100;
  if (normLabel.startsWith(normQuery)) return 90;
  if (normLabel.includes(normQuery)) return 80;

  const queryTokens = normQuery.split(" ").filter(Boolean);
  const labelTokens = normLabel.split(" ").filter(Boolean);
  const allTokensMatch = queryTokens.every((qt) => labelTokens.some((lt) => lt.includes(qt)));
  if (!allTokensMatch) return null;

  const firstIndex = Math.min(...queryTokens.map((qt) => normLabel.indexOf(qt)).filter((i) => i >= 0));
  return 60 - firstIndex * 0.1;
};

/** Bolds every case-insensitive occurrence of each search token inside the
 * (un-normalized) label, so highlighting still lines up with what's on
 * screen even though matching itself runs on the normalized/stripped text. */
const highlightInvestorMatch = (label: string, query: string): React.ReactNode => {
  const tokens = query.trim().split(/\s+/).filter(Boolean).map((t) => t.toLowerCase());
  if (tokens.length === 0) return label;

  const lowerLabel = label.toLowerCase();
  const ranges: [number, number][] = [];
  tokens.forEach((t) => {
    let idx = lowerLabel.indexOf(t);
    while (idx !== -1) {
      ranges.push([idx, idx + t.length]);
      idx = lowerLabel.indexOf(t, idx + 1);
    }
  });
  if (ranges.length === 0) return label;

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([start, end], i) => {
    if (start > cursor) nodes.push(label.slice(cursor, start));
    nodes.push(
      <strong key={i} style={{ fontWeight: 700, background: "#fde68a", borderRadius: 2 }}>
        {label.slice(start, end)}
      </strong>
    );
    cursor = end;
  });
  if (cursor < label.length) nodes.push(label.slice(cursor));
  return nodes;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// SEC figures are US dollars and must group US-style. Left to the browser's
// default locale, an en-IN machine renders 266000 as "2,66,000" (lakh/crore
// grouping), so the locale is pinned rather than inherited.
const NUMBER_LOCALE = "en-US";

const formatUSD = (thousands: any) => {
  if (!thousands) return "N/A";
  const val = Number(thousands) * 1000;
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString(NUMBER_LOCALE)}`;
};

const formatLargeUSD = (value: any) => {
  if (!value) return "N/A";
  const numValue = Number(value);
  if (numValue >= 1e9)  return `$${(numValue / 1e9).toFixed(2)}B`;
  if (numValue >= 1e6)  return `$${(numValue / 1e6).toFixed(0)}M`;
  return `$${numValue.toLocaleString(NUMBER_LOCALE)}`;
};

// The pipeline sometimes fills fields (notes, outcomes, nominee lists, public
// notes) with a boilerplate "no data" sentence instead of leaving them empty
// — "None stated.", "Not disclosed", "N/A", etc. Showing that text reads as
// real information when it isn't, so treat it the same as no value everywhere
// it can appear and render nothing instead.
const PLACEHOLDER_TEXT_RE = /\b(not\s+(stated|disclosed|available|recorded|found|applicable|specified|provided|listed|identified|indicated|named|given|reported|captured)|none\s+(stated|disclosed|available|recorded|found|applicable|specified|provided|listed|identified|indicated|named|given|reported|noted)|n\/a|unknown|tbd)\b/i;
const isMeaningfulText = (text: any) =>
  typeof text === "string" &&
  text.trim().length > 0 &&
  !PLACEHOLDER_TEXT_RE.test(text);

// Same wording/format as the rest of the profile ("August 19, 2026"). Returns
// "" rather than a dash when there's no usable timestamp, so the caller drops
// the pill entirely instead of showing an empty one.
const formatUpdatedDate = (value: any): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

/**
 * The investor's real name as shown in the dashboard header. Returns "" (not a
 * placeholder) when the profile has neither field, so callers can decide their
 * own fallback — the investor picker falls back to the slug-derived label.
 */
const extractLegalName = (raw: any): string =>
  raw?.activist_investor_summary?.legal_name || raw?.activist_investor_summary?.brand_name || "";

/** Normalise the raw JSON from S3 into a consistent internal shape */
const normaliseProfile = (raw: any) => {
  if (!raw) return null;

  const stripCitations = (text: any): string => {
  if (typeof text !== "string") return "";

  return text
    .replace(/\[(?:cite|citation|citations):\s*.*?\]/gi, "")
    .replace(/\[[\d,\s-]+\]/g, "")
    .replace(/(?:cite|citation|citations):\s*[\d,\s-]+/gi, "")
    // Markdown-link citations, e.g. "[sec.gov](https://...)" — strip the
    // whole link (label + url), not just the url, since the bare label
    // ("sec.gov") would otherwise read as orphaned noise once the link
    // markup is gone.
    .replace(/\[[^\[\]]*\]\(https?:\/\/[^\s()]+\)/gi, "")
    // Bare (non-markdown) URLs, parenthesized or not — e.g. "(https://...)".
    .replace(/\(?\bhttps?:\/\/[^\s()]+\)?/gi, "")
    // Empty parens left behind once their only contents were a citation,
    // e.g. "increased its stake ()" or "(, )" from a multi-link citation.
    .replace(/\(\s*(?:[,;]\s*)*\)/g, "")
    .replace(/\[\s*\]/g, "")
    // Dangling space before punctuation left by a removed citation.
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
};
  // activist_playbook is synthesized purely from this profile's own
  // campaign_history + 13F data (no external web search), so it's still
  // reliable even on runs where the firm-bio web search came back empty —
  // used below as a fallback for the summary text and observations list.
  const playbook = raw.activist_playbook || {};

  const rawSummary =
    typeof raw.investor_summary === "string"
      ? raw.investor_summary
      // narrative_summary is the pipeline's dedicated "institutional research
      // report" opening paragraph, written after all campaign/13F data is
      // final — richer than investment_focus, so it leads when present.
      : raw.activist_investor_summary?.narrative_summary ||
        raw.activist_investor_summary?.investment_focus ||
        (typeof raw.activist_investor_summary === "string"
          ? raw.activist_investor_summary
          : "") ||
        playbook.campaign_style ||
        "";

  const summary = stripCitations(rawSummary);

  // 🛑 REMOVED .filter(Boolean) SO EMPTY ROWS DON'T DISAPPEAR
  const summaryPoints = (raw.activist_investor_summary?.summary_points || [])
    .map((pt: any) => stripCitations(pt));

  const legalName = extractLegalName(raw) || "Activist Profile";
  const founded  = raw.activist_investor_summary?.founded || "";
  const hq       = raw.activist_investor_summary?.headquarters || "";
  const founderOrLead = raw.activist_investor_summary?.founder_or_key_lead || "";
  const officialWebsite = raw.activist_investor_summary?.official_website || "";

  // ── RESTORED MISSING DATA ──
  const personnel = (raw.nominees_and_visible_personnel || raw.visible_personnel || []).map((p: any) => ({
    name:        p.name || "Unknown",
    category:    p.category || "visible_personnel",
    role:        p.role_or_context || p.role || p.current_title || "",
    public_note: isMeaningfulText(p.public_note) ? p.public_note : null,
    linkedin:    p.linkedin_url || null,
    sources:     p.source_set || [],
  }));

  const snap13f = raw.latest_13f_snapshot || {};
  const snapshot = {
    filing_date:      snap13f.filing_date || snap13f.report_period_end || "N/A",
    portfolio_value:  snap13f.reported_13f_portfolio_value_usd || 0,
    aum_signal:       snap13f.firm_level_aum_signal || "",
    cik:              snap13f.sec_cik || "",
    filing_url:       snap13f.sec_filing_url || null,
    holdings:         snap13f.top_25_holdings || [],
    portfolio_note:   snap13f.reported_13f_portfolio_value_note || "",
  };

  const campaigns = (raw.campaign_registry || raw.campaign_history || []).map((c: any) => {
    // Two schemas feed this dashboard: the manual multi-file compile path emits
    // nominees_or_personnel as an array, the auto-generated pipeline emits
    // nominees as a single "Name (role); Name2 (role2)" string — support both
    // rather than silently dropping whichever one wasn't written first.
    const nomineeList = Array.isArray(c.nominees_or_personnel) && c.nominees_or_personnel.length > 0
      ? c.nominees_or_personnel
      : (typeof c.nominees === "string" && c.nominees.trim()
          ? c.nominees.split(/;\s*/).filter(Boolean)
          : []);
    return {
      target_company:  c.target_company || "Unknown",
      start_date:      c.campaign_start_date || c.start_year || "N/A",
      start_year:      (c.campaign_start_date || c.start_year || "N/A").toString().slice(0, 4),
      status_label:    c.campaign_status_label || c.status || "N/A",
      normalized_status: c.normalized_status || c.status?.toLowerCase() || "closed",
      campaign_form:   c.campaign_form || [],
      main_issues:     c.main_issues || [],
      nominees:        nomineeList,
      objectives:      c.objectives || null,
      tactics:         c.tactics || null,
      notes:           stripCitations(c.notes || c.objectives || ""),
      outcome_to_date: c.outcome_to_date || null,
      confidence_label: c.confidence_label || null,
      source_filing_url: c.source_filing?.url || null,
      sources:         c.source_set || [],
    };
  });

  const playbookObservations = [
    playbook.governance_philosophy,
    playbook.board_representation_strategy,
    playbook.operational_focus,
    Array.isArray(playbook.recurring_investment_themes) && playbook.recurring_investment_themes.length > 0
      ? `Recurring investment themes: ${playbook.recurring_investment_themes.join(", ")}.`
      : null,
    Array.isArray(playbook.preferred_sectors) && playbook.preferred_sectors.length > 0
      ? `Preferred sectors: ${playbook.preferred_sectors.join(", ")}.`
      : null,
  ].filter(Boolean);

  const rawObservations =
    raw.key_cross_campaign_observations ||
    raw.custom_observations ||
    (Array.isArray(raw.investor_profile_analysis) && raw.investor_profile_analysis.length > 0
      ? raw.investor_profile_analysis
      : playbookObservations);

  // 🛑 REMOVED .filter(Boolean) HERE TOO
  const observations = rawObservations.map((obs: any) => stripCitations(obs));

  const sources = raw.source_inventory || [];

  return {
    legalName,
    founded,
    hq,
    founderOrLead,
    officialWebsite,
    summary,
    summaryPoints,
    personnel,
    snapshot,
    campaigns,
    observations,
    sources,
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
    <h3 style={{ fontSize: 13, fontWeight: 600, color: THEME_MAROON, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
      {title}
    </h3>
    <div style={{ flex: 1, height: 1, background: "#e5e7eb", marginLeft: 16 }}></div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const key   = statusKey(status);
  const color = STATUS_COLOR_MAP[key as keyof typeof STATUS_COLOR_MAP] || "#6b7280";
  // An unrecognised key used to fall back to the raw status, which on
  // pipeline-generated profiles is a full sentence — that is what pushed the
  // pill outside its table cell. Fall back to the capitalised first word and
  // keep the full text on hover instead.
  const label = STATUS_LABEL_MAP[key as keyof typeof STATUS_LABEL_MAP]
    || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "N/A");
  const bg    = color + "20";
  return (
    <span
      title={status || undefined}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        background: bg,
        color,
        border: `1px solid ${color}40`,
        whiteSpace: "nowrap",
        display: "inline-block",
        maxWidth: 150,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}
    </span>
  );
};

const Tag = ({ text, color = "#6b728020", textColor = "#374151" }: { text: string; color?: string; textColor?: string }) => (
  <span
    style={{
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 6,
      background: color,
      color: textColor,
      border: "1px solid #e5e7eb",
      marginRight: 4,
      marginBottom: 4,
      display: "inline-block",
    }}
  >
    {text}
  </span>
);

// A small persistent "still generating" indicator for a specific investor
// row in the picker dropdown — the row already shows that investor's name,
// so this only needs the percentage.
const GeneratingChip = ({ job }: { job: ActiveGenerationJob }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 10,
      fontWeight: 600,
      padding: "2px 7px",
      borderRadius: 999,
      background: "#fdf2f2",
      color: THEME_MAROON,
      border: `1px solid ${THEME_MAROON}30`,
      whiteSpace: "nowrap",
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
    title="Generating"
  >
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: THEME_MAROON, flexShrink: 0, animation: "pulse-dot 1.2s ease-in-out infinite" }} />
    {typeof job.progress_pct === "number" ? `Generating… ${Math.round(job.progress_pct)}%` : "Generating…"}
    <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
  </span>
);

/** Marks a profile built by merging two others (is_combination). Same pill
 *  vocabulary as GeneratingChip so the dropdown row and the header bar read as
 *  one family; `onDark` is the variant that sits on the maroon header. */
const CombinedBadge = ({ onDark = false, title }: { onDark?: boolean; title?: string }) => {
  const borderColor = onDark ? "rgba(255,255,255,0.45)" : `${THEME_MAROON}30`;
  return (
    <span
      title={title || "Combined profile — synthesised from two other profiles"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        flexShrink: 0,
        background: onDark ? "rgba(255,255,255,0.18)" : "#fdf2f2",
        color: onDark ? "#fff" : THEME_MAROON,
        border: `1px solid ${borderColor}`,
      }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M6 21V9a9 9 0 0 0 9 9" />
      </svg>
      Combined
    </span>
  );
};

// to show "Generating" just because the currently-viewed investor happened
const GenerationProgressBar = ({ job, onClick }: { job: ActiveGenerationJob; onClick?: () => void }) => {
  const pct = typeof job.progress_pct === "number" ? Math.max(0, Math.min(100, Math.round(job.progress_pct))) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      title="Click to view generation details"
      style={{
        width: 180, flexShrink: 0, boxSizing: "border-box", padding: "5px 10px",
        background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)", cursor: onClick ? "pointer" : "default",
        textAlign: "left", font: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={job.investor_name}>
          {job.investor_name || "Generating profile"}
        </span>
        {pct !== null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", flexShrink: 0, animation: "pct-pulse 1.4s ease-in-out infinite" }}>
            {pct}%
          </span>
        )}
      </div>
      <div style={{ height: 5, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%", width: `${pct ?? 10}%`, borderRadius: 999, transition: "width 0.4s ease",
            background: "linear-gradient(90deg, #10b981 0%, #6ee7b7 50%, #10b981 100%)",
            backgroundSize: "200% 100%",
            animation: "progress-shimmer 1.3s linear infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes progress-shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }
        @keyframes pct-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>
    </button>
  );
};

// ─── Investor trigger button (header only) ────────────────────────────────────

const InvestorTrigger = ({
  label,
  open,
  onClick,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 14px",
      fontSize: 13,
      borderRadius: 6,
      border: "1px solid #e5e7eb",
      background: "white",
      color: "#111827",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: 320,
      boxSizing: "border-box",
      flexShrink: 0,
      textAlign: "left",
    }}
  >
    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {label}
    </span>
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>
);

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const Bone = ({ w = "100%", h = 14, radius = 6, mb = 0 }: { w?: string | number; h?: number; radius?: number; mb?: number }) => (
  <div className="animate-pulse bg-slate-200" style={{ width: w, height: h, borderRadius: radius, marginBottom: mb }} />
);

const ActivistDashboardSkeleton = () => (
  <div style={{ padding: 24, width: "100%", background: "#f9fafb", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px #0000000a" }}>
      <div style={{ background: THEME_MAROON, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <Bone w={200} h={22} radius={4} />
        <Bone w={240} h={36} radius={6} />
      </div>

      {/* Profile info */}
      <div style={{ padding: "20px 24px 0" }}>
        <Bone w={130} h={22} radius={999} mb={14} />
        <Bone w={110} h={13} radius={4} mb={16} />
        <Bone w="90%" h={14} radius={4} mb={8} />
        <Bone w="75%" h={14} radius={4} mb={20} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
            <Bone w={12} h={12} radius={2} />
            <Bone w={`${[85, 78, 70][i]}%`} h={13} radius={4} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 28, marginTop: 16 }}>
        {[70, 80, 90, 72].map((w, i) => (
          <Bone key={i} w={w} h={14} radius={4} />
        ))}
      </div>

      {/* Metric cards */}
      <div style={{ padding: "24px 24px 0", display: "flex", flexWrap: "wrap", gap: 0, borderBottom: "1px solid #e5e7eb", paddingBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: "1 1 180px", borderRight: i < 3 ? "1px solid #e5e7eb" : "none", padding: "0 16px" }}>
            <Bone w={100} h={11} radius={3} mb={10} />
            <Bone w={70} h={30} radius={4} mb={8} />
            <Bone w={90} h={11} radius={3} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const ActivistIntelligenceDashboard = ({
  externalPreviewData = null,
  onPreviewPublished = () => {},
  openGenerateModalSignal = 0,
  headerActionsSlot = null,
}: {
  externalPreviewData?: any;
  onPreviewPublished?: () => void;
  openGenerateModalSignal?: number;
  // Element in the host page's header where the Edit Mode controls should
  // render (see ProxyContestAI). Null when this dashboard is used standalone,
  // in which case the controls fall back to rendering above the profile.
  headerActionsSlot?: HTMLElement | null;
}) => {
  const { user } = useAppSelector((state: RootState) => state.authentiction);
  // Compared case-insensitively: user_type comes straight from the API and
  // isn't guaranteed to be title-cased (UserManagement normalises it the same
  // way before matching), so a strict === "Admin" silently locked real admins
  // out of Edit Mode. Edit Mode is admin-only.
  const userType = (user?.user_type || "").trim().toLowerCase();
  const isAdmin = userType === "admin";
  const isAnalyst = userType === "analyst";
  const isAdminOrAnalyst = isAdmin || isAnalyst;
  const showEditButton = isAdminOrAnalyst;

  const [profilesCache, setProfilesCache] = useState<Record<string, any>>({});
  const [investorKeys, setInvestorKeys] = useState<string[]>([]);
  const [activeInvestorKey, setActiveInvestorKey] = useState("");
  const activeInvestorKeyRef = useRef(activeInvestorKey);
  activeInvestorKeyRef.current = activeInvestorKey;

  const [investorNames, setInvestorNames] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("summary");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newInvestorName, setNewInvestorName] = useState("");
  const [selectedJsonFiles, setSelectedJsonFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateInvestorName, setGenerateInvestorName] = useState("");
  const [generateCik, setGenerateCik] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState("");
  // Scoped to the Generate modal so a failed generation shows inline there
  // instead of replacing the whole dashboard via the shared page-level
  // `error` state (that used to wipe out the modal along with everything else).
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ── Basic profile (new "Basic" tab) ──────────────────────────────────────
  // Deliberately separate from rawProfile/profile/profilesCache, which are
  // the Advanced/enhanced profile's state — BasicProfile is a different
  // backend shape (see BasicProfilePanel) and must never enter Edit Mode /
  // isPreviewMode / the Approve & Publish flow, all of which assume the
  // enhanced schema.
  const [basicProfile, setBasicProfile] = useState<any>(null);
  const [basicLoading, setBasicLoading] = useState(false);
  const [basicError, setBasicError] = useState<string | null>(null);
  const [basicProfilesCache, setBasicProfilesCache] = useState<Record<string, any>>({});

  // ── Merging two profiles into a combined one ─────────────────────────────
  // Investor keys (index form), never more than MERGE_PAIR_SIZE of them. Held
  // apart from activeInvestorKey on purpose: ticking rows builds a merge pair,
  // it never changes which profile is on screen.
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [mergeName, setMergeName] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  // is_combination / combination_of per BASE slug — read off the profile index
  // when it carries them, and off each basic profile as it loads. The dropdown
  // needs this before a profile has ever been opened, since a combined profile
  // can't be merged again and its checkbox has to say so up front.
  const [combinationMeta, setCombinationMeta] = useState<Record<string, { isCombination: boolean; combinationOf: string[] }>>({});

  // Which panel shows when an investor has BOTH a Basic and an Advanced
  // profile — only meaningful in that case; when only one exists, the render
  // forces that one regardless of this. Reset to "basic" on every investor
  // switch (see the activeInvestorKey effect below) so the default is always
  // Basic, not whatever was last selected for a different investor.
  const [profileViewMode, setProfileViewMode] = useState<"basic" | "advanced">("basic");

  // Drives the Generate modal's second step: submitting the name only ever
  // generates a PREVIEW (basic/generate no longer persists anything) — the
  // modal expands in-place to show that preview and gate on an explicit
  // Approve before basic/publish ever gets called. Nothing is saved until
  // that click.
  const [generateModalStep, setGenerateModalStep] = useState<"form" | "preview">("form");
  const [isSubmittingBasic, setIsSubmittingBasic] = useState(false);
  const [isApprovingBasic, setIsApprovingBasic] = useState(false);
  const [modalBasicResult, setModalBasicResult] = useState<any>(null);

  // WhaleWisdom filer disambiguation — reuses the same picker as the
  // institution-linking flow (CreateAndEditInstitution.tsx) so a raw typed
  // name resolves to a specific WhaleWisdom filer before generation runs,
  // instead of leaving the backend to best-effort match on the name alone.
  const [isResolvingWhaleWisdom, setIsResolvingWhaleWisdom] = useState(false);
  const [whaleWisdomFilerOptions, setWhaleWisdomFilerOptions] = useState<WhaleWisdomFiler[]>([]);
  const [showWhaleWisdomPicker, setShowWhaleWisdomPicker] = useState(false);
  // Set when the WhaleWisdom lookup came back with zero matches (or failed
  // outright) — surfaced as a subtle, non-blocking note rather than stopping
  // generation, since a raw-name-only generate is exactly what happened here
  // before this feature existed.
  const [whaleWisdomNoMatch, setWhaleWisdomNoMatch] = useState(false);

  // Generation runs server-side, so closing the modal must not stop the job.
  // Holding the poll timer in a ref lets the preview still land once the job
  // finishes with the modal dismissed, and lets us clear the timer on unmount
  // instead of leaking a 3-second interval for the rest of the session.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentGenerationSlugRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // All in-flight generation jobs (not just this session's) — lets the
  // "Generating… NN%" indicator survive closing the modal, and lets a freshly
  // opened modal detect a job that's already running for that investor.
  const [activeJobs, setActiveJobs] = useState<ActiveGenerationJob[]>([]);
  const activeJobsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The poll interval is created once on mount, so it can't close over fresh
  const fetchActiveJobsRef = useRef<((force?: boolean) => Promise<void>) | null>(null);

  /** Dismiss the modal. Safe mid-generation — the backend job keeps running. */
  const closeGenerateModal = () => {
    setGenerateModalOpen(false);
    setGenerateError(null);
    // These are pure modal-local UI state (not tied to any background job —
    // that's isGenerating/currentGenerationSlugRef), safe to always reset.
    setGenerateModalStep("form");
    setModalBasicResult(null);
    if (!isGenerating) {
      setGenerateInvestorName("");
      setGenerateCik("");
    }
  };

  // ── External trigger: opens the Generate Profile modal from the "Add Proxy
  // Contest" split-button dropdown outside this component ──
  const consumedGenerateSignal = useRef(0);
  useEffect(() => {
    if (openGenerateModalSignal && openGenerateModalSignal !== consumedGenerateSignal.current) {
      consumedGenerateSignal.current = openGenerateModalSignal;
      setGenerateModalOpen(true);
      setGenerateError(null); // don't carry a stale error into a fresh attempt
    }
  }, [openGenerateModalSignal]);


  const [rawProfile, setRawProfile] = useState<any>(null); 
  const [isEditMode, setIsEditMode] = useState(false);     
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [profile, setProfile]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const loadTokenRef = useRef(0);
  // Keys that have already failed a profile fetch this session -- prevents
  // loadProfileForKey's fallback-on-error logic from ever bouncing between
  // the same bad keys forever (seen in prod as a runaway loop hammering
  // /api/activist-profiles with no backoff).
  const failedProfileKeysRef = useRef<Set<string>>(new Set());
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState("");
  const [selectorHighlightedIndex, setSelectorHighlightedIndex] = useState(0);
  const selectorContainerRef = useRef<HTMLDivElement>(null);
  const selectorOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close on outside click or Escape — the dropdown previously only closed
  // via an explicit onClick on an item or the trigger toggle.
  useEffect(() => {
    if (!selectorOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (selectorContainerRef.current && !selectorContainerRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectorOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectorOpen]);

  // A fresh search (or a freshly (re)opened dropdown) always starts the
  // keyboard highlight back at the top result.
  useEffect(() => {
    setSelectorHighlightedIndex(0);
  }, [selectorSearch, selectorOpen]);

  useEffect(() => {
    selectorOptionRefs.current[selectorHighlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectorHighlightedIndex]);

  // Admin-only inline rename of a firm's display name (header title and/or
  // investor picker). Keyed by which investor key is currently being edited
  // (not a single boolean) so the same affordance works both for the header
  // — always the active profile — and for any row in the dropdown list.
  const [editingNameKey, setEditingNameKey] = useState<string | null>(null);
  const [legalNameDraft, setLegalNameDraft] = useState("");
  const [isSavingLegalName, setIsSavingLegalName] = useState(false);

  // Admin-only delete of the active profile.
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  const startEditLegalName = (key: string, currentLabel: string) => {
    setEditingNameKey(key);
    setLegalNameDraft(currentLabel);
  };

  const cancelEditLegalName = () => {
    setEditingNameKey(null);
    setLegalNameDraft("");
  };

  const saveLegalName = async (key: string) => {
    const trimmed = legalNameDraft.trim();
    if (!trimmed) return;
    try {
      setIsSavingLegalName(true);
      await axios.patch(`${AI_CHATBOT_API_BASE}/api/activist-profiles/${key}/name`, { legal_name: trimmed });

      // Reflect immediately everywhere the name is shown, without a full
      // reload: the dropdown/trigger label map, the cached raw profile (so a
      // later cache hit doesn't regress the name), and the currently
      // rendered profile if this is the one being viewed.
      setInvestorNames((prev) => ({ ...prev, [key]: trimmed }));
      setProfilesCache((prev) => {
        const existing = prev[key];
        if (!existing) return prev;
        return {
          ...prev,
          [key]: {
            ...existing,
            activist_investor_summary: { ...(existing.activist_investor_summary || {}), legal_name: trimmed },
          },
        };
      });

      // The Basic copy of the name has to move too. displayName reads
      //   profile?.legalName || basicProfile?.investor_name || investorNames[key]
      // so on a Basic-only investor (no Advanced `profile` object, which makes
      // the setProfile call below a no-op) the header would fall through to the
      // stale basicProfile.investor_name and snap straight back to the old
      // name — a successful save that looks like it silently failed. The cache
      // is keyed by base slug, so a later cache hit doesn't regress it either.
      const baseSlug = toBaseSlug(key);
      setBasicProfilesCache((prev) => {
        const existing = prev[baseSlug];
        if (!existing) return prev;
        return { ...prev, [baseSlug]: { ...existing, investor_name: trimmed } };
      });

      if (key === activeInvestorKey) {
        setProfile((prev: any) => (prev ? { ...prev, legalName: trimmed } : prev));
        setRawProfile((prev: any) =>
          prev ? { ...prev, activist_investor_summary: { ...(prev.activist_investor_summary || {}), legal_name: trimmed } } : prev
        );
        setBasicProfile((prev: any) => (prev ? { ...prev, investor_name: trimmed } : prev));
      }
      setEditingNameKey(null);
      setLegalNameDraft("");
    } catch (err) {
      console.error("Failed to rename profile:", err);
      setError("Failed to rename the firm.");
    } finally {
      setIsSavingLegalName(false);
    }
  };

  // Deletes the profile tier actually being viewed (admin/analyst — the
  // button that triggers this is gated on isAdminOrAnalyst, and the backend
  // independently rejects the call for other X-User-Type values). Handles
  // both slug shapes the dropdown can hand us: an advanced-profile key
  // ("x-profile") or a bare basic-only key ("x") — see
  // delete_investor_profile's docstring.
  const handleDeleteActiveProfile = async () => {
    if (!activeInvestorKey || isDeletingProfile) return;
    const deletedKey = activeInvestorKey;
    const deletingBasicOnly = effectiveProfileView === "basic" && hasAdvancedProfile;
    const slugToDelete = effectiveProfileView === "basic" ? toBaseSlug(deletedKey) : deletedKey;
    setIsDeletingProfile(true);
    try {
      await axios.delete(`${AI_CHATBOT_API_BASE}/api/activist-profiles/${slugToDelete}`, {
        headers: { "X-User-Type": user?.user_type || "" },
      });

      setIsDeleteModalOpen(false);
      toast.success(`${displayName} ${effectiveProfileView === "basic" ? "Condensed" : "Comprehensive"} profile deleted.`);

      const baseSlug = toBaseSlug(deletedKey);

      if (deletingBasicOnly) {
        // Advanced profile survives -- stay on this investor, just drop the
        // Basic half and fall back to the Comprehensive view.
        setBasicProfilesCache((prev) => {
          const { [baseSlug]: _omit, ...rest } = prev;
          return rest;
        });
        setBasicProfile(null);
        setProfileViewMode("advanced");
        return;
      }

      // Deleting the Advanced profile (or the investor's only profile) --
      // same full-removal behavior as before.
      setProfilesCache((prev) => {
        const { [deletedKey]: _omit, ...rest } = prev;
        return rest;
      });
      setBasicProfilesCache((prev) => {
        const { [baseSlug]: _omit, ...rest } = prev;
        return rest;
      });
      setInvestorNames((prev) => {
        const { [deletedKey]: _omit, ...rest } = prev;
        return rest;
      });

      const remainingKeys = investorKeys.filter((k) => k !== deletedKey);
      setInvestorKeys(remainingKeys);
      setActiveInvestorKey(remainingKeys[0] || "");
      if (!remainingKeys.length) {
        setProfile(null);
        setRawProfile(null);
        setBasicProfile(null);
      }
    } catch (err: any) {
      console.error("Failed to delete profile:", err);
      toast.error(err.response?.data?.detail || "Failed to delete the profile.");
    } finally {
      setIsDeletingProfile(false);
    }
  };

  // Fallback label used only until the real legal name lands (see the name
  // prefetch effect). Strips the trailing "-profile"/"_profile" suffix — S3
  // slugs use both separators (e.g. "biglari-capital_profile"), and matching
  // only the hyphen form left "Profile" stuck on the end of those labels.
  const formatKeyToLabel = (keyStr: string) => {
    if (!keyStr) return "";
    return keyStr
      .replace(/[-_]profile$/i, '')
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const fetchAllProfiles = useCallback(async (keyToSelect?: string) => {
    const myToken = ++loadTokenRef.current;
    try {
      setLoading(true);
      setError(null);
      const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles`;
      const response = await axios.get(url, { params: { t: Date.now() } });

      let listPayload = response.data?.data || response.data;
      if (listPayload && typeof listPayload === 'object' && !Array.isArray(listPayload)) {
          listPayload = Object.keys(listPayload);
      }

      if (!Array.isArray(listPayload) || listPayload.length === 0) {
        throw new Error("No profiles available in the designated S3 cluster prefix.");
      }

      // The index now returns {slug, legal_name} entries so the dropdown gets
      // real names in this single call — no more per-profile fetch just to
      // resolve a label (see the deleted name-prefetch effect this replaced).
      // Still tolerates the older plain-slug-array shape defensively.
      const discoveredKeys: string[] = listPayload.map((entry: any) => (typeof entry === "string" ? entry : entry.slug));
      const namesFromIndex: Record<string, string> = {};
      listPayload.forEach((entry: any) => {
        if (entry && typeof entry === "object" && entry.slug && entry.legal_name) {
          namesFromIndex[entry.slug] = entry.legal_name;
        }
      });
      if (Object.keys(namesFromIndex).length > 0) {
        setInvestorNames((prev) => ({ ...namesFromIndex, ...prev }));
      }

      // Combination flags, when the index carries them. Anything it doesn't
      // cover gets filled in by loadBasicForKey as profiles are opened, so this
      // merges into whatever is already known rather than replacing it.
      const combinationsFromIndex: Record<string, { isCombination: boolean; combinationOf: string[] }> = {};
      listPayload.forEach((entry: any) => {
        if (entry && typeof entry === "object" && entry.slug && entry.is_combination) {
          combinationsFromIndex[toBaseSlug(entry.slug)] = {
            isCombination: true,
            combinationOf: Array.isArray(entry.combination_of) ? entry.combination_of : [],
          };
        }
      });
      if (Object.keys(combinationsFromIndex).length > 0) {
        setCombinationMeta((prev) => ({ ...prev, ...combinationsFromIndex }));
      }

      setInvestorKeys(discoveredKeys);
      const currentActiveKey = activeInvestorKeyRef.current;
      if (keyToSelect && discoveredKeys.includes(keyToSelect)) {
        setActiveInvestorKey(keyToSelect);
      } else if (!currentActiveKey || (keyToSelect && !discoveredKeys.includes(currentActiveKey))) {
        // Either nothing selected yet, or the key we wanted (or the one
        // already active) isn't actually present in S3 — fall back to the
        // first profile that is, instead of showing a stale/missing one.
        setActiveInvestorKey(discoveredKeys[0]);
      }
      return discoveredKeys as string[];
    } catch (err: any) {
      console.error("[ActivistDashboard] index assembly failure:", err);
      setError(err.response?.data?.detail || err.message || "Failed to load dynamic profile index.");
      return undefined;
    } finally {
      // Only the most recently-started profile-affecting load may clear (or
      // re-set) loading — a superseded call finishing late becomes a no-op
      // instead of clobbering whatever a newer request already settled.
      if (loadTokenRef.current === myToken) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (externalPreviewData) {
      setRawProfile(externalPreviewData);
      setProfile(normaliseProfile(externalPreviewData));
      setIsPreviewMode(true);
      // Show the generated profile as a normal read view first — Edit Mode
      // is opt-in via the button, not the default landing state.
      setIsEditMode(false);
    }
  }, [externalPreviewData]);

  useEffect(() => {
    fetchAllProfiles();
  }, [fetchAllProfiles]);

  // Loads one investor's profile into rawProfile/profile, using profilesCache
  // unless forceRefresh is set (used after a background-generated job for
  // this investor finishes, so the currently-open profile doesn't keep
  // showing stale cached data). Shared by the activeInvestorKey effect below
  // and by refreshFinishedJobProfile.
  const loadProfileForKey = async (key: string, { forceRefresh = false } = {}) => {
    // Defensive guard: key must be a real, non-empty string before it's ever
    // allowed into a URL template literal -- if a non-string slips in from
    // anywhere (bad state, a stale reference, etc.), interpolating it would
    // silently produce a literal "/api/activist-profiles/[object Object]"
    // request instead of failing loudly. Refuse it here instead.
    if (typeof key !== "string" || !key) {
      console.error("[loadProfileForKey] refusing to fetch a non-string/empty key:", key);
      setError("Failed to load the selected investor profile (invalid key).");
      setLoading(false);
      return;
    }
    const myToken = ++loadTokenRef.current;
    setIsPreviewMode(false);
    setIsEditMode(false);

    if (!forceRefresh && profilesCache[key]) {
      setRawProfile(profilesCache[key]);
      setProfile(normaliseProfile(profilesCache[key]));
      // Free upgrade from the slug-derived fallback label to the real legal
      // name — no extra network call, this data was already fetched.
      const cachedLegalName = extractLegalName(profilesCache[key]);
      if (cachedLegalName) {
        setInvestorNames((prev) => (prev[key] === cachedLegalName ? prev : { ...prev, [key]: cachedLegalName }));
      }
      // Resolves synchronously with fresh-enough data — clear any skeleton
      // left over from a still-in-flight, now-superseded fetch (e.g. an
      // earlier investor switch whose network call hasn't returned yet).
      if (loadTokenRef.current === myToken) setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles/${key}`;
      const response = await axios.get(url, { params: { t: Date.now() } });
      const profileData = response.data?.data || response.data;

      setProfilesCache(prev => ({ ...prev, [key]: profileData }));
      setRawProfile(profileData);
      setProfile(normaliseProfile(profileData));
      // Same free upgrade, for the path that actually had to hit the network.
      const legalName = extractLegalName(profileData);
      if (legalName) {
        setInvestorNames((prev) => ({ ...prev, [key]: legalName }));
      }
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 404) {
        // No Advanced profile exists for this investor — legitimate now that
        // Basic-only profiles exist (e.g. a freshly-approved basic profile
        // with no Advanced version yet). NOT a broken/stale key: leave
        // profile/rawProfile null (already cleared by the effect above) and
        // don't bounce to a different investor or surface a page-level error
        // — the render gate below falls through to the Basic-only content.
        console.info(`[Comprehensive Profile] No comprehensive profile for '${key}' — rendering Basic-only if available.`);
      } else {
        console.error(`[Fetch Profile Error] '${key}' not found in S3:`, err);
        failedProfileKeysRef.current.add(key);

        // The selected key doesn't have a matching file in S3 (stale slug, deleted
        // profile, etc). Rather than dead-ending on an error screen, fall back to
        // the first profile that does exist so the dashboard still shows something
        // -- but only among keys that haven't already failed this session, so a
        // bad key can never bounce back and forth with another bad key forever.
        const fallbackKey = investorKeys.find((k) => k !== key && !failedProfileKeysRef.current.has(k));
        if (fallbackKey) {
          setActiveInvestorKey(fallbackKey);
        } else {
          setError("Failed to fetch the selected investor profile data.");
        }
      }
    } finally {
      // Only the most recently-started profile-affecting load may clear (or
      // re-set) loading — see loadTokenRef's declaration for why.
      if (loadTokenRef.current === myToken) setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeInvestorKey) return;
    // Clear the PREVIOUS investor's Advanced data immediately — loadProfileForKey
    // no longer treats "no Advanced profile" as an error it bounces away from
    // (see its catch block below), so without this, switching from an investor
    // that has an Advanced profile to a Basic-only one would keep showing the
    // old investor's Advanced content under the new investor's header. Mirrors
    // the Basic-fetch effect's setBasicProfile(null)/setBasicError(null) below.
    setProfile(null);
    setRawProfile(null);
    setError(null);
    setProfileViewMode("basic");
    // The "activist_filings" tab only exists for dual-profile investors (see
    // the hasBasicProfile && hasAdvancedProfile-gated tab list below) — reset
    // here too so switching to a single-profile investor while sitting on
    // that tab can't leave activeTab pointing at a tab that no longer renders
    // (which would otherwise show a blank pane with no tab visually active).
    setActiveTab("summary");
    loadProfileForKey(activeInvestorKey);
  }, [activeInvestorKey]);

  // Loads the Basic profile for `key` from cache or GET .../basic/{baseSlug}.
  // Mirrors loadProfileForKey's cache-then-fetch shape but against its own
  // cache — basicProfilesCache/basicProfile never touch rawProfile/profile.
  // Pure read: this is the ONLY network call viewing a profile is allowed to
  // make for the Basic tab — no fallback POST, no generation, ever. A 404
  // (nothing was ever approved for this investor) is not an error, it's just
  // "no basic profile yet" — the tab shows empty, not a scary error banner.
  const loadBasicForKey = async (key: string, { forceRefresh = false } = {}) => {
    const baseSlug = toBaseSlug(key);
    if (!baseSlug) return;

    if (!forceRefresh && basicProfilesCache[baseSlug]) {
      setBasicProfile(basicProfilesCache[baseSlug]);
      setBasicError(null);
      return;
    }

    try {
      setBasicLoading(true);
      setBasicError(null);
      const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles/basic/${baseSlug}`;
      const response = await axios.get(url, { params: { t: Date.now() } });
      const data = response.data?.data || response.data;
      setBasicProfilesCache((prev) => ({ ...prev, [baseSlug]: data }));
      // Authoritative for this slug: the document itself, not the index summary.
      setCombinationMeta((prev) => ({
        ...prev,
        [baseSlug]: {
          isCombination: !!data?.is_combination,
          combinationOf: Array.isArray(data?.combination_of) ? data.combination_of : [],
        },
      }));
      if (activeInvestorKeyRef.current === key) setBasicProfile(data);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 404) {
        // Nothing has ever been approved for this investor — expected, not
        // an error. Leave the tab empty rather than surfacing basicError.
        if (activeInvestorKeyRef.current === key) setBasicProfile(null);
      } else {
        console.error(`[Basic Profile] Failed to fetch basic profile for '${baseSlug}':`, err);
        if (activeInvestorKeyRef.current === key) {
          setBasicProfile(null);
          setBasicError("Failed to load the basic profile.");
        }
      }
    } finally {
      if (activeInvestorKeyRef.current === key) setBasicLoading(false);
    }
  };

  // Fires whenever the active investor changes: read-only GET of whatever
  // basic profile was already approved/published for it, nothing else.
  // Viewing a profile must never trigger generation — the only place a basic
  // profile gets created is the explicit Approve action in the Generate
  // modal (see handleApproveBasic).
  useEffect(() => {
    if (!activeInvestorKey) return;
    setBasicProfile(null);
    setBasicError(null);
    loadBasicForKey(activeInvestorKey);
  }, [activeInvestorKey]);

  const fetchActiveJobs = async (force = false) => {
    // Deliberately NOT skipping this when isGenerating is false and
    // activeJobs is empty. That used to be here as a "nothing to check"
    // optimization, but it self-deadlocks: right after a page refresh both
    // isGenerating and activeJobs reset to their empty defaults regardless
    // of whether a job is genuinely still running server-side, so a single
    // fetch on the (force=true) mount call coming up empty — a transient
    // network blip, or getCreatorEmail() resolving before auth state has
    // hydrated — would permanently block every later (force=false) 15s poll
    // from ever checking again, since the guard's own condition never stops
    // being true once activeJobs is empty. The whole point of this poll is
    // to recover state we don't yet know about, so it must never gate on
    // state that's exactly what it's trying to discover.
    const creatorEmail = getCreatorEmail();
    if (!creatorEmail) return;
    try {
      const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles/generate/active`;
      const response = await axios.get(url, { params: { t: Date.now(), creator_email: creatorEmail } });
      let jobs = response.data?.data || response.data;
      if (!Array.isArray(jobs)) jobs = [];
      // Defensive: a job genuinely still "in flight" should never be reporting
      // 100% — if one is, the backend just hasn't removed it from this list
      // yet, so don't leave a "done" job looking perpetually active on screen.
      jobs = jobs.filter((j: ActiveGenerationJob) => !(typeof j.progress_pct === "number" && j.progress_pct >= 100));

      const newSlugs = new Set(jobs.map((j: ActiveGenerationJob) => j.slug));
      const finishedSlugs = activeJobs.filter((j) => !newSlugs.has(j.slug)).map((j) => j.slug);

      setActiveJobs(jobs);
      finishedSlugs.forEach((slug) => refreshFinishedJobProfile(slug));
    } catch (err) {
      // The endpoint may not exist yet / may be briefly unreachable — the
      // indicator just stays as it was, nothing user-facing to show for this.
      console.warn("[Active jobs poll] failed:", err);
    }
  };
  fetchActiveJobsRef.current = fetchActiveJobs;

  const refreshFinishedJobProfile = async (jobSlug: string) => {
    const freshKeys = await fetchAllProfiles();
    const matchedKey = (freshKeys || investorKeys).find((k) => slugMatches(jobSlug, k));
    if (matchedKey && matchedKey === activeInvestorKey) {
      setProfilesCache((prev) => {
        const next = { ...prev };
        delete next[matchedKey];
        return next;
      });
      loadProfileForKey(matchedKey, { forceRefresh: true });
    }
  };

  useEffect(() => {
    fetchActiveJobsRef.current?.(true);
    activeJobsPollRef.current = setInterval(() => {
      fetchActiveJobsRef.current?.(false);
    }, 15000);
    return () => {
      if (activeJobsPollRef.current) {
        clearInterval(activeJobsPollRef.current);
        activeJobsPollRef.current = null;
      }
    };
  }, []);

 const handlePreviewFiles = async () => {
    if (!newInvestorName || selectedJsonFiles.length === 0) {
      setError("Please provide an investor name and select files.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append("investor_name", newInvestorName);
      selectedJsonFiles.forEach((file) => {
        formData.append("files", file);
      });

      // Pointing to your new preview endpoint
      const response = await axios.post(
        `${AI_CHATBOT_API_BASE}/api/activist-profiles/preview-multi`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const previewData = response.data.data;
      
      // Load the preview data into the dashboard
      setRawProfile(previewData);
      setProfile(normaliseProfile(previewData));
      
      setIsPreviewMode(true);
      setIsEditMode(false); // land on the read view; Edit Mode is opt-in
      setUploadModalOpen(false); // Close modal on success

    } catch (err: any) {
      console.error("Preview generation failed:", err);
      setError(err.response?.data?.detail || "Failed to generate preview.");
    } finally {
      setIsUploading(false);
    }
  };

  const buildGenerationFailedMessage = (name: string) =>
    `We couldn't generate a profile for "${name}".  
    double-check the spelling, or try the fund's ` +
    `exact legal name (e.g. "Elliott Investment Management" rather than "Elliott").`;

  // Mirrors the backend's slugify() (app/api/activist_intelligence.py) so we
  // can check "does a profile for this name already exist" against
  // investorKeys before spending several minutes regenerating one.
  const slugifyName = (text: string) =>
    text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");

  const getActiveJobForName = (name: string): ActiveGenerationJob | undefined => {
    const slug = slugifyName(name);
    if (!slug) return undefined;
    return activeJobs.find((j) => slugMatches(slug, j.slug));
  };

  const getActiveJobForKey = (key: string): ActiveGenerationJob | undefined =>
    activeJobs.find((j) => slugMatches(j.slug, key));

  const getCreatorEmail = (): string | undefined => {
    if (user?.email) return user.email;
    try {
      const stored = JSON.parse(localStorage.getItem("User") || "null");
      return stored?.email || undefined;
    } catch {
      return undefined;
    }
  };

  // Shared by the manual "Approve & Publish" button (handleSaveProfile) and
  // the regular-user auto-publish path in runGeneration below.
  const publishProfileToS3 = async (payload: any) => {
    await axios.post(`${AI_CHATBOT_API_BASE}/api/activist-profiles`, payload);
  };

  // Reads the current profile's metadata.version from cache (or S3 if never
  // loaded this session) so a regenerate of the same investor bumps to the
  // next version instead of silently overwriting it as "version 1" again.
  const getNextVersion = async (regenerateFromKey: string | null): Promise<number> => {
    if (!regenerateFromKey) return 1;
    try {
      let existingRaw = profilesCache[regenerateFromKey];
      if (!existingRaw) {
        const res = await axios.get(`${AI_CHATBOT_API_BASE}/api/activist-profiles/${regenerateFromKey}`, { params: { t: Date.now() } });
        existingRaw = res.data?.data || res.data;
      }
      return (Number(existingRaw?.metadata?.version) || 1) + 1;
    } catch (err) {
      console.warn("Failed to read prior version for regenerate, defaulting to 2:", err);
      return 2;
    }
  };

  const runGeneration = async (regenerateFromKey: string | null = null) => {
    try {
      setIsGenerating(true);
      setGenerateStep("Starting...");
      setGenerateError(null);

      const creatorEmail = SEND_GENERATION_EMAIL ? getCreatorEmail() : undefined;
      if (SEND_GENERATION_EMAIL && !creatorEmail) {
        // Not fatal — the profile still generates, the user just won't get the
        // "your profile is ready" mail.
        console.warn("No logged-in email available; generation will not send a completion email.");
      }
      if (!SEND_GENERATION_EMAIL) {
        console.info("[dev] SEND_GENERATION_EMAIL is off — no completion email will be sent.");
      }

      // Kick off the background job
      const startRes = await axios.post(`${AI_CHATBOT_API_BASE}/api/activist-profiles/generate`, {
        investor_name: generateInvestorName,
        creator_email: creatorEmail,
        mode: GENERATE_MODE,
      });
      
      const { slug } = startRes.data;
      currentGenerationSlugRef.current = slug;

      // Let the page-level indicator pick up this job immediately instead of
      // waiting for its next 4s tick.
      fetchActiveJobsRef.current?.(true);

      // Start Polling
      if (pollRef.current) clearInterval(pollRef.current);
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${AI_CHATBOT_API_BASE}/api/activist-profiles/generate/${slug}/status`);
          const jobData = statusRes.data;

          if (jobData.state === "running") {
            setGenerateStep(jobData.step || "Processing...");
          }
          else if (jobData.state === "done") {
            clearInterval(pollInterval);
            setGenerateStep("Complete!");
            currentGenerationSlugRef.current = null;

            const nextVersion = await getNextVersion(regenerateFromKey);
            jobData.data.metadata = { ...(jobData.data.metadata || {}), version: nextVersion };

            setRawProfile(jobData.data);
            setProfile(normaliseProfile(jobData.data));
            setIsEditMode(false); // land on the read view; Edit Mode is opt-in
            setIsPreviewMode(false);
            try {
              await publishProfileToS3(jobData.data);
              const newSlug = jobData.data?.metadata?.slug || slug;
              await fetchAllProfiles(newSlug);
              // Same as publishBasicProfile: land on a clean view of the
              // freshly-generated profile, not the investor grid still open
              // from before generation started.
              setSelectorOpen(false);
              setSelectorSearch("");
              const legalName = extractLegalName(jobData.data) || generateInvestorName;
              toast.success(`${legalName} profile created — now available in the dropdown.`);
            } catch (publishErr: any) {
              console.error("Auto-publish failed:", publishErr);
              const message = publishErr?.response?.data?.detail || "Failed to publish the generated profile.";
              setError(message);
              toast.error(message);
            } finally {
              setGenerateModalOpen(false);
              setIsGenerating(false);
            }
          }
          else if (jobData.state === "error") {
            clearInterval(pollInterval);
            console.error("Generation job failed:", jobData.message);
            setGenerateError(buildGenerationFailedMessage(generateInvestorName));
            setIsGenerating(false);
            currentGenerationSlugRef.current = null;
          }
        } catch (pollErr) {
          // If 404, it might just not be written to S3 yet, keep polling.
          console.warn("Polling interval warning:", pollErr);
        }
      }, 3000); // Poll every 3 seconds
      pollRef.current = pollInterval;

    } catch (err: any) {
      console.error("Failed to start generation:", err);
      setGenerateError(buildGenerationFailedMessage(generateInvestorName));
      setIsGenerating(false);
      currentGenerationSlugRef.current = null;
    }
  };

  // Published profiles are saved as "{slug}-profile" — check investorKeys
  // (already loaded for the profile switcher) before burning several minutes
  // regenerating one that already exists, and ask the user to confirm first.
  const [duplicateProfileKey, setDuplicateProfileKey] = useState<string | null>(null);

  const handleStartGeneration = () => {
    if (!generateInvestorName.trim()) return;
    if (getActiveJobForName(generateInvestorName)) return;
    const targetSlug = `${slugifyName(generateInvestorName)}-profile`;
    // Compare with underscores normalised to dashes — a handful of legacy S3
    // keys (e.g. "biglari-capital_profile") predate the "-profile" suffix
    // convention and would otherwise silently miss this match, skipping the
    // regenerate-confirmation prompt and leaving metadata.version stuck at 1.
    const normalize = (s: string) => s.toLowerCase().replace(/_/g, "-");
    const existingKey = investorKeys.find((k) => normalize(k) === normalize(targetSlug));
    if (existingKey) {
      setDuplicateProfileKey(existingKey);
      return;
    }
    runGeneration();
  };

  const handleConfirmRegenerate = () => {
    const regenerateFromKey = duplicateProfileKey;
    setDuplicateProfileKey(null);
    runGeneration(regenerateFromKey);
  };

  const handleCancelRegenerate = () => {
    // "No" — back to the main page, per the requested flow.
    setDuplicateProfileKey(null);
    setGenerateModalOpen(false);
    setGenerateInvestorName("");
    setGenerateCik("");
  };

  // ── Generate modal, step 1: Basic profile PREVIEW ───────────────────────
  // basic/generate is preview-only — it returns a BasicProfileResponse but
  // persists nothing. Held in modalBasicResult until the user explicitly
  // approves it (handleApproveBasic) — closing the modal at this point
  // discards it with no server-side trace. No duplicate-name check here
  // either: previewing costs nothing to redo, and the guard stays scoped to
  // the "Create Advanced Profile Instead" path below, unchanged.
  //
  // Actually calls basic/generate — split out from handleGenerateModalSubmit
  // so it can run either right after an auto-resolved (0 or 1 candidate)
  // WhaleWisdom lookup, or from the picker modal's onConfirm once the user
  // has disambiguated among multiple candidates.
  const runBasicGenerate = async (filer: WhaleWisdomFiler | null) => {
    setIsSubmittingBasic(true);
    setGenerateError(null);
    try {
      const response = await axios.post(`${AI_CHATBOT_API_BASE}/api/activist-profiles/basic/generate`, {
        investor_name: generateInvestorName,
        creator_email: getCreatorEmail(),
        ...(filer?.id ? { whalewisdom_filer_id: filer.id } : {}),
        ...(filer?.cik ? { whalewisdom_cik: filer.cik } : {}),
      });
      const data = response.data?.data || response.data;
      setModalBasicResult(data);
      if (IS_LOCAL_ENV) {
        // Local dev keeps today's exact flow: show the preview step so the
        // user can review and explicitly Approve (or bail to Advanced).
        setGenerateModalStep("preview");
      } else {
        // Production: no manual approval gate — publish straight through
        // using the freshly-fetched `data`, NOT `modalBasicResult` state
        // (which wouldn't be readable yet in this same synchronous flow).
        // isSubmittingBasic stays true across this await, so the modal's
        // "Generating..." state naturally covers the publish call too.
        await publishBasicProfile(data);
      }
    } catch (err: any) {
      console.error("Basic preview generation failed:", err);
      setGenerateError(
        err.response?.data?.detail || `We couldn't generate a basic profile for  "${generateInvestorName}".`
      );
    } finally {
      setIsSubmittingBasic(false);
    }
  };

  // Checks whether the backend already has a resolved WhaleWisdom filer on
  // record for this investor name — GET .../basic/known-filer, which does
  // its own fuzzy name matching server-side (the same matching used
  // everywhere else on the backend). This makes no matching decisions of
  // its own; it only reads resolved_whalewisdom_filer_id /
  // resolved_whalewisdom_cik off the response (both null together when
  // nothing's known — investor doesn't exist yet, or exists but was
  // published before these fields did). Returns null in both of those
  // cases, and on any request failure, so callers uniformly fall through to
  // the normal search+picker flow.
  const getKnownWhaleWisdomFiler = async (investorName: string): Promise<WhaleWisdomFiler | null> => {
    try {
      const response = await axios.get(`${AI_CHATBOT_API_BASE}/api/activist-profiles/basic/known-filer`, {
        params: { investor_name: investorName },
      });
      const filerId = response.data?.resolved_whalewisdom_filer_id;
      const cik = response.data?.resolved_whalewisdom_cik;
      if (!filerId || !cik) return null;
      // name/link aren't returned by this endpoint and aren't needed — this
      // filer is only ever handed to runBasicGenerate (which only reads
      // id/cik), never rendered in a picker.
      return { id: filerId, cik, name: investorName, link: "" };
    } catch (err) {
      console.warn("[WhaleWisdom] known-filer lookup failed; falling back to the normal search:", err);
      return null;
    }
  };

  // "Generate Preview" click. First checks whether the backend already has a
  // resolved filer on record for this investor name — if so, generation
  // proceeds straight through with it, no WhaleWisdom search or picker at
  // all. Otherwise resolves a filer for the typed name via WhaleWisdom (same
  // auto-select/prompt behavior as the institution-linking flow's
  // handleGenerateWhaleWisdomId), then hands off to runBasicGenerate. A
  // failed or empty lookup doesn't block generation — it falls back to the
  // raw-name-only behavior that existed before this feature, just flagged
  // with a subtle note so the user knows why no filer was attached.
  const handleGenerateModalSubmit = async () => {
    if (isSubmittingBasic || isResolvingWhaleWisdom) return;
    const trimmedCik = generateCik.trim();
    if (!generateInvestorName.trim() && !trimmedCik) {
      setGenerateError("Enter an activist name or a CIK to generate a profile.");
      return;
    }
    setGenerateError(null);
    setWhaleWisdomNoMatch(false);
    setIsResolvingWhaleWisdom(true);
    try {
      if (trimmedCik) {
        // User supplied an exact CIK -- skip the known-filer cache, the
        // WhaleWisdom name search, and the disambiguation picker entirely.
        // resolve_filer() on the backend already resolves a bare CIK
        // directly, with zero fuzzy name matching involved.
        await runBasicGenerate({ id: "", cik: trimmedCik, name: generateInvestorName, link: "" });
        return;
      }

      const knownFiler = await getKnownWhaleWisdomFiler(generateInvestorName);
      if (knownFiler) {
        await runBasicGenerate(knownFiler);
        return;
      }

      const data = await generateWhaleWisdomId(generateInvestorName);
      const filers: WhaleWisdomFiler[] = data?.filers || [];
      if (filers.length === 1) {
        await runBasicGenerate(filers[0]);
      } else if (filers.length > 1) {
        setWhaleWisdomFilerOptions(filers);
        setShowWhaleWisdomPicker(true);
      } else {
        setWhaleWisdomNoMatch(true);
        await runBasicGenerate(null);
      }
    } catch (err) {
      console.warn("WhaleWisdom filer lookup failed; proceeding without a filer match:", err);
      setWhaleWisdomNoMatch(true);
      await runBasicGenerate(null);
    } finally {
      setIsResolvingWhaleWisdom(false);
    }
  };

  const handleWhaleWisdomFilerConfirm = async (filer: WhaleWisdomFiler) => {
    setShowWhaleWisdomPicker(false);
    await runBasicGenerate(filer);
  };

  const handleWhaleWisdomFilerCancel = () => {
    setShowWhaleWisdomPicker(false);
  };

  // The actual publish — takes the basic-profile payload directly (rather
  // than reading `modalBasicResult` state) so it can be called either from
  // the manual "Approve" click (handleApproveBasic, preview step) or
  // straight out of handleGenerateModalSubmit in production, where there's
  // no preview step and thus no reliable moment at which `modalBasicResult`
  // state has actually re-rendered yet. This is the ONLY place a basic
  // profile is ever actually persisted; closes out and lands the user on
  // the newly-published investor either way.
  const publishBasicProfile = async (basicResult: any) => {
    const guessedSlug = basicResult?.slug || slugifyName(generateInvestorName);
    setIsApprovingBasic(true);
    setGenerateError(null);
    try {
      const publishResponse = await axios.post(`${AI_CHATBOT_API_BASE}/api/activist-profiles/basic/publish`, basicResult);
      const publishedProfile = publishResponse.data?.data || publishResponse.data || basicResult;
      const publishedSlug = publishedProfile?.slug || guessedSlug;

      setBasicProfilesCache((prev) => ({ ...prev, [publishedSlug]: publishedProfile }));
      // setActiveInvestorKey below is a no-op when this investor's Advanced
      // profile was already active (matchedKey === activeInvestorKey), which
      // means the Basic-loading effect (keyed only on activeInvestorKey)
      // never re-fires and loadBasicForKey never picks up the cache update
      // above. Set basicProfile directly so the freshly-published profile
      // shows immediately regardless of whether the key actually changes.
      setBasicProfile(publishedProfile);
      setBasicError(null);

      const approvedName = basicResult.investor_name || generateInvestorName;
      setGenerateModalOpen(false);
      setGenerateModalStep("form");
      setModalBasicResult(null);

      const freshKeys = await fetchAllProfiles();
      const matchedKey = (freshKeys || investorKeys).find((k) => toBaseSlug(k) === publishedSlug);
      if (matchedKey) setActiveInvestorKey(matchedKey);
      // Land on a clean view of the freshly-published profile, not the full
      // investor grid still hanging open from before generation started, and
      // not whatever tab (e.g. Advanced) was active before generation.
      setSelectorOpen(false);
      setSelectorSearch("");
      setProfileViewMode("basic");
      toast.success(`${approvedName} basic profile published.`);

      // Basic→Advanced no longer auto-chains (deliberate product decision,
      // see the comment near the top of this file where the old
      // AUTO_CHAIN_ADVANCED_ON_APPROVE flag used to live). Advanced
      // generation now only ever starts from the explicit "Generate Advanced
      // Profile" prompt in the Advanced tab's empty state, which the
      // activeInvestorKey switch above (landing on the freshly-published
      // investor) already puts the user right in front of.
      setGenerateInvestorName("");
      setGenerateCik("");
    } catch (err: any) {
      console.error("Basic publish failed:", err);
      setGenerateError(err.response?.data?.detail || "Failed to publish the basic profile.");
    } finally {
      setIsApprovingBasic(false);
    }
  };

  // "Approve" on the preview step (local dev only — production never shows
  // this step, see handleGenerateModalSubmit). Thin wrapper preserving the
  // same guard semantics as before, delegating the actual work to
  // publishBasicProfile.
  const handleApproveBasic = async () => {
    if (!modalBasicResult || isApprovingBasic) return;
    await publishBasicProfile(modalBasicResult);
  };

  // "Create Advanced Profile Instead" on the preview step — discards the
  // unsaved basic preview (no publish call for it) and falls through to the
  // existing, completely unchanged enhanced-pipeline flow.
  const handleCreateAdvancedInstead = () => {
    setModalBasicResult(null);
    setGenerateModalStep("form");
    handleStartGeneration();
  };

  // Optional: Discard a running/completed job
  const handleDiscardJob = async (slug: string) => {
    try {
      await axios.delete(`${AI_CHATBOT_API_BASE}/api/activist-profiles/generate/${slug}`);
    } catch (err) {
      console.error("Failed to discard job scratch file:", err);
    }
  };

  // State handlers for text mutation
  const handleSummaryTextChange = (val: string) => {
    if (!rawProfile) return;
    const updatedRaw = JSON.parse(JSON.stringify(rawProfile));
    if (typeof updatedRaw.investor_summary === "string") updatedRaw.investor_summary = val;
    // Mirror normaliseProfile's display priority (narrative_summary first)
    // so editing the visible text edits the field actually being shown.
    else if (updatedRaw.activist_investor_summary?.narrative_summary) updatedRaw.activist_investor_summary.narrative_summary = val;
    else if (updatedRaw.activist_investor_summary) updatedRaw.activist_investor_summary.investment_focus = val;
    else updatedRaw.investor_summary = val;
    setRawProfile(updatedRaw);
    setProfile(normaliseProfile(updatedRaw));
  };

  const handleSummaryPointChange = (index: number, val: string) => {
    if (!rawProfile) return;
    const updatedRaw = JSON.parse(JSON.stringify(rawProfile));
    if (!updatedRaw.activist_investor_summary) updatedRaw.activist_investor_summary = {};
    if (!Array.isArray(updatedRaw.activist_investor_summary.summary_points)) updatedRaw.activist_investor_summary.summary_points = [];
    updatedRaw.activist_investor_summary.summary_points[index] = val;
    setRawProfile(updatedRaw);
    setProfile(normaliseProfile(updatedRaw));
  };

  const handle13fMetaChange = (field: string, val: any) => {
    if (!rawProfile) return;
    const updatedRaw = JSON.parse(JSON.stringify(rawProfile));
    if (!updatedRaw.latest_13f_snapshot) updatedRaw.latest_13f_snapshot = {};
    updatedRaw.latest_13f_snapshot[field] = val;
    setRawProfile(updatedRaw);
    setProfile(normaliseProfile(updatedRaw));
  };

  const handleSummaryMetaChange = (field: string, val: any) => {
    if (!rawProfile) return;
    const updatedRaw = JSON.parse(JSON.stringify(rawProfile));
    if (!updatedRaw.activist_investor_summary) updatedRaw.activist_investor_summary = {};
    updatedRaw.activist_investor_summary[field] = val;
    setRawProfile(updatedRaw);
    setProfile(normaliseProfile(updatedRaw));
  };

  const getObservationKey = (raw: any) => {
    // 🛑 FIXED: Prioritize the keys in the exact same order the UI reads them!
    if (raw.key_cross_campaign_observations) return "key_cross_campaign_observations";
    if (raw.custom_observations) return "custom_observations";
    if (raw.investor_profile_analysis) return "investor_profile_analysis";
    return "key_cross_campaign_observations"; // Default fallback
  };

  const handleObservationChange = (index: number, val: string) => {
    if (!rawProfile) return;
    const updatedRaw = JSON.parse(JSON.stringify(rawProfile));
    const key = getObservationKey(updatedRaw);
    if (!Array.isArray(updatedRaw[key])) updatedRaw[key] = [];
    updatedRaw[key][index] = val;
    setRawProfile(updatedRaw);
    setProfile(normaliseProfile(updatedRaw));
  };

  const addObservation = () => {
    if (!rawProfile) return;
    const updatedRaw = JSON.parse(JSON.stringify(rawProfile)); 
    const key = getObservationKey(updatedRaw);
    if (!Array.isArray(updatedRaw[key])) updatedRaw[key] = [];
    updatedRaw[key].push("");
    setRawProfile(updatedRaw);
    setProfile(normaliseProfile(updatedRaw));
  };

  const removeObservation = (index: number) => {
    if (!rawProfile) return;
    const updatedRaw = JSON.parse(JSON.stringify(rawProfile));
    const key = getObservationKey(updatedRaw);
    if (!Array.isArray(updatedRaw[key])) return;
    updatedRaw[key].splice(index, 1);
    setRawProfile(updatedRaw);
    setProfile(normaliseProfile(updatedRaw));
  };

  // Cancels a generated/uploaded preview without publishing anything to S3,
  // and restores whichever profile was showing before the preview started.
  const handleDiscardPreview = async () => {
    // If this preview came from the auto-generate pipeline, it left a
    // job-status scratch file in S3 (used for progress polling) — clean it
    // up so discarding truly leaves no trace behind.
    const discardedSlug = rawProfile?.metadata?.slug;
    if (discardedSlug) {
      axios.delete(`${AI_CHATBOT_API_BASE}/api/activist-profiles/generate/${discardedSlug}`).catch((err) => {
        console.error("[Discard Preview] Failed to clean up job-status file:", err);
      });
    }

    setIsPreviewMode(false);
    setIsEditMode(false);
    onPreviewPublished();

    if (activeInvestorKey && profilesCache[activeInvestorKey]) {
      setRawProfile(profilesCache[activeInvestorKey]);
      setProfile(normaliseProfile(profilesCache[activeInvestorKey]));
      return;
    }

    if (activeInvestorKey) {
      try {
        setLoading(true);
        const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles/${activeInvestorKey}`;
        const response = await axios.get(url, { params: { t: Date.now() } });
        const profileData = response.data?.data || response.data;
        setProfilesCache(prev => ({ ...prev, [activeInvestorKey]: profileData }));
        setRawProfile(profileData);
        setProfile(normaliseProfile(profileData));
      } catch (err) {
        console.error("[Discard Preview] Failed to restore prior profile:", err);
      } finally {
        setLoading(false);
      }
    } else {
      setRawProfile(null);
      setProfile(null);
      fetchAllProfiles();
    }
  };

  // The final save push to the upcoming FastAPI backend
  const handleSaveProfile = async () => {
    if (!rawProfile && !basicProfile) return;

    try {
      setIsSaving(true);
      setError(null);

      if (!rawProfile && basicProfile) {
        // Condensed-only profile — no Advanced rawProfile exists to PUT below,
        // so republish the (possibly edited) Condensed draft through the same
        // endpoint runBasicGenerate/publishBasicProfile already use.
        await axios.post(`${AI_CHATBOT_API_BASE}/api/activist-profiles/basic/publish`, basicProfile);
        setIsEditMode(false);
        setBasicProfilesCache((prev) => ({ ...prev, [toBaseSlug(activeInvestorKey)]: basicProfile }));
      } else if (isPreviewMode) {
        // Re-assign rawProfile to payload
        const payload = { ...rawProfile };

        await publishProfileToS3(payload);

        setIsPreviewMode(false);
        setIsEditMode(false);
        onPreviewPublished(); 
        
        const newSlug = rawProfile.metadata?.slug || "";
        await fetchAllProfiles(newSlug);

        alert("Profile Approved and Published to S3!");

      } else {
        const profileName = activeInvestorKey;
        await axios.put(`${AI_CHATBOT_API_BASE}/api/activist-profiles/${profileName}`, rawProfile);
        setIsEditMode(false);
        setProfilesCache(prev => ({ ...prev, [profileName]: rawProfile }));
      }
    } catch (err: unknown) {
      console.error("Save failed:", err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Failed to save profile.");
      } else {
        setError("An unexpected error occurred while saving.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Render as soon as EITHER the Advanced or the Basic fetch has data —
  // a Basic-only investor (has_basic: true, has_advanced: false, e.g. a
  // freshly-approved basic profile) is a normal, common state now, not a
  // failure. Only show the skeleton while BOTH are still pending with
  // nothing to show yet, and only show the error/empty screen when BOTH have
  // genuinely resolved with nothing (loadProfileForKey no longer treats a
  // 404 — "no Advanced profile" — as an error; see its catch block).
  const hasAnyProfileData = !!profile || !!basicProfile;

  if (!hasAnyProfileData && (loading || basicLoading)) {
    return <ActivistDashboardSkeleton />;
  }

  if (!hasAnyProfileData) {
    return (
      <div style={{ margin: 24, padding: 20, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, color: "#dc2626" }}>
        ⚠ {error || basicError || "Profile data unavailable."}
      </div>
    );
  }

  // Safe display name for the header/CTA — profile.legalName only exists
  // when the Advanced fetch succeeded; fall back through the Basic profile's
  // name, the index's cached name, then the slug itself.
  const displayName = profile?.legalName || basicProfile?.investor_name || investorNames[activeInvestorKey] || formatKeyToLabel(activeInvestorKey);

  // Investor-selector dropdown: fuzzy-matched + ranked, best match first.
  const filteredInvestors = investorKeys
    .map((key) => ({ key, label: investorNames[key] || formatKeyToLabel(key) }))
    .map((item) => ({ ...item, score: scoreInvestorMatch(item.label, selectorSearch) }))
    .filter((item): item is typeof item & { score: number } => item.score !== null)
    .sort((a, b) => b.score - a.score);

  // ── Merge ────────────────────────────────────────────────────────────────
  const isCombinationKey = (key: string) => !!combinationMeta[toBaseSlug(key)]?.isCombination;

  // The open profile's own document wins over the index summary — it's the one
  // that's certainly current, and it's loaded by the time the header renders.
  const activeIsCombination = !!basicProfile?.is_combination || isCombinationKey(activeInvestorKey);

  const mergeSelectionNames = mergeSelection.map((key) => investorNames[key] || formatKeyToLabel(key));
  const defaultMergeName = mergeSelectionNames.length === MERGE_PAIR_SIZE ? mergeSelectionNames.join(" + ") : "";

  const toggleMergeSelection = (key: string) => {
    setMergeError(null);
    setMergeSelection((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // Hard cap rather than a rolling window: silently dropping the earliest
      // pick would make the disabled checkboxes look broken instead of full.
      if (prev.length >= MERGE_PAIR_SIZE) return prev;
      return [...prev, key];
    });
  };

  const clearMergeSelection = () => {
    setMergeSelection([]);
    setMergeName("");
    setMergeError(null);
  };

  const handleMergeProfiles = async () => {
    if (mergeSelection.length !== MERGE_PAIR_SIZE || isMerging) return;

    setIsMerging(true);
    setMergeError(null);
    try {
      const result = await mergeBasicProfiles(
        toBaseSlug(mergeSelection[0]),
        toBaseSlug(mergeSelection[1]),
        mergeName
      );

      // The combined profile only enters the index on the backend's write, so
      // the list has to be refetched before anything can select it.
      const freshKeys = await fetchAllProfiles();
      // Fall back to the returned slug itself if the index hasn't caught up —
      // the basic-profile GET is keyed by that slug either way, so the new
      // profile still opens rather than leaving the user on the old one.
      const matchedKey = (freshKeys || investorKeys).find((k) => toBaseSlug(k) === result.slug) || result.slug;

      clearMergeSelection();
      setSelectorOpen(false);
      setSelectorSearch("");
      setActiveInvestorKey(matchedKey);
      // A combined profile is a Condensed profile — never land on Comprehensive.
      setProfileViewMode("basic");
      toast.success(result.message || `${result.name} created.`);
    } catch (err: any) {
      console.error("[Merge] failed:", err);
      // Whatever the server said about why this pair can't be merged.
      setMergeError(err?.message || "Failed to merge the selected profiles.");
    } finally {
      setIsMerging(false);
    }
  };

  // combination_of holds base slugs, while the index keys profiles that also
  // have an Advanced document as "{slug}-profile" — try both before giving up
  // and prettifying the slug.
  const resolveProfileName = (slug: string) =>
    investorNames[slug] || investorNames[`${slug}-profile`] || formatKeyToLabel(slug);

  // "Not in our database" fallback — pre-fills and opens the exact same
  // Generate New Profile flow as the header's own CTA (see the
  // primaryActiveJob onClick above).
  const openGenerateModalFromSelectorSearch = () => {
    setGenerateInvestorName(selectorSearch.trim());
    setGenerateError(null);
    setSelectorOpen(false);
    setSelectorSearch("");
    setGenerateModalOpen(true);
  };

  const handleSelectorSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectorHighlightedIndex((i) => Math.min(i + 1, filteredInvestors.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectorHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filteredInvestors[selectorHighlightedIndex];
      if (item) {
        setActiveInvestorKey(item.key);
        setSelectorOpen(false);
        setSelectorSearch("");
      } else if (selectorSearch.trim()) {
        openGenerateModalFromSelectorSearch();
      }
    } else if (e.key === "Escape") {
      // Also handled by the document-level listener; this just avoids
      // waiting on the event to bubble while focus is in the input.
      e.preventDefault();
      setSelectorOpen(false);
    }
  };

  const campaigns = profile?.campaigns || [];
  // Match on the canonical first word, not the whole string — otherwise every
  // "ongoing - 13d on file" / "open - proxy solicitation" campaign is missed
  // and this reads 0 on profiles that plainly have live campaigns.
  const activeCampaigns = campaigns.filter((c: any) =>
    LIVE_STATUS_KEYS.includes(statusKey(c.normalized_status))
  ).length;

  // Group on the canonical first word too. Keying on the raw status turned the
  // breakdown into ~40 rows of count-1 variants ("closed - 13d engagement
  // preceding sale", "closed (third episode) - single-day amendment", ...)
  // instead of a readable Open / Ongoing / Settled / Closed split.
  const statusGroups: Record<string, number> = campaigns.reduce((acc: Record<string, number>, c: any) => {
    const key = statusKey(c.normalized_status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(statusGroups)
    .map(([key, count]) => ({
      name: STATUS_LABEL_MAP[key as keyof typeof STATUS_LABEL_MAP]
        || key.charAt(0).toUpperCase() + key.slice(1),
      count: Number(count),
      fill: STATUS_COLOR_MAP[key as keyof typeof STATUS_COLOR_MAP] || "#6b7280",
    }))
    .sort((a, b) => b.count - a.count);

  const classifyPersonnelLabel = (p: any): "Settlement Director" | "Nominee" | null => {
    const role = p.role || "";
    if (/settlement director/i.test(role)) return "Settlement Director";
    // category is now the authoritative signal once the backend populates it
    // ("firm_leadership" | "recurring_nominee" | "campaign_designee" | "other").
    if (p.category === "recurring_nominee" || p.category === "campaign_designee") return "Nominee";
    // Fallback to the role-text pattern only when category hasn't been set to
    // one of the new values — i.e. historical profiles generated before this
    // backend change, still tagged "other"/"visible_personnel" or missing.
    if (!p.category || p.category === "other" || p.category === "visible_personnel") {
      if (/nominee|appointee|elected/i.test(role)) return "Nominee";
    }
    return null;
  };
  const nominees = (profile?.personnel || []).filter((p: any) => classifyPersonnelLabel(p) !== null);
  const visiblePersonnel = (profile?.personnel || []).filter((p: any) => !nominees.includes(p));

  // Best-effort extraction of the company a nominee was put forward at, e.g.
  // "...Ancora nominee at U.S. Steel (2025)" -> "U.S. Steel", so the Nominee
  // card can show a company tag instead of just repeating the same layout
  // as the Management cards. Returns null (no tag) rather than a bad guess
  // when the role text doesn't match either phrasing.
  const extractNomineeCompany = (role: string) => {
    const match =
      /nominee[^.]*?\bat\s+([A-Z][\w&.,'\-\s]*?)(?:\s*\(|,|;|\.|$)/i.exec(role || "") ||
      /nominee[^.]*?\bfor\s+([A-Z][\w&.,'\-\s]*?)(?:\s*\(|,|;|\.|$)/i.exec(role || "");
    return match ? match[1].trim() : null;
  };


  const matchingActiveJob = !isGenerating ? getActiveJobForName(generateInvestorName) : undefined;

  const localGeneratingJob: ActiveGenerationJob | null =
    isGenerating && currentGenerationSlugRef.current
      ? { slug: currentGenerationSlugRef.current, investor_name: generateInvestorName, mode: GENERATE_MODE, step: generateStep }
      : null;
  const jobsForDisplay =
    localGeneratingJob && !activeJobs.some((j) => slugMatches(j.slug, localGeneratingJob.slug))
      ? [...activeJobs, localGeneratingJob]
      : activeJobs;
  const primaryActiveJob = jobsForDisplay.length > 0
    ? [...jobsForDisplay].sort((a, b) => {
        const pctDiff = (b.progress_pct || 0) - (a.progress_pct || 0);
        if (pctDiff !== 0) return pctDiff;
        return (b.step ? 1 : 0) - (a.step ? 1 : 0);
      })[0]
    : null;

  // Driven directly by whether the Advanced fetch actually succeeded, not a
  // flag heuristic — profile is reliably null/non-null now that the
  // activeInvestorKey effect clears it on every investor switch and
  // loadProfileForKey no longer bounces away on a legitimate 404.
  const hasAdvancedProfile = !!profile;
  const hasBasicProfile = !!basicProfile;

  // What actually renders below: respects the user's Basic/Advanced toggle
  // choice only when both exist; otherwise forces whichever one does (or
  // "basic" — which itself renders an empty state — when neither does).
  const effectiveProfileView: "basic" | "advanced" =
    hasBasicProfile && hasAdvancedProfile ? profileViewMode : hasAdvancedProfile ? "advanced" : "basic";

  // Replaces the old "Version N" pill in the header. The pill sits above the
  // Condensed/Comprehensive toggle, so it stamps the card as a whole: take the
  // most recent timestamp either half of it carries (Condensed exposes
  // generated_at; the Comprehensive profile keeps its own on the raw
  // metadata). Deliberately not view-dependent — a date that changed every
  // time you flipped the toggle would read as a glitch.
  const updatedCandidates = [
    basicProfile?.generated_at,
    rawProfile?.metadata?.generated_at,
    rawProfile?.metadata?.updated_at,
    rawProfile?.generated_at,
  ]
    .map((v: any) => (v ? new Date(v) : null))
    .filter((d: Date | null): d is Date => !!d && !Number.isNaN(d.getTime()));
  const lastUpdatedLabel = updatedCandidates.length
    ? formatUpdatedDate(new Date(Math.max(...updatedCandidates.map((d) => d.getTime()))))
    : "";

  // ── Edit Mode controls ──
  // Admin-only — showEditButton is the single gate, so end users never see the
  // toggle or the Save/Discard actions that come with it. Sized to match the
  // page-header buttons (38px tall, text-sm) since that's where they render:
  // portalled into `headerActionsSlot`, left of "Upload Activist Profile".
  // Without a slot (standalone use) they fall back to the profile card header.
  const editControls = showEditButton ? (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {(isEditMode || isPreviewMode) && (
        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          style={{
            height: 38, padding: "0 12px", background: "#10b981", color: "white", border: "1px solid #10b981",
            borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: isSaving ? "wait" : "pointer",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {isSaving ? "Processing..." : (isPreviewMode ? "Approve & Publish to S3" : "Save Changes")}
        </button>
      )}

      {isPreviewMode && (
        <button
          onClick={handleDiscardPreview}
          disabled={isSaving}
          style={{
            height: 38, padding: "0 12px", background: "white", color: "#dc2626", border: "1px solid #dc2626",
            borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: isSaving ? "wait" : "pointer",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Discard
        </button>
      )}

      <button
        onClick={() => setIsEditMode((v) => !v)}
        style={{
          height: 38, padding: "0 12px", fontSize: 14, fontWeight: 500, borderRadius: 6, cursor: "pointer",
          border: isEditMode ? `1px solid ${THEME_MAROON}` : "1px solid #e5e7eb",
          background: isEditMode ? "#fdf2f2" : "white",
          color: isEditMode ? THEME_MAROON : "#374151",
          display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "all 0.15s",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        {isEditMode ? "Editing…" : "Edit Mode"}
      </button>
    </div>
  ) : null;

  const portalledEditControls = headerActionsSlot && editControls
    ? createPortal(editControls, headerActionsSlot)
    : null;

  return (
    <div style={{ padding: "24px", width: "100%", background: "#f9fafb", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 1px 3px #0000000a" }}>
        
        {/* ── COMPANY HEADER ── */}
        <div style={{ borderRadius: "10px 10px 0 0", position: "relative" }}>
          
          <div style={{ background: THEME_MAROON, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, borderRadius: "10px 10px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {editingNameKey === activeInvestorKey ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* The frame lives on this wrapper, not the input: a global
                      reset in app.css (`div[class*="select"] input`) forces
                      background/border off any input nested under a class
                      containing "select" — Tailwind's `select-none` included —
                      which is why this field used to render as unreadable dark
                      text straight on the maroon bar. The wrapper is a div, so
                      that rule can't touch it. */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "rgba(255,255,255,0.16)",
                      border: "1px solid rgba(255,255,255,0.55)",
                      borderRadius: 4,
                      padding: "3px 8px",
                      opacity: isSavingLegalName ? 0.6 : 1,
                    }}
                  >
                    <input
                      autoFocus
                      value={legalNameDraft}
                      onChange={(e) => setLegalNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveLegalName(activeInvestorKey);
                        if (e.key === "Escape") cancelEditLegalName();
                      }}
                      disabled={isSavingLegalName}
                      className="investor-rename-input"
                      style={{ fontSize: 16, fontWeight: 600, padding: 0, border: "none", outline: "none", minWidth: 240, background: "transparent", color: "#fff" }}
                    />
                  </div>
                  <button type="button" onClick={() => saveLegalName(activeInvestorKey)} disabled={isSavingLegalName} title="Save" style={{ background: "transparent", border: "none", cursor: isSavingLegalName ? "wait" : "pointer", color: "white", padding: 4, display: "inline-flex" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </button>
                  <button type="button" onClick={cancelEditLegalName} disabled={isSavingLegalName} title="Cancel" style={{ background: "transparent", border: "none", cursor: "pointer", color: "white", padding: 4, display: "inline-flex" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ) : (
                <h1 style={{ fontSize: 18, fontWeight: 600, color: "white", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  {displayName}
                  {activeIsCombination && <CombinedBadge onDark />}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => startEditLegalName(activeInvestorKey, displayName)}
                      title="Rename firm"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.75)", padding: 2, display: "inline-flex" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                </h1>
              )}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {primaryActiveJob && (
                <GenerationProgressBar
                  job={primaryActiveJob}
                  onClick={() => {
                    // shows its live progress there instead.
                    setGenerateInvestorName(primaryActiveJob.investor_name || "");
                    setGenerateError(null);
                    setGenerateModalOpen(true);
                  }}
                />
              )}
              <div ref={selectorContainerRef} style={{ position: "relative" }}>
                <InvestorTrigger
                  label={displayName}
                  open={selectorOpen}
                  onClick={() => { setSelectorOpen((v) => !v); setSelectorSearch(""); }}
                />

                {/* ── Inline investor picker — anchored floating dropdown, not
                    a full-width panel. Closes on outside click, Escape, or a
                    selection (see the effect above that wires those up). ── */}
                {selectorOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 380, zIndex: 50, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15), 0 4px 6px -4px rgba(0,0,0,0.1)" }}>
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        autoFocus
                        value={selectorSearch}
                        onChange={(e) => setSelectorSearch(e.target.value)}
                        onKeyDown={handleSelectorSearchKeyDown}
                        placeholder="Search investors..."
                        style={{ width: "100%", padding: "9px 12px 9px 36px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none", boxSizing: "border-box", color: "#111827", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                      />
                    </div>

                    {filteredInvestors.length === 0 && selectorSearch.trim() ? (
                      <div style={{ padding: "18px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 12, lineHeight: 1.5 }}>
                          No investor found matching "{selectorSearch.trim()}".
                        </div>
                        <button
                          type="button"
                          onClick={openGenerateModalFromSelectorSearch}
                          style={{ padding: "8px 14px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12.5 }}
                        >
                          Generate a new profile for "{selectorSearch.trim()}"
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", maxHeight: 420, overflowY: "auto", overflowX: "hidden", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                        {filteredInvestors.map(({ key, label: investorLabel }, index) => {
                          const isActive = key === activeInvestorKey;
                          const isHighlighted = index === selectorHighlightedIndex;
                          const job = getActiveJobForKey(key);
                          const isSelectedForMerge = mergeSelection.includes(key);
                          const rowIsCombination = isCombinationKey(key);
                          const mergeSelectionFull = mergeSelection.length >= MERGE_PAIR_SIZE;
                          // Disabled, never hidden: a checkbox that vanishes once
                          // two are picked reads as a bug, one that greys out with
                          // a reason explains the cap.
                          const mergeCheckboxDisabled = isMerging || rowIsCombination || (mergeSelectionFull && !isSelectedForMerge);
                          const mergeCheckboxTitle = rowIsCombination
                            ? "Already a combined profile — combinations can't be merged again"
                            : isSelectedForMerge
                            ? "Selected for merge"
                            : mergeSelectionFull
                            ? "Two profiles are already selected — untick one to choose a different pair"
                            : "Select for merge";

                          if (editingNameKey === key) {
                            return (
                              <div key={key} style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #f3f4f6", background: "#fff" }}>
                                <input
                                  autoFocus
                                  value={legalNameDraft}
                                  onChange={(e) => setLegalNameDraft(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveLegalName(key); if (e.key === "Escape") cancelEditLegalName(); }}
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={isSavingLegalName}
                                  style={{ flex: 1, minWidth: 0, fontSize: 13, padding: "5px 8px", borderRadius: 4, border: "1px solid #d1d5db", outline: "none", color: "#111827" }}
                                />
                                <button type="button" onClick={(e) => { e.stopPropagation(); saveLegalName(key); }} disabled={isSavingLegalName} title="Save" style={{ background: "transparent", border: "none", cursor: isSavingLegalName ? "wait" : "pointer", color: "#059669", padding: 2, display: "inline-flex", flexShrink: 0 }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); cancelEditLegalName(); }} title="Cancel" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#dc2626", padding: 2, display: "inline-flex", flexShrink: 0 }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={key}
                              style={{
                                display: "flex", alignItems: "stretch",
                                background: isActive ? "#fdf2f2" : isHighlighted ? "#f3f4f6" : "#fff",
                                borderBottom: "1px solid #f3f4f6",
                              }}
                            >
                              {/* Selection lives outside the button, both because a
                                  checkbox nested in a button is a broken control and
                                  because ticking a row must never be mistaken for
                                  opening it. */}
                              <label
                                title={mergeCheckboxTitle}
                                onMouseEnter={() => setSelectorHighlightedIndex(index)}
                                style={{ display: "flex", alignItems: "center", paddingLeft: 10, cursor: mergeCheckboxDisabled ? "not-allowed" : "pointer" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelectedForMerge}
                                  disabled={mergeCheckboxDisabled}
                                  onChange={() => toggleMergeSelection(key)}
                                  style={{ width: 14, height: 14, margin: 0, accentColor: THEME_MAROON, cursor: "inherit" }}
                                />
                              </label>
                              <button
                                ref={(el) => { selectorOptionRefs.current[index] = el; }}
                                onClick={() => { setActiveInvestorKey(key); setSelectorOpen(false); setSelectorSearch(""); }}
                                onMouseEnter={() => setSelectorHighlightedIndex(index)}
                                style={{
                                  flex: 1, minWidth: 0,
                                  padding: "10px 12px", fontSize: 13, textAlign: "left",
                                  background: "transparent", color: isActive ? THEME_MAROON : "#374151",
                                  fontWeight: isActive ? 600 : 400, border: "none",
                                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, transition: "background 0.1s",
                                }}
                              >
                                {isActive && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={THEME_MAROON} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>}
                                <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: 1 }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{highlightInvestorMatch(investorLabel, selectorSearch)}</span>
                                    {rowIsCombination && <CombinedBadge />}
                                  </span>
                                  {job && <GeneratingChip job={job} />}
                                </span>
                                {isAdminOrAnalyst && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); startEditLegalName(key, investorLabel); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); startEditLegalName(key, investorLabel); } }}
                                    title="Rename firm"
                                    style={{ display: "inline-flex", flexShrink: 0, color: "#9ca3af", padding: 2 }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Merge tray — appears with the first tick. At one pick it
                        stays on screen with the button disabled, so "why can't I
                        merge yet" is answered instead of left blank. */}
                    {mergeSelection.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#9ca3af" }}>
                          {mergeSelection.length} of {MERGE_PAIR_SIZE} selected
                        </div>

                        <div style={{ fontSize: 12.5, color: "#111827", fontWeight: 600, lineHeight: 1.45 }}>
                          {mergeSelectionNames.join("  +  ")}
                          {mergeSelection.length < MERGE_PAIR_SIZE && (
                            <span style={{ fontWeight: 400, color: "#9ca3af" }}> — tick one more to merge</span>
                          )}
                        </div>

                        <input
                          value={mergeName}
                          onChange={(e) => setMergeName(e.target.value)}
                          disabled={isMerging}
                          placeholder={defaultMergeName || "Name for the combined profile"}
                          style={{ width: "100%", padding: "8px 10px", fontSize: 12.5, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", boxSizing: "border-box", color: "#111827", background: "#fff" }}
                        />

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            onClick={handleMergeProfiles}
                            disabled={mergeSelection.length !== MERGE_PAIR_SIZE || isMerging}
                            style={{
                              padding: "8px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: "none", color: "#fff",
                              background: THEME_MAROON,
                              opacity: mergeSelection.length !== MERGE_PAIR_SIZE || isMerging ? 0.45 : 1,
                              cursor: mergeSelection.length !== MERGE_PAIR_SIZE || isMerging ? "not-allowed" : "pointer",
                            }}
                          >
                            {isMerging ? "Merging…" : "Merge Profiles"}
                          </button>
                          <button
                            type="button"
                            onClick={clearMergeSelection}
                            disabled={isMerging}
                            style={{ padding: "8px 12px", fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: isMerging ? "not-allowed" : "pointer" }}
                          >
                            Clear
                          </button>
                        </div>

                        {isMerging && (
                          <div style={{ fontSize: 11.5, color: "#6b7280", lineHeight: 1.45 }}>
                            Synthesising the combined profile — this runs an LLM pass server-side and takes several seconds.
                          </div>
                        )}

                        {mergeError && (
                          <div style={{ fontSize: 12, color: "#b91c1c", lineHeight: 1.45 }}>{mergeError}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {isAdminOrAnalyst && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); startEditLegalName(activeInvestorKey, displayName); }}
                  title="Rename firm"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "white", opacity: 0.85, padding: 4, display: "inline-flex", flexShrink: 0 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              {isAdminOrAnalyst && activeInvestorKey && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
                  title="Delete profile"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "white", opacity: 0.85, padding: 4, display: "inline-flex", flexShrink: 0 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <DeleteConfirmationModal
            isVisible={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteActiveProfile}
            loading={isDeletingProfile}
            description={`Are you sure you want to delete <strong>${displayName}</strong>'s profile? This action cannot be undone.`}
          />
        </div>

        {/* ── Profile Header Info ── */}
        {/* Just the "last updated" stamp now: the Version pill is gone (version
            is still tracked in metadata, it simply isn't a user-facing number),
            the city line was dropped as a duplicate of the region shown in the
            profile below, and Edit Mode moved up to the page header. */}
        {(lastUpdatedLabel || (!headerActionsSlot && editControls)) && (
          <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            {lastUpdatedLabel ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME_MAROON, background: "#fdf2f2", border: `1px solid ${THEME_MAROON}40`, borderRadius: 999, padding: "2px 10px", fontWeight: 500 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Last updated: {lastUpdatedLabel}
              </div>
            ) : (
              <span />
            )}

            {/* Fallback position — only when no header slot was provided. */}
            {!headerActionsSlot && editControls}
          </div>
        )}

        {portalledEditControls}

        {/* ── Basic / Advanced toggle — only shown when both actually exist ── */}
        {hasBasicProfile && hasAdvancedProfile && (
          <div style={{ padding: "16px 24px 0", borderTop: "1px solid #e5e7eb", background: "#fff" }}>
            <div style={{ display: "inline-flex", background: "#f3f4f6", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["basic", "advanced"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setProfileViewMode(mode)}
                  style={{
                    padding: "6px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none",
                    cursor: "pointer", transition: "all 0.15s",
                    background: effectiveProfileView === mode ? "#fff" : "transparent",
                    color: effectiveProfileView === mode ? THEME_MAROON : "#6b7280",
                    boxShadow: effectiveProfileView === mode ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {PROFILE_VIEW_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Profile content: Advanced if selected/available, else Basic ── */}
        {effectiveProfileView === "advanced" ? (
          <>
            {/* ── Tabs Navigation ── */}
                  <div style={{ padding: "0 24px", borderBottom: "1px solid #e5e7eb", borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", gap: 24 }}>
                    {[
                      { id: "summary",   label: "Summary" },
                      { id: "campaigns", label: "Campaigns" },
                      { id: "holdings",  label: "13F Holdings" },
                      // Only meaningful when a Basic profile also exists for
                      // this investor — that's where activist_filings data
                      // lives (basicProfile.sections.activist_filings), not
                      // on the Advanced `profile` object.
                      ...(hasBasicProfile && hasAdvancedProfile
                        ? [{ id: "activist_filings", label: "Activist Filings (13D & Proxy Contests)" }]
                        : []),
                      { id: "personnel", label: "Personnel" },
                      { id: "sources",   label: "Sources" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          padding: "16px 4px", border: "none", cursor: "pointer", background: "transparent",
                          color: activeTab === tab.id ? THEME_MAROON : "#6b7280", fontWeight: activeTab === tab.id ? 600 : 500,
                          borderBottom: activeTab === tab.id ? `2px solid ${THEME_MAROON}` : "2px solid transparent", transition: "all 0.2s ease", marginBottom: "-1px", fontSize: 13
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Tab Content Container ── */}
                  <div style={{ padding: "24px" }}>

          {activeTab === "summary" && (
            <>
              {/* Summary narrative + bullets — editable in Edit Mode. These used
                  to sit above the tab bar, which meant they were also printed
                  over the Campaigns / 13F / Personnel / Sources tabs; they
                  belong to Summary only. */}
              <div style={{ marginBottom: 24 }}>
                {isEditMode ? (
                  <textarea
                    value={profile.summary}
                    onChange={(e) => handleSummaryTextChange(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", fontSize: 14, fontWeight: 500, color: "#111827", lineHeight: 1.6,
                      border: "1px solid #d1d5db", borderRadius: 6, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", minHeight: 80, background: "#fafafa",
                    }}
                  />
                ) : (
                  <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{profile.summary}</p>
                )}

                {profile.summaryPoints.length > 0 && (
                  <ul style={{ marginTop: 16, marginBottom: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {profile.summaryPoints.map((pt: string, i: number) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>
                        <span style={{ color: THEME_MAROON, marginRight: 8, fontSize: 16, lineHeight: 1, marginTop: isEditMode ? 8 : 0, flexShrink: 0 }}>▸</span>
                        {isEditMode ? (
                          <textarea value={pt} onChange={(e) => handleSummaryPointChange(i, e.target.value)} style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, minHeight: 48, background: "#fafafa" }} />
                        ) : (
                          <span>{pt}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ZMH Style Unified Metrics Row */}
              <div style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid #e5e7eb", paddingBottom: 24, marginBottom: 24 }}>
                {[
                  { label: "13F Portfolio Value", value: formatLargeUSD(profile.snapshot.portfolio_value), raw: rawProfile?.latest_13f_snapshot?.reported_13f_portfolio_value_usd ?? "", onChange: (v: any) => handle13fMetaChange("reported_13f_portfolio_value_usd", v === "" ? "" : Number(v)) },
                  { label: "Tracked Campaigns", value: rawProfile?.activist_investor_summary?.tracked_campaigns_override ?? campaigns.length, raw: rawProfile?.activist_investor_summary?.tracked_campaigns_override ?? campaigns.length, onChange: (v: any) => handleSummaryMetaChange("tracked_campaigns_override", v === "" ? "" : Number(v)) },
                  { label: "Active / Open", value: rawProfile?.activist_investor_summary?.active_campaigns_override ?? activeCampaigns, raw: rawProfile?.activist_investor_summary?.active_campaigns_override ?? activeCampaigns, onChange: (v: any) => handleSummaryMetaChange("active_campaigns_override", v === "" ? "" : Number(v)) },
                  { label: "Personnel Tracked", value: rawProfile?.activist_investor_summary?.personnel_tracked_override ?? profile.personnel.length, raw: rawProfile?.activist_investor_summary?.personnel_tracked_override ?? profile.personnel.length, onChange: (v: any) => handleSummaryMetaChange("personnel_tracked_override", v === "" ? "" : Number(v)) },
                ].map((card, i, arr) => (
                  <div key={i} style={{ flex: "1 1 200px", borderRight: i !== arr.length - 1 ? "1px solid #e5e7eb" : "none", padding: "0 16px" }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</p>
                    {isEditMode ? (
                      <input type="number" value={card.raw} onChange={(e) => card.onChange(e.target.value)} style={{ width: "100%", padding: "6px 8px", fontSize: 18, fontWeight: 600, border: "1px solid #d1d5db", borderRadius: 6, outline: "none", background: "#fff", color: "#111827", fontFamily: "Georgia, serif" }} />
                    ) : (
                      <p style={{ fontSize: 28, fontWeight: 400, color: "#111827", margin: 0, fontFamily: "Georgia, serif" }}>{card.value}</p>
                    )}
                  </div>
                ))}
              </div>

              {(profile.observations.length > 0 || isEditMode) && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader title="Key Cross-Campaign Observations" />
                  <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                    {profile.observations.map((obs: string, i: number) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", paddingBottom: 14, borderBottom: i !== profile.observations.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <span style={{ color: THEME_MAROON, marginRight: 10, fontSize: 16, lineHeight: 1, marginTop: isEditMode ? 8 : 0 }}>▸</span>
                        
                        {/* THE SWAP: Edit Mode vs View Mode */}
                        {isEditMode ? (
                          <div style={{ display: "flex", flex: 1, gap: 12 }}>
                            <textarea value={obs} onChange={(e) => handleObservationChange(i, e.target.value)} style={{ flex: 1, padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db", minHeight: 60, resize: "vertical", fontFamily: "inherit" }} />
                            <button onClick={() => removeObservation(i)} style={{ background: "#fee2e2", border: "none", color: "#dc2626", borderRadius: 6, padding: "8px 12px", cursor: "pointer", height: "fit-content", fontSize: 12, fontWeight: 600 }}>Trash</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.55 }}>{obs}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Add Button */}
                  {isEditMode && (
                    <button onClick={addObservation} style={{ marginTop: 16, padding: "8px 16px", background: "#f3f4f6", border: "1px dashed #d1d5db", borderRadius: 6, color: "#374151", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      Add Observation
                    </button>
                  )}
                </div>
              )}

              <div>
                <SectionHeader title="Recent Campaigns Snapshot" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {campaigns.slice(0, 6).map((c: any, i: number) => (
                    <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px", background: "#fafafa" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, flex: 1, marginRight: 8 }}>{c.target_company}</p>
                        <StatusBadge status={c.normalized_status} />
                      </div>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px", fontWeight: 500 }}>Started: {c.start_year}</p>
                      <div style={{ display: "flex", flexWrap: "wrap" }}>
                        {(c.main_issues || []).slice(0, 3).map((issue: string, j: number) => <Tag key={j} text={issue} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "campaigns" && (
            <>
              <SectionHeader title="Campaigns Overview" />
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: "0 0 260px", minWidth: 240 }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 18px" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status Breakdown</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {chartData.map((entry) => {
                        const pct = campaigns.length > 0 ? Math.round((entry.count / campaigns.length) * 100) : 0;
                        return (
                          <div key={entry.name}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.fill, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{entry.name}</span>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{entry.count}</span>
                            </div>
                            <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: entry.fill, borderRadius: 999 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Total Campaigns</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{campaigns.length}</span>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                      <colgroup><col style={{ width: "20%" }} /><col style={{ width: "10%" }} /><col style={{ width: "15%" }} /><col style={{ width: "55%" }} /></colgroup>
                      <thead>
                        <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                          {["Target", "Year", "Status", "Issues"].map((h) => <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c: any, i: number) => (
                          <tr key={i} style={{ borderBottom: i !== campaigns.length - 1 ? "1px solid #f3f4f6" : "none", verticalAlign: "top" }}>
                            <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.target_company}</td>
                            <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b7280" }}>{c.start_year}</td>
                            <td style={{ padding: "14px 16px" }}><StatusBadge status={c.normalized_status} /></td>
                            <td style={{ padding: "14px 16px", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                              {c.main_issues.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", marginBottom: c.campaign_form.length > 0 ? 6 : 0 }}>{c.main_issues.map((issue: string, j: number) => <Tag key={j} text={issue} />)}</div>}
                              {c.campaign_form.length > 0 && <div style={{ display: "flex", flexWrap: "wrap" }}>{c.campaign_form.map((form: string, j: number) => <Tag key={j} text={form} color="#fdf2f2" textColor={THEME_MAROON} />)}</div>}
                              {(() => {
                                const meaningfulNominees = (c.nominees || []).filter(isMeaningfulText);
                                return meaningfulNominees.length > 0 && (
                                  <p style={{ fontSize: 12, color: "#6b7280", margin: "8px 0 0", overflowWrap: "anywhere", wordBreak: "break-word" }}>👤 {meaningfulNominees.join(", ")}</p>
                                );
                              })()}
                              {/* notes and outcome_to_date are both sourced from the same pipeline
                                  field on some profiles, so they end up identical — only show notes
                                  when it says something outcome_to_date doesn't already say. */}
                              {isMeaningfulText(c.notes) && c.notes.trim() !== (c.outcome_to_date || "").trim() && (
                                <p style={{ fontSize: 12, color: "#4b5563", margin: "8px 0 0", lineHeight: 1.5, overflowWrap: "anywhere", wordBreak: "break-word" }}>{c.notes}</p>
                              )}
                              {isMeaningfulText(c.outcome_to_date) && (
                                <p style={{ fontSize: 12, color: "#4b5563", margin: "8px 0 0", lineHeight: 1.5, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                                  <strong>Outcome:</strong> {c.outcome_to_date}
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "holdings" && (
            <>
              <SectionHeader title="Form 13F Snapshot" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 32, marginBottom: 20, padding: "16px 20px", background: "#fafafa", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <div>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Report Period</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{profile.snapshot.filing_date}</p>
                </div>
                <div style={{ borderLeft: "1px solid #e5e7eb", paddingLeft: 32 }}>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.10em" }}>13F Portfolio Value</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{formatLargeUSD(profile.snapshot.portfolio_value)}</p>
                </div>
              </div>
              
              <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                      {[{ label: "Issuer", align: "left" }, { label: "Ticker", align: "left" }, { label: "Shares", align: "right" }, { label: "Value", align: "right" }].map((h) => <th key={h.label} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: h.align as any, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {profile.snapshot.holdings.map((h: any, i: number) => {
                      const sharesRaw = h.shares_or_principal;
                      const sharesDisplay = typeof sharesRaw === "number" ? sharesRaw.toLocaleString(NUMBER_LOCALE) : sharesRaw ? String(sharesRaw).replace(/\s*shares/gi, '') : "N/A";
                      return (
                        <tr key={i} style={{ borderBottom: i !== profile.snapshot.holdings.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                          <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{h.issuer}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: THEME_MAROON, fontWeight: 500 }}>{h.ticker_or_symbol}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280", textAlign: "right" }}>{sharesDisplay}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#111827", fontWeight: 500, textAlign: "right" }}>{formatUSD(h.value_usd_thousands)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(profile.snapshot.filing_url || profile.snapshot.cik) && (
                <ul style={{ padding: 0, margin: "16px 0 0", listStyle: "none" }}>
                  <li style={{ display: "flex", alignItems: "flex-start" }}>
                    <span style={{ color: THEME_MAROON, marginRight: 10, fontSize: 16, lineHeight: 1 }}>▸</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: "#4b5563", margin: 0, lineHeight: 1.55 }}>
                        {profile.snapshot.filing_url ? (
                          <a href={profile.snapshot.filing_url} target="_blank" rel="noopener noreferrer" style={{ color: "#2e50cdcf", textDecoration: "none", fontWeight: 500 }} onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}>SEC Form 13F-HR filing</a>
                        ) : (
                          <span>SEC Form 13F-HR filing</span>
                        )}
                      </p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                        {[profile.snapshot.cik ? `CIK ${profile.snapshot.cik}` : null, profile.snapshot.filing_date !== "N/A" ? profile.snapshot.filing_date : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </li>
                </ul>
              )}
            </>
          )}

          {/* ── ACTIVIST FILINGS TAB CONTENT — only reachable when both a Basic
              and an Advanced profile exist (see the tab-list gate above and
              the activeTab reset in the activeInvestorKey effect). Sourced
              from basicProfile, not the Advanced `profile` object — pure
              display composition, no new fetching. ── */}
          {activeTab === "activist_filings" && (() => {
            const filings = basicProfile?.sections?.activist_filings?.filings;
            const filingsList = Array.isArray(filings) ? filings : [];
            return (
              <>
                <SectionHeader title="Activist Filings (13D & Proxy Contests)" />
                <ActivistFilingsTable filings={filingsList} variant="inline" />
              </>
            );
          })()}

          {activeTab === "personnel" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {visiblePersonnel.length > 0 && (
                <div>
                  <SectionHeader title="Management & Key Personnel" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>{visiblePersonnel.map((p: any, i: number) => <PersonnelCard key={i} person={p} accentColor="#fdf2f2" textColor={THEME_MAROON} />)}</div>
                </div>
              )}
              {nominees.length > 0 && (
                <div>
                  <SectionHeader title="Nominees & Settlement Directors" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>{nominees.map((p: any, i: number) => <PersonnelCard key={i} person={p} accentColor="#f0fdf4" textColor="#166534" personnelLabel={classifyPersonnelLabel(p)} nomineeCompany={extractNomineeCompany(p.role)} />)}</div>
                </div>
              )}
            </div>
          )}

          {/* ── ADDED SOURCES TAB CONTENT ── */}
          {activeTab === "sources" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <SectionHeader title="Source Inventory & References" />
              {profile.sources && profile.sources.length > 0 ? (
                <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                  {profile.sources.map((src: any, i: number) => {
                    const title = typeof src === "string" ? src : (
                      src.title || src.name || src.source_name || src.document_title ||
                      (src.publisher ? `${src.source_type || "Document"} — ${src.publisher}` : "Reference Document")
                    );
                    const url = typeof src === "object" ? (src.url || src.link || src.source_url) : null;
                    // The auto-generated pipeline emits publication_or_filing_date, not date —
                    // check both so dates actually show instead of silently being empty.
                    const date = typeof src === "object" ? (src.publication_or_filing_date || src.date) : null;
                    const sourceType = typeof src === "object" ? src.source_type : null;
                    const publisher = typeof src === "object" ? src.publisher : null;
                    const relevanceNote = typeof src === "object" ? src.relevance_note : null;
                    const metaLine = [sourceType, publisher, date].filter(Boolean).join(" · ");

                    return (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", paddingBottom: 14, borderBottom: i !== profile.sources.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <span style={{ color: THEME_MAROON, marginRight: 10, fontSize: 16, lineHeight: 1 }}>▸</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, color: "#4b5563", margin: 0, lineHeight: 1.55 }}>
                            {url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#2e50cdcf", textDecoration: "none", fontWeight: 500 }} onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}>{title}</a> : <span>{title}</span>}
                          </p>
                          {relevanceNote && <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>{relevanceNote}</p>}
                          {metaLine && <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{metaLine}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>No source documents indexed for this profile.</p>}
            </div>
          )}
          {/* ── END SOURCES TAB CONTENT ── */}

                  </div>
                </>
              ) : (
                <div style={{ padding: 24 }}>
                  <BasicProfilePanel
                    data={basicProfile}
                    loading={basicLoading}
                    error={basicError}
                    isEditMode={isEditMode}
                    onChange={(updated) => setBasicProfile(updated)}
                    resolveProfileName={resolveProfileName}
                  />
                </div>
              )}
      </div>

      {/* ── NEW MULTI-FILE UPLOAD MODAL ── */}
      {uploadModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", padding: 28, borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 8px", color: "#111827", fontSize: 18, fontWeight: 600 }}>Compile New Profile</h2>
            <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 13 }}>Upload distinct data modules (13F, Campaigns, Overviews). The backend engine will synthesize them into a standard matrix.</p>
            
            <label style={{ display: "block", marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Investor Entity Name
              <input
                value={newInvestorName}
                onChange={(e) => setNewInvestorName(e.target.value)}
                placeholder="e.g. Elliott Investment Management"
                style={{
                  width: "100%", marginTop: 8, padding: "10px 14px", fontSize: 14,
                  border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box",
                  outline: "none", background: "#fff", color: "#111827",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = THEME_MAROON; e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME_MAROON}1f`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 28, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Data Modules (.json fragments)
              <input 
                type="file"
                multiple
                accept=".json"
                onChange={(e) => {
                  if (e.target.files) setSelectedJsonFiles(Array.from(e.target.files));
                }}
                style={{ width: "100%", marginTop: 8, fontSize: 13, color: "#4b5563" }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                onClick={() => { setUploadModalOpen(false); setSelectedJsonFiles([]); setNewInvestorName(""); }} 
                style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#374151" }}
              >
                Cancel
              </button>
              <button 
    onClick={handlePreviewFiles} 
    disabled={isUploading} 
    style={{ padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: isUploading ? "wait" : "pointer", fontWeight: 600, opacity: isUploading ? 0.7 : 1 }}
  >
    {isUploading ? "Processing..." : "Generate Preview"}
  </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GENERATE PROFILE MODAL ── */}
      {generateModalOpen && (
        <div
          // Any modal/portal rendered inside this overlay (e.g.
          // WhaleWisdomFilerPickerModal, which portals its DOM elsewhere but
          // still bubbles its React synthetic events through this tree)
          // would otherwise have its clicks misread as a backdrop click and
          // close this whole modal. Only close on a genuine click on the
          // overlay itself, not one bubbled up from any descendant.
          onClick={(e) => {
            if (e.target === e.currentTarget) closeGenerateModal();
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          {/* Positioned via the Tailwind class, NOT an inline style: app.css has a
              global `div[style*="position: relative"] input { border: none !important }`
              rule, so an inline position here silently stripped the border off the
              investor-name input below (the Upload modal keeps its box because its
              panel isn't inline-positioned). */}
          <div
            className="zmh-modal relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white", padding: 28, borderRadius: 12, width: "100%",
              maxWidth: generateModalStep === "preview" ? "min(1100px, 92vw)" : 440,
              maxHeight: generateModalStep === "preview" ? "85vh" : undefined,
              overflowY: generateModalStep === "preview" ? "auto" : undefined,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            {/* A pre-existing global rule (app.css: "div[style*='position: relative'] input")
                force-kills border/outline/box-shadow/background with !important on any
                input inside a relatively-positioned div (this one, needed for the ×
                button below) — it beats inline styles outright, so the input's look has
                to come from this scoped, higher-specificity stylesheet instead. */}
            <style>{`
              .zmh-modal input.zmh-investor-input {
                border: 1px solid #d1d5db !important;
                outline: none !important;
                box-shadow: none !important;
                background: #fff !important;
                color: #111827 !important;
              }
              .zmh-modal input.zmh-investor-input:focus {
                border-color: ${THEME_MAROON} !important;
                box-shadow: 0 0 0 3px ${THEME_MAROON}1f !important;
              }
            `}</style>
            <button
              type="button"
              onClick={closeGenerateModal}
              aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#374151"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}
            >
              ×
            </button>
            {generateModalStep === "preview" ? (
              <>
                <h2 style={{ margin: "0 0 8px", color: "#111827", fontSize: 18, fontWeight: 600 }}>
                  Condensed Profile Preview
                </h2>
                <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13 }}>
                  Please review the profile — <strong>{modalBasicResult?.investor_name || generateInvestorName}</strong> below, then Approve to publish it or generate the Comprehensive profile instead.
                </p>

                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 20 }}>
                  {/* Pre-publish preview only (local dev step, see
                      handleApproveBasic) — not the live basicProfile, so this
                      intentionally stays read-only rather than wiring edits
                      into the active profile's state. */}
                  <BasicProfilePanel data={modalBasicResult} loading={false} error={null} isEditMode={false} onChange={() => {}} />
                </div>

                {generateError && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6 }}>
                    <span style={{ flexShrink: 0, lineHeight: 1 }}>⚠</span>
                    <span style={{ fontSize: 12, color: "#b91c1c", lineHeight: 1.5 }}>{generateError}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button
                    onClick={handleCreateAdvancedInstead}
                    disabled={isApprovingBasic}
                    style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: isApprovingBasic ? "wait" : "pointer", fontWeight: 600, color: "#374151", opacity: isApprovingBasic ? 0.7 : 1 }}
                  >
                    Create Comprehensive Profile Instead
                  </button>
                  <button
                    onClick={handleApproveBasic}
                    disabled={isApprovingBasic}
                    style={{ padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: isApprovingBasic ? "wait" : "pointer", fontWeight: 600, opacity: isApprovingBasic ? 0.7 : 1 }}
                  >
                    {isApprovingBasic ? "Publishing..." : "Approve"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ margin: "0 0 24px", color: "#111827", fontSize: 18, fontWeight: 600 }}>Generate New Profile</h2>

                <label style={{ display: "block", marginBottom: 24, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Activist Name <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional if CIK is provided below)</span>
                  <input
                    autoFocus
                    className="zmh-investor-input"
                    value={generateInvestorName}
                    onChange={(e) => {
                      setGenerateInvestorName(e.target.value);
                      setWhaleWisdomNoMatch(false);
                    }}
                    placeholder="e.g. Elliott Investment Management"
                    disabled={isGenerating || !!matchingActiveJob || isSubmittingBasic || isResolvingWhaleWisdom}
                    style={{
                      width: "100%", marginTop: 8, padding: "10px 14px", fontSize: 14,
                      borderRadius: 6, boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  />
                </label>

                <label style={{ display: "block", marginBottom: 24, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  CIK <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                  <input
                    className="zmh-investor-input"
                    value={generateCik}
                    onChange={(e) => setGenerateCik(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 1697748"
                    disabled={isGenerating || !!matchingActiveJob || isSubmittingBasic || isResolvingWhaleWisdom}
                    style={{
                      width: "100%", marginTop: 8, padding: "10px 14px", fontSize: 14,
                      borderRadius: 6, boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  />
                  <span style={{ display: "block", marginTop: 6, fontSize: 12, fontWeight: 400, color: "#6b7280" }}>
                    If you already know the exact SEC CIK, enter it here to skip the name search entirely.
                  </span>
                </label>

                {isResolvingWhaleWisdom && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#fdf2f2", border: `1px solid ${THEME_MAROON}30`, borderRadius: 6 }}>
                    <div style={{ width: 14, height: 14, border: `2px solid ${THEME_MAROON}30`, borderTopColor: THEME_MAROON, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 12, color: "#374151" }}>Researching...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {whaleWisdomNoMatch && !isResolvingWhaleWisdom && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                    <span style={{ flexShrink: 0, lineHeight: 1, color: "#9ca3af" }}>ⓘ</span>
                    <span style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                      No WhaleWisdom match found for this name — the profile will use best-effort auto-resolution.
                    </span>
                  </div>
                )}

                {isSubmittingBasic && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#fdf2f2", border: `1px solid ${THEME_MAROON}30`, borderRadius: 6 }}>
                    <div style={{ width: 14, height: 14, border: `2px solid ${THEME_MAROON}30`, borderTopColor: THEME_MAROON, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 12, color: "#374151" }}>Generating the basic profile Please wait...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {isGenerating && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#fdf2f2", border: `1px solid ${THEME_MAROON}30`, borderRadius: 6 }}>
                    <div style={{ width: 14, height: 14, border: `2px solid ${THEME_MAROON}30`, borderTopColor: THEME_MAROON, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 12, color: "#374151" }}>
                      Your Advanced profile creation is in progress. You'll have to wait for a few moments.
                      <br />
                      <span style={{ color: "#6b7280" }}>You can close this window — generation continues in the background.</span>
                    </span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {/* A job for this exact investor is already running — in this
                    session or another — so block starting a second one and show
                    its live progress instead. */}
                {!isGenerating && matchingActiveJob && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#fdf2f2", border: `1px solid ${THEME_MAROON}30`, borderRadius: 6 }}>
                    <div style={{ width: 14, height: 14, border: `2px solid ${THEME_MAROON}30`, borderTopColor: THEME_MAROON, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 12, color: "#374151" }}>
                      Your Comprehensive profile creation is in progress. You'll have to wait for a few moments.
                      <br />
                      <span style={{ color: "#6b7280" }}>Close this window and check back — no need to start another one.</span>
                    </span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {generateError && !isGenerating && !isSubmittingBasic && !isResolvingWhaleWisdom && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6 }}>
                    <span style={{ flexShrink: 0, lineHeight: 1 }}>⚠</span>
                    <span style={{ fontSize: 12, color: "#b91c1c", lineHeight: 1.5 }}>{generateError}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  {/* Never disabled: the job runs server-side, so trapping the user
                      in this modal for the length of a 40-minute enhanced run bought
                      nothing. Closing dismisses the dialog only. */}
                  <button
                    onClick={closeGenerateModal}
                    style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#374151" }}
                  >
                    {isGenerating ? "Close" : "Cancel"}
                  </button>
                  <button
                    onClick={handleGenerateModalSubmit}
                    disabled={isGenerating || !!matchingActiveJob || isSubmittingBasic || isResolvingWhaleWisdom}
                    style={{ padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: (isGenerating || matchingActiveJob || isSubmittingBasic || isResolvingWhaleWisdom) ? "wait" : "pointer", fontWeight: 600, opacity: (isGenerating || matchingActiveJob || isSubmittingBasic || isResolvingWhaleWisdom) ? 0.7 : 1 }}
                  >
                    {isResolvingWhaleWisdom ? "Researching..." : isSubmittingBasic ? "Generating..." : (isGenerating || matchingActiveJob) ? "Generating..." : "Generate Preview"}
                  </button>
                </div>
              </>
            )}
          </div>

          <WhaleWisdomFilerPickerModal
            filers={whaleWisdomFilerOptions}
            isOpen={showWhaleWisdomPicker}
            onConfirm={handleWhaleWisdomFilerConfirm}
            onCancel={handleWhaleWisdomFilerCancel}
          />
        </div>
      )}

      {/* ── DUPLICATE PROFILE CONFIRMATION ── */}
      {duplicateProfileKey && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", padding: 28, borderRadius: 12, width: "100%", maxWidth: 420, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 8px", color: "#111827", fontSize: 18, fontWeight: 600 }}>Profile Already Exists</h2>
            <p style={{ margin: "0 0 24px", color: "#4b5563", fontSize: 13, lineHeight: 1.6 }}>
              A profile for <strong>{investorNames[duplicateProfileKey] || formatKeyToLabel(duplicateProfileKey)}</strong> has already been generated and published.
              Do you want to regenerate it anyway? This will run the full pipeline again and produce a fresh
              preview — the existing published profile isn't overwritten until you approve and publish it.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                onClick={handleCancelRegenerate}
                style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#374151" }}
              >
                No
              </button>
              <button
                onClick={handleConfirmRegenerate}
                style={{ padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
              >
                Yes, regenerate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ─── PersonnelCard sub-component ─────────────────────────────────────────────

const PersonnelCard = ({ person, accentColor = "#f3f4f6", textColor = "#374151", personnelLabel = null, nomineeCompany = null }: { person: any, accentColor?: string, textColor?: string, personnelLabel?: string | null, nomineeCompany?: string | null }) => {
  const initials = person.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
  return (
    <div style={{ border: `1px solid #e5e7eb`, borderRadius: 8, padding: "16px", display: "flex", gap: 14, alignItems: "flex-start", background: "#fafafa" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: textColor, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {personnelLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 999, background: "#dcfce7", color: "#166534" }}>{personnelLabel}</span>
            {nomineeCompany && <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", overflowWrap: "anywhere" }}>{nomineeCompany}</span>}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px", overflowWrap: "anywhere" }}>{person.name}</p>
        </div>
        <p style={{ fontSize: 12, color: "#6b7280", margin: person.public_note ? "0 0 6px" : 0, lineHeight: 1.4, overflowWrap: "anywhere" }}>{person.role}</p>
        {person.public_note && (
          // public_note often embeds raw citation URLs with no spaces (e.g. "([sec.gov](https://...))"),
          // which without overflowWrap push straight past the card's right edge instead of wrapping.
          <p style={{ fontSize: 12, color: "#4b5563", margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" }}>{person.public_note}</p>
        )}
      </div>
    </div>
  );
};

export default ActivistIntelligenceDashboard;
