import React, { useState } from "react";
import Lucide from "@/components/Base/Lucide";
import ActivistFilingsTable from "@/pages/AIChatbot/ActivistFilingsTable";

const THEME_MAROON = "#8b1828";

// ─── Local helpers — deliberately duplicated rather than imported, so this
// panel has zero coupling to InvestorCard/ActivistDashboard internals. ───────

// SEC figures are US dollars and must group US-style. Left to the browser's
// default locale, an en-IN machine renders 266000 as "2,66,000" (lakh/crore
// grouping), so the locale is pinned rather than inherited.
const NUMBER_LOCALE = "en-US";

const formatLargeUSD = (value: any) => {
  if (!value) return "N/A";
  const numValue = Number(value);
  if (!Number.isFinite(numValue)) return "N/A";
  if (numValue >= 1e9) return `$${(numValue / 1e9).toFixed(2)}B`;
  if (numValue >= 1e6) return `$${(numValue / 1e6).toFixed(0)}M`;
  if (numValue >= 1e3) return `$${(numValue / 1e3).toFixed(0)}K`;
  return `$${numValue.toLocaleString(NUMBER_LOCALE)}`;
};

const formatUSDThousands = (thousands: any) => {
  if (!thousands) return "N/A";
  return formatLargeUSD(Number(thousands) * 1000);
};

// h.note on a 13F holding is a full sentence, e.g. "INDUSTRIALS /
// CONSTRUCTION & ENGINEERING; 23.34% of reported 13F portfolio." — the
// percent-of-portfolio figure is embedded in there, not the whole string.
// Pull just the number out (dynamically, per row) rather than displaying
// the sentence or naively appending a "%".
const formatPortfolioPercent = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return `${value.toFixed(2)}%`;
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? `${match[1]}%` : "—";
};

const formatDate = (value: any) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const ABBREVIATIONS = /\b(?:[A-Z]|U\.S|Inc|Corp|Ltd|L\.P|LLC|Co|St|Mr|Mrs|Ms|Dr|vs|etc)\.$/;

// Re-merges any split that landed right after a known abbreviation (so
// "U.S. public companies" or "...with Mr. Ferguson..." stays one sentence),
// regardless of which splitter produced the raw parts. Both branches of
// splitIntoSentences below call this instead of each doing their own
// re-merge pass, so they can't drift apart on abbreviation handling again —
// the Intl.Segmenter branch used to skip this entirely, which is exactly
// what let "...with Mr." / "Ferguson also managing..." split in two.
const mergeAbbreviationSplits = (parts: string[]): string[] => {
  const sentences: string[] = [];
  for (const part of parts) {
    const prev = sentences[sentences.length - 1];
    if (prev && ABBREVIATIONS.test(prev)) {
      sentences[sentences.length - 1] = `${prev} ${part}`;
    } else {
      sentences.push(part);
    }
  }
  return sentences.map((s) => s.trim()).filter(Boolean);
};

const splitIntoSentences = (text: string): string[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (typeof Intl !== "undefined" && typeof (Intl as any).Segmenter === "function") {
    const segmenter = new (Intl as any).Segmenter("en", { granularity: "sentence" });
    const rawParts: string[] = [];
    for (const { segment } of segmenter.segment(trimmed)) {
      const s = String(segment).trim();
      if (s) rawParts.push(s);
    }
    return mergeAbbreviationSplits(rawParts);
  }

  // Fallback: split after ./!/? + whitespace when followed by a capital
  // letter or opening paren, then re-merge via the same abbreviation pass
  // as the Intl.Segmenter branch above.
  const parts = trimmed.split(/(?<=[.!?])\s+(?=[A-Z(])/);
  return mergeAbbreviationSplits(parts);
};

// Groups sentences into 2-3 bullets of roughly-equal character length. Very
// short text (1-2 sentences total) is left as a single bullet rather than
// forcing an artificial split, so we never create empty/near-empty bullets.
const groupSentencesIntoBullets = (sentences: string[]): string[] => {
  if (sentences.length <= 2) {
    return sentences.length ? [sentences.join(" ")] : [];
  }

  const targetBulletCount = sentences.length >= 5 ? 3 : 2;
  const totalLength = sentences.reduce((sum, s) => sum + s.length, 0);
  const targetLength = totalLength / targetBulletCount;

  const bullets: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  sentences.forEach((sentence, i) => {
    current.push(sentence);
    currentLength += sentence.length;

    const isLast = i === sentences.length - 1;
    const remainingBulletsToFill = targetBulletCount - bullets.length - 1;
    const remainingSentences = sentences.length - (i + 1);

    // Close out the current bullet once it has reached its target share of
    // the text — but only if enough sentences remain to fill the rest of
    // the target bullets (otherwise keep accumulating into this one).
    if (!isLast && remainingBulletsToFill > 0 && remainingSentences >= remainingBulletsToFill && currentLength >= targetLength) {
      bullets.push(current.join(" "));
      current = [];
      currentLength = 0;
    }
  });

  if (current.length) bullets.push(current.join(" "));
  return bullets;
};
const renderTextAsBullets = (text: string | null | undefined) => {
  if (!text) return null;
  const normalized = text
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;

  const sentences = splitIntoSentences(normalized);
  if (sentences.length === 0) return null;

  const bullets = groupSentencesIntoBullets(sentences);
  if (bullets.length <= 1) {
    return <p className="m-0 text-slate-700">{bullets[0] ?? normalized}</p>;
  }

  return (
    <ul className="pl-5 m-0 list-disc text-slate-700 flex flex-col gap-2">
      {bullets.map((bullet, i) => (
        <li key={i}>{bullet}</li>
      ))}
    </ul>
  );
};

const Badge = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-slate-100 border border-slate-200 px-3 py-1">
    <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
    <div className="text-sm font-bold text-slate-800 mt-1">{value}</div>
  </div>
);

// ─── Per-section "unavailable" fallback ──────────────────────────────────────

// `message` overrides the default "<label> unavailable" wording for sections
// where an empty result is a plain fact rather than a failure to report.
const UnavailableNotice = ({
  label,
  error,
  message,
}: {
  label: string;
  error?: string | null;
  message?: string;
}) => (
  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-md flex items-start gap-3">
    <Lucide icon="AlertCircle" className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
    <div>
      <p className="text-sm font-semibold text-slate-600">{message || `${label} unavailable`}</p>
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

// Company website / LinkedIn / etc. — a collapsible list of the raw URLs, one
// per row, embedded inline under the WhaleWisdom summary rather than as its
// own SectionCard. The anchor text is the full URL rather than a title, so
// the destination is visible without hovering; the same URL arriving twice
// from the API collapses into a single row.
const RelevantLinksList = ({ links }: { links: any[] }) => {
  const [open, setOpen] = useState(true);

  if (!Array.isArray(links) || links.length === 0) return null;

  const urls: string[] = [];
  links.forEach((link: any) => {
    const raw = link?.url || link?.link;
    const url = typeof raw === "string" ? raw.trim() : "";
    if (url && !urls.includes(url)) urls.push(url);
  });
  if (urls.length === 0) return null;

  return (
    <div className="border-t border-slate-100 mt-4 -mx-6 px-6">
      <div
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between py-4 cursor-pointer hover:bg-slate-50 transition-all"
      >
        <div className="flex items-center gap-2">
          <Lucide icon="Link" className="w-5 h-5 text-red-800" />
          <h4 className="text-sm font-bold text-slate-800">Relevant Links</h4>
        </div>
        <Lucide
          icon="ChevronDown"
          className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <ul className="p-0 m-0 pb-4 list-none flex flex-col gap-2">
          {urls.map((url: string, i: number) => (
            <li key={i} className="flex items-start">
              <span className="text-red-800 mr-2 text-base leading-none">▸</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 text-sm text-blue-700 no-underline font-medium hover:underline break-all leading-relaxed"
              >
                {url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Simple bulleted sub-section for owners / known_email_addresses — only
// rendered when the array actually has entries (empty is expected, not an
// error, so it renders nothing at all rather than a placeholder).
// `boxed` matches Overview's text-base + bg-slate-50 card treatment (used
// for Owners, per instructions); Known Email Addresses stays the plain,
// smaller default.
const BulletList = ({ heading, items, boxed = false }: { heading: string; items: any[]; boxed?: boolean }) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  const list = (
    <ul className={`pl-5 m-0 list-disc text-slate-700 flex flex-col gap-1 ${boxed ? "text-base" : "text-sm"}`}>
      {items.map((item: any, i: number) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );

  return (
    <div className="mt-4">
      <h4 className="text-sm font-bold text-slate-800 mb-2">{heading}</h4>
      {boxed ? (
        <div className="bg-slate-50 p-4 rounded-md border border-slate-100">{list}</div>
      ) : (
        list
      )}
    </div>
  );
};

// ─── Sections ─────────────────────────────────────────────────────────────

const OverviewSection = ({
  section,
  isEditMode,
  onChange,
}: {
  section: any;
  isEditMode: boolean;
  onChange: (updated: any) => void;
}) => {
  const [showBrochure, setShowBrochure] = useState(false);

  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Investor Overview" icon="Globe">
        <UnavailableNotice label="Investor overview" error={section?.error} />
      </SectionCard>
    );
  }

  const bodyText = section.ai_enriched_summary || section.summary;
  // Edit whichever field actually holds the text — ai_enriched_summary when
  // present, otherwise the plain summary — same precedence as bodyText above.
  const summaryField = section.ai_enriched_summary != null ? "ai_enriched_summary" : "summary";
  const summaryValue = section[summaryField] ?? "";

  return (
    <SectionCard title="Investor Overview" icon="Globe" collapsible>
      {/* Region and CIK badges removed — the region is already stated in the
          overview text below, and the CIK number is not something this view
          needs to lead with. The row only renders now when a profile actually
          carries a proxy-influence rating. */}
      {section.proxy_influence && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Badge label="Proxy Influence" value={section.proxy_influence} />
        </div>
      )}

      {isEditMode ? (
        <textarea
          value={summaryValue}
          onChange={(e) => onChange({ ...section, [summaryField]: e.target.value })}
          rows={7}
          placeholder="Investor overview text…"
          className="w-full text-base leading-relaxed text-slate-700 bg-white p-4 rounded-md border border-slate-300 focus:border-red-800 focus:outline-none resize-y"
        />
      ) : (
        <div className="text-slate-600 text-base leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100">
          {renderTextAsBullets(bodyText) || <p className="text-slate-500 m-0">No overview text available.</p>}
        </div>
      )}

      {/* investment_strategy is a genuinely separate field from summary
          (not an alternate phrasing of it) — its own labeled sub-section.
          Same text-base + boxed-card treatment as the Overview paragraph
          above, so both read as one consistent visual unit rather than
          Overview looking like a card and this floating below it as plain text. */}
      {isEditMode ? (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-slate-800 mb-2">Investment Strategy</h4>
          <textarea
            value={section.investment_strategy || ""}
            onChange={(e) => onChange({ ...section, investment_strategy: e.target.value })}
            rows={5}
            placeholder="Investment strategy…"
            className="w-full text-base leading-relaxed text-slate-700 bg-white p-4 rounded-md border border-slate-300 focus:border-red-800 focus:outline-none resize-y"
          />
        </div>
      ) : (
        section.investment_strategy && (
          <div className="mt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-2">Investment Strategy</h4>
            <div className="text-slate-600 text-base leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100">
              {renderTextAsBullets(section.investment_strategy)}
            </div>
          </div>
        )
      )}

      {isEditMode && Array.isArray(section.owners) && section.owners.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-slate-800 mb-2">Owners</h4>
          <div className="bg-slate-50 p-4 rounded-md border border-slate-100 flex flex-col gap-2">
            {section.owners.map((owner: any, i: number) => (
              <input
                key={i}
                type="text"
                value={owner || ""}
                onChange={(e) => {
                  const updated = section.owners.map((o: any, oi: number) => (oi === i ? e.target.value : o));
                  onChange({ ...section, owners: updated });
                }}
                className="w-full text-sm text-slate-800 border border-slate-300 rounded px-2 py-1.5 bg-white focus:border-red-800 focus:outline-none"
              />
            ))}
          </div>
        </div>
      ) : (
        <BulletList heading="Owners" items={section.owners} boxed />
      )}
      <BulletList heading="Known Email Addresses" items={section.known_email_addresses} />

      <RelevantLinksList links={section.firm_links} />


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

const editableCellInputClass =
  "w-full text-xs text-slate-900 border border-slate-300 rounded px-1.5 py-1 focus:border-red-800 focus:outline-none bg-white";

const HoldingsSection = ({
  section,
  isEditMode,
  onChange,
}: {
  section: any;
  isEditMode: boolean;
  onChange: (updated: any) => void;
}) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Current 13F Holdings" icon="Briefcase">
        <UnavailableNotice label="13F holdings" error={section?.error} />
      </SectionCard>
    );
  }

  const holdings = Array.isArray(section.top_holdings) ? section.top_holdings : [];

  const updateHolding = (index: number, field: string, value: string) => {
    const updated = holdings.map((h: any, i: number) => (i === index ? { ...h, [field]: value } : h));
    onChange({ ...section, top_holdings: updated });
  };

  return (
    <SectionCard title="Current 13F Holdings" icon="Briefcase" collapsible defaultOpen={false}>
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
              <tr className="bg-red-50 border-b border-red-100 text-xs uppercase tracking-wide text-red-800">
                <th className="px-3 py-2 font-bold">Issuer</th>
                <th className="px-3 py-2 font-bold">Ticker</th>
                <th className="px-3 py-2 font-bold text-right">
                  % Portfolio<sup className="text-red-600 ml-0.5">*</sup>
                </th>
                <th className="px-3 py-2 font-bold text-right">Shares</th>
                <th className="px-3 py-2 font-bold text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h: any, i: number) => {
                const sharesRaw = h.shares_or_principal;
                const sharesDisplay =
                  typeof sharesRaw === "number"
                    ? sharesRaw.toLocaleString(NUMBER_LOCALE)
                    : sharesRaw
                    ? String(sharesRaw).replace(/\s*shares/gi, "")
                    : "N/A";
                return (
                  <tr key={`${h.issuer}-${i}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {isEditMode ? (
                        <input type="text" value={h.issuer || ""} onChange={(e) => updateHolding(i, "issuer", e.target.value)} className={editableCellInputClass} />
                      ) : (
                        h.issuer
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-800 font-medium">
                      {isEditMode ? (
                        <input type="text" value={h.ticker_or_symbol || ""} onChange={(e) => updateHolding(i, "ticker_or_symbol", e.target.value)} className={editableCellInputClass} />
                      ) : (
                        h.ticker_or_symbol || "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-right">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={h.note || ""}
                          onChange={(e) => updateHolding(i, "note", e.target.value)}
                          placeholder="e.g. 23.34% of reported 13F portfolio"
                          className={`${editableCellInputClass} text-right`}
                        />
                      ) : (
                        formatPortfolioPercent(h.note)
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-right">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={h.shares_or_principal ?? ""}
                          onChange={(e) => updateHolding(i, "shares_or_principal", e.target.value)}
                          className={`${editableCellInputClass} text-right`}
                        />
                      ) : (
                        sharesDisplay
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-900 font-medium text-right">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={h.value_usd_thousands ?? ""}
                          onChange={(e) => updateHolding(i, "value_usd_thousands", e.target.value)}
                          className={`${editableCellInputClass} text-right`}
                        />
                      ) : (
                        formatUSDThousands(h.value_usd_thousands)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500 m-0">No holdings reported in this filing.</p>
      )}

      {/* Defines the "*" on the % Portfolio column header. */}
      {holdings.length > 0 && (
        <p className="text-xs text-slate-500 mt-2 m-0">
          <span className="text-red-600">*</span> ZMH Calculation
        </p>
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

// "Form & File" mirrors EDGAR's own full-text-search results table
// (https://www.sec.gov/edgar/search/) — form type stacked over the SEC
// file number, e.g. "SC 13D/A" / "005-82940".
const editableLabelInputClass =
  "mt-1 w-full text-sm text-slate-800 border border-slate-300 rounded px-2 py-1.5 focus:border-red-800 focus:outline-none bg-white";

const ActivistFilingsSection = ({
  section,
  isEditMode,
  onChange,
}: {
  section: any;
  isEditMode: boolean;
  onChange: (updated: any) => void;
}) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Activist Filings (13D & Proxy Contests)" icon="FileText">
        <UnavailableNotice label="Activist filings" message="None" error={section?.error} />
      </SectionCard>
    );
  }

  const filings = Array.isArray(section.filings) ? section.filings : [];

  const updateFiling = (index: number, field: string, value: string) => {
    const updated = filings.map((f: any, i: number) => (i === index ? { ...f, [field]: value } : f));
    onChange({ ...section, filings: updated });
  };

  return (
    <SectionCard title="Activist Filings (13D & Proxy Contests)" icon="FileText" collapsible defaultOpen={false}>
      {isEditMode ? (
        filings.length > 0 ? (
          <div className="flex flex-col gap-3">
            {/* form, filing_date, accession, and url are verifiable SEC facts,
                not something to hand-correct — shown read-only for context. */}
            {filings.map((f: any, i: number) => (
              <div key={f.accession || i} className="border border-slate-200 rounded-md p-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{f.form || "Filing"}</span>
                  <span>{f.filing_date || "—"}</span>
                  {f.accession && <span>{f.accession}</span>}
                  {f.url && (
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 no-underline font-medium hover:underline">
                      View filing
                    </a>
                  )}
                </div>
                <label className="text-xs font-semibold text-slate-600">
                  Reporting For
                  <input
                    type="text"
                    value={f.reporting_for || ""}
                    onChange={(e) => updateFiling(i, "reporting_for", e.target.value)}
                    className={editableLabelInputClass}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Filing Entity / Person
                  <input
                    type="text"
                    value={f.filing_entity_person || ""}
                    onChange={(e) => updateFiling(i, "filing_entity_person", e.target.value)}
                    className={editableLabelInputClass}
                  />
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 m-0">No activist filings found in the last 5 years.</p>
        )
      ) : (
        <ActivistFilingsTable filings={filings} variant="tailwind" />
      )}
    </SectionCard>
  );
};

// The API now populates `published_date` on shareholder-letter results when
// the source page/PDF actually states one, so that field wins first. When
// it's absent or unparseable (an older/unfetched result), this falls back to
// scanning the snippet/title text itself for a dateline -- PRNewswire-style
// month-day-year ("NEW YORK, March 25, 2022 /PRNewswire/", "Aug. 14, 2026",
// "May 05, 2023, 08:00 ET") and day-month-year ("30 Apr, 2025",
// "14 Aug 2026") order, full or abbreviated (with-or-without a trailing
// period) month names -- mirrors basic_profile.py's own _LETTER_DATE_RE on
// the backend so the two stay in agreement on what counts as a real date.
//
// Only a full month-day-year (or day-month-year) counts. A bare "December
// 2021" is almost always prose about a holding period ("has been a
// stockholder since December 2021"), not a publish date, and sorting on it
// would place rows confidently wrong.
const MONTH_FULL =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const MONTH_ABBR = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";
const MONTH_TOKEN = `(?:${MONTH_FULL}|${MONTH_ABBR})\\.?`;
// Comma between day and year is optional in both orders -- "May 05, 2023"
// and "May 05 2023" should both count.
const TEXT_DATE_MDY_RE = new RegExp(`\\b(${MONTH_TOKEN})\\s+(\\d{1,2}),?\\s*(\\d{4})\\b`, "i");
const TEXT_DATE_DMY_RE = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_TOKEN})\\s*,?\\s*(\\d{4})\\b`, "i");
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;

const getLetterDate = (r: any): Date | null => {
  if (r?.published_date) {
    const d = new Date(r.published_date);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const text = `${r?.snippet || ""} ${r?.title || ""}`;

  const iso = text.match(ISO_DATE_RE);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const mdy = text.match(TEXT_DATE_MDY_RE);
  if (mdy) {
    const d = new Date(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dmy = text.match(TEXT_DATE_DMY_RE);
  if (dmy) {
    const d = new Date(`${dmy[2]} ${dmy[1]}, ${dmy[3]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
};

const ShareholderLettersSection = ({
  section,
  isEditMode,
  onChange,
}: {
  section: any;
  isEditMode: boolean;
  onChange: (updated: any) => void;
}) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Shareholder Letters" icon="Mail">
        <UnavailableNotice label="Shareholder letters" error={section?.error} />
      </SectionCard>
    );
  }

  const rawResults = Array.isArray(section.results) ? section.results : [];

  // Newest first. Letters we could not date keep their original API order and
  // sink below the dated ones, so an undated result never masquerades as recent.
  const sortedResults = rawResults
    .map((r: any, i: number) => ({ r, i, time: getLetterDate(r)?.getTime() ?? null }))
    .sort((a, b) => {
      if (a.time === null || b.time === null) {
        if (a.time === b.time) return a.i - b.i;
        return a.time === null ? 1 : -1;
      }
      return b.time - a.time;
    });

  const updateLetter = (index: number, field: string, value: string) => {
    const updated = rawResults.map((r: any, i: number) => (i === index ? { ...r, [field]: value } : r));
    onChange({ ...section, results: updated });
  };

  return (
    <SectionCard title="Shareholder Letters" icon="Mail" collapsible defaultOpen={false}>
      {isEditMode ? (
        rawResults.length > 0 ? (
          <div className="flex flex-col gap-3">
            {/* url is a verifiable source link, not something to hand-correct
                — shown read-only for context. */}
            {rawResults.map((r: any, i: number) => (
              <div key={i} className="border border-slate-200 rounded-md p-3 flex flex-col gap-2">
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 no-underline font-medium hover:underline break-all">
                    {r.url}
                  </a>
                )}
                <label className="text-xs font-semibold text-slate-600">
                  Title
                  <input type="text" value={r.title || ""} onChange={(e) => updateLetter(i, "title", e.target.value)} className={editableLabelInputClass} />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Source
                  <input type="text" value={r.source || ""} onChange={(e) => updateLetter(i, "source", e.target.value)} className={editableLabelInputClass} />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Snippet
                  <textarea
                    value={r.snippet || ""}
                    onChange={(e) => updateLetter(i, "snippet", e.target.value)}
                    rows={3}
                    className={`${editableLabelInputClass} resize-y`}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Published Date
                  <input
                    type="text"
                    value={r.published_date || ""}
                    onChange={(e) => updateLetter(i, "published_date", e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className={editableLabelInputClass}
                  />
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 m-0">No shareholder letters found.</p>
        )
      ) : sortedResults.length > 0 ? (
        <ul className="p-0 m-0 list-none flex flex-col gap-4">
          {sortedResults.map(({ r, time }, i: number) => (
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
                {/* Title + date only. The snippet is still read by
                    getLetterDate() above to derive that date — it just isn't
                    rendered any more. */}
                {time !== null && (
                  <p className="text-xs text-slate-400 m-0 mt-1">{formatDate(time)}</p>
                )}
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
    activist_filings?: any;
    shareholder_letters_web?: any;
  };
}

const BasicProfilePanel = ({
  data,
  loading,
  error,
  isEditMode,
  onChange,
}: {
  data: BasicProfileData | null;
  loading: boolean;
  error: string | null;
  isEditMode: boolean;
  onChange: (updated: BasicProfileData) => void;
}) => {
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div
          className="w-10 h-10 rounded-full border-4 border-slate-200 animate-spin"
          style={{ borderTopColor: THEME_MAROON }}
        />
        <p className="text-slate-500 mt-4 text-sm">Generating Condensed profile…</p>
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
    return <p className="text-sm text-slate-500">No Condensed profile available yet.</p>;
  }

  const sections = data.sections || {};

  // Merges a section-level edit back into the full BasicProfileData object
  // (immutable, same shape) and hands it up to the parent, which holds the
  // live draft in its own basicProfile state.
  const updateSection = (key: keyof BasicProfileData["sections"], updatedSection: any) => {
    onChange({ ...data, sections: { ...data.sections, [key]: updatedSection } });
  };

  return (
    <div className="flex flex-col gap-5">
      {data.status === "partial" && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          <Lucide icon="AlertTriangle" className="w-4 h-4 shrink-0" />
          Some sections of this profile could not be retrieved.
        </div>
      )}

      {/* "Last updated" moved to the dashboard header pill (ActivistDashboard)
          so it isn't stated twice on the same screen; the refreshing hint stays
          here, where the sections it applies to are. */}
      {loading && <p className="text-xs text-slate-400 m-0">Refreshing…</p>}

      <OverviewSection
        section={sections.whalewisdom_overview}
        isEditMode={isEditMode}
        onChange={(s) => updateSection("whalewisdom_overview", s)}
      />
      <HoldingsSection
        section={sections.current_13f_holdings}
        isEditMode={isEditMode}
        onChange={(s) => updateSection("current_13f_holdings", s)}
      />
      <ActivistFilingsSection
        section={sections.activist_filings}
        isEditMode={isEditMode}
        onChange={(s) => updateSection("activist_filings", s)}
      />
      <ShareholderLettersSection
        section={sections.shareholder_letters_web}
        isEditMode={isEditMode}
        onChange={(s) => updateSection("shareholder_letters_web", s)}
      />
    </div>
  );
};

export default BasicProfilePanel;
