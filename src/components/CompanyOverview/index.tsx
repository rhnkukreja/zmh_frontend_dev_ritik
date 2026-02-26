import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  BarChart3,
  Users,
  Vote,
  FileCheck2,
  FileText,
  BarChart2,
  Download,
} from "lucide-react";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

type BasicProps = {
  className?: string;
  children?: React.ReactNode;
};

const Card = ({ className, children }: BasicProps) => (
  <div className={cx("rounded-xl border border-slate-200 bg-white", className)}>{children}</div>
);

const CardHeader = ({ className, children }: BasicProps) => (
  <div className={cx("px-5 pt-5", className)}>{children}</div>
);

const CardContent = ({ className, children }: BasicProps) => (
  <div className={cx("px-5 pb-5", className)}>{children}</div>
);

const CardTitle = ({ className, children }: BasicProps) => (
  <h3 className={cx("text-base font-semibold", className)}>{children}</h3>
);

type BadgeProps = BasicProps & { variant?: "secondary" | "outline" | "destructive" };

const Badge = ({ className, children, variant = "secondary" }: BadgeProps) => {
  const variantClass =
    variant === "destructive"
      ? "border border-red-200 bg-red-50 text-red-700"
      : variant === "outline"
        ? "border border-slate-300 bg-white text-slate-700"
        : "border border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={cx("inline-flex items-center px-2 py-0.5 text-xs font-medium", variantClass, className)}>
      {children}
    </span>
  );
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
};

