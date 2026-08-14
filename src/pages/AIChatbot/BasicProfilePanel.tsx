import React, { useState } from "react";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";

const THEME_MAROON = "#8b1828";

// ─── Local helpers — deliberately duplicated rather than imported, so this
// panel has zero coupling to InvestorCard/ActivistDashboard internals. ───────

const formatLargeUSD = (value: any) => {
  if (!value) return "N/A";
  const numValue = Number(value);
  if (!Number.isFinite(numValue)) return "N/A";
  if (numValue >= 1e9) return `$${(numValue / 1e9).toFixed(2)}B`;
  if (numValue >= 1e6) return `$${(numValue / 1e6).toFixed(0)}M`;
  return `$${numValue.toLocaleString()}`;
};

const formatUSDThousands = (thousands: any) => {
  if (!thousands) return "N/A";
  return formatLargeUSD(Number(thousands) * 1000);
};

const formatDate = (value: any) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const getDomain = (url: any): string | null => {
  if (typeof url !== "string" || !url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

// Recreates InvestorCard's renderFormattedStrategy independently (see
// src/components/InvestorCard/index.tsx renderFormattedStrategy) — not
// imported, per instructions to keep this panel fully standalone.
const renderFormattedText = (text: string | null | undefined) => {
  if (!text) return null;
  const normalized = text.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  return normalized.split("\n").map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("-")) {
      return (
        <li key={index} className="ml-4 mb-1 list-disc text-slate-700">
          {trimmed.substring(1).trim()}
        </li>
      );
    }
    return (
      <p key={index} className="mb-2 text-slate-700 last:mb-0">
        {trimmed}
      </p>
    );
  });
};

const Badge = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-slate-100 border border-slate-200 px-3 py-1">
    <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
    <div className="text-sm font-bold text-slate-800 mt-1">{value}</div>
  </div>
);

// ─── Per-section "unavailable" fallback ──────────────────────────────────────

const UnavailableNotice = ({ label, error }: { label: string; error?: string | null }) => (
  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-md flex items-start gap-3">
    <Lucide icon="AlertCircle" className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
    <div>
      <p className="text-sm font-semibold text-slate-600">{label} unavailable</p>
      {error && <p className="text-xs text-slate-500 mt-1">{error}</p>}
    </div>
  </div>
);

