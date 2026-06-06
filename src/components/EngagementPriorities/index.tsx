import React, { useState, useEffect } from "react";

const CARDS = [
  {
    label: "Board Composition & Effectiveness",
    pct: 83,
    color: "#f97316",
    bg: "#fff7ed",
    border: "#fed7aa",
    text: "#9a3412",
    desc: "Independence, diversity, skills alignment, refreshment practices, succession planning",
    investors: ["BlackRock", "Vanguard", "State Street", "Fidelity", "T. Rowe Price"],
    Icon: () => (
      <svg viewBox="0 0 20 20" fill="none" stroke="#f97316" strokeWidth="1.5" width={16} height={16}>
        <circle cx="8" cy="6" r="2.5" />
        <path d="M3 17c0-3 2.2-5 5-5s5 2 5 5" />
        <circle cx="14" cy="8" r="2" />
        <path d="M14 14c1.5 0 3 .8 3 3" />
      </svg>
    ),
  },
  {
    label: "Risk Oversight",
    pct: 83,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    text: "#5b21b6",
    desc: "Material financial, operational, strategic risks including AI, cybersecurity, regulatory shifts",
    investors: ["BlackRock", "Vanguard", "State Street", "Fidelity", "T. Rowe Price"],
    Icon: () => (
      <svg viewBox="0 0 20 20" fill="none" stroke="#8b5cf6" strokeWidth="1.5" width={16} height={16}>
        <path d="M10 2l7 4v5c0 4-3 7-7 8-4-1-7-4-7-8V6l7-4z" />
      </svg>
    ),
  },
  {
    label: "Executive Compensation",
    pct: 67,
    color: "#f97316",
    bg: "#fff7ed",
    border: "#fed7aa",
    text: "#9a3412",
    desc: "Pay-performance alignment, long-term value creation, transparent metrics, avoid excessive awards",
    investors: ["BlackRock", "Vanguard", "State Street", "Fidelity"],
    Icon: () => (
      <svg viewBox="0 0 20 20" fill="none" stroke="#f97316" strokeWidth="1.5" width={16} height={16}>
        <circle cx="10" cy="10" r="7" />
        <path d="M10 6v8M7.5 8.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1 2.5 2.5S12 13 10 13.5" />
      </svg>
    ),
  },
  {
    label: "Environmental & Social Risk Oversight",
    pct: 67,
    color: "#10b981",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    text: "#065f46",
    desc: "Climate transition plans, emissions targets, environmental risk management and disclosure",
    investors: ["BlackRock", "Vanguard", "State Street", "Fidelity"],
    Icon: () => (
      <svg viewBox="0 0 20 20" fill="none" stroke="#10b981" strokeWidth="1.5" width={16} height={16}>
        <circle cx="10" cy="10" r="7" />
        <path d="M2 10h16M10 2a14 14 0 0 1 0 16M10 2a14 14 0 0 0 0 16" />
      </svg>
    ),
  },
  {
    label: "Shareholder Rights",
    pct: 50,
    color: "#f97316",
    bg: "#fff7ed",
    border: "#fed7aa",
    text: "#9a3412",
    desc: "Protect voting rights, board accountability, responsiveness to shareholder proposals",
    investors: ["BlackRock", "Vanguard", "State Street"],
    Icon: () => (
      <svg viewBox="0 0 20 20" fill="none" stroke="#f97316" strokeWidth="1.5" width={16} height={16}>
        <rect x="3" y="4" width="14" height="12" rx="1.5" />
        <path d="M7 4V2M13 4V2M3 9h14" />
      </svg>
    ),
  },
  {
    label: "Human Capital & Human Rights",
    pct: 50,
    color: "#10b981",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    text: "#065f46",
    desc: "Workforce safety, DEI, labor rights, supply chain human rights, just transition",
    investors: ["BlackRock", "Vanguard", "State Street"],
    Icon: () => (
      <svg viewBox="0 0 20 20" fill="none" stroke="#10b981" strokeWidth="1.5" width={16} height={16}>
        <path d="M7 13s0-4 3-4 3 4 3 4" />
        <circle cx="10" cy="7" r="2" />
        <path d="M3 17c0-2 1.5-4 4-4M17 17c0-2-1.5-4-4-4" />
      </svg>
    ),
  },
];

const TABS = ["Engagement Priorities", "Reporting Expectations", "ESG & Proxy Voting"];

type CardData = (typeof CARDS)[number];

function EngagementCard({ card }: { card: CardData }) {
  const [open, setOpen] = useState(false);
  const { label, pct, color, bg, border, text, desc, investors, Icon } = card;

  return (
    <div
      style={{
        background: "#fff",
        border: `0.5px solid ${open ? border : "#e2e8f0"}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color .15s",
      }}
      className="shadow-sm"
    >
      {/* Top clickable area */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ padding: "14px 16px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
          {/* Icon */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon />
          </div>
          {/* Label */}
          <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: "#0f172a", lineHeight: 1.3, paddingTop: 2 }}>
            {label}
          </div>
          {/* Percentage */}
          <div style={{ fontSize: 13, fontWeight: 500, color, flexShrink: 0, paddingTop: 2 }}>
            {pct}%
          </div>
        </div>
        {/* Description */}
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, paddingLeft: 40 }}>
          {desc}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#f1f5f9", margin: "0 16px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width .6s" }} />
      </div>

      {/* Divider */}
      <div style={{ height: "0.5px", background: "#f1f5f9", margin: "10px 16px 0" }} />

      {/* Investors toggle */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 16px",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Investors ({investors.length})
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          width={14}
          height={14}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}
        >
          <path d="M5 7.5l5 5 5-5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Expanded investor pills */}
      {open && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {investors.map((investorName) => (
            <span
              key={investorName}
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                borderRadius: 20,
                padding: "3px 10px",
                background: bg,
                color: text,
                border: `0.5px solid ${border}`,
              }}
            >
              {investorName}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 1. Defined the props expected from index.tsx
interface EngagementPrioritiesProps {
  name?: string | null;
  onLoaded?: () => void;
  sources?: { id: number; name: string; year?: string }[];
}

// 2. Applied the props to the main component
const EngagementPriorities: React.FC<EngagementPrioritiesProps> = ({ name, onLoaded, sources }) => {
  const [activeTab, setActiveTab] = useState(0);

  // 2. ADD THIS PARSING LOGIC RIGHT HERE
  let parsedSources: { id: number; name: string; year?: string | number }[] = [];
  if (typeof sources === 'string') {
      try {
          parsedSources = JSON.parse(sources);
      } catch (e) {
          parsedSources = [];
      }
  } else if (Array.isArray(sources)) {
      parsedSources = sources;
  }

  // 3. Keep your existing useEffect
  useEffect(() => {
    if (onLoaded) {
      onLoaded();
    }
  }, [onLoaded]);
  console.log("DEBUG SOURCES:", parsedSources);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px 0", background: "transparent" }}>

      {/* Section title */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div
          style={{
            width: 22,
            height: 22,
            background: "#f97316",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 20 20" fill="none" width={12} height={12}>
            <path d="M4 10l4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
          Key Takeaways — What Investors Care About Most
        </span>
      </div>

      {/* 2-column card grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 16,
        }}
      >
       
      
      {parsedSources && parsedSources.length > 0 && (
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", margin: 0 }}>
            Profile updated based on the release of{" "}
            <span style={{ fontWeight: 600, color: "#0f172a" }}>
              {parsedSources.map((s: any) => {
                  // If it's a string, render it directly
                  if (typeof s === 'string') return s;
                  // If it's an object, check all possible keys for the name
                  return s.name || s.document_name || s.title || "Unknown Document";
              }).join(", ")}
            </span>
          </p>
        </div>
      )}
        {CARDS.map((card) => (
          <EngagementCard key={card.label} card={card} />
        ))}
      </div>
    </div>
  );
};

export default EngagementPriorities;