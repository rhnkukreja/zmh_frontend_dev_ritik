import React, { useState, useEffect } from "react";
import axios from "axios";
import { AI_CHATBOT_API_BASE } from '@/pages/AIChatbot/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

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
  // Master multi-file database cache state
  const [profilesCache, setProfilesCache] = useState<Record<string, any>>({});
  const [investorKeys, setInvestorKeys] = useState<string[]>([]);
  const [activeInvestorKey, setActiveInvestorKey] = useState<string>("");
  
  const [activeTab, setActiveTab] = useState("summary");
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Phase 1: Load all profiles on component mount sequence
  useEffect(() => {
    const fetchAllProfiles = async () => {
      try {
        setLoading(true);
        setError(null);

        // Call the plural endpoint that streams the full folder prefix contents
        const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles?t=${Date.now()}`;
        const response = await axios.get(url);

        const serverPayload = response.data?.data || response.data;
        
        if (!serverPayload || Object.keys(serverPayload).length === 0) {
          throw new Error("No data matrices available in the designated S3 cluster prefix.");
        }

        setProfilesCache(serverPayload);
        
        const discoveredKeys = Object.keys(serverPayload);
        setInvestorKeys(discoveredKeys);
        
        // Auto-select the first dynamic filename registry token found
        setActiveInvestorKey(discoveredKeys[0]);

      } catch (err: any) {
        console.error("[ActivistDashboard] dynamic index assembly failure:", err);
        setError(err.response?.data?.detail || err.message || "Failed to load dynamic profile index registry.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllProfiles();
  }, []);

  // Phase 2: Switch views in browser memory when activeInvestorKey changes
  useEffect(() => {
    if (!activeInvestorKey || !profilesCache[activeInvestorKey]) return;

    try {
      const targetData = profilesCache[activeInvestorKey];
      
      // Auto-unwrap if inner profile block wraps data under a nested asset key name
      const cleanRawData = targetData[activeInvestorKey] || targetData;
      
      const normalised = normaliseProfile(cleanRawData);
      setProfile(normalised);
    } catch (err: any) {
      console.error("[Unwrapper Process Engine Fail]:", err);
      setError("Failed to correctly unwrap selected data mapping layout.");
    }
  }, [activeInvestorKey, profilesCache]);


  const formatKeyToLabel = (keyStr: string) => {
    if (!keyStr) return "";
    
    // Fallback optimization: If the underlying cache profile already parsed a legalName text string, extract it directly!
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
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#b91c1c", margin: 0 }}>
          Activist Intelligence Dashboard
        </h1>
        
        {/* Dynamic Selector Dropdown built completely from S3 contents */}
        <select
          value={activeInvestorKey}
          onChange={(e) => setActiveInvestorKey(e.target.value)}
          style={{
            padding: "8px 14px", fontSize: 13, borderRadius: 8,
            border: "1px solid #d1d5db", background: "white", color: "#374151", cursor: "pointer",
          }}
        >
          {investorKeys.map((key) => (
            <option key={key} value={key}>
              {formatKeyToLabel(key)}
            </option>
          ))}
        </select>
      </div>

      {/* ── Profile header card ── */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 3px #0000000a" }}>
        <span style={{ fontSize: 11, color: "#9ca3af", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 999, padding: "2px 10px", fontWeight: 500 }}>
          Updated May 2026
        </span>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "10px 0 2px" }}>{profile.legalName}</h2>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>
          Activist Investor Profile · {profile.hq} · Founded {profile.founded}
        </p>
        <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>{profile.summary}</p>
        {profile.summaryPoints.length > 0 && (
          <ul style={{ marginTop: 12, paddingLeft: 18 }}>
            {profile.summaryPoints.map((pt, i) => (
              <li key={i} style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, lineHeight: 1.5 }}>{pt}</li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Tabs Navigation ── */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1.5px solid #e5e7eb", marginBottom: 20 }}>
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
              padding: "8px 16px", fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              border: "none", background: "none", cursor: "pointer",
              borderBottom: activeTab === tab.id ? "2px solid #111827" : "2px solid transparent",
              color: activeTab === tab.id ? "#111827" : "#9ca3af",
              marginBottom: -1.5,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📑 TAB CONTAINER HOOKS RENDERING AS IS */}
      {activeTab === "summary" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { label: "13F Portfolio Value", value: formatLargeUSD(profile.snapshot.portfolio_value), sub: "As of " + (profile.snapshot.filing_date || "N/A") },
              { label: "AUM Signal", value: profile.snapshot.aum_signal || "N/A", sub: "Form ADV regulatory AUM" },
              { label: "Tracked Campaigns", value: campaigns.length, sub: "Historical count" },
              { label: "Active / Open", value: activeCampaigns, sub: "Current watchlist" },
              { label: "Personnel Tracked", value: profile.personnel.length, sub: `${visiblePersonnel.length} mgmt · ${nominees.length} nominees` },
            ].map((card, i) => (
              <div key={i} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px #0000000a" }}>
                <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{card.value}</p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{card.sub}</p>
              </div>
            ))}
          </div>

          {profile.observations.length > 0 && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px #0000000a" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 14px" }}>💬 Key Cross-Campaign Observations</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {profile.observations.map((obs, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 8, padding: "10px 14px", gap: 10 }}>
                    <span style={{ color: "#6366f1", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>↗</span>
                    <span style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.55 }}>{obs}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px #0000000a" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 14px" }}>🎯 Recent Campaigns Snapshot</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {campaigns.slice(0, 6).map((c, i) => (
                <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, flex: 1, marginRight: 6 }}>{c.target_company}</p>
                    <StatusBadge status={c.normalized_status} />
                  </div>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px" }}>{c.start_year}</p>
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
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, minWidth: 220, flex: "0 0 220px", boxShadow: "0 1px 3px #0000000a" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 16px", textAlign: "center" }}>Campaign Outcomes</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                <Bar dataKey="count" barSize={28} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, flex: 1, minWidth: 0, boxShadow: "0 1px 3px #0000000a" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 14px" }}>📜 Full Campaign List</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "64%" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #e5e7eb" }}>
                    {["Target", "Year", "Status", "Issues / Notes"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", verticalAlign: "top" }}>
                      <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>{c.target_company}</td>
                      <td style={{ padding: "10px 10px", fontSize: 13, color: "#6b7280" }}>{c.start_year}</td>
                      <td style={{ padding: "10px 10px" }}><StatusBadge status={c.normalized_status} /></td>
                      <td style={{ padding: "10px 10px" }}>
                        {c.main_issues.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: c.notes ? 6 : 0 }}>
                            {c.main_issues.map((issue, j) => <Tag key={j} text={issue} />)}
                          </div>
                        )}
                        {c.campaign_form.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: c.notes ? 6 : 0 }}>
                            {c.campaign_form.map((form, j) => <Tag key={j} text={form} color="#eff6ff" textColor="#1d4ed8" />)}
                          </div>
                        )}
                        {c.notes && <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0", lineHeight: 1.5 }}>{c.notes}</p>}
                        {c.nominees.length > 0 && <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>👤 {c.nominees.join(", ")}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "holdings" && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px #0000000a" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 18, padding: "12px 16px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
            <div>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Report Period</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{profile.snapshot.filing_date}</p>
            </div>
            <div style={{ borderLeft: "1px solid #e5e7eb", paddingLeft: 16 }}>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>13F Portfolio Value</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{formatLargeUSD(profile.snapshot.portfolio_value)}</p>
            </div>
            <div style={{ borderLeft: "1px solid #e5e7eb", paddingLeft: 16 }}>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>AUM Signal</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{profile.snapshot.aum_signal || "N/A"}</p>
            </div>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid #e5e7eb" }}>
                  {["#", "Issuer", "Ticker", "Type", "Value", "Position", "Note"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile.snapshot.holdings.map((h, i) => {
                  const isOption = h.security_type?.toLowerCase().includes("option") || h.security_type?.toLowerCase().includes("put");
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "9px 10px", fontSize: 12, color: "#9ca3af" }}>{h.rank}</td>
                      <td style={{ padding: "9px 10px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{h.issuer}</td>
                      <td style={{ padding: "9px 10px", fontSize: 12, color: "#2563eb", fontWeight: 500 }}>{h.ticker_or_symbol}</td>
                      <td style={{ padding: "9px 10px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: isOption ? "#fef3c7" : "#eff6ff", color: isOption ? "#d97706" : "#1d4ed8" }}>
                          {h.security_type}
                        </span>
                      </td>
                      <td style={{ padding: "9px 10px", fontSize: 13, color: "#111827", fontWeight: 500 }}>{formatUSD(h.value_usd_thousands)}</td>
                      <td style={{ padding: "9px 10px", fontSize: 12, color: "#6b7280" }}>{h.shares_or_principal}</td>
                      <td style={{ padding: "9px 10px", fontSize: 12, color: "#9ca3af" }}>{h.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "personnel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {visiblePersonnel.length > 0 && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>👔 Management & Key Personnel</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {visiblePersonnel.map((p, i) => <PersonnelCard key={i} person={p} />)}
              </div>
            </div>
          )}
          {nominees.length > 0 && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>🏛 Nominees & Settlement Directors</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {nominees.map((p, i) => <PersonnelCard key={i} person={p} accentColor="#f0fdf4" borderColor="#bbf7d0" />)}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "sources" && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>📚 Source Inventory</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {profile.sources.map((src, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", minWidth: 32 }}>{src.source_id || i + 1}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>{src.title || src["Form / Document Type"]}</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                    {src.publisher || src["Target Company"]} {src.publication_or_filing_date || src["Filing Date"] ? `· ${src.publication_or_filing_date || src["Filing Date"]}` : ""}
                  </p>
                  {(src.relevance_note || src["Relevance Note"]) && <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0", fontStyle: "italic" }}>{src.relevance_note || src["Relevance Note"]}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ marginTop: 24, padding: "12px 16px", background: "#f3f4f6", borderRadius: 10, fontSize: 12, color: "#9ca3af" }}>
        Source: Dynamic multi-profile folder sync engine (S3). Data rendering updates dynamically without application compilation overhead.
      </div>
    </div>
  );
};

// ─── PersonnelCard sub-component ─────────────────────────────────────────────

const PersonnelCard = ({ person, accentColor = "#eff6ff", borderColor = "#bfdbfe" }) => {
  const initials = person.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div style={{ background: "white", border: `1px solid ${borderColor}`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%", background: accentColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, color: "#1d4ed8", flexShrink: 0,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>{person.name}</p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>{person.role}</p>
      </div>
    </div>
  );
};

export default ActivistIntelligenceDashboard;