const SectionCard = ({
  title,
  icon,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm">
      <div
        className={`flex items-center gap-2 px-6 pt-6 ${showBody ? "pb-3" : "pb-6"} ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <Lucide icon={icon as any} className="w-5 h-5 text-red-800" />
        <h3 className="text-base font-bold text-slate-800 flex-1">{title}</h3>
        {collapsible && (
          <Lucide
            icon="ChevronDown"
            className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>
      {showBody && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
};

// Company website / LinkedIn / etc. — same external-link-list visual pattern
// as the 13D/13G and Shareholder Letters lists below, embedded inline under
// the WhaleWisdom summary rather than as its own SectionCard.
const FirmLinksList = ({ links }: { links: any[] }) => {
  if (!Array.isArray(links) || links.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <h4 className="text-sm font-bold text-slate-800 mb-3">Company Links</h4>
      <ul className="p-0 m-0 list-none flex flex-col gap-3">
        {links.map((link: any, i: number) => {
          const url = link?.url || link?.link;
          const domain = getDomain(url);
          const label = link?.label || link?.title || link?.name || link?.type || domain || "Link";
          return (
            <li key={i} className="flex items-start">
              <span className="text-red-800 mr-2 text-base leading-none">▸</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-600 m-0 leading-relaxed">
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 no-underline font-medium hover:underline">
                      {label}
                    </a>
                  ) : (
                    <span className="font-medium">{label}</span>
                  )}
                </p>
                {domain && <p className="text-xs text-slate-400 m-0 mt-1">{domain}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// Simple bulleted sub-section for owners / known_email_addresses — only
// rendered when the array actually has entries (empty is expected, not an
// error, so it renders nothing at all rather than a placeholder).
const BulletList = ({ heading, items }: { heading: string; items: any[] }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="mt-4">
      <h4 className="text-sm font-bold text-slate-800 mb-2">{heading}</h4>
      <ul className="pl-5 m-0 list-disc text-slate-700 text-sm flex flex-col gap-1">
        {items.map((item: any, i: number) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

// ─── Sections ─────────────────────────────────────────────────────────────

const OverviewSection = ({ section }: { section: any }) => {
  const [showBrochure, setShowBrochure] = useState(false);

  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Investor Overview" icon="Globe">
        <UnavailableNotice label="Investor overview" error={section?.error} />
      </SectionCard>
    );
  }

  const bodyText = section.ai_enriched_summary || section.summary;

  return (
    <SectionCard title="Investor Overview " icon="Globe">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {section.region && <Badge label="Region" value={section.region} />}
        {section.proxy_influence && <Badge label="Proxy Influence" value={section.proxy_influence} />}
        {/* {section.sec_number && <Badge label="SEC #" value={section.sec_number} />} */}
      </div>

      <div className="text-slate-600 text-base leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100">
        {renderFormattedText(bodyText) || <p className="text-slate-500 m-0">No overview text available.</p>}
      </div>

      {/* investment_strategy is a genuinely separate field from summary
          (not an alternate phrasing of it) — its own labeled sub-section. */}
      {section.investment_strategy && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-slate-800 mb-2">Investment Strategy</h4>
          <div className="text-slate-600 text-sm leading-relaxed">
            {renderFormattedText(section.investment_strategy)}
          </div>
        </div>
      )}

      <BulletList heading="Owners" items={section.owners} />
      <BulletList heading="Known Email Addresses" items={section.known_email_addresses} />

      <FirmLinksList links={section.firm_links} />

      {section.source_url && (
        <a
          href={section.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-sm font-semibold text-blue-700 underline"
        >
          View on WhaleWisdom
        </a>
      )}

      {section.adv_brochure_url && (
        <div className="border-t border-slate-100 mt-4 -mx-6 px-6">
          <div
            onClick={() => setShowBrochure((v) => !v)}
            className="flex items-center justify-between py-4 cursor-pointer hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-2">
              <Lucide icon="FileText" className="w-5 h-5 text-red-800" />
              <h4 className="text-sm font-bold text-slate-800">SEC Form ADV Part 2 Brochure</h4>
            </div>
            <Lucide
              icon="ChevronDown"
              className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${showBrochure ? "rotate-180" : ""}`}
            />
          </div>
          {showBrochure && (
            <div className="pb-4">
              <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-100 shadow-inner">
                <iframe src={section.adv_brochure_url} width="100%" height="600px" title="SEC Brochure PDF" className="w-full" />
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
};

const HoldingsSection = ({ section }: { section: any }) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Current 13F Holdings" icon="Briefcase">
        <UnavailableNotice label="13F holdings" error={section?.error} />
      </SectionCard>
    );
  }

  const holdings = Array.isArray(section.top_holdings) ? section.top_holdings : [];

  return (
    <SectionCard title="Current 13F Holdings" icon="Briefcase">
      <div className="flex flex-wrap gap-6 mb-4 text-sm">
        {section.filing_date && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Filing Date</p>
            <p className="font-semibold text-slate-800">{section.filing_date}</p>
          </div>
        )}
        {section.report_period_end && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Period End</p>
            <p className="font-semibold text-slate-800">{section.report_period_end}</p>
          </div>
        )}
        {!!section.reported_13f_portfolio_value_usd && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Portfolio Value</p>
            <p className="font-semibold text-slate-800">{formatLargeUSD(section.reported_13f_portfolio_value_usd)}</p>
          </div>
        )}
      </div>

      {holdings.length > 0 ? (
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-medium">Issuer</th>
                <th className="px-3 py-2 font-medium">Ticker</th>
                <th className="px-3 py-2 font-medium text-right">Shares</th>
                <th className="px-3 py-2 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h: any, i: number) => {
                const sharesRaw = h.shares_or_principal;
                const sharesDisplay =
                  typeof sharesRaw === "number"
                    ? sharesRaw.toLocaleString()
                    : sharesRaw
                    ? String(sharesRaw).replace(/\s*shares/gi, "")
                    : "N/A";
                return (
                  <tr key={`${h.issuer}-${i}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {h.issuer}
                      {h.note && (
                        <Tippy content={h.note}>
                          <span className="ml-1 text-slate-400 cursor-help">ⓘ</span>
                        </Tippy>
                      )}
                    </td>
                    <td className="px-3 py-2 text-red-800 font-medium">{h.ticker_or_symbol || "—"}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{sharesDisplay}</td>
                    <td className="px-3 py-2 text-slate-900 font-medium text-right">{formatUSDThousands(h.value_usd_thousands)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500 m-0">No holdings reported in this filing.</p>
      )}

      {section.sec_filing_url && (
        <a
          href={section.sec_filing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-sm font-semibold text-blue-700 underline"
        >
          View SEC Form 13F-HR filing
        </a>
      )}
    </SectionCard>
  );
};

const Filings13DGSection = ({ section }: { section: any }) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="13D/13G Filings" icon="FileText">
        <UnavailableNotice label="13D/13G filings" error={section?.error} />
      </SectionCard>
    );
  }

  const filings = Array.isArray(section.filings) ? section.filings : [];

  return (
    <SectionCard title="13D/13G Filings" icon="FileText" collapsible defaultOpen={false}>
      {filings.length > 0 ? (
        <ul className="p-0 m-0 list-none flex flex-col gap-4">
          {filings.map((f: any, i: number) => (
            <li key={i} className="flex items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <span className="text-red-800 mr-2 text-base leading-none">▸</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-600 m-0 leading-relaxed">
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 no-underline font-medium hover:underline">
                      {f.form || "Filing"}
                    </a>
                  ) : (
                    <span className="font-medium">{f.form || "Filing"}</span>
                  )}
                  {Array.isArray(f.entities) && f.entities.length > 0 && ` — ${f.entities.join("; ")}`}
                </p>
                <p className="text-xs text-slate-400 m-0 mt-1">
                  {[f.filing_date, f.accession].filter(Boolean).join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 m-0">No 13D/13G filings found.</p>
      )}
    </SectionCard>
  );
};

const ShareholderLettersSection = ({ section }: { section: any }) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Shareholder Letters" icon="Mail">
        <UnavailableNotice label="Shareholder letters" error={section?.error} />
      </SectionCard>
    );
  }

  const results = Array.isArray(section.results) ? section.results : [];

  return (
    <SectionCard title="Shareholder Letters" icon="Mail">
      {results.length > 0 ? (
        <ul className="p-0 m-0 list-none flex flex-col gap-4">
          {results.map((r: any, i: number) => (
            <li key={i} className="flex items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <span className="text-red-800 mr-2 text-base leading-none">▸</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-600 m-0 leading-relaxed">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 no-underline font-medium hover:underline">
                      {r.title || "Untitled letter"}
                    </a>
                  ) : (
                    <span className="font-medium">{r.title || "Untitled letter"}</span>
                  )}
                </p>
                {r.snippet && <p className="text-xs text-slate-600 m-0 mt-1 leading-relaxed">{r.snippet}</p>}
                <p className="text-xs text-slate-400 m-0 mt-1">
                  {[r.source, formatDate(r.published_date)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 m-0">No shareholder letters found.</p>
      )}
    </SectionCard>
  );
};

// ─── Panel ────────────────────────────────────────────────────────────────

export interface BasicProfileData {
  status: "success" | "partial";
  slug: string;
  investor_name: string;
  generated_at: string;
  sections: {
    whalewisdom_overview?: any;
    current_13f_holdings?: any;
    sec_13d_13g_filings?: any;
    shareholder_letters_web?: any;
  };
}

const BasicProfilePanel = ({
  data,
  loading,
  error,
}: {
  data: BasicProfileData | null;
  loading: boolean;
  error: string | null;
}) => {
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div
          className="w-10 h-10 rounded-full border-4 border-slate-200 animate-spin"
          style={{ borderTopColor: THEME_MAROON }}
        />
        <p className="text-slate-500 mt-4 text-sm">Generating basic profile…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate-500">No basic profile available yet.</p>;
  }

  const sections = data.sections || {};

  return (
    <div className="flex flex-col gap-5">
      {data.status === "partial" && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          <Lucide icon="AlertTriangle" className="w-4 h-4 shrink-0" />
          Some sections of this profile could not be retrieved.
        </div>
      )}

      <div>
        <p className="text-xs text-slate-500">
          Last updated: {formatDate(data.generated_at) || "—"}
          {loading && <span className="ml-2 text-slate-400">(refreshing…)</span>}
        </p>
      </div>

      <OverviewSection section={sections.whalewisdom_overview} />
      <HoldingsSection section={sections.current_13f_holdings} />
      <Filings13DGSection section={sections.sec_13d_13g_filings} />
      <ShareholderLettersSection section={sections.shareholder_letters_web} />
    </div>
  );
};

export default BasicProfilePanel;
