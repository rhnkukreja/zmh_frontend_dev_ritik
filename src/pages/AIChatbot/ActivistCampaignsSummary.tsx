import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AI_CHATBOT_API_BASE } from "@/pages/AIChatbot/api";

// ─── Constants ──────────────────────────────────────────────────────────────

const THEME_MAROON = "#8b1828";

// Replicated from ActivistDashboard.tsx (this app's convention is small local
// helpers per page/component rather than cross-file imports — see
// BasicProfilePanel.tsx / ActivistFilingsTable.tsx doing the same).
//
// The pipeline writes free-text statuses — "ongoing (second episode) -
// cooperation period filings", "closed - 13d engagement", "exited (position
// liquidated)" — so every consumer keys off the FIRST word, never the whole
// string.
const STATUS_COLOR_MAP: Record<string, string> = {
  open: "#f59e0b",
  ongoing: "#f59e0b",
  active: "#3b82f6",
  settled: "#10b981",
  closed: "#6b7280",
  exited: "#6b7280",
  undisclosed: "#6b7280",
};

const STATUS_LABEL_MAP: Record<string, string> = {
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

/** Preferred left-to-right ordering for the status pill filters; any status
 * keys seen in the data but not listed here are appended alphabetically. */
const STATUS_FILTER_ORDER = ["open", "ongoing", "active", "settled", "closed", "exited", "undisclosed"];

// ─── Field access helpers ───────────────────────────────────────────────────
// FIELD SHAPE VARIES by which pipeline generated a given investor's profile —
// access everything beyond investor_slug/investor_legal_name defensively.

const campaignStatusRaw = (c: any) => c?.normalized_status || c?.status || "";
const campaignTarget = (c: any) => c?.target_company || c?.ticker || "—";
const campaignDate = (c: any) => c?.latest_activity_date || c?.campaign_start_date || null;

const formatDate = (value: any): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

// ─── Status badge (mirrors StatusBadge in ActivistDashboard.tsx) ───────────

const StatusBadge = ({ status }: { status: any }) => {
  const key = statusKey(status);
  const color = STATUS_COLOR_MAP[key] || "#6b7280";
  const label = STATUS_LABEL_MAP[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "N/A");
  const bg = color + "20";
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
        maxWidth: 220,
        overflow: "hidden",
        textOverflow: "ellipsis",
        verticalAlign: "middle",
      }}
    >
      {label}
    </span>
  );
};

// ─── Investor filter dropdown ───────────────────────────────────────────────
// Custom downward-opening dropdown, adapted from CompanyFilterDropdown's
// "inline" variant in ActivistFilingsTable.tsx — that file already solved
// (and fixed) the native-<select>-flips-upward problem this session, so this
// reuses the same pattern rather than reintroducing it.

const InvestorFilterDropdown = ({
  investor,
  setInvestor,
  investorOptions,
}: {
  investor: string;
  setInvestor: (name: string) => void;
  investorOptions: { name: string; count: number }[];
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectOption = (name: string) => {
    setInvestor(name);
    setOpen(false);
  };

  const label = investor === "all" ? "All Investors" : investor;

  const optionContainerStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    textAlign: "left",
    padding: "8px 12px",
    fontSize: 14,
    background: active ? "#fdf2f4" : "transparent",
    border: "none",
    cursor: "pointer",
    minWidth: 0,
  });

  const optionNameStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 0,
    fontWeight: active ? 600 : 500,
    color: active ? THEME_MAROON : "#374151",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  const optionCountStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#94a3b8",
    flexShrink: 0,
  };

  const CheckIcon = ({ active }: { active: boolean }) => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={THEME_MAROON}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: active ? 1 : 0 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const optionHoverProps = (active: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = "#fdf2f4";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = active ? "#fdf2f4" : "transparent";
    },
  });

  return (
    <div style={{ position: "relative", marginLeft: "auto" }} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          padding: "5px 8px",
          color: "#111827",
          background: "#fff",
          maxWidth: 220,
          cursor: "pointer",
        }}
      >
        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 4,
            minWidth: 220,
            maxWidth: 300,
            maxHeight: 336,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            zIndex: 30,
            padding: "4px 0",
          }}
        >
          <button
            type="button"
            onClick={() => selectOption("all")}
            style={{ ...optionContainerStyle(investor === "all"), borderBottom: "1px solid #f1f5f9" }}
            {...optionHoverProps(investor === "all")}
          >
            <span style={optionNameStyle(investor === "all")}>All Investors</span>
            <CheckIcon active={investor === "all"} />
          </button>
          {investorOptions.map(({ name, count }) => (
            <button
              key={name}
              type="button"
              onClick={() => selectOption(name)}
              style={optionContainerStyle(investor === name)}
              {...optionHoverProps(investor === name)}
            >
              <span style={optionNameStyle(investor === name)}>{name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={optionCountStyle}>({count})</span>
                <CheckIcon active={investor === name} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Stat tile row ───────────────────────────────────────────────────────────

const StatTile = ({ label, value, isLast }: { label: string; value: React.ReactNode; isLast: boolean }) => (
  <div style={{ flex: "1 1 200px", borderRight: isLast ? "none" : "1px solid #e5e7eb", padding: "0 20px" }}>
    <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </p>
    <p style={{ fontSize: 28, fontWeight: 400, color: "#111827", margin: 0, fontFamily: "Georgia, serif" }}>{value}</p>
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────

type Campaign = Record<string, any> & { investor_slug: string; investor_legal_name: string };

const ActivistCampaignsSummary = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalCampaigns, setTotalCampaigns] = useState<number | null>(null);
  const [totalInvestors, setTotalInvestors] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [investorFilter, setInvestorFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `${AI_CHATBOT_API_BASE}/api/activist-profiles/campaigns/summary`;
        const response = await axios.get(url, { params: { t: Date.now() } });
        if (cancelled) return;

        const payload = response.data || {};
        const list: Campaign[] = Array.isArray(payload.data) ? payload.data : [];

        setCampaigns(list);
        setTotalCampaigns(typeof payload.total_campaigns === "number" ? payload.total_campaigns : list.length);
        setTotalInvestors(typeof payload.total_investors_with_campaigns === "number" ? payload.total_investors_with_campaigns : null);
      } catch (err: any) {
        if (cancelled) return;
        console.error("[ActivistCampaignsSummary] fetch failure:", err);
        setError(err.response?.data?.detail || err.message || "Failed to load campaign summary.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Aggregate stats (client-side, from the raw campaign list) ──
  const activeCount = useMemo(
    () => campaigns.filter((c) => LIVE_STATUS_KEYS.includes(statusKey(campaignStatusRaw(c)))).length,
    [campaigns]
  );
  const closedCount = campaigns.length - activeCount;

  // ── Investor dropdown options ──
  const investorOptions = useMemo(() => {
    const counts = new Map<string, number>();
    campaigns.forEach((c) => {
      const name = c?.investor_legal_name;
      if (!name) return;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [campaigns]);

  // Scoped to the currently-selected investor (but NOT the status filter) so
  // the status pill counts reflect "how many campaigns of each status does
  // this investor have", same pattern as ActivistFilingsTable's company scoping.
  const investorFilteredCampaigns = useMemo(() => {
    if (investorFilter === "all") return campaigns;
    return campaigns.filter((c) => c?.investor_legal_name === investorFilter);
  }, [campaigns, investorFilter]);

  const statusBucketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    investorFilteredCampaigns.forEach((c) => {
      const key = statusKey(campaignStatusRaw(c));
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [investorFilteredCampaigns]);

  const statusBucketOrder = useMemo(() => {
    const seen = Object.keys(statusBucketCounts);
    const known = STATUS_FILTER_ORDER.filter((k) => seen.includes(k));
    const unknown = seen.filter((k) => !STATUS_FILTER_ORDER.includes(k)).sort();
    return [...known, ...unknown];
  }, [statusBucketCounts]);

  const filteredCampaigns = useMemo(() => {
    return investorFilteredCampaigns.filter((c) => {
      if (statusFilter !== "all" && statusKey(campaignStatusRaw(c)) !== statusFilter) return false;
      return true;
    });
  }, [investorFilteredCampaigns, statusFilter]);

  // ─── Loading state ───
  if (loading && campaigns.length === 0) {
    return (
      <div style={{ padding: 24, width: "100%", background: "#f9fafb", boxSizing: "border-box", fontFamily: "system-ui, sans-serif", minHeight: 320 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "4px solid #e5e7eb",
              borderTopColor: THEME_MAROON,
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
          <p style={{ color: "#6b7280", marginTop: 16, fontSize: 14 }}>Loading campaigns…</p>
        </div>
      </div>
    );
  }

  // ─── Error state ───
  if (error && campaigns.length === 0) {
    return (
      <div style={{ margin: 24, padding: 20, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, color: "#dc2626" }}>
        ⚠ {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, width: "100%", background: "#f9fafb", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px #0000000a" }}>
        {/* Header */}
        <div style={{ background: THEME_MAROON, padding: "16px 24px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: 0 }}>Total Campaigns Covered</h2>
          <p style={{ fontSize: 12, color: "#f3d7db", margin: "4px 0 0" }}>
            Every activist campaign tracked across all covered investors.
          </p>
        </div>

        {/* Aggregate stat tiles */}
        <div style={{ display: "flex", flexWrap: "wrap", padding: "24px 24px", borderBottom: "1px solid #e5e7eb" }}>
          <StatTile label="Total Campaigns" value={totalCampaigns ?? campaigns.length} isLast={false} />
          <StatTile label="Investors Covered" value={totalInvestors ?? investorOptions.length} isLast={false} />
          <StatTile label="Active / Open" value={activeCount} isLast={false} />
          <StatTile label="Closed" value={closedCount} isLast={true} />
        </div>

        {/* Filters + table */}
        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${statusFilter === "all" ? THEME_MAROON : "#e5e7eb"}`,
                background: statusFilter === "all" ? THEME_MAROON : "#fff",
                color: statusFilter === "all" ? "#fff" : "#6b7280",
                cursor: "pointer",
              }}
            >
              All ({investorFilteredCampaigns.length})
            </button>
            {statusBucketOrder.map((key) => {
              const active = statusFilter === key;
              const count = statusBucketCounts[key] || 0;
              const color = STATUS_COLOR_MAP[key] || "#6b7280";
              const label = STATUS_LABEL_MAP[key] || (key.charAt(0).toUpperCase() + key.slice(1));
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${active ? color : "#e5e7eb"}`,
                    background: active ? color : "#fff",
                    color: active ? "#fff" : "#6b7280",
                    cursor: "pointer",
                  }}
                >
                  {label} ({count})
                </button>
              );
            })}

            <InvestorFilterDropdown
              investor={investorFilter}
              setInvestor={setInvestorFilter}
              investorOptions={investorOptions}
            />
          </div>

          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
            {filteredCampaigns.length} of {campaigns.length} campaigns
            {loading && <span style={{ marginLeft: 8, color: "#9ca3af" }}>(refreshing…)</span>}
          </p>

          {filteredCampaigns.length > 0 ? (
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 560, border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fdf2f4", borderBottom: "1px solid #f3d7db", position: "sticky", top: 0, zIndex: 1 }}>
                    {["Target Company", "Investor", "Status", "Campaign Start / Latest Activity"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: THEME_MAROON,
                          textAlign: "left",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          background: "#fdf2f4",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((c, i) => {
                    const rowBaseBg = i % 2 === 1 ? "#fafafa" : "#fff";
                    return (
                      <tr
                        key={`${c.investor_slug || "investor"}-${i}`}
                        style={{
                          borderBottom: i !== filteredCampaigns.length - 1 ? "1px solid #f3f4f6" : "none",
                          verticalAlign: "top",
                          background: rowBaseBg,
                          transition: "background-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fdf2f4")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBaseBg)}
                      >
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
                          {campaignTarget(c)}
                        </td>
                        <td
                          style={{ padding: "12px 16px", fontSize: 13, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}
                          title={c.investor_legal_name}
                        >
                          {c.investor_legal_name || "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <StatusBadge status={campaignStatusRaw(c)} />
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
                          {formatDate(campaignDate(c))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>No campaigns match the selected filters.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivistCampaignsSummary;
