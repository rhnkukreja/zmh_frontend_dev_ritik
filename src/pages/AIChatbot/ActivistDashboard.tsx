import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { AI_CHATBOT_API_BASE } from '@/pages/AIChatbot/api';

// ─── Module-level cache (survives tab switches, clears on page refresh) ───────
const PROFILES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let _profilesCache: { data: Record<string, any>; ts: number } | null = null;

// ─── Constants ────────────────────────────────────────────────────────────────

const THEME_MAROON = "#8b1828";

const STATUS_COLOR_MAP = {
  open: "#f59e0b",
  settled: "#10b981",
  closed: "#6b7280",
  active: "#3b82f6",
};

const STATUS_LABEL_MAP = {
  open: "Open",
  settled: "Settled",
  closed: "Closed",
  active: "Active",
};

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

/** Normalise the raw JSON from S3 into a consistent internal shape */
const normaliseProfile = (raw: any) => {
  if (!raw) return null;

  // ── Universal Citation Stripper Helper ────────────────────────────────────
const stripCitations = (text: any) => {
  if (typeof text !== "string") return "";

  return text
    .replace(/\]*\]/gi, "")
    .trim();
};
  // ── Summary text ──────────────────────────────────────────────────────────
  const rawSummary =
    typeof raw.investor_summary === "string"
      ? raw.investor_summary
      : raw.activist_investor_summary?.investment_focus ||
        (typeof raw.activist_investor_summary === "string"
          ? raw.activist_investor_summary
          : "");
          
  const summary = stripCitations(rawSummary);

  const summaryPoints = (raw.activist_investor_summary?.summary_points || [])
    .map((pt: any) => stripCitations(pt))
    .filter(Boolean);

  const legalName =
    raw.activist_investor_summary?.legal_name ||
    raw.activist_investor_summary?.brand_name ||
    "Activist Profile";

  const founded  = raw.activist_investor_summary?.founded || "N/A";
  const hq       = raw.activist_investor_summary?.headquarters || "N/A";

  // ── Personnel ─────────────────────────────────────────────────────────────
  const personnel = (
    raw.nominees_and_visible_personnel ||
    raw.visible_personnel ||
    []
  ).map((p: any) => ({
    name:        p.name || "Unknown",
    category:    p.category || "visible_personnel",
    role:        p.role_or_context || p.role || p.current_title || "",
    public_note: p.public_note || null,
    linkedin:    p.linkedin_url || null,
    sources:     p.source_set || [],
  }));

  // ── 13F snapshot ──────────────────────────────────────────────────────────
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

  // ── Campaigns ─────────────────────────────────────────────────────────────
  const campaigns = (
    raw.campaign_registry ||
    raw.campaign_history ||
    []
  ).map((c: any) => ({
    target_company:  c.target_company || "Unknown",
    start_date:      c.campaign_start_date || c.start_year || "N/A",
    start_year:      (c.campaign_start_date || c.start_year || "N/A").toString().slice(0, 4),
    status_label:    c.campaign_status_label || c.status || "N/A",
    normalized_status: c.normalized_status || c.status?.toLowerCase() || "closed",
    campaign_form:   c.campaign_form || [],
    main_issues:     c.main_issues || [],
    nominees:        c.nominees_or_personnel || [],
    notes:           c.notes || c.objectives || "",
    sources:         c.source_set || [],
  }));

  // ── Observations ──────────────────────────────────────────────────────────
  const rawObservations =
    raw.key_cross_campaign_observations ||
    raw.custom_observations ||
    raw.investor_profile_analysis ||
    [];
    
  const observations = rawObservations
    .map((obs: any) => stripCitations(obs))
    .filter(Boolean);

  // ── Source inventory ──────────────────────────────────────────────────────
  const sources = raw.source_inventory || [];

  return {
    legalName,
    founded,
    hq,
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
  const key   = (status || "closed").toLowerCase().split(/[/ ]/)[0];
  const color = STATUS_COLOR_MAP[key as keyof typeof STATUS_COLOR_MAP] || "#6b7280";
  const label = STATUS_LABEL_MAP[key as keyof typeof STATUS_LABEL_MAP] || (status || "N/A");
  const bg    = color + "20";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        background: bg,
        color,
        border: `1px solid ${color}40`,
        whiteSpace: "nowrap",
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

      {/* Header bar */}
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

const ActivistIntelligenceDashboard = () => {
  const [profilesCache, setProfilesCache] = useState<Record<string, any>>({});
  const [investorKeys, setInvestorKeys] = useState<string[]>([]);
  const [activeInvestorKey, setActiveInvestorKey] = useState("");
  
  const [activeTab, setActiveTab] = useState("summary");
  const [profile, setProfile]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState("");

  useEffect(() => {
    const fetchAllProfiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles`;
        const response = await axios.get(url);
        
        let discoveredKeys = response.data?.data || response.data; 
        
        if (discoveredKeys && typeof discoveredKeys === 'object' && !Array.isArray(discoveredKeys)) {
            discoveredKeys = Object.keys(discoveredKeys);
        }

        if (!Array.isArray(discoveredKeys) || discoveredKeys.length === 0) {
          throw new Error("No profiles available in the designated S3 cluster prefix.");
        }

        setInvestorKeys(discoveredKeys);
        setActiveInvestorKey(discoveredKeys[0]); 

      } catch (err: any) {
        console.error("[ActivistDashboard] index assembly failure:", err);
        setError(err.response?.data?.detail || err.message || "Failed to load dynamic profile index.");
        setLoading(false); 
      }
    };
    fetchAllProfiles();
  }, []);

  useEffect(() => {
    if (!activeInvestorKey) return;

    const fetchSingleProfile = async () => {
      if (profilesCache[activeInvestorKey]) {
        setProfile(normaliseProfile(profilesCache[activeInvestorKey]));
        return;
      }

      try {
        setLoading(true);
        const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles/${activeInvestorKey}`;
        const response = await axios.get(url);
        const profileData = response.data?.data || response.data;

        setProfilesCache(prev => ({ ...prev, [activeInvestorKey]: profileData }));

        const normalised = normaliseProfile(profileData);
        setProfile(normalised);
      } catch (err) {
        console.error("[Fetch Profile Error]:", err);
        setError("Failed to fetch the selected investor profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchSingleProfile();
  }, [activeInvestorKey]);

  const formatKeyToLabel = (keyStr: string) => {
    if (!keyStr) return "";
    return keyStr
      .replace('-profile', '')
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
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
  const activeCampaigns = campaigns.filter(
    (c: any) => c.normalized_status === "open" || c.normalized_status === "active"
  ).length;

  const statusGroups: Record<string, number> = campaigns.reduce((acc: Record<string, number>, c: any) => {
    const key = c.normalized_status || "closed";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(statusGroups).map(([key, count]) => ({
    name: STATUS_LABEL_MAP[key as keyof typeof STATUS_LABEL_MAP] || key,
    count: Number(count),
    fill: STATUS_COLOR_MAP[key as keyof typeof STATUS_COLOR_MAP] || "#6b7280",
  }));

  const visiblePersonnel = profile.personnel.filter((p: any) => p.category === "visible_personnel");
  const nominees = profile.personnel.filter((p: any) => p.category === "nominee_or_outcome_director");

  return (
    <div style={{ padding: "24px", width: "100%", background: "#f9fafb", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 1px 3px #0000000a", position: "relative" }}>
        
        {/* ── STICKY HEADER WRAPPER ── */}
        <div style={{ 
          position: "sticky", 
        
          top: "200px", 
          zIndex: 40, 
          borderRadius: "10px 10px 0 0",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" // Adds a nice shadow when it sticks and floats
        }}>
          
          {/* ── Maroon ZMH Header ── */}
          <div style={{ 
            background: THEME_MAROON, 
            padding: "16px 24px", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: 16,
            borderRadius: "10px 10px 0 0" 
          }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "white", margin: 0 }}>
               {profile.legalName}
            </h1>
            
            <InvestorTrigger
              label={formatKeyToLabel(activeInvestorKey)}
              open={selectorOpen}
              onClick={() => { setSelectorOpen((v) => !v); setSelectorSearch(""); }}
            />
          </div>

          {/* ── Inline investor picker (Rendered Absolute to the sticky header) ── */}
          {selectorOpen && (
            <div style={{ 
              position: "absolute", 
              top: "100%", // Renders exactly below the maroon header
              left: 0, right: 0, 
              borderBottom: "1px solid #e5e7eb", 
              background: "#f9fafb", 
              padding: "16px 24px",
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
            }}>
              <div style={{ position: "relative", marginBottom: 14 }}>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                >
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  value={selectorSearch}
                  onChange={(e) => setSelectorSearch(e.target.value)}
                  placeholder="Search investors..."
                  style={{
                    width: "100%", padding: "9px 12px 9px 36px", fontSize: 13,
                    border: "1px solid #e5e7eb", borderRadius: 8, outline: "none",
                    boxSizing: "border-box", color: "#111827", background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                />
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 0,
                maxHeight: 300,
                overflowY: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                background: "#fff",
                overflow: "hidden",
              }}>
                {investorKeys
                  .filter((k) => formatKeyToLabel(k).toLowerCase().includes(selectorSearch.toLowerCase()))
                  .map((key) => {
                    const isActive = key === activeInvestorKey;
                    return (
                      <button
                        key={key}
                        onClick={() => { setActiveInvestorKey(key); setSelectorOpen(false); setSelectorSearch(""); }}
                        style={{
                          padding: "11px 16px",
                          fontSize: 13,
                          textAlign: "left",
                          background: isActive ? "#fdf2f2" : "#fff",
                          color: isActive ? THEME_MAROON : "#374151",
                          fontWeight: isActive ? 600 : 400,
                          border: "none",
                          borderRight: "1px solid #f3f4f6",
                          borderBottom: "1px solid #f3f4f6",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
                        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
                      >
                        {formatKeyToLabel(key)}
                        {isActive && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={THEME_MAROON} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* ── Profile Header Info ── */}
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME_MAROON, background: "#fdf2f2", border: `1px solid ${THEME_MAROON}40`, borderRadius: 999, padding: "2px 10px", fontWeight: 500, marginBottom: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Updated May 2026
          </div>
          
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px" }}>
            {profile.hq}
          </p>
          <p style={{ fontSize: 14, color: "#111827", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{profile.summary}</p>
          
          {profile.summaryPoints.length > 0 && (
            <ul style={{ marginTop: 16, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {profile.summaryPoints.map((pt: string, i: number) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>
                  <span style={{ color: THEME_MAROON, marginRight: 8, fontSize: 16, lineHeight: 1 }}>▸</span>
                  {pt}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Tabs Navigation ── */}
        <div style={{ padding: "0 24px", borderBottom: "1px solid #e5e7eb", borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", gap: 24 }}>
          {[
            { id: "summary",   label: "Summary" },
            { id: "campaigns", label: "Campaigns" },
            { id: "holdings",  label: "13F Holdings" },
            { id: "personnel", label: "Personnel" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "16px 4px",
                border: "none",
                cursor: "pointer",
                background: "transparent",
                color: activeTab === tab.id ? THEME_MAROON : "#6b7280",
                fontWeight: activeTab === tab.id ? 600 : 500,
                borderBottom: activeTab === tab.id ? `2px solid ${THEME_MAROON}` : "2px solid transparent",
                transition: "all 0.2s ease",
                marginBottom: "-1px",
                fontSize: 13
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
              {/* ZMH Style Unified Metrics Row */}
              <div style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid #e5e7eb", paddingBottom: 24, marginBottom: 24 }}>
                {[
                  { label: "13F Portfolio Value", value: formatLargeUSD(profile.snapshot.portfolio_value) },
                  { label: "Tracked Campaigns",   value: campaigns.length },
                  { label: "Active / Open",        value: activeCampaigns },
                  { label: "Personnel Tracked",    value: profile.personnel.length },
                ].map((card, i, arr) => (
                  <div key={i} style={{ flex: "1 1 200px", borderRight: i !== arr.length - 1 ? "1px solid #e5e7eb" : "none", padding: "0 16px" }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</p>
                    <p style={{ fontSize: 28, fontWeight: 400, color: "#111827", margin: 0, fontFamily: "Georgia, serif" }}>{card.value}</p>
                  </div>
                ))}
              </div>

              {profile.observations.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader title="Key Cross-Campaign Observations" />
                  <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                    {profile.observations.map((obs: string, i: number) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", paddingBottom: 14, borderBottom: i !== profile.observations.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <span style={{ color: THEME_MAROON, marginRight: 10, fontSize: 16, lineHeight: 1 }}>▸</span>
                        <span style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.55 }}>{obs}</span>
                      </li>
                    ))}
                  </ul>
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
                        {(c.main_issues || []).slice(0, 3).map((issue: string, j: number) => (
                          <Tag key={j} text={issue} />
                        ))}
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

                {/* ── Left panel: analytics ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: "0 0 260px", minWidth: 240 }}>

                  {/* Status breakdown */}
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
                </div>{/* end left panel */}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                      <colgroup>
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "55%" }} />
                      </colgroup>
                      <thead>
                        <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                          {["Target", "Year", "Status", "Issues"].map((h) => (
                            <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c: any, i: number) => (
                          <tr key={i} style={{ borderBottom: i !== campaigns.length - 1 ? "1px solid #f3f4f6" : "none", verticalAlign: "top" }}>
                            <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.target_company}</td>
                            <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b7280" }}>{c.start_year}</td>
                            <td style={{ padding: "14px 16px" }}><StatusBadge status={c.normalized_status} /></td>
                            <td style={{ padding: "14px 16px" }}>
                              {c.main_issues.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", marginBottom: c.campaign_form.length > 0 ? 6 : 0 }}>
                                  {c.main_issues.map((issue: string, j: number) => <Tag key={j} text={issue} />)}
                                </div>
                              )}
                              {c.campaign_form.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap" }}>
                                  {c.campaign_form.map((form: string, j: number) => <Tag key={j} text={form} color="#fdf2f2" textColor={THEME_MAROON} />)}
                                </div>
                              )}
                              {c.nominees.length > 0 && <p style={{ fontSize: 12, color: "#6b7280", margin: "8px 0 0" }}>👤 {c.nominees.join(", ")}</p>}
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
                      {[
                        { label: "Issuer",  align: "left"  },
                        { label: "Ticker",  align: "left"  },
                        { label: "Shares",  align: "right" },
                        { label: "Value",   align: "right" },
                        { label: "Type",    align: "left"  },
                      ].map((h) => (
                        <th key={h.label} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: h.align as any, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profile.snapshot.holdings.map((h: any, i: number) => {
                      const isOption = h.security_type?.toLowerCase().includes("option") || h.security_type?.toLowerCase().includes("put");
                      const sharesRaw = h.shares_or_principal;
                      // Ensure "shares" text is removed completely and numbers formatted cleanly
                      const sharesDisplay = typeof sharesRaw === "number"
                        ? sharesRaw.toLocaleString()
                        : sharesRaw ? String(sharesRaw).replace(/\s*shares/gi, '') : "N/A";
                        
                      return (
                        <tr key={i} style={{ borderBottom: i !== profile.snapshot.holdings.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                          <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{h.issuer}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: THEME_MAROON, fontWeight: 500 }}>{h.ticker_or_symbol}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280", textAlign: "right" }}>{sharesDisplay}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#111827", fontWeight: 500, textAlign: "right" }}>{formatUSD(h.value_usd_thousands)}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 999, background: isOption ? "#fef3c7" : "#f3f4f6", color: isOption ? "#d97706" : "#4b5563" }}>
                              {h.security_type}
                            </span>
                          </td>
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {visiblePersonnel.map((p: any, i: number) => <PersonnelCard key={i} person={p} accentColor="#fdf2f2" textColor={THEME_MAROON} />)}
                  </div>
                </div>
              )}
              {nominees.length > 0 && (
                <div>
                  <SectionHeader title="Nominees & Settlement Directors" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {nominees.map((p: any, i: number) => <PersonnelCard key={i} person={p} accentColor="#f0fdf4" textColor="#166534" />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── PersonnelCard sub-component ─────────────────────────────────────────────

const PersonnelCard = ({ person, accentColor = "#f3f4f6", textColor = "#374151" }: { person: any, accentColor?: string, textColor?: string }) => {
  const initials = person.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div style={{ border: `1px solid #e5e7eb`, borderRadius: 8, padding: "16px", display: "flex", gap: 14, alignItems: "flex-start", background: "#fafafa" }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%", background: accentColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, color: textColor, flexShrink: 0,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>{person.name}</p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>{person.role}</p>
      </div>
    </div>
  );
};

export default ActivistIntelligenceDashboard;