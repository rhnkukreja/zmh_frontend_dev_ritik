import React, { useState, useEffect } from "react";
import axios from "axios";
import { AI_CHATBOT_API_BASE } from '@/pages/AIChatbot/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

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

const formatUSD = (thousands) => {
  if (!thousands) return "N/A";
  const val = thousands * 1000;
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
};

const formatLargeUSD = (value) => {
  if (!value) return "N/A";
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
};

/** Normalise the raw JSON from S3 into a consistent internal shape */
const normaliseProfile = (raw) => {
  if (!raw) return null;

  // ── Summary text ──────────────────────────────────────────────────────────
  const summary =
    typeof raw.investor_summary === "string"
      ? raw.investor_summary
      : raw.activist_investor_summary?.investment_focus ||
        (typeof raw.activist_investor_summary === "string"
          ? raw.activist_investor_summary
          : "");

  const summaryPoints =
    raw.activist_investor_summary?.summary_points || [];

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
  ).map((p) => ({
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
  ).map((c) => ({
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
  const observations =
    raw.key_cross_campaign_observations ||
    raw.custom_observations ||
    raw.investor_profile_analysis ||
    [];

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

const SectionHeader = ({ title }) => (
  <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
    <h3 style={{ fontSize: 13, fontWeight: 600, color: THEME_MAROON, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
      {title}
    </h3>
    <div style={{ flex: 1, height: 1, background: "#e5e7eb", marginLeft: 16 }}></div>
  </div>
);

const StatusBadge = ({ status }) => {
  const key   = (status || "closed").toLowerCase().split(/[/ ]/)[0];
  const color = STATUS_COLOR_MAP[key] || "#6b7280";
  const label = STATUS_LABEL_MAP[key] || (status || "N/A");
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

const Tag = ({ text, color = "#6b728020", textColor = "#374151" }) => (
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

// ─── Main component ───────────────────────────────────────────────────────────

const ActivistIntelligenceDashboard = () => {
  const [profilesCache, setProfilesCache] = useState({});
  const [investorKeys, setInvestorKeys] = useState([]);
  const [activeInvestorKey, setActiveInvestorKey] = useState("");
  
  const [activeTab, setActiveTab] = useState("summary");
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    const fetchAllProfiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles?t=${Date.now()}`;
        const response = await axios.get(url);
        const serverPayload = response.data?.data || response.data;
        
        if (!serverPayload || Object.keys(serverPayload).length === 0) {
          throw new Error("No data matrices available in the designated S3 cluster prefix.");
        }

        setProfilesCache(serverPayload);
        const discoveredKeys = Object.keys(serverPayload);
        setInvestorKeys(discoveredKeys);
        setActiveInvestorKey(discoveredKeys[0]);

      } catch (err) {
        console.error("[ActivistDashboard] dynamic index assembly failure:", err);
        setError(err.response?.data?.detail || err.message || "Failed to load dynamic profile index registry.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllProfiles();
  }, []);

  useEffect(() => {
    if (!activeInvestorKey || !profilesCache[activeInvestorKey]) return;
    try {
      const targetData = profilesCache[activeInvestorKey];
      const cleanRawData = targetData[activeInvestorKey] || targetData;
      const normalised = normaliseProfile(cleanRawData);
      setProfile(normalised);
    } catch (err) {
      console.error("[Unwrapper Process Engine Fail]:", err);
      setError("Failed to correctly unwrap selected data mapping layout.");
    }
  }, [activeInvestorKey, profilesCache]);


  const formatKeyToLabel = (keyStr) => {
    if (!keyStr) return "";
    const loadedData = profilesCache[keyStr];
    if (loadedData?.activist_investor_summary?.legal_name) return loadedData.activist_investor_summary.legal_name;
    if (loadedData?.metadata?.investor_name) return loadedData.metadata.investor_name;

    return keyStr
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <p style={{ color: "#6b7280", fontSize: 15, animation: "pulse 1.5s infinite" }}>
          Syncing activist intelligence metrics…
        </p>
      </div>
    );
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
    (c) => c.normalized_status === "open" || c.normalized_status === "active"
  ).length;

  const statusGroups = campaigns.reduce((acc, c) => {
    const key = c.normalized_status || "closed";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(statusGroups).map(([key, count]) => ({
    name: STATUS_LABEL_MAP[key] || key,
    count,
    fill: STATUS_COLOR_MAP[key] || "#6b7280",
  }));

  const visiblePersonnel = profile.personnel.filter((p) => p.category === "visible_personnel");
  const nominees = profile.personnel.filter((p) => p.category === "nominee_or_outcome_director");

  return (
    <div style={{ padding: "24px", width: "100%", background: "#f9fafb", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px #0000000a" }}>
        {/* ── Maroon ZMH Header ── */}
        <div style={{ background: THEME_MAROON, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "white", margin: 0 }}>
             {profile.legalName}
          {/* <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{profile.legalName}</h2> */}
          </h1>
          
          <select
            value={activeInvestorKey}
            onChange={(e) => setActiveInvestorKey(e.target.value)}
            style={{
              padding: "8px 14px", fontSize: 13, borderRadius: 6,
              border: "1px solid #e5e7eb", background: "white", color: "#111827", cursor: "pointer",
              minWidth: 240
            }}
          >
            {investorKeys.map((key) => (
              <option key={key} value={key}>
                {formatKeyToLabel(key)}
              </option>
            ))}
          </select>
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
              {profile.summaryPoints.map((pt, i) => (
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
            // { id: "sources",   label: "Sources" },
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
                  { label: "13F Portfolio Value", value: formatLargeUSD(profile.snapshot.portfolio_value), sub: "As of " + (profile.snapshot.filing_date || "N/A") },
                  { label: "Tracked Campaigns", value: campaigns.length, sub: "Historical count" },
                  { label: "Active / Open", value: activeCampaigns, sub: "Current watchlist" },
                  { label: "Personnel Tracked", value: profile.personnel.length, sub: `${visiblePersonnel.length} mgmt · ${nominees.length} nominees` },
                ].map((card, i, arr) => (
                  <div key={i} style={{ flex: "1 1 200px", borderRight: i !== arr.length - 1 ? "1px solid #e5e7eb" : "none", padding: "0 16px" }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</p>
                    <p style={{ fontSize: 28, fontWeight: 400, color: "#111827", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>{card.value}</p>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{card.sub}</p>
                  </div>
                ))}
              </div>

              {profile.observations.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader title="Key Cross-Campaign Observations" />
                  <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                    {profile.observations.map((obs, i) => (
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
                  {campaigns.slice(0, 6).map((c, i) => (
                    <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px", background: "#fafafa" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, flex: 1, marginRight: 8 }}>{c.target_company}</p>
                        <StatusBadge status={c.normalized_status} />
                      </div>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px", fontWeight: 500 }}>Started: {c.start_year}</p>
                      <div style={{ display: "flex", flexWrap: "wrap" }}>
                        {(c.main_issues || []).slice(0, 3).map((issue, j) => (
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
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, minWidth: 260, flex: "0 0 260px" }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Campaign Outcomes</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      <Bar dataKey="count" barSize={32} radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

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
                          {["Target", "Year", "Status", "Issues / Notes"].map((h) => (
                            <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c, i) => (
                          <tr key={i} style={{ borderBottom: i !== campaigns.length - 1 ? "1px solid #f3f4f6" : "none", verticalAlign: "top" }}>
                            <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.target_company}</td>
                            <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b7280" }}>{c.start_year}</td>
                            <td style={{ padding: "14px 16px" }}><StatusBadge status={c.normalized_status} /></td>
                            <td style={{ padding: "14px 16px" }}>
                              {c.main_issues.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", marginBottom: c.campaign_form.length > 0 ? 6 : 0 }}>
                                  {c.main_issues.map((issue, j) => <Tag key={j} text={issue} />)}
                                </div>
                              )}
                              {c.campaign_form.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap" }}>
                                  {c.campaign_form.map((form, j) => <Tag key={j} text={form} color="#fdf2f2" textColor={THEME_MAROON} />)}
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
                      {["Issuer", "Ticker", "Type", "Value", "Shares / Principal", "Note"].map((h) => (
                        <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profile.snapshot.holdings.map((h, i) => {
                      const isOption = h.security_type?.toLowerCase().includes("option") || h.security_type?.toLowerCase().includes("put");
                      return (
                        <tr key={i} style={{ borderBottom: i !== profile.snapshot.holdings.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                          <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{h.issuer}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: THEME_MAROON, fontWeight: 500 }}>{h.ticker_or_symbol}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: isOption ? "#fef3c7" : "#f3f4f6", color: isOption ? "#d97706" : "#4b5563" }}>
                              {h.security_type}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#111827", fontWeight: 500 }}>{formatUSD(h.value_usd_thousands)}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>{h.shares_or_principal}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af" }}>{h.note}</td>
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
                    {visiblePersonnel.map((p, i) => <PersonnelCard key={i} person={p} accentColor="#fdf2f2" textColor={THEME_MAROON} />)}
                  </div>
                </div>
              )}
              {nominees.length > 0 && (
                <div>
                  <SectionHeader title="Nominees & Settlement Directors" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {nominees.map((p, i) => <PersonnelCard key={i} person={p} accentColor="#f0fdf4" textColor="#166534" />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "sources" && (
            <>
              <SectionHeader title="Source Inventory" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {profile.sources.map((src, i) => {
                  const title = src.title || src["Form / Document Type"] || "Untitled Source";
                  const publisher = src.publisher || src["Target Company"] || "";
                  const date = src.publication_or_filing_date || src["Filing Date"] || "";
                  const note = src.relevance_note || src["Relevance Note"] || "";
                  const url = src.url || src["URL"] || null;
                  const sourceId = src.source_id || String(i + 1);

                  return (
                    <div key={i} style={{ display: "flex", gap: 16, padding: "16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fafafa" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME_MAROON, minWidth: 24, paddingTop: 2 }}>{sourceId}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 14, fontWeight: 600, color: THEME_MAROON, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                          >
                            {title}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/>
                              <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          </a>
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{title}</p>
                        )}
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0" }}>
                          {publisher}{date ? ` · ${date}` : ""}
                        </p>
                        {note && <p style={{ fontSize: 12, color: "#4b5563", margin: "8px 0 0", fontStyle: "italic" }}>"{note}"</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

// ─── PersonnelCard sub-component ─────────────────────────────────────────────

const PersonnelCard = ({ person, accentColor = "#f3f4f6", textColor = "#374151" }) => {
  const initials = person.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
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