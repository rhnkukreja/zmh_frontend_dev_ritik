import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import GovernanceTab from "@/components/CompanyOverview/GovernanceTab";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { fetchCompanyOverview, fetchCompanyOverviewGPT } from "@/stores/dashboardSlice";
import { dashboardService } from "@/services/dashboard";
import { baseURL } from "@/constant";
import pdfMake from "pdfmake/build/pdfmake";
import CompensationTab from './CompensationTab';
import { useCacheInvalidation } from "@/hooks/useCacheInvalidation";

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
  <h3 className={cx("text-base font-semibold text-slate-900", className)}>{children}</h3>
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
    <span className={cx("inline-flex items-center px-2 py-0.5 text-[15px] font-medium", variantClass, className)}>
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

  const sizeClass = size === "sm" ? "h-8 px-3 text-[15px]" : "h-10 px-4 text-[15px]";

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
      "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[15px] text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none",
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
    rationales?: Rationale[];
  };
  shareholderProposals?: {
    headlineBullets: string[];
    selected?: string[];
    proposalVotes?: Array<{
      proposal: string;
      proposal_name: string;
      proponent: string;
      outcome_percentage: string;
      vote_outcome: string | null;
      year: number;
      institution_votes: Array<{
        institution: string;
        vote: string;
      }>;
    }>;
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
    <ul className="ml-5 list-disc space-y-1 text-[15px] text-slate-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function ProposalList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        // Parse: "PROPOSAL TITLE (Proponent: Name) – XX.X%"
        const proponentMatch = item.match(/\(Proponent:\s*([^)]+)\)\s*–\s*([\d.]+)%/i);

        if (proponentMatch) {
          const title = item.substring(0, item.indexOf('(Proponent:')).trim();
          const proponent = proponentMatch[1].trim();
          const supportPercent = parseFloat(proponentMatch[2]);
          const support = `${proponentMatch[2]}%`;

          // Determine color based on support percentage
          const isGreen = supportPercent >= 50;
          const pillClass = isGreen
            ? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[15px] font-semibold text-emerald-700'
            : 'rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[15px] font-semibold text-red-700';

          return (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[15px] font-semibold text-slate-900">{title}</div>
                  <div className="mt-1 text-[15px] text-slate-600">
                    <span className="font-medium">Proponent:</span> {proponent}
                  </div>
                </div>
                <div className={pillClass}>
                  {support}
                </div>
              </div>
            </div>
          );
        }

        // Fallback for items without proponent info
        return (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[15px] text-slate-700">{item}</div>
          </div>
        );
      })}
    </div>
  );
}

