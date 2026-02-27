  // Helper to render text with '**' as bold
  function renderBold(text: string | undefined) {
    if (!text) return null;
    // Replace **text** with <strong>text</strong>
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return <strong key={idx}>{part.replace(/\*\*/g, "")}</strong>;
      }
      return part;
    });
  }
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  BarChart3,
  BarChart2,
  Users,
  Vote,
  FileCheck2,
  FileText,
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

const Separator = ({ className }: { className?: string }) => (
  <div className={cx("h-px w-full bg-slate-200", className)} />
);

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
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
      return <FileCheck2 className="h-4 w-4" />;
    case "auditor":
      return <FileText className="h-4 w-4" />;
    case "sp":
      return <Vote className="h-4 w-4" />;
    default:
      return null;
  }
};

type CompanyReport = {
  report: { headlineBullets: any[]; rationales: any[]; };
  company: string;
  ticker: string;
  asOf: string;
  sharePriceTakeaway: string;
  esg?: {
    themeSummary: string;
    investors: Array<{
      name: string;
      env?: string[];
      soc?: string[];
      gov?: string[];
      noteIfNoTopics?: boolean;
    }>;
  };
  proxy?: {
    summary: string;
    buckets: Array<{ label: string; pct: number }>;
  };
  board?: {
    headlineBullets: string[];
    lowestSupport?: string[];
    rationales?: Array<{
      investor: string;
      vote: string;
      proposal: string;
      notes?: string;
    }>;
  };
  sop?: {
    headlineBullets: string[];
    rationaleSummary?: string;
    rationales?: Array<{
      investor: string;
      vote: string;
      proposal: string;
      notes?: string;
    }>;
  };
  auditor?: {
    headlineBullets: string[];
  };
  shareholderProposals?: {
    headlineBullets: string[];
    selected?: string[];
  };
};

type ESGInvestorProps = {
  inv: {
    name: string;
    env?: string[];
    soc?: string[];
    gov?: string[];
    noteIfNoTopics?: boolean;
  };
};

function ESGInvestorBlock({ inv }: ESGInvestorProps) {
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

type BulletListProps = { items?: string[] };

function BulletList({ items }: BulletListProps) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="ml-5 list-disc space-y-1 text-[15px] text-slate-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

type ProposalListProps = { items?: string[] };

function ProposalList({ items }: ProposalListProps) {
  if (!items || items.length === 0) return null;
  
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        // Parse: "PROPOSAL TITLE (Proponent: Name) – XX.X%"
        const proponentMatch = item.match(/\(Proponent:\s*([^)]+)\)\s*–\s*([\d.]+%)/i);
        
        if (proponentMatch) {
          const title = item.substring(0, item.indexOf('(Proponent:')).trim();
          const proponent = proponentMatch[1].trim();
          const support = proponentMatch[2];
          
          return (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[15px] font-semibold text-slate-900">{title}</div>
                  <div className="mt-1 text-[15px] text-slate-600">
                    <span className="font-medium">Proponent:</span> {proponent}
                  </div>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[15px] font-semibold text-emerald-700">
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

type RationaleListProps = {
  items?: Array<{ investor: string; vote: string; proposal: string; notes?: string }>;
  summary?: string;
};

function RationaleList({ items, summary }: RationaleListProps) {
  if (!items || items.length === 0) return null;
  return (
    <>
      <Separator className="my-4" />
      <div className="text-[15px] font-semibold text-slate-500 mb-3">
        Voting Rationale Disclosures
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
                {r.notes.split(/<br\s*\/?>/gi).filter(n => n.trim()).map((note, noteIdx) => (
                  <div key={noteIdx} className="text-[15px] text-slate-700">
                    <span className="font-medium">Rationale {noteIdx + 1}:</span> {note.trim()}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

type CollapsibleCardProps = {
  title: string;
  iconKey?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function CollapsibleCard({
  title,
  iconKey,
  children,
  defaultOpen,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            {iconKey && iconForSection(iconKey)}
            <CardTitle>{title}</CardTitle>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function buildPlainText(report: CompanyReport): string {
  const lines: string[] = [];
  lines.push(report.company);
  lines.push(report.ticker);
  lines.push(report.asOf);
  lines.push("Share Price Performance");
  lines.push(report.sharePriceTakeaway);

  if (report.esg) {
    lines.push("ESG & Engagement");
    lines.push(report.esg.themeSummary);
    report.esg.investors.forEach((inv) => {
      lines.push(inv.name);
      if (inv.env) inv.env.forEach((e) => lines.push(e));
      if (inv.soc) inv.soc.forEach((s) => lines.push(s));
      if (inv.gov) inv.gov.forEach((g) => lines.push(g));
    });
  }

  if (report.proxy) {
    lines.push("Proxy Advisor Influence");
    lines.push(report.proxy.summary);
    report.proxy.buckets.forEach((b) => lines.push(`${b.label}: ${b.pct}%`));
  }

  if (report.board) {
    lines.push("Board of Directors");
    report.board.headlineBullets.forEach((b) => lines.push(`- ${b}`));
    report.board.lowestSupport?.forEach((b) => lines.push(`- ${b}`));
    report.board.rationales?.forEach((r) => {
      lines.push(`- ${r.investor} – ${r.vote}`);
      lines.push(`  - Proposal: ${r.proposal}`);
      if (r.notes) lines.push(`  - Notes: ${r.notes}`);
    });
  }

  if (report.sop) {
    lines.push("Executive Compensation (Say-on-Pay)");
    report.sop.headlineBullets.forEach((b) => lines.push(`- ${b}`));
    if (report.sop.rationaleSummary) lines.push(report.sop.rationaleSummary);
    report.sop.rationales?.forEach((r) => {
      lines.push(`- ${r.investor} – ${r.vote}`);
      lines.push(`  - Proposal: ${r.proposal}`);
      if (r.notes) lines.push(`  - Notes: ${r.notes}`);
    });
  }

  if (report.auditor) {
    lines.push("Auditor Ratification");
    report.auditor.headlineBullets.forEach((b) => lines.push(`- ${b}`));
  }

  if (report.shareholderProposals) {
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
    sharePriceTakeaway: "",
    report: {
      headlineBullets: [],
      rationales: []
    }
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

export default function CompanyOverviewGPT() {
  const { companyGlobalSearchId } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const { companyOverviewGPTData, companyOverviewGPTLoading } = useAppSelector(
    (state) => state.dashboard
  );

  const [query, setQuery] = useState("");

  // Transform API data to UI format
  const apiReport = useMemo(() => {
    return transformApiDataToReport(companyOverviewGPTData);
  }, [companyOverviewGPTData]);

  // Use API data if available
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
      {companyOverviewGPTLoading ? (
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
          <p className="text-gray-500 text-[15px] font-medium">Search for a company to view its overview</p>
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

                <CardContent className="py-10 text-center text-[15px] text-slate-600">
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
                          </CollapsibleCard>
                        ) : null}

                        {r.shareholderProposals ? (
                          <CollapsibleCard title="Shareholder Proposals" iconKey="sp">
                            <BulletList items={r.shareholderProposals.headlineBullets} />
                            {r.shareholderProposals.selected?.length ? (
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
          </div>
        </div>
      )}
    </>
  );
}
