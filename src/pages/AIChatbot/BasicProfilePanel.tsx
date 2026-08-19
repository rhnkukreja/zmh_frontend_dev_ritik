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

const getDomain = (url: any): string | null => {
  if (typeof url !== "string" || !url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const ABBREVIATIONS = /\b(?:[A-Z]|U\.S|Inc|Corp|Ltd|L\.P|LLC|Co|St|Mr|Mrs|Ms|Dr|vs|etc)\.$/;

const splitIntoSentences = (text: string): string[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (typeof Intl !== "undefined" && typeof (Intl as any).Segmenter === "function") {
    const segmenter = new (Intl as any).Segmenter("en", { granularity: "sentence" });
    const sentences: string[] = [];
    for (const { segment } of segmenter.segment(trimmed)) {
      const s = String(segment).trim();
      if (s) sentences.push(s);
    }
    return sentences;
  }

  // Fallback: split after ./!/? + whitespace when followed by a capital
  // letter or opening paren, then re-merge any split that landed right
  // after a known abbreviation (so "U.S. public companies" stays whole).
  const parts = trimmed.split(/(?<=[.!?])\s+(?=[A-Z(])/);
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

// Some links come back from the API under a generic label (the X/Twitter link
// arrives as "Website"), so a recognised social domain always supplies its own
// name instead of whatever the payload said.
const DOMAIN_LABELS: Array<[string, string]> = [
  ["twitter.com", "Twitter"],
  ["x.com", "Twitter"],
];

const getLinkLabel = (link: any, domain: string | null): string => {
  const known =
    domain && DOMAIN_LABELS.find(([d]) => domain === d || domain.endsWith("." + d));
  if (known) return known[1];
  return link?.label || link?.title || link?.name || link?.type || domain || "Link";
};

// Company website / LinkedIn / etc. — same external-link-list visual pattern
// as the 13D/13G and Shareholder Letters lists below, embedded inline under
// the WhaleWisdom summary rather than as its own SectionCard.
const FirmLinksList = ({ links }: { links: any[] }) => {
  if (!Array.isArray(links) || links.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <h4 className="text-sm font-bold text-slate-800 mb-3">Company Links</h4>
      <ul className="p-0 m-0 list-none flex flex-row flex-wrap gap-x-6 gap-y-3">
        {links.map((link: any, i: number) => {
          const url = link?.url || link?.link;
          const domain = getDomain(url);
          const label = getLinkLabel(link, domain);
          return (
            <li key={i} className="flex items-start">
              <span className="text-red-800 mr-2 text-base leading-none">▸</span>
              <div className="min-w-0">
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
    <SectionCard title="Investor Overview" icon="Globe" collapsible>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {section.region && <Badge label="Region" value={section.region} />}
        {section.proxy_influence && <Badge label="Proxy Influence" value={section.proxy_influence} />}
        {/* {section.sec_number && <Badge label="SEC #" value={section.sec_number} />} */}
        {section.cik_number && <Badge label="CIK" value={section.cik_number} />}
      </div>

      <div className="text-slate-600 text-base leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100">
        {renderTextAsBullets(bodyText) || <p className="text-slate-500 m-0">No overview text available.</p>}
      </div>

      {/* investment_strategy is a genuinely separate field from summary
          (not an alternate phrasing of it) — its own labeled sub-section.
          Same text-base + boxed-card treatment as the Overview paragraph
          above, so both read as one consistent visual unit rather than
          Overview looking like a card and this floating below it as plain text. */}
      {section.investment_strategy && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-slate-800 mb-2">Investment Strategy</h4>
          <div className="text-slate-600 text-base leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100">
            {renderTextAsBullets(section.investment_strategy)}
          </div>
        </div>
      )}

      <BulletList heading="Owners" items={section.owners} boxed />
      <BulletList heading="Known Email Addresses" items={section.known_email_addresses} />

      <FirmLinksList links={section.firm_links} />


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
                    <td className="px-3 py-2 font-semibold text-slate-900">{h.issuer}</td>
                    <td className="px-3 py-2 text-slate-800 font-medium">{h.ticker_or_symbol || "—"}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{formatPortfolioPercent(h.note)}</td>
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
const ActivistFilingsSection = ({ section }: { section: any }) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Activist Filings (13D/13G & Proxy Contests)" icon="FileText">
        <UnavailableNotice label="Activist filings" message="None" error={section?.error} />
      </SectionCard>
    );
  }

  const filings = Array.isArray(section.filings) ? section.filings : [];

  return (
    <SectionCard title="Activist Filings (13D/13G & Proxy Contests)" icon="FileText" collapsible defaultOpen={false}>
      <ActivistFilingsTable filings={filings} variant="tailwind" />
    </SectionCard>
  );
};

// The API sends a `published_date` on every shareholder-letter result but
// currently leaves it null, so the only dates actually available are the ones
// written into the article text itself — PRNewswire datelines ("NEW YORK,
// March 25, 2022 /PRNewswire/") and stamps like "May 05, 2023, 08:00 ET".
// `published_date` still wins whenever the backend starts populating it.
//
// Only a full month-day-year counts. A bare "December 2021" is almost always
// prose about a holding period ("has been a stockholder since December 2021"),
// not a publish date, and sorting on it would place rows confidently wrong.
const MONTH_NAMES =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const TEXT_DATE_RE = new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{1,2}),\\s*(\\d{4})\\b`, "i");
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

  const named = text.match(TEXT_DATE_RE);
  if (named) {
    const d = new Date(`${named[1]} ${named[2]}, ${named[3]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
};

const ShareholderLettersSection = ({ section }: { section: any }) => {
  if (!section || section.status !== "ok") {
    return (
      <SectionCard title="Shareholder Letters" icon="Mail">
        <UnavailableNotice label="Shareholder letters" error={section?.error} />
      </SectionCard>
    );
  }

  // Newest first. Letters we could not date keep their original API order and
  // sink below the dated ones, so an undated result never masquerades as recent.
  const results = (Array.isArray(section.results) ? section.results : [])
    .map((r: any, i: number) => ({ r, i, time: getLetterDate(r)?.getTime() ?? null }))
    .sort((a, b) => {
      if (a.time === null || b.time === null) {
        if (a.time === b.time) return a.i - b.i;
        return a.time === null ? 1 : -1;
      }
      return b.time - a.time;
    });

  return (
    <SectionCard title="Shareholder Letters" icon="Mail" collapsible defaultOpen={false}>
      {results.length > 0 ? (
        <ul className="p-0 m-0 list-none flex flex-col gap-4">
          {results.map(({ r, time }, i: number) => (
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
      <ActivistFilingsSection section={sections.activist_filings} />
      <ShareholderLettersSection section={sections.shareholder_letters_web} />
    </div>
  );
};

export default BasicProfilePanel;