function ProposalVotesList({ proposals }: {
  proposals?: Array<{
    proposal: string;
    proposal_name: string;
    proponent: string;
    outcome_percentage: string;
    vote_outcome: string | null;
    year: number;
    institution_votes: Array<{
      institution: string;
      vote: string;
    }>;
  }>
}) {
  if (!proposals || proposals.length === 0) return null;

  return (
    <div className="space-y-4">
      {proposals.map((prop, idx) => {
        const supportPercent = parseFloat(prop.outcome_percentage);
        const isGreen = supportPercent >= 50;
        const pillClass = isGreen
          ? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[15px] font-semibold text-emerald-700'
          : 'rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[15px] font-semibold text-red-700';

        return (
          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {/* Proposal Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="text-[15px] font-semibold text-slate-900">{prop.proposal_name}</div>
                <div className="mt-1 text-[15px] text-slate-600">
                  <span className="font-medium">Proponent:</span> {prop.proponent}
                </div>
              </div>
              <div className={pillClass}>
                {prop.outcome_percentage}
              </div>
            </div>

            {/* Institution Votes */}
            {prop.institution_votes && prop.institution_votes.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="text-[13px] font-semibold text-slate-500 mb-2">
                  Top Investor Votes
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {prop.institution_votes.map((instVote, instIdx) => (
                    <div
                      key={instIdx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="text-[14px] text-slate-700 font-medium truncate pr-2">
                        {instVote.institution}
                      </div>
                      <Badge
                        variant={instVote.vote === "For" ? "secondary" : "destructive"}
                        className="rounded-full shrink-0"
                      >
                        {instVote.vote}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
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
                  <span className="text-[15px]">Hide</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="text-[15px]">Show</span>
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

function RationaleList({ items, summary }: { items?: Rationale[]; summary?: string }) {
  if (!items?.length) return null;
  return (
    <>
      <Separator className="my-4" />
      <div className="text-[15px] font-semibold text-slate-500 mb-3">
        Voting Rationale Disclosures <span>(Against or Withhold votes for top 20 investors only)</span>
      </div>
      {summary && (
        <p className="mb-3 text-[15px] text-slate-700">{summary}</p>
      )}
      <div className="space-y-3">
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
              <div className="mt-2 space-y-2">
                {(() => {
                  const notes = r.notes.split(/<br\s*\/?>/gi).filter(n => n.trim());
                  return notes.map((note, noteIdx) => (
                    <div key={noteIdx} className="text-[15px] text-slate-700">
                      <span className="font-medium">
                        {notes.length === 1 ? 'Rationale:' : `Rationale ${noteIdx + 1}:`}
                      </span> {note.trim()}
                    </div>
                  ));
                })()}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

function ESGInvestorBlock({ inv }: { inv: ESGInvestor }) {
  const hasTopics = inv.env || inv.soc || inv.gov;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 font-semibold text-[15px] text-slate-900">{inv.name}</div>

      {hasTopics ? (
        <div className="space-y-1.5 text-[15px] text-slate-700">
          {inv.env && (
            <div>
              <span className="font-semibold text-slate-600">Environmental:</span> {inv.env.join(", ")}
            </div>
          )}
          {inv.soc && (
            <div>
              <span className="font-semibold text-slate-600">Social:</span> {inv.soc.join(", ")}
            </div>
          )}
          {inv.gov && (
            <div>
              <span className="font-semibold text-slate-600">Governance:</span> {inv.gov.join(", ")}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[15px] italic text-slate-500">{inv.name} doesn't disclose the engagement details.</div>
      )}

    </div>

  );

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

    lines.push("Engagement Details (as disclosed by investors)");

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

      case "board_of_directors":
        // Filter out duplicate/disclosure paragraphs
        const boardParagraphs = (section.paragraphs || []).filter((p: string) =>
          !p.includes('Voting Rationale Disclosures') &&
          !p.includes('Lowest support levels:') &&
          !p.toLowerCase().includes('voting rationale')
        );

        report.board = {
          headlineBullets: boardParagraphs,
          lowestSupport: section.lowest_support?.map((ls: any) =>
            `${ls.nominee} – ${ls.support_pct}%`
          ),
          rationales: section.voting_rationales?.map((r: any) => ({
            investor: r.investor,
            vote: r.vote,
            proposal: r.proposal,
            notes: r.notes
          })) || [],
        };
        break;

      case "say_on_pay":
        // Filter out duplicate/disclosure paragraphs
        const sopParagraphs = (section.paragraphs || []).filter((p: string) =>
          !p.includes('Voting Rationale Disclosures') &&
          !p.toLowerCase().includes('voting rationale')
        );

        report.sop = {
          headlineBullets: sopParagraphs,
          rationales: section.voting_rationales?.map((r: any) => ({
            investor: r.investor,
            vote: r.vote,
            proposal: r.proposal || '',
            notes: r.notes
          })) || [],
        };
        break;

      case "voting_rationale":
        const rationaleItems: Array<{ investor: string; vote: string; proposal: string; notes?: string }> = [];

        section.paragraphs?.forEach((p: string) => {
          const lines = p.split('\n').filter(l => l.trim());
          if (lines.length >= 3) {
            const firstLine = lines[0];
            const investorMatch = firstLine.match(/^(.+?)\s*[–-]\s*(.+)$/);

            if (investorMatch) {
              const investor = investorMatch[1].trim();
              const vote = investorMatch[2].trim();
              const proposal = lines[1].replace(/^Proposal:\s*/i, '').trim();
              const notesLines = lines.slice(2).map(l => l.replace(/^Notes:\s*/i, '')).join('\n').trim();

              rationaleItems.push({
                investor: investor,
                vote: vote,
                proposal: proposal,
                notes: notesLines
              });
            }
          }
        });

        if (!report.sop) {
          report.sop = {
            headlineBullets: [],
            rationales: rationaleItems,
          };
        } else {
          report.sop.rationales = [...(report.sop.rationales || []), ...rationaleItems];
        }
        break;

      case "auditor_ratification":
        report.auditor = {
          headlineBullets: section.paragraphs || [],
          rationales: section.voting_rationales?.map((r: any) => ({
            investor: r.investor,
            vote: r.vote,
            proposal: r.proposal,
            notes: r.notes
          })) || [],
        };
        break;

      case "shareholder_proposals":
        report.shareholderProposals = {
          headlineBullets: section.paragraphs || [],
          selected: section.selected_support_levels || [],
          proposalVotes: section.shareholder_proposal_votes || [],
        };
        break;
    }
  });

  return report;
}

export default function CompanyOverview() {
  const dispatch = useAppDispatch();

  const { companyGlobalSearchId, user } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const { companyOverviewData, companyOverviewLoading } = useAppSelector(
    (state) => state.dashboard
  );

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const [activeOverviewTab, setActiveOverviewTab] = useState<'investor_summary' | 'compensation' | 'governance'>('investor_summary');

  const canViewRestrictedTabs = user?.user_type === 'Admin' || user?.user_type === 'Analyst';

  const handleCompanySwitch = useCallback(() => {
    setAvailableYears([]);
    setSelectedYear(null);
    setActiveOverviewTab('investor_summary');
    setQuery('');
  }, []);

  const handleYearSwitch = useCallback((year: number | null) => {
    setSelectedYear(year);
    setActiveOverviewTab('investor_summary');
  }, []);

  const cacheInvalidationOptions = useMemo(() => ({
    onCompanyChange: (oldId: number | undefined, newId: number) => {
      console.log(`💾 Company changed cache invalidation: ${oldId} → ${newId}`);
      handleCompanySwitch();
    },
    onYearChange: (oldYear: number | undefined, newYear: number) => {
      console.log(`💾 Year changed cache invalidation: ${oldYear} → ${newYear}`);
    },
  }), [handleCompanySwitch]);

  // Setup cache invalidation on company/year changes
  useCacheInvalidation(companyGlobalSearchId, selectedYear, cacheInvalidationOptions);

  useEffect(() => {
    let isMounted = true;

    const loadYears = async () => {
      if (!companyGlobalSearchId) {
        handleCompanySwitch();
        return;
      }

      handleCompanySwitch();
      setYearsLoading(true);
      try {
        const years = await dashboardService.getCompanyOverviewYears(companyGlobalSearchId);
        if (!isMounted) return;

        setAvailableYears(years);
        const nextYear = years[0] ?? null;
        handleYearSwitch(nextYear);
      } catch (error) {
        console.error("Failed to load company overview years:", error);
        if (isMounted) {
          handleCompanySwitch();
        }
      } finally {
        if (isMounted) {
          setYearsLoading(false);
        }
      }
    };

    loadYears();

    return () => {
      isMounted = false;
    };
  }, [companyGlobalSearchId]);

  useEffect(() => {
    if (!companyGlobalSearchId || !selectedYear) return;

    dispatch(
      fetchCompanyOverview(
        `${baseURL}/company_report/key_findings/?company_id=${companyGlobalSearchId}&year=${selectedYear}`
      )
    );

    if (canViewRestrictedTabs) {
      dispatch(
        fetchCompanyOverviewGPT(
          `${baseURL}/company_report/key_findings_gpt/?company_id=${companyGlobalSearchId}&year=${selectedYear}`
        )
      );
    }
  }, [dispatch, companyGlobalSearchId, selectedYear, canViewRestrictedTabs]);

  // Transform API data to UI format
  const apiReport = useMemo(() => {
    return transformApiDataToReport(companyOverviewData);
  }, [companyOverviewData]);

  // Use API data if available, otherwise use sample
  const reports: CompanyReport[] = apiReport ? [apiReport] : [];


  const generatePDF = (report: CompanyReport) => {
    const primaryColor = "#b91c1c";
    const gray50 = "#f9fafb";
    const gray200 = "#e5e7eb";
    const gray600 = "#4b5563";
    const gray700 = "#374151";
    const gray900 = "#111827";

    const content: any[] = [];
    setLoading(true);

    // Title
    content.push({
      text: `${report.company} (${report.ticker})`,
      style: "title",
      margin: [0, 0, 0, 5]
    });

    content.push({
      text: "Key Governance & Investor Summary",
      style: "subtitle",
      margin: [0, 0, 0, 10]
    });

    content.push({
      text: `As of ${report.asOf}`,
      style: "caption",
      margin: [0, 0, 0, 20]
    });

    // Share Price Performance
    if (report.sharePriceTakeaway) {
      content.push({
        text: "Share Price Performance",
        style: "sectionTitle"
      });
      content.push({
        text: report.sharePriceTakeaway,
        style: "bodyText",
        margin: [0, 5, 0, 15]
      });
    }

    // Proxy Advisor Influence
    if (report.proxy) {
      content.push({
        text: "Proxy Advisor Influence",
        style: "sectionTitle"
      });
      content.push({
        text: report.proxy.summary,
        style: "bodyText",
        margin: [0, 5, 0, 10]
      });

      if (report.proxy.buckets.length > 0) {
        const bucketRows = report.proxy.buckets
          .filter(b => b.pct > 0)
          .map(b => [
            { text: b.label, style: "tableCell" },
            { text: `${b.pct.toFixed(2)}%`, style: "tableCell", alignment: "right" }
          ]);

        content.push({
          table: {
            widths: ["*", "auto"],
            body: [
              [
                { text: "Category", style: "tableHeader" },
                { text: "Percentage", style: "tableHeader", alignment: "right" }
              ],
              ...bucketRows
            ]
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => gray200,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6
          },
          margin: [0, 0, 0, 15]
        });
      }
    }

    // Board of Directors
    if (report.board) {
      const boardContent: any[] = [];

      boardContent.push({
        text: "Board of Directors",
        style: "sectionTitle"
      });

      if (report.board.headlineBullets?.length > 0) {
        boardContent.push({
          ul: report.board.headlineBullets.map(bullet => ({
            text: bullet,
            style: "bulletText"
          })),
          margin: [0, 5, 0, 10]
        });
      }

      if (report.board.lowestSupport?.length > 0) {
        boardContent.push({
          text: "Lowest Support Levels:",
          style: "subSectionTitle",
          margin: [0, 5, 0, 5]
        });
        boardContent.push({
          ul: report.board.lowestSupport.map(item => ({
            text: item,
            style: "bulletText"
          })),
          margin: [0, 0, 0, 10]
        });
      }

      // Board Voting Rationale
      if (report.board.rationales && report.board.rationales.length > 0) {
        boardContent.push({
          text: "Voting Rationale:",
          style: "subSectionTitle",
          margin: [0, 5, 0, 5]
        });

        report.board.rationales.forEach((rationale: any) => {
          boardContent.push({
            stack: [
              {
                text: `${rationale.investor} – ${rationale.vote}`,
                style: "rationaleInvestor"
              },
              rationale.proposal ? {
                text: `Proposal: ${rationale.proposal}`,
                style: "rationaleDetail",
                margin: [10, 2, 0, 0]
              } : null,
              rationale.notes ? {
                text: `Notes: ${rationale.notes}`,
                style: "rationaleDetail",
                margin: [10, 2, 0, 0]
              } : null
            ].filter(Boolean),
            margin: [0, 0, 0, 8],
            unbreakable: true  // ✅ Keep rationale items together
          });
        });

        boardContent.push({ text: "", margin: [0, 0, 0, 10] });
      }

      // ✅ Wrap entire section in unbreakable stack if it's short
      if (boardContent.length <= 5) {
        content.push({
          stack: boardContent,
          unbreakable: true
        });
      } else {
        content.push(...boardContent);
      }
    }

    // Say-on-Pay
    if (report.sop) {
      content.push({
        text: "Executive Compensation (Say-on-Pay)",
        style: "sectionTitle"
      });

      if (report.sop.headlineBullets?.length > 0) {
        content.push({
          ul: report.sop.headlineBullets.map(bullet => ({
            text: bullet,
            style: "bulletText"
          })),
          margin: [0, 5, 0, 10]
        });
      }

      if (report.sop.rationaleSummary) {
        content.push({
          text: report.sop.rationaleSummary,
          style: "bodyText",
          margin: [0, 0, 0, 10]
        });
      }

      // SOP Voting Rationale
      if (report.sop.rationales && report.sop.rationales.length > 0) {
        content.push({
          text: "Voting Rationale:",
          style: "subSectionTitle",
          margin: [0, 5, 0, 5]
        });

        report.sop.rationales.forEach((rationale: any) => {
          content.push({
            stack: [
              {
                text: `${rationale.investor} – ${rationale.vote}`,
                style: "rationaleInvestor"
              },
              rationale.proposal ? {
                text: `Proposal: ${rationale.proposal}`,
                style: "rationaleDetail",
                margin: [10, 2, 0, 0]
              } : null,
              rationale.notes ? {
                text: `Notes: ${rationale.notes}`,
                style: "rationaleDetail",
                margin: [10, 2, 0, 0]
              } : null
            ].filter(Boolean),
            margin: [0, 0, 0, 8]
          });
        });

        content.push({ text: "", margin: [0, 0, 0, 10] });
      }
    }

    // Auditor Ratification
    if (report.auditor) {
      content.push({
        text: "Auditor Ratification",
        style: "sectionTitle"
      });

      if (report.auditor.headlineBullets?.length > 0) {
        content.push({
          ul: report.auditor.headlineBullets.map(bullet => ({
            text: bullet,
            style: "bulletText"
          })),
          margin: [0, 5, 0, 15]
        });
      }
    }

    // Shareholder Proposals
    if (report.shareholderProposals) {
      content.push({
        text: "Shareholder Proposals",
        style: "sectionTitle"
      });

      if (report.shareholderProposals.headlineBullets?.length > 0) {
        content.push({
          ul: report.shareholderProposals.headlineBullets.map(bullet => ({
            text: bullet,
            style: "bulletText"
          })),
          margin: [0, 5, 0, 10]
        });
      }

      if (report.shareholderProposals.selected?.length > 0) {
        content.push({
          text: "Selected Proposal Results:",
          style: "subSectionTitle",
          margin: [0, 5, 0, 5]
        });
        content.push({
          ul: report.shareholderProposals.selected.map(item => ({
            text: item,
            style: "bulletText"
          })),
          margin: [0, 0, 0, 15]
        });
      }
    }

    // ESG & Engagement
    if (report.esg) {
      content.push({
        text: "ESG & Engagement",
        style: "sectionTitle",
        // ❌ REMOVED: pageBreak: "before"  - This was forcing new page
        keepWithNext: true
      });

      if (report.esg.themeSummary) {
        content.push({
          text: report.esg.themeSummary,
          style: "bodyText",
          margin: [0, 5, 0, 15]
        });
      }

      report.esg.investors.forEach((investor: any) => {
        const investorContent: any[] = [];

        investorContent.push({
          text: investor.name,
          style: "investorName",
          margin: [0, 0, 0, 5],
          keepWithNext: true
        });

        const hasTopics = investor.env?.length || investor.soc?.length || investor.gov?.length;

        if (hasTopics) {
          const topics: any[] = [];

          if (investor.env?.length) {
            topics.push({
              text: [
                { text: "Environmental: ", style: "topicLabel", bold: true },
                { text: investor.env.join(", "), style: "topicText" }
              ],
              margin: [0, 2, 0, 2]
            });
          }

          if (investor.soc?.length) {
            topics.push({
              text: [
                { text: "Social: ", style: "topicLabel", bold: true },
                { text: investor.soc.join(", "), style: "topicText" }
              ],
              margin: [0, 2, 0, 2]
            });
          }

          if (investor.gov?.length) {
            topics.push({
              text: [
                { text: "Governance: ", style: "topicLabel", bold: true },
                { text: investor.gov.join(", "), style: "topicText" }
              ],
              margin: [0, 2, 0, 2]
            });
          }

          investorContent.push({
            stack: topics,
            margin: [0, 0, 0, 15]
          });
        } else if (investor.noteIfNoTopics) {
          investorContent.push({
            text: "Engagement reported (specific topics not detailed)",
            style: "bodyText",
            italics: true,
            margin: [0, 0, 0, 15]
          });
        }

        // ✅ Keep each investor block together
        content.push({
          stack: investorContent,
          unbreakable: true
        });
      });
    }

    const docDefinition: any = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      header: (currentPage: number, pageCount: number) => ({
        text: `${report.company} (${report.ticker}) - Key Governance & Investor Summary`,
        alignment: "center",
        fontSize: 9,
        color: gray600,
        margin: [40, 20, 40, 0]
      }),
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: `As of ${report.asOf}`,
            alignment: "left",
            fontSize: 8,
            color: gray600
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: "right",
            fontSize: 8,
            color: gray600
          }
        ],
        margin: [40, 0, 40, 20]
      }),
      content,
      styles: {
        title: {
          fontSize: 18,
          bold: true,
          color: gray900,
          keepWithNext: true
        },
        subtitle: {
          fontSize: 14,
          bold: true,
          color: gray700,
          keepWithNext: true
        },
        sectionTitle: {
          fontSize: 13,
          bold: true,
          color: primaryColor,
          margin: [0, 15, 0, 8],
          keepWithNext: true
        },
        subSectionTitle: {
          fontSize: 11,
          bold: true,
          color: gray700,
          margin: [0, 10, 0, 5],
          keepWithNext: true
        },
        bodyText: {
          fontSize: 10,
          color: gray700,
          lineHeight: 1.4
        },
        bulletText: {
          fontSize: 10,
          color: gray700,
          lineHeight: 1.3,
          margin: [0, 2, 0, 2]
        },
        caption: {
          fontSize: 10,
          color: gray600,
          italics: true
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          fillColor: gray50,
          color: gray700
        },
        tableCell: {
          fontSize: 9,
          color: gray700
        },
        investorName: {
          fontSize: 11,
          bold: true,
          color: gray900,
          keepWithNext: true
        },
        topicLabel: {
          fontSize: 10,
          bold: true,
          color: gray700
        },
        topicText: {
          fontSize: 10,
          color: gray700,
          bold: false
        },
        rationaleInvestor: {
          fontSize: 10,
          bold: true,
          color: gray900,
          keepWithNext: true
        },
        rationaleDetail: {
          fontSize: 9,
          color: gray700,
          lineHeight: 1.3
        }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    const fileName = `${report.company.replace(/[^a-z0-9]/gi, '_')}_Overview_${new Date().toISOString().split('T')[0]}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);

    setLoading(false);
  };

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
        <>
          {/* STICKY COMPANY OVERVIEW TABS - Static Content */}
          {canViewRestrictedTabs && (
            <div className="sticky top-[220px] z-40 flex items-center justify-start gap-3 py-5 mb-3 bg-white backdrop-blur-md ps-6 shadow-lg">
              <button
                onClick={() => setActiveOverviewTab('investor_summary')}
                className={`px-5 py-2 rounded-lg border font-semibold text-[14px] transition-colors ${activeOverviewTab === 'investor_summary'
                    ? 'border-primary text-primary bg-white'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                Summary
              </button>

              <button
                onClick={() => setActiveOverviewTab('governance')}
                className={`px-5 py-2 rounded-lg border font-semibold text-[14px] transition-colors ${activeOverviewTab === 'governance'
                    ? 'border-primary text-primary bg-white'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                Governance Profile
              </button>

              <button
                onClick={() => setActiveOverviewTab('compensation')}
                className={`px-5 py-2 rounded-lg border font-semibold text-[14px] transition-colors ${activeOverviewTab === 'compensation'
                    ? 'border-primary text-primary bg-white'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                Compensation
              </button>
            </div>
          )}

          <div className="min-h-screen bg-white p-6 mt-3.5 border rounded-md">
            <div className="mx-auto space-y-6">
              {/* STATIC HEADER - Always visible during loading */}
              {activeOverviewTab === 'investor_summary' && (
                <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    {(yearsLoading || availableYears.length > 0) && (
                      <div className="mb-2">
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {yearsLoading
                            ? [0, 1].map((index) => (
                              <span
                                key={`year-loading-${index}`}
                                className="inline-block h-10 w-20 animate-pulse rounded-xl bg-slate-200"
                              />
                            ))
                            : availableYears.map((year) => {
                              const isActiveYear = selectedYear === year;
                              return (
                                <button
                                  key={year}
                                  type="button"
                                  onClick={() => handleYearSwitch(year)}
                                  className={cx(
                                    "rounded-xl border px-6 py-2 text-[14px] font-semibold transition-colors",
                                    isActiveYear
                                      ? "border-[#b01217] bg-[#b01217] text-white"
                                      : "border-[#d9c2c8] bg-[#f3e7eb] text-[#b05b72] hover:bg-[#efdde3]"
                                  )}
                                  aria-pressed={isActiveYear}
                                >
                                  {year}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    <h1 className="mt-2 text-xl font-bold tracking-tight">
                      Key Governance & Investor Summary
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </header>
              )}

              {/* SKELETON LOADING - Only for fetched content */}
              <div className="grid gap-6 md:grid-cols-12">
                {/* Left column skeleton */}
                <div className="rounded-2xl shadow-sm md:col-span-4 bg-white border border-gray-200 p-6 space-y-4">
                  <div>
                    <div className="h-5 w-48 animate-pulse rounded bg-slate-200 mb-2" />
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="h-6 w-32 animate-pulse rounded-full bg-slate-200" />
                    </div>
                  </div>

                  {/* Share Price Takeaway skeleton */}
                  <div className="rounded-xl border bg-white p-3 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 space-y-2">
                      <div className="h-4 w-[96%] rounded bg-slate-200 animate-pulse" />
                      <div className="h-4 w-[88%] rounded bg-slate-200 animate-pulse" />
                      <div className="h-4 w-[70%] rounded bg-slate-200 animate-pulse" />
                    </div>
                  </div>

                  {/* Proxy Advisor Influence skeleton */}
                  <div className="rounded-xl border bg-white p-3 space-y-2">
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 space-y-2">
                      <div className="h-4 w-[92%] rounded bg-slate-200 animate-pulse" />
                      <div className="h-4 w-[82%] rounded bg-slate-200 animate-pulse" />
                    </div>
                    <div className="mt-3 space-y-2">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                          key={`proxy-bucket-skeleton-${idx}`}
                          className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2"
                        >
                          <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                          <div className="h-5 w-16 rounded-full bg-slate-200 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right column skeleton */}
                <div className="space-y-6 md:col-span-8">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={`section-skeleton-${idx}`} className="rounded-xl border bg-white overflow-hidden">
                      <div className="flex items-center justify-between border-b px-4 py-4">
                        <div className="h-5 w-56 animate-pulse rounded bg-slate-200" />
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 w-[96%] rounded bg-slate-200 animate-pulse" />
                        <div className="h-4 w-[90%] rounded bg-slate-200 animate-pulse" />
                        <div className="h-4 w-[78%] rounded bg-slate-200 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : !companyGlobalSearchId ? (
        <div className="p-8 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-500 text-[15px] font-medium">Search for a company to view its overview</p>
        </div>
      ) : (
        <>
          {/* STICKY COMPANY OVERVIEW TABS */}
          {/* Note: You may need to adjust "top-[180px]" up or down depending on the exact pixel height of your main header */}
          {canViewRestrictedTabs && (
            <div className="sticky top-[220px] z-40 flex items-center justify-start gap-3 py-5 mb-3 bg-white backdrop-blur-md ps-6 shadow-lg">
              <button
                onClick={() => setActiveOverviewTab('investor_summary')}
                className={`px-5 py-2 rounded-lg border font-semibold text-[14px] transition-colors ${activeOverviewTab === 'investor_summary'
                    ? 'border-primary text-primary bg-white'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                Summary
              </button>

              <button
                onClick={() => setActiveOverviewTab('governance')}
                className={`px-5 py-2 rounded-lg border font-semibold text-[14px] transition-colors ${activeOverviewTab === 'governance'
                    ? 'border-primary text-primary bg-white'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                Governance Profile
              </button>

              <button
                onClick={() => setActiveOverviewTab('compensation')}
                className={`px-5 py-2 rounded-lg border font-semibold text-[14px] transition-colors ${activeOverviewTab === 'compensation'
                    ? 'border-primary text-primary bg-white'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                Compensation
              </button>
            </div>
          )}


          <div className="min-h-screen bg-white p-6 mt-3.5 border rounded-md">
            <div className="mx-auto space-y-6">
              {/* ONLY SHOW HEADER ON INVESTOR SUMMARY TAB */}
              {activeOverviewTab === 'investor_summary' && (
                <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    {(yearsLoading || availableYears.length > 0) && (
                      <div className="mb-2">
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {yearsLoading
                            ? [0, 1].map((index) => (
                              <span
                                key={`year-loading-${index}`}
                                className="inline-block h-10 w-20 animate-pulse rounded-xl bg-slate-200"
                              />
                            ))
                            : availableYears.map((year) => {
                              const isActiveYear = selectedYear === year;
                              return (
                                <button
                                  key={year}
                                  type="button"
                                  onClick={() => setSelectedYear(year)}
                                  className={cx(
                                    "rounded-xl border px-6 py-2 text-[14px] font-semibold transition-colors",
                                    isActiveYear
                                      ? "border-red-800 bg-red-800 text-white"
                                      : "border-[#d9c2c8] bg-[#f3e7eb] text-[#b05b72] hover:bg-[#efdde3]"
                                  )}
                                  aria-pressed={isActiveYear}
                                >
                                  {year}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    <h1 className="mt-2 text-xl font-bold tracking-tight">
                      Key Governance & Investor Summary
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        if (filtered.length > 0) {
                          generatePDF(filtered[0]);
                        }
                      }}
                      disabled={loading ? true : (filtered.length === 0 || companyOverviewLoading)}
                    >
                      <Download className="h-4 w-4" />
                      {loading ? "Downloading..." : "Download PDF"}
                    </Button>
                  </div>
                </header>
              )}

              {filtered.length === 0 ? (

                <Card className="rounded-2xl">

                  <CardContent className="py-10 text-center text-[15px] text-slate-600">
                    No matches. Try a different search term.
                  </CardContent>

                </Card>

              ) : (
                <>
                  {/* INVESTOR SUMMARY VIEW */}
                  {activeOverviewTab === 'investor_summary' && (
                    <Tabs defaultValue={filtered[0].ticker} className="w-full">
                      {filtered.map((r) => (
                        <TabsContent key={r.ticker} value={r.ticker} className="mt-4">
                          <div className="grid gap-6 md:grid-cols-12">
                            {/* Left column: headline */}
                            <Card className="rounded-2xl shadow-sm md:col-span-4">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-[15px] text-slate-900">
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
                                              className={`rounded-full border px-2 py-0.5 text-[15px] font-semibold ${pctPill(
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
                                      <div className="text-[15px] font-semibold text-slate-500">
                                        Lowest support
                                      </div>
                                      <BulletList items={r.board.lowestSupport} />
                                    </>
                                  ) : null}
                                  <RationaleList items={r.board.rationales} />
                                </CollapsibleCard>
                              ) : null}

                              {r.sop ? (
                                <CollapsibleCard
                                  title="Executive Compensation (Say-on-Pay)"
                                  iconKey="sop"
                                >
                                  <BulletList items={r.sop.headlineBullets} />
                                  <RationaleList items={r.sop.rationales} summary={r.sop.rationaleSummary} />
                                </CollapsibleCard>
                              ) : null}

                              {r.auditor ? (
                                <CollapsibleCard title="Auditor Ratification" iconKey="auditor">
                                  <BulletList items={r.auditor.headlineBullets} />
                                  <RationaleList items={r.auditor.rationales} />
                                </CollapsibleCard>
                              ) : null}

                              {r.shareholderProposals ? (
                                <CollapsibleCard title="Shareholder Proposals" iconKey="sp">
                                  <BulletList items={r.shareholderProposals.headlineBullets} />
                                  {r.shareholderProposals.proposalVotes?.length ? (
                                    <>
                                      <Separator className="my-4" />
                                      <div className="text-[15px] font-semibold text-slate-500 mb-3">
                                        Proposal Details with Top Investor Votes
                                      </div>
                                      <ProposalVotesList proposals={r.shareholderProposals.proposalVotes} />
                                    </>
                                  ) : r.shareholderProposals.selected?.length ? (
                                    <>
                                      <Separator className="my-4" />
                                      <div className="text-[15px] font-semibold text-slate-500 mb-3">
                                        Selected proposal results
                                      </div>
                                      <ProposalList items={r.shareholderProposals.selected} />
                                    </>
                                  ) : null}
                                </CollapsibleCard>
                              ) : null}

                              {r.esg ? (
                                <CollapsibleCard title="Engagement Details (as disclosed by investors)" iconKey="esg">
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

                  {/* COMPENSATION VIEW */}
                  {activeOverviewTab === 'compensation' && (
                    <div className="mt-4">
                      <CompensationTab ticker={filtered[0]?.ticker || ""} />
                    </div>
                  )}

                  {activeOverviewTab === 'governance' && (
                    <div className="mt-4">
                      <GovernanceTab 
                        ticker={filtered[0]?.ticker || ""} 
                        companyId={companyGlobalSearchId}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}