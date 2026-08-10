import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { AI_CHATBOT_API_BASE } from '@/pages/AIChatbot/api';
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";

// ─── Module-level cache (survives tab switches, clears on page refresh) ───────
const PROFILES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let _profilesCache: { data: Record<string, any>; ts: number } | null = null;

// ─── Constants ────────────────────────────────────────────────────────────────

const THEME_MAROON = "#8b1828";

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

/** "ongoing (second episode) - cooperation period filings" -> "ongoing" */
const statusKey = (status: any) =>
  String(status || "closed").toLowerCase().trim().split(/[/\s(]/)[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatUSD = (thousands: any) => {
  if (!thousands) return "N/A";
  const val = Number(thousands) * 1000;
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
};

const formatLargeUSD = (value: any) => {
  if (!value) return "N/A";
  const numValue = Number(value);
  if (numValue >= 1e9)  return `$${(numValue / 1e9).toFixed(2)}B`;
  if (numValue >= 1e6)  return `$${(numValue / 1e6).toFixed(0)}M`;
  return `$${numValue.toLocaleString()}`;
};

// The pipeline sometimes fills fields (notes, outcomes, nominee lists, public
// notes) with a boilerplate "no data" sentence instead of leaving them empty
// — "None stated.", "Not disclosed", "N/A", etc. Showing that text reads as
// real information when it isn't, so treat it the same as no value everywhere
// it can appear and render nothing instead.
const PLACEHOLDER_TEXT_RE = /\b(not\s+(stated|disclosed|available|recorded|found|applicable|specified|provided|listed|identified|indicated|named|given|reported)|none\s+(stated|disclosed|available|recorded|found|applicable|specified|provided|listed|identified|indicated|named|given|reported|noted)|n\/a|unknown)\b/i;
const isMeaningfulText = (text: any) =>
  typeof text === "string" &&
  text.trim().length > 0 &&
  !PLACEHOLDER_TEXT_RE.test(text);

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
    .replace(/\[\s*\]/g, "")
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
        maxWidth: "100%",
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
      minWidth: 220,
      maxWidth: 320,
      textAlign: "left",
    }}
  >
    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
}: {
  externalPreviewData?: any;
  onPreviewPublished?: () => void;
  openGenerateModalSignal?: number;
}) => {
  const { user } = useAppSelector((state: RootState) => state.authentiction);
  // Compared case-insensitively: user_type comes straight from the API and
  // isn't guaranteed to be title-cased (UserManagement normalises it the same
  // way before matching), so a strict === "Admin" silently locked real admins
  // out of Edit Mode. Anything that isn't Admin/Analyst still gets nothing.
  const userType = (user?.user_type || "").trim().toLowerCase();
  const isAdmin = userType === "admin";
  const isAdminOrAnalyst = isAdmin || userType === "analyst";
  const showEditButton = isAdminOrAnalyst;

  const [profilesCache, setProfilesCache] = useState<Record<string, any>>({});
  const [investorKeys, setInvestorKeys] = useState<string[]>([]);
  const [activeInvestorKey, setActiveInvestorKey] = useState("");

  // Real legal names for the dropdown/trigger, background-fetched per key
  // since the S3 index only gives us slugs (see prefetch effect below).
  const [investorNames, setInvestorNames] = useState<Record<string, string>>({});
  const fetchedNameKeysRef = useRef<Set<string>>(new Set());
  
  const [activeTab, setActiveTab] = useState("summary");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newInvestorName, setNewInvestorName] = useState("");
  const [selectedJsonFiles, setSelectedJsonFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateInvestorName, setGenerateInvestorName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState("");
  // Scoped to the Generate modal so a failed generation shows inline there
  // instead of replacing the whole dashboard via the shared page-level
  // `error` state (that used to wipe out the modal along with everything else).
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Generation runs server-side, so closing the modal must not stop the job.
  // Holding the poll timer in a ref lets the preview still land once the job
  // finishes with the modal dismissed, and lets us clear the timer on unmount
  // instead of leaking a 3-second interval for the rest of the session.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  /** Dismiss the modal. Safe mid-generation — the backend job keeps running. */
  const closeGenerateModal = () => {
    setGenerateModalOpen(false);
    setGenerateError(null);
    if (!isGenerating) {
      setGenerateInvestorName("");
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
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState("");

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
    try {
      setLoading(true);
      setError(null);
      const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles`;
      const response = await axios.get(url, { params: { t: Date.now() } });
      
      let discoveredKeys = response.data?.data || response.data; 
      if (discoveredKeys && typeof discoveredKeys === 'object' && !Array.isArray(discoveredKeys)) {
          discoveredKeys = Object.keys(discoveredKeys);
      }

      if (!Array.isArray(discoveredKeys) || discoveredKeys.length === 0) {
        throw new Error("No profiles available in the designated S3 cluster prefix.");
      }

      setInvestorKeys(discoveredKeys);
      // Resolved functionally rather than from the `activeInvestorKey` state
      // value: reading it here would make this callback depend on it, so every
      // investor switch re-ran the index fetch and handed down a brand-new
      // investorKeys array — which tore down the name prefetch below mid-flight.
      setActiveInvestorKey((current) => {
        if (keyToSelect && discoveredKeys.includes(keyToSelect)) return keyToSelect;
        // Either nothing selected yet, or the key we wanted (or the one
        // already active) isn't actually present in S3 — fall back to the
        // first profile that is, instead of showing a stale/missing one.
        if (!current) return discoveredKeys[0];
        if (keyToSelect && !discoveredKeys.includes(current)) return discoveredKeys[0];
        return current;
      });
    } catch (err: any) {
      console.error("[ActivistDashboard] index assembly failure:", err);
      setError(err.response?.data?.detail || err.message || "Failed to load dynamic profile index.");
    } finally {
      setLoading(false);
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

  // Background-fetch the real legal name for every investor key so the
  // dropdown/trigger show it instead of the slug-derived label. Reuses
  // profilesCache when a profile's already been loaded this session, and
  // doesn't re-fetch a key whose name request already settled (tracked via a
  // ref, not state, so this effect doesn't re-run as names trickle in).
  // Keyed on the joined slug list, not the array identity, so a re-fetched but
  // identical index doesn't restart (and cancel) the whole prefetch.
  const investorKeysSignature = investorKeys.join("|");
  useEffect(() => {
    const keysToFetch = investorKeys.filter((k) => !fetchedNameKeysRef.current.has(k));
    if (!keysToFetch.length) return;
    keysToFetch.forEach((k) => fetchedNameKeysRef.current.add(k));

    let cancelled = false;
    // Keys whose fetch actually settled. Anything still unsettled when this
    // effect is torn down gets un-marked in the cleanup — otherwise the ref
    // claims a name was fetched for a key that never resolved one, and the
    // dropdown is stuck on the slug fallback for the rest of the session.
    const settled = new Set<string>();
    const NAME_FETCH_CONCURRENCY = 5;
    const queue = [...keysToFetch];

    const fetchName = async (key: string) => {
      if (profilesCache[key]) {
        const legalName = extractLegalName(profilesCache[key]);
        if (legalName && !cancelled) setInvestorNames((prev) => ({ ...prev, [key]: legalName }));
        settled.add(key);
        return;
      }
      try {
        const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles/${key}`;
        const response = await axios.get(url, { params: { t: Date.now() } });
        const profileData = response.data?.data || response.data;
        if (cancelled) return;

        setProfilesCache((prev) => (prev[key] ? prev : { ...prev, [key]: profileData }));
        const legalName = extractLegalName(profileData);
        if (legalName) setInvestorNames((prev) => ({ ...prev, [key]: legalName }));
        settled.add(key);
      } catch (err) {
        console.warn(`[Investor name prefetch] failed for '${key}':`, err);
        // Marked settled so a genuinely broken key isn't retried in a loop.
        settled.add(key);
      }
    };

    const worker = async () => {
      while (!cancelled) {
        const key = queue.shift();
        if (!key) return;
        await fetchName(key);
      }
    };

    Promise.all(Array.from({ length: Math.min(NAME_FETCH_CONCURRENCY, queue.length) }, worker));

    return () => {
      cancelled = true;
      keysToFetch.forEach((k) => { if (!settled.has(k)) fetchedNameKeysRef.current.delete(k); });
    };
  }, [investorKeysSignature]);

  useEffect(() => {
    if (!activeInvestorKey) return;

    // Keep the picker's label for this key in sync with the header, without
    // waiting on the background name prefetch — we already hold the profile.
    const rememberName = (raw: any) => {
      const legalName = extractLegalName(raw);
      if (legalName) {
        fetchedNameKeysRef.current.add(activeInvestorKey);
        setInvestorNames((prev) =>
          prev[activeInvestorKey] === legalName ? prev : { ...prev, [activeInvestorKey]: legalName });
      }
    };

    const fetchSingleProfile = async () => {
      setIsPreviewMode(false);
      setIsEditMode(false);

      // FIX: Ensure rawProfile state is populated even when utilizing cache
      if (profilesCache[activeInvestorKey]) {
        setRawProfile(profilesCache[activeInvestorKey]);
        setProfile(normaliseProfile(profilesCache[activeInvestorKey]));
        rememberName(profilesCache[activeInvestorKey]);
        return;
      }

      try {
        setLoading(true);
        const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles/${activeInvestorKey}`;
        const response = await axios.get(url, { params: { t: Date.now() } });
        const profileData = response.data?.data || response.data;

        setProfilesCache(prev => ({ ...prev, [activeInvestorKey]: profileData }));
        setRawProfile(profileData);
        setProfile(normaliseProfile(profileData));
        rememberName(profileData);
      } catch (err) {
        console.error(`[Fetch Profile Error] '${activeInvestorKey}' not found in S3:`, err);

        // The selected key doesn't have a matching file in S3 (stale slug, deleted
        // profile, etc). Rather than dead-ending on an error screen, fall back to
        // the first profile that does exist so the dashboard still shows something.
        const fallbackKey = investorKeys.find((k) => k !== activeInvestorKey);
        if (fallbackKey) {
          setActiveInvestorKey(fallbackKey);
        } else {
          setError("Failed to fetch the selected investor profile data.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSingleProfile();
  }, [activeInvestorKey]);

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

            const nextVersion = await getNextVersion(regenerateFromKey);
            jobData.data.metadata = { ...(jobData.data.metadata || {}), version: nextVersion };

            setRawProfile(jobData.data);
            setProfile(normaliseProfile(jobData.data));
            setIsEditMode(false); // land on the read view; Edit Mode is opt-in

            if (isAdminOrAnalyst) {
              // Load the generated payload as a preview so it can be
              // reviewed/edited before publishing.
              setIsPreviewMode(true);
              setGenerateModalOpen(false);
              setIsGenerating(false);
            } else {
              // Regular users skip preview/edit entirely — publish straight
              // to S3 and land on the normal read-only view.
              try {
                await publishProfileToS3(jobData.data);
                const newSlug = jobData.data?.metadata?.slug || slug;
                setIsPreviewMode(false);
                await fetchAllProfiles(newSlug);
              } catch (publishErr: any) {
                console.error("Auto-publish failed:", publishErr);
                setError(publishErr?.response?.data?.detail || "Failed to publish the generated profile.");
              } finally {
                setGenerateModalOpen(false);
                setIsGenerating(false);
              }
            }
          }
          else if (jobData.state === "error") {
            clearInterval(pollInterval);
            console.error("Generation job failed:", jobData.message);
            setGenerateError(buildGenerationFailedMessage(generateInvestorName));
            setIsGenerating(false);
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
    }
  };

  // Published profiles are saved as "{slug}-profile" — check investorKeys
  // (already loaded for the profile switcher) before burning several minutes
  // regenerating one that already exists, and ask the user to confirm first.
  const [duplicateProfileKey, setDuplicateProfileKey] = useState<string | null>(null);

  const handleStartGeneration = () => {
    if (!generateInvestorName.trim()) return;
    const targetSlug = `${slugifyName(generateInvestorName)}-profile`;
    const existingKey = investorKeys.find((k) => k === targetSlug);
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
    if (!rawProfile) return;

    try {
      setIsSaving(true);
      setError(null);

      if (isPreviewMode) {
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

  if (loading || (!profile && !error)) {
    return <ActivistDashboardSkeleton />;
  }

  if (error || !profile) {
    return (
      <div style={{ margin: 24, padding: 20, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, color: "#dc2626" }}>
        ⚠ {error || "Profile data unavailable."}
      </div>
    );
  }

  const campaigns = profile.campaigns || [];
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

  // The auto-generated pipeline always tags personnel "visible_personnel" —
  // it never emits "nominee_or_outcome_director" — so splitting strictly on
  // category left the Nominees section permanently empty even for people
  // whose role is literally "nominee for election to the Board". Split on
  // category when it's actually been set to the nominee value, otherwise
  // fall back to the role text so real nominees still land in that section.
  // Settlement director is checked first since it's the more specific phrase
  // — "settlement director" would otherwise also match the generic
  // nominee/appointee/elected pattern.
  const classifyPersonnelLabel = (p: any): "Settlement Director" | "Nominee" | null => {
    const role = p.role || "";
    if (/settlement director/i.test(role)) return "Settlement Director";
    if (/nominee|appointee|elected/i.test(role)) return "Nominee";
    return p.category === "nominee_or_outcome_director" ? "Nominee" : null;
  };
  const nominees = profile.personnel.filter((p: any) => classifyPersonnelLabel(p) !== null);
  const visiblePersonnel = profile.personnel.filter((p: any) => !nominees.includes(p));

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

  return (
    <div style={{ padding: "24px", width: "100%", background: "#f9fafb", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 1px 3px #0000000a" }}>
        
        {/* ── COMPANY HEADER ── */}
        <div style={{ borderRadius: "10px 10px 0 0", position: "relative" }}>
          
          <div style={{ background: THEME_MAROON, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, borderRadius: "10px 10px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: "white", margin: 0 }}>
                 {profile.legalName}
              </h1>
              

            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <InvestorTrigger
                label={profile.legalName || formatKeyToLabel(activeInvestorKey)}
                open={selectorOpen}
                onClick={() => { setSelectorOpen((v) => !v); setSelectorSearch(""); }}
              />
            </div>
          </div>

          {/* ── Inline investor picker ── */}
          {selectorOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", padding: "16px 24px", borderBottomLeftRadius: 10, borderBottomRightRadius: 10, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
              <div style={{ position: "relative", marginBottom: 14 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  value={selectorSearch}
                  onChange={(e) => setSelectorSearch(e.target.value)}
                  placeholder="Search investors..."
                  style={{ width: "100%", padding: "9px 12px 9px 36px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none", boxSizing: "border-box", color: "#111827", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 0, maxHeight: 300, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", overflow: "hidden" }}>
                {investorKeys.filter((k) => (investorNames[k] || formatKeyToLabel(k)).toLowerCase().includes(selectorSearch.toLowerCase())).map((key) => {
                  const isActive = key === activeInvestorKey;
                  const investorLabel = investorNames[key] || formatKeyToLabel(key);
                  return (
                    <button
                      key={key}
                      onClick={() => { setActiveInvestorKey(key); setSelectorOpen(false); setSelectorSearch(""); }}
                      style={{
                        padding: "11px 16px", fontSize: 13, textAlign: "left",
                        background: isActive ? "#fdf2f2" : "#fff", color: isActive ? THEME_MAROON : "#374151",
                        fontWeight: isActive ? 600 : 400, border: "none", borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => { if (!isActive) (e.currentTarget.style.background = "#f9fafb"); }}
                      onMouseLeave={(e) => { if (!isActive) (e.currentTarget.style.background = "#fff"); }}
                    >
                      {isActive && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={THEME_MAROON} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>}
                      {investorLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Profile Header Info ── */}
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            {/* Version pill — was "Updated Framework"; now shows the profile's
                generation version. Defaults to 1 for profiles with no
                metadata.version (i.e. every profile published before this
                change), and bumps by 1 each time the same investor is
                regenerated (see getNextVersion / handleConfirmRegenerate). */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME_MAROON, background: "#fdf2f2", border: `1px solid ${THEME_MAROON}40`, borderRadius: 999, padding: "2px 10px", fontWeight: 500 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Version {rawProfile?.metadata?.version || 1}
            </div>

              {/* ── Edit Mode Controls ── */}
{showEditButton && (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>

    {(isEditMode || isPreviewMode) && (
  <button
    onClick={handleSaveProfile}
    disabled={isSaving}
    style={{
      background: "#10b981", color: "white", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 12,
      fontWeight: 600, cursor: isSaving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 3px rgba(16,185,129,0.3)",
    }}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
    {/* 🛑 DYNAMIC TEXT CHANGE HERE */}
    {isSaving ? "Processing..." : (isPreviewMode ? "Approve & Publish to S3" : "Save Changes")}
  </button>
)}
    {isPreviewMode && (
  <button
    onClick={handleDiscardPreview}
    disabled={isSaving}
    style={{
      background: "white", color: "#dc2626", border: "1px solid #dc2626", padding: "6px 14px", borderRadius: 6, fontSize: 12,
      fontWeight: 600, cursor: isSaving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6,
    }}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
    Discard
  </button>
)}
                <button
                  onClick={() => setIsEditMode((v) => !v)}
                  style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 600,
                    borderRadius: 6, cursor: "pointer",
                    border: isEditMode ? `1px solid ${THEME_MAROON}` : "1px solid #e5e7eb",
                    background: isEditMode ? "#fdf2f2" : "white",
                    color: isEditMode ? THEME_MAROON : "#374151",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.15s",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121  3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {isEditMode ? "Editing…" : "Edit Mode"}
                </button>
              </div>
            )}
          </div>

          {/* Firm identity line stays above the tabs — it's context for every
              tab, unlike the summary narrative which now lives in its own tab. */}
          {(profile.hq || profile.founded || profile.founderOrLead) && (
            <div style={{ display: "flex", flexWrap: "wrap", columnGap: 16, rowGap: 4, margin: 0, fontSize: 12, color: "#6b7280" }}>
              {profile.hq && <span>{profile.hq}</span>}
              {profile.founded && <span>Founded {profile.founded}</span>}
              {profile.founderOrLead && <span>Led by {profile.founderOrLead}</span>}
            </div>
          )}
        </div>

        {/* ── Tabs Navigation ── */}
        <div style={{ padding: "0 24px", borderBottom: "1px solid #e5e7eb", borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", gap: 24 }}>
          {[
            { id: "summary",   label: "Summary" },
            { id: "campaigns", label: "Campaigns" },
            { id: "holdings",  label: "13F Holdings" },
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
                            <td style={{ padding: "14px 16px" }}>
                              {c.main_issues.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", marginBottom: c.campaign_form.length > 0 ? 6 : 0 }}>{c.main_issues.map((issue: string, j: number) => <Tag key={j} text={issue} />)}</div>}
                              {c.campaign_form.length > 0 && <div style={{ display: "flex", flexWrap: "wrap" }}>{c.campaign_form.map((form: string, j: number) => <Tag key={j} text={form} color="#fdf2f2" textColor={THEME_MAROON} />)}</div>}
                              {(() => {
                                const meaningfulNominees = (c.nominees || []).filter(isMeaningfulText);
                                return meaningfulNominees.length > 0 && (
                                  <p style={{ fontSize: 12, color: "#6b7280", margin: "8px 0 0" }}>👤 {meaningfulNominees.join(", ")}</p>
                                );
                              })()}
                              {/* notes and outcome_to_date are both sourced from the same pipeline
                                  field on some profiles, so they end up identical — only show notes
                                  when it says something outcome_to_date doesn't already say. */}
                              {isMeaningfulText(c.notes) && c.notes.trim() !== (c.outcome_to_date || "").trim() && (
                                <p style={{ fontSize: 12, color: "#4b5563", margin: "8px 0 0", lineHeight: 1.5 }}>{c.notes}</p>
                              )}
                              {isMeaningfulText(c.outcome_to_date) && (
                                <p style={{ fontSize: 12, color: "#4b5563", margin: "8px 0 0", lineHeight: 1.5 }}>
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
                      const sharesDisplay = typeof sharesRaw === "number" ? sharesRaw.toLocaleString() : sharesRaw ? String(sharesRaw).replace(/\s*shares/gi, '') : "N/A";
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
            </>
          )}

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
                    // Robust parser in case backend sends strings OR objects
                    const title = typeof src === "string" ? src : (src.title || src.name || src.source_name || "Reference Document");
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
                style={{ width: "100%", marginTop: 8, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box", fontSize: 14 }}
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
          onClick={closeGenerateModal}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          {/* Positioned via the Tailwind class, NOT an inline style: app.css has a
              global `div[style*="position: relative"] input { border: none !important }`
              rule, so an inline position here silently stripped the border off the
              investor-name input below (the Upload modal keeps its box because its
              panel isn't inline-positioned). */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative"
            style={{ background: "white", padding: 28, borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
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
            <h2 style={{ margin: "0 0 8px", color: "#111827", fontSize: 18, fontWeight: 600 }}>Generate New Profile</h2>
            <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 13 }}>
              Enter an activist fund's legal name — This can take a few minutes.
            </p>

            <label style={{ display: "block", marginBottom: 24, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Investor Entity Name
              {/* Focus is signalled with border-colour, not a ring: app.css nukes
                  box-shadow/outline on any element carrying them inline. */}
              <input
                autoFocus
                value={generateInvestorName}
                onChange={(e) => setGenerateInvestorName(e.target.value)}
                onFocus={(e) => { e.currentTarget.style.borderColor = THEME_MAROON; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; }}
                placeholder="e.g. Elliott Investment Management"
                disabled={isGenerating}
                style={{
                  width: "100%", marginTop: 8, padding: "10px 14px", fontSize: 14,
                  border: "1px solid #cbd5e1", borderRadius: 6, boxSizing: "border-box",
                  background: isGenerating ? "#f9fafb" : "#fff", color: "#111827", fontWeight: 400, outline: "none",
                }}
              />
            </label>

            {/* Profile type picker removed — every run uses the enhanced
                pipeline (GENERATE_MODE), so there is nothing left to choose,
                and no notice to explain the choice either. The in-progress
                panel below still says generation continues in the background. */}

            {isGenerating && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#fdf2f2", border: `1px solid ${THEME_MAROON}30`, borderRadius: 6 }}>
                <div style={{ width: 14, height: 14, border: `2px solid ${THEME_MAROON}30`, borderTopColor: THEME_MAROON, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 12, color: "#374151" }}>
                  {generateStep && generateStep !== "Starting..."
                    ? generateStep
                    : "Generating profile, this can take a few minutes..."}
                  <br />
                  <span style={{ color: "#6b7280" }}>You can close this window — generation continues in the background.</span>
                </span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {generateError && !isGenerating && (
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
                onClick={handleStartGeneration}
                disabled={isGenerating}
                style={{ padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: isGenerating ? "wait" : "pointer", fontWeight: 600, opacity: isGenerating ? 0.7 : 1 }}
              >
                {isGenerating ? "Generating..." : "Generate & Preview"}
              </button>
            </div>
          </div>
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