const Button = ({ className, children, variant = "default", size = "default", ...rest }: ButtonProps) => {
  const variantClass =
    variant === "outline"
      ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      : variant === "ghost"
        ? "border-none bg-transparent text-slate-700 hover:bg-slate-100"
        : "border border-primary bg-primary text-white hover:opacity-90";

  const sizeClass = size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm";

  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClass,
        sizeClass,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = ({ className, ...rest }: InputProps) => (
  <input
    className={cx(
      "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none",
      className
    )}
    {...rest}
  />
);

const Separator = ({ className }: { className?: string }) => (
  <div className={cx("h-px w-full bg-slate-200", className)} />
);

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

const Tabs = ({ defaultValue, className, children }: BasicProps & { defaultValue: string }) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsContent = ({ value, className, children }: BasicProps & { value: string }) => {
  const context = useContext(TabsContext);
  if (!context || context.value !== value) return null;
  return <div className={className}>{children}</div>;
};

/**
 * Final Company Overview UI
 * - Drop in your saved company report content as structured data (see `sampleCompany`).
 * - Supports: sections, sub-sections, bullets, and rationale items.
 */

const iconForSection = (key: string) => {
  switch (key) {
    case "sharePrice":
      return <BarChart3 className="h-4 w-4" />;
    case "esg":
      return <BarChart2 className="h-4 w-4" />;
    case "proxy":
      return <ShieldCheck className="h-4 w-4" />;
    case "board":
      return <Users className="h-4 w-4" />;
    case "sop":
      return <Vote className="h-4 w-4" />;
    case "auditor":
      return <FileCheck2 className="h-4 w-4" />;
    case "sp":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileCheck2 className="h-4 w-4" />;
  }
};

type Rationale = {
  investor: string;
  vote: string;
  proposal: string;
  notes?: string;
};

type ProxySplit = {
  summary: string;
  buckets: { label: string; pct: number }[];
};

type ESGInvestor = {
  name: string;
  env?: string[];
  soc?: string[];
  gov?: string[];
  noteIfNoTopics?: boolean;
};

type CompanyReport = {
  company: string;
  ticker: string;
  asOf: string;
  sharePriceTakeaway: string;
  esg?: {
    themeSummary?: string;
    investors: ESGInvestor[];
  };
  proxy?: ProxySplit;
  board?: {
    headlineBullets: string[];
    lowestSupport?: string[];
    rationales?: Rationale[];
  };
  sop?: {
    headlineBullets: string[];
    rationaleSummary?: string;
    votingRationaleSummary?: string;
    rationales?: Rationale[];
  };
  auditor?: {
    headlineBullets: string[];
  };
  shareholderProposals?: {
    headlineBullets: string[];
    selected?: string[];
  };
};

// Replace this with your saved report(s)
// const sampleCompany: CompanyReport = {

//   company: "Apple Inc.",

//   ticker: "AAPL",

//   asOf: "February 17, 2026",

//   sharePriceTakeaway:

//     "Apple underperformed both the S&P 500 and Nasdaq over the 1-year period, while outperforming both indices over the 3-year and 5-year periods. The short-term relative underperformance could trigger pay-for-performance discussions or potential activist screening.",

//   esg: {

//     themeSummary:

//       "Most frequently cited engagement themes included climate risk management, talent and culture, executive succession planning, technology governance, climate change, biodiversity, diversity and inclusion, and human rights.",

//     investors: [

//       {

//         name: "BlackRock, Inc.",

//         env: ["Climate Risk Management"],

//         soc: ["Talent and Culture"],

//         gov: [

//           "Business Oversight/Risk Management",

//           "Executive Management and Succession Planning",

//           "Technology Deployment and Governance/Disclosure",

//         ],

//       },

//       {

//         name: "Schroder Investment Management Ltd",

//         env: ["Climate Change", "Natural Capital and Biodiversity"],

//         soc: ["Diversity and Inclusion", "Human Rights"],

//       },

//       {

//         name: "Dimensional Fund Advisors",

//         noteIfNoTopics: true,

//       },

//       {

//         name: "State Street Global Advisors",

//         noteIfNoTopics: true,

//       },

//     ],

//   },

//   proxy: {

//     summary:

//       "A substantial portion of Top 20 ownership subscribes to ISS and/or Glass Lewis alongside internal voting frameworks, indicating meaningful potential alignment with proxy advisory recommendations.",

//     buckets: [

//       { label: "Internal Only Guidelines", pct: 4.09 },

//       { label: "ISS & Glass Lewis (GL) Subscribers", pct: 24.07 },

//     ],

//   },

//   board: {

//     headlineBullets: [

//       "8 directors elected with support ranging from 92.8% to 99.2%",

//       "Overall director approval (2025): 96.29%",

//       "2024 director approval: 97.12%",

//     ],

//     lowestSupport: ["Art Levinson – 92.8%", "Andrea Jung – 93.5%"],

//   },

//   sop: {

//     headlineBullets: ["2025 Support: 91.9%", "2024 Support: 91.8%"],

//     rationaleSummary:

//       "Voting rationales cited concerns related to CEO pay magnitude, alignment of pay structure with best practices, and board refreshment.",

//     rationales: [

//       {

//         investor: "Morgan Stanley Investment Management",

//         vote: "Split Vote",

//         proposal: "Advisory Vote to Ratify Named Executive Officers' Compensation",

//         notes:

//           "Certain aspects of pay program not aligned with best practice, though pay and performance considered reasonably aligned.",

//       },

//       {

//         investor: "T Rowe Price Associates",

//         vote: "Split Vote",

//         proposal: "Advisory Vote to Ratify Named Executive Officers' Compensation",

//         notes:

//           "CEO pay deemed excessive after considering long-term performance.",

//       },

//       {

//         investor: "UBS Asset Management AG",

//         vote: "Against",

//         proposal: "Elect Director Sue Wagner",

//         notes: "Lack of board refreshment and presence of long-tenured directors.",

//       },

//     ],

//   },

//   auditor: {

//     headlineBullets: [

//       "Ernst & Young LLP ratified with 97.8% support (2025)",

//       "2024 support: 98.4%",

//     ],

//   },

//   shareholderProposals: {

//     headlineBullets: [

//       "China Entanglement Audit – Meeting not held or results not available.",

//     ],

//   },

// };

function pctPill(pct: number) {
  if (pct >= 25) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (pct >= 10) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function SectionHeader({
  title,
  icon,
  right,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
          {icon ? React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4 text-primary" }) : null}
        </div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      {right}
    </div>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-3 space-y-2 text-[15px] text-slate-700">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function CollapsibleCard({
  title,
  iconKey,
  children,
  defaultOpen = true,
}: {
  title: string;
  iconKey: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <SectionHeader
          title={title}
          icon={iconForSection(iconKey)}
          right={
            <Button
              variant="default"
              size="sm"
              onClick={() => setOpen((v) => !v)}
              className="gap-1"
            >
              {open ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span className="text-xs">Hide</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="text-xs">Show</span>
                </>
              )}
            </Button>
          }
        />
      </CardHeader>
      {open ? <CardContent className="pt-0">{children}</CardContent> : null}
    </Card>
  );
}

function RationaleList({ items }: { items?: Rationale[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {items.map((r, idx) => (
        <div key={idx} className="rounded-xl border bg-white p-3 shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-2">

            <div className="text-[15px] font-semibold text-slate-900">

              {r.investor}

            </div>

            <Badge variant="secondary" className="rounded-full">

              {r.vote}

            </Badge>

          </div>

          <div className="mt-1 text-[15px] text-slate-700">

            <span className="font-medium">Proposal:</span> {r.proposal}

          </div>

          {r.notes ? (

            <div className="mt-2 text-[15px] text-slate-700">{r.notes}</div>

          ) : null}

        </div>

      ))}

    </div>

  );

}

function ESGInvestorBlock({ inv }: { inv: ESGInvestor }) {

  const hasTopics =

    (inv.env && inv.env.length) || (inv.soc && inv.soc.length) || (inv.gov && inv.gov.length);



  return (

    <div className="rounded-xl border bg-white p-3 shadow-sm">

      <div className="flex items-center justify-between gap-2">

        <div className="text-[15px] font-semibold text-slate-900">{inv.name}</div>

      </div>



      {hasTopics ? (

        <div className="mt-3 grid gap-3 md:grid-cols-3">

          <div>

            <div className="text-xs font-semibold text-slate-500">Environmental</div>

            <BulletList items={inv.env} />

          </div>

          <div>

            <div className="text-xs font-semibold text-slate-500">Social</div>

            <BulletList items={inv.soc} />

          </div>

          <div>

            <div className="text-xs font-semibold text-slate-500">Governance</div>

            <BulletList items={inv.gov} />

          </div>

        </div>

      ) : inv.noteIfNoTopics ? (

        <div className="mt-2 text-[15px] text-slate-700">

          Engagement reported (specific topics not detailed)

        </div>

      ) : null}

    </div>

  );

}

function copyText(text: string) {

  try {

    navigator.clipboard.writeText(text);

  } catch {

    // no-op

  }

}

function buildPlainText(report: CompanyReport) {

  const lines: string[] = [];

  lines.push(`${report.company} (${report.ticker}) – Key Governance & Investor Summary`);

  lines.push(`As of ${report.asOf}`);

  lines.push("");

  lines.push("Share Price Performance");

  lines.push(`- ${report.sharePriceTakeaway}`);

  if (report.esg) {

    lines.push("");

    lines.push("ESG & Engagement (2025)");

    if (report.esg.themeSummary) lines.push(`- ${report.esg.themeSummary}`);

    report.esg.investors.forEach((i) => {

      lines.push(`- ${i.name}`);

      if (i.env?.length) lines.push(`  - Environmental: ${i.env.join("; ")}`);

      if (i.soc?.length) lines.push(`  - Social: ${i.soc.join("; ")}`);

      if (i.gov?.length) lines.push(`  - Governance: ${i.gov.join("; ")}`);

      if (!i.env?.length && !i.soc?.length && !i.gov?.length && i.noteIfNoTopics) {

        lines.push(`  - Engagement reported (specific topics not detailed)`);

      }

    });

  }

  if (report.proxy) {

    lines.push("");

    lines.push("Proxy Advisor Influence (Top 20 Ownership)");

    lines.push(`- ${report.proxy.summary}`);

    report.proxy.buckets.forEach((b) => lines.push(`- ${b.label}: ${b.pct.toFixed(2)}%`));

  }

  if (report.board) {

    lines.push("");

    lines.push("Board of Directors");

    report.board.headlineBullets.forEach((b) => lines.push(`- ${b}`));

    report.board.lowestSupport?.forEach((b) => lines.push(`- ${b}`));

  }

  if (report.sop) {

    lines.push("");

    lines.push("Executive Compensation (Say-on-Pay)");

    report.sop.headlineBullets.forEach((b) => lines.push(`- ${b}`));

    if (report.sop.rationaleSummary) lines.push(`- ${report.sop.rationaleSummary}`);

    if (report.sop.votingRationaleSummary) {
      lines.push("- Voting Rationale");
      lines.push(report.sop.votingRationaleSummary);
    }

    report.sop.rationales?.forEach((r) => {

      lines.push(`- ${r.investor} – ${r.vote}`);

      lines.push(`  - Proposal: ${r.proposal}`);

      if (r.notes) lines.push(`  - Notes: ${r.notes}`);

    });

  }

  if (report.auditor) {

    lines.push("");

    lines.push("Auditor Ratification");

    report.auditor.headlineBullets.forEach((b) => lines.push(`- ${b}`));

  }

  if (report.shareholderProposals) {

    lines.push("");

    lines.push("Shareholder Proposals");

    report.shareholderProposals.headlineBullets.forEach((b) => lines.push(`- ${b}`));

    report.shareholderProposals.selected?.forEach((b) => lines.push(`- ${b}`));

  }

  return lines.join("\n");

}

// Transform API response to match the UI format
function transformApiDataToReport(apiData: any): CompanyReport | null {
  if (!apiData) return null;

  const report: CompanyReport = {
    company: apiData.company?.name || "",
    ticker: apiData.company?.ticker || "",
    asOf: apiData.report_metadata?.data_as_of || "",
    sharePriceTakeaway: ""
  };

  // Helper to robustly split rationale blocks, even if embedded as a single string
  function splitRationaleLines(paragraph: string): string[] {
    // Split on \n, but also trim and filter empty lines
    return paragraph.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
  }

  // Helper to extract rationale blocks from paragraphs
  function extractRationales(paragraphs: string[]): Array<{ investor: string; vote: string; proposal?: string; notes?: string }> {
    const rationales: Array<{ investor: string; vote: string; proposal?: string; notes?: string }> = [];
    let block: string[] = [];
    function flushBlock() {
      if (!block.length) return;
      const [first, ...rest] = block;
      const investorMatch = first.match(/^\*\*(.+?)\*\*\s*-\s*(.+)$/);
      if (investorMatch) {
        const investor = investorMatch[1];
        const vote = investorMatch[2];
        let proposal = "";
        let notes = "";
        rest.forEach(l => {
          if (l.startsWith("Proposal:")) proposal = l.replace(/^Proposal:\s*/, "");
          else if (l.startsWith("Notes:")) notes = l.replace(/^Notes:\s*/, "");
        });
        rationales.push({ investor, vote, proposal: proposal || undefined, notes: notes || undefined });
      }
      block = [];
    }
    for (let i = 0; i < paragraphs.length; i++) {
      const line = paragraphs[i];
      const isRationaleStart = /^\*\*(.+?)\*\*\s*-\s*(.+)$/.test(line);
      if (isRationaleStart) {
        flushBlock();
        block = [line];
      } else if (block.length) {
        block.push(line);
      }
    }
    flushBlock();
    return rationales;
  }

  // Process sections from API
  apiData.sections?.forEach((section: any) => {
    switch (section.id) {
      case "share_price_performance":
        report.sharePriceTakeaway = section.paragraphs?.join(" ") || "";
        break;

      case "engagement":
        report.esg = {
          themeSummary: section.paragraphs?.[0] || "",
          investors: section.institutions?.map((inst: any) => ({
            name: inst.institution,
            env: inst.environmental ? [inst.environmental] : undefined,
            soc: inst.social ? [inst.social] : undefined,
            gov: inst.governance ? [inst.governance] : undefined,
          })) || [],
        };
        break;

      case "proxy_advisor_influence":
        report.proxy = {
          summary: section.paragraphs?.[0] || "",
          buckets: section.paragraphs?.slice(1).map((p: string) => {
            const match = p.match(/(.+?):\s*([\d.]+)%/);
            return match ? { label: match[1], pct: parseFloat(match[2]) } : null;
          }).filter(Boolean) || [],
        };
        break;

      case "board_of_directors": {
        const bullets: string[] = [];
        let rationaleSummary: string[] = [];
        let rationaleLines: string[] = [];
        let rationaleMode = false;
        (section.paragraphs || []).forEach((p: string) => {
          if (p.startsWith("### Voting Rationale")) {
            rationaleMode = true;
            return;
          }
          if (!rationaleMode) {
            bullets.push(p);
          } else {
            if (/^\*\*(.+?)\*\*\s*-\s*(.+)$/.test(p) || p.startsWith("Proposal:") || p.startsWith("Notes:")) {
              rationaleLines.push(...splitRationaleLines(p));
            } else {
              rationaleSummary.push(p);
            }
          }
        });
        const rationales = extractRationales(rationaleLines);
        report.board = {
          headlineBullets: bullets,
          lowestSupport: section.lowest_support?.map((ls: any) => `${ls.nominee} – ${ls.support_pct}%`),
          rationales: rationales.length ? rationales : undefined,
          rationaleSummary: rationaleSummary.length ? rationaleSummary.join("\n") : undefined,
          voting_rationales: section.voting_rationales || [],
        };
        break;
      }

      case "say_on_pay": {
        const bullets: string[] = [];
        let rationaleSummary: string[] = [];
        let rationaleLines: string[] = [];
        let rationaleMode = false;
        (section.paragraphs || []).forEach((p: string) => {
          if (p.startsWith("### Voting Rationale")) {
            rationaleMode = true;
            return;
          }
          if (!rationaleMode) {
            bullets.push(p);
          } else {
            if (/^\*\*(.+?)\*\*\s*-\s*(.+)$/.test(p) || p.startsWith("Proposal:") || p.startsWith("Notes:")) {
              rationaleLines.push(...splitRationaleLines(p));
            } else {
              rationaleSummary.push(p);
            }
          }
        });
        const rationales = extractRationales(rationaleLines);
        report.sop = {
          headlineBullets: bullets,
          rationales: rationales.length ? rationales : undefined,
          rationaleSummary: rationaleSummary.length ? rationaleSummary.join("\n") : undefined,
          voting_rationales: section.voting_rationales || [],
        };
        break;
      }

      case "voting_rationale":
        if (!report.sop) {
          report.sop = {
            headlineBullets: [],
            rationales: [],
          };
        }

        const rawVotingRationale = (section.paragraphs || [])
          .map((p: string) => p?.trim())
          .filter(Boolean)
          .join("\n\n");

        if (rawVotingRationale) {
          report.sop.votingRationaleSummary = [report.sop.votingRationaleSummary, rawVotingRationale]
            .filter(Boolean)
            .join("\n\n");
        }
        break;

      case "auditor_ratification":
        report.auditor = {
          headlineBullets: section.paragraphs || [],
        };
        break;

      case "shareholder_proposals":
        report.shareholderProposals = {
          headlineBullets: section.paragraphs || [],
          selected: section.selected_support_levels || [],
        };
        break;
    }
  });

  return report;
}

export default function CompanyOverview() {
  const { companyGlobalSearchId } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const { companyOverviewData, companyOverviewLoading } = useAppSelector(
    (state) => state.dashboard
  );

  const [query, setQuery] = useState("");

  // Transform API data to UI format
  const apiReport = useMemo(() => {
    return transformApiDataToReport(companyOverviewData);
  }, [companyOverviewData]);

  // Use API data if available, otherwise use sample
  const reports: CompanyReport[] = apiReport ? [apiReport] : [];



  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      const blob = buildPlainText(r).toLowerCase();
      return !q || blob.includes(q);
    });
  }, [reports, query]);



  return (
    <>
      {companyOverviewLoading ? (
        <div className="flex items-center justify-center bg-white p-10 mt-3.5 border rounded-md">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
      ) : !companyGlobalSearchId ? (
        <div className="p-8 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-500 text-base font-medium">Search for a company to view its overview</p>
        </div>
      ) : (
        <div className="min-h-screen bg-white p-6 mt-3.5 border rounded-md">
          <div className="mx-auto space-y-6">
            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="mt-2 text-xl font-bold tracking-tight">
                  Key Governance & Investor Summary
                </h1>
              </div>
              {/* TODO: Add download functionality */}
              {/* <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div> */}
            </header>



            {filtered.length === 0 ? (

              <Card className="rounded-2xl">

                <CardContent className="py-10 text-center text-sm text-slate-600">
                  No matches. Try a different search term.
                </CardContent>

              </Card>

            ) : (

              <Tabs defaultValue={filtered[0].ticker} className="w-full">
                {filtered.map((r) => (
                  <TabsContent key={r.ticker} value={r.ticker} className="mt-4">
                    <div className="grid gap-6 md:grid-cols-12">
                      {/* Left column: headline */}
                      <Card className="rounded-2xl shadow-sm md:col-span-4">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-slate-900">
                            {r.company}
                          </CardTitle>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full" variant="outline">
                              As of {r.asOf}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div className="rounded-xl border bg-white p-3">
                            <SectionHeader
                              title="Share Price Takeaway"
                              icon={<BarChart3 className="h-4 w-4" />}
                            />
                            <p className="mt-3 text-[15px] text-slate-700">
                              {r.sharePriceTakeaway}
                            </p>
                          </div>

                          {r.proxy ? (
                            <div className="rounded-xl border bg-white p-3">
                              <SectionHeader
                                title="Proxy Advisor Influence"
                                icon={<ShieldCheck className="h-4 w-4" />}
                              />
                              <p className="mt-3 text-[15px] text-slate-700">{r.proxy.summary}</p>
                              <div className="mt-3 space-y-2">
                                {r.proxy.buckets
                                  .filter((b) => b.pct > 0)
                                  .map((b, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2"
                                    >
                                      <div className="text-[15px] text-slate-700">{b.label}</div>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${pctPill(
                                          b.pct
                                        )}`}
                                      >
                                        {b.pct.toFixed(2)}%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>

                      {/* Right column: sections */}
                      <div className="space-y-6 md:col-span-8">
                        {r.board ? (
                          <CollapsibleCard title="Board of Directors" iconKey="board">
                            <BulletList items={r.board.headlineBullets} />
                            {r.board.lowestSupport?.length ? (
                              <>
                                <Separator className="my-4" />
                                <div className="text-xs font-semibold text-slate-500">
                                  Lowest support
                                </div>
                                <BulletList items={r.board.lowestSupport} />
                              </>
                            ) : null}
                            {/* Voting Rationale as sub-bullets for Board of Directors, if present */}
                            {r.board?.rationales && r.board.rationales.length > 0 ? (
                              <>
                                <Separator className="my-4" />
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Voting Rationale
                                </div>
                                <ul className="mt-2 ml-4 list-disc space-y-2 text-[15px] text-slate-700">
                                  {r.board.rationales.map((item, idx) => (
                                    <li key={idx}>
                                      <span className="font-semibold">{item.investor}</span> – {item.vote}
                                      <ul className="ml-6 list-[circle] mt-1">
                                        <li><span className="font-medium">Proposal:</span> {item.proposal}</li>
                                        {item.notes && <li><span className="font-medium">Notes:</span> {item.notes}</li>}
                                      </ul>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : null}
                          </CollapsibleCard>
                        ) : null}

                        {r.sop ? (
                          <CollapsibleCard
                            title="Executive Compensation (Say-on-Pay)"
                            iconKey="sop"
                          >
                            <BulletList items={r.sop.headlineBullets} />
                            {r.sop.rationaleSummary ? (
                              <p className="mt-3 text-[15px] text-slate-700">
                                {r.sop.rationaleSummary}
                              </p>
                            ) : null}
                            {r.sop.votingRationaleSummary ? (
                              <>
                                <Separator className="my-4" />
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Voting Rationale
                                </div>
                                <p className="mt-2 whitespace-pre-line text-[15px] text-slate-700">
                                  {r.sop.votingRationaleSummary}
                                </p>
                              </>
                            ) : null}
                            {/* Voting Rationale as sub-bullets for Say-on-Pay, if present */}
                            {r.sop?.rationales?.length ? (
                              <ul className="mt-2 ml-4 list-disc space-y-2 text-[15px] text-slate-700">
                                {r.sop.rationales.map((item, idx) => (
                                  <li key={idx}>
                                    <span className="font-semibold">{item.investor}</span> – {item.vote}
                                    <ul className="ml-6 list-[circle] mt-1">
                                      <li><span className="font-medium">Proposal:</span> {item.proposal}</li>
                                      {item.notes && <li><span className="font-medium">Notes:</span> {item.notes}</li>}
                                    </ul>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </CollapsibleCard>
                        ) : null}

                        {r.auditor ? (
                          <CollapsibleCard title="Auditor Ratification" iconKey="auditor">
                            <BulletList items={r.auditor.headlineBullets} />
                          </CollapsibleCard>
                        ) : null}

                        {r.shareholderProposals ? (
                          <CollapsibleCard title="Shareholder Proposals" iconKey="sp">
                            <BulletList items={r.shareholderProposals.headlineBullets} />
                            {r.shareholderProposals.selected?.length ? (
                              <>
                                <Separator className="my-4" />
                                <div className="text-xs font-semibold text-slate-500">
                                  Selected proposal results
                                </div>
                                <BulletList items={r.shareholderProposals.selected} />
                              </>
                            ) : null}
                          </CollapsibleCard>
                        ) : null}

                        {r.esg ? (
                          <CollapsibleCard title="ESG & Engagement (2025)" iconKey="esg">
                            {r.esg.themeSummary ? (
                              <p className="text-[15px] text-slate-700">
                                {r.esg.themeSummary}
                              </p>
                            ) : null}
                            <div className="mt-4 grid gap-3">
                              {r.esg.investors.map((inv, idx) => (
                                <ESGInvestorBlock key={idx} inv={inv} />
                              ))}
                            </div>
                          </CollapsibleCard>
                        ) : null}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {/* <footer className="pt-2 text-xs text-slate-500">
              Tip: Replace <span className="font-mono">sampleCompany</span> with your saved reports (AAPL, AMZN, MSFT, etc.) to generate a multi-company dashboard.
            </footer> */}
          </div>
        </div>
      )}
    </>
  );
}

