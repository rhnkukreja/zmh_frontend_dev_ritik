import React, { useState } from "react";
import { Dialog } from "@/components/Base/Headless";
import { useAppSelector } from "@/stores/hooks";
import {
  BarChart2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  MessageSquareQuote,
  ShieldCheck,
  Users,
  Vote,
} from "lucide-react";
import type { CompanyReport, ESGInvestor, Rationale } from "./index";

type BasicProps = {
  className?: string;
  children?: React.ReactNode;
};

type SummaryTabProps = {
  filtered: CompanyReport[];
  yearsLoading: boolean;
  availableYears: number[];
  selectedYear: number | null;
  onYearSwitch: (year: number) => void;
  onDownloadPdf: (report: CompanyReport) => void;
  downloadLoading: boolean;
  companyOverviewLoading: boolean;
};

const cx = (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" ");

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
          {icon}
        </div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      {right}
    </div>
  );
}

function toTitleCase(text?: string) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizeFirstLetter(text?: string) {
  const value = String(text ?? "").trim();
  if (!value) return value;
  const first = value.charAt(0);
  return first === first.toUpperCase() ? value : `${first.toUpperCase()}${value.slice(1)}`;
}

function titleCaseAllCapsHeading(text: string) {
  if (!/^[A-Z0-9&/.'()\-,\s]+$/.test(text) || !/[A-Z]/.test(text)) return text;
  return text
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMixedCaseHeading(text: string) {
  return text.replace(/(^|\s)(\d+)([a-z])(?=\b)/g, (_, prefix: string, digits: string, letter: string) => `${prefix}${digits}${letter.toUpperCase()}`);
}

function formatEngagementParagraph(text: string) {
  return text
    .split(/\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      const normalized = normalizeMixedCaseHeading(trimmed);
      if (/^[A-Z0-9&/.'()\-,\s]+$/.test(normalized) && /[A-Z]/.test(normalized)) {
        return titleCaseAllCapsHeading(normalized);
      }

      return normalized;
    })
    .join("\n");
}

function hasMeaningfulValue(value: unknown) {
  const str = String(value ?? "").trim();
  const lower = str.toLowerCase();

  return !!str && !["-", "none", "null", "nan"].includes(lower);
}

function splitParagraphs(paragraphs?: string) {
  return String(paragraphs ?? "")
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function BulletList({ items }: { items?: string[] }) {
  if (!items?.length) return null;

  return (
    <ul className="ml-5 list-disc space-y-1 text-[15px] text-slate-700">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function ShareholderEngagementSection({
  engagement,
}: {
  engagement: NonNullable<CompanyReport["shareholderEngagement"]>;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasData = !!engagement.hasData;
  const sourceUrl = engagement.source || engagement.proxyLink || "";
  const hasSource = hasMeaningfulValue(sourceUrl);
  const paragraphText = String(engagement.paragraphs || "").trim();
  const formattedParagraphText = formatEngagementParagraph(paragraphText);
  const paragraphBlocks = splitParagraphs(formattedParagraphText);
  const detailCards = [
    {
      label: "Number of investors contacted",
      value: engagement.numberOfInvestorsContacted,
      kind: "metric" as const,
    },
    {
      label: "Percentage ownership contacted",
      value: engagement.percentageOwnershipContacted,
      kind: "metric" as const,
    },
    {
      label: "Issues discussed",
      value: engagement.issuesDiscussed,
      kind: "issues" as const,
    },
    {
      label: "Action taken",
      value: engagement.actionTaken,
      kind: "action" as const,
    },
  ];

  const visibleCards = detailCards.filter((item) => {
    if (item.kind === "issues") return !!item.value?.length;
    return hasMeaningfulValue(item.value);
  });

  const hasVisibleCards = visibleCards.length > 0;
  const isDisclosureFallback = /proxy does not disclose engagement details/i.test(paragraphText);
  const showPreview = hasData && !hasVisibleCards && !!paragraphText && !isDisclosureFallback;
  const displayYear = engagement.year ?? "Year N/A";
  const previewText = formattedParagraphText.slice(0, 260);
  const hasMorePreview = formattedParagraphText.length > previewText.length;

  const topMetricCards = visibleCards.filter((item) => item.kind === "metric");
  const issueCard = visibleCards.find((item) => item.kind === "issues");
  const actionCard = visibleCards.find((item) => item.kind === "action");

  const renderCardWidthClass = topMetricCards.length > 1 ? "sm:col-span-1" : "sm:col-span-2";

  const modalParagraphs = paragraphBlocks.length ? paragraphBlocks : paragraphText ? [paragraphText] : [];

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
              <MessageSquareQuote className="h-4 w-4 text-primary" />
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <h3 className="max-w-[180px] whitespace-normal text-[14px] font-semibold leading-5 text-slate-900">
                <span className="block whitespace-nowrap">{displayYear} Proxy Disclosure:</span>
                <span className="block whitespace-nowrap">Shareholder Engagement</span>
              </h3>
              <span className="inline-flex shrink-0 items-center rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-extrabold leading-none text-white shadow-sm">
                BETA
              </span>
            </div>
          </div>

          {hasData && hasVisibleCards ? (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 rounded-full border-slate-300 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setDetailsOpen(true)}
              >
                Detail
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          ) : null}
        </div>

        {!hasData ? (
          formattedParagraphText ? (
            <p className="mt-4 text-[15px] leading-6 text-slate-700 whitespace-pre-line">{formattedParagraphText}</p>
          ) : null
        ) : hasVisibleCards ? (
          <div className="mt-4 space-y-4">
            {topMetricCards.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {topMetricCards.map((item) => (
                  <div
                    key={item.label}
                    className={cx(
                      "rounded-xl border border-slate-200 bg-slate-50 p-3",
                      renderCardWidthClass
                    )}
                  >
                    <div className="text-[13px] font-bold capitalize text-slate-700">{toTitleCase(item.label)}</div>
                    <div className="mt-1 text-[15px] font-normal text-slate-900">{String(item.value)}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {issueCard ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[13px] font-bold capitalize text-slate-700">Issues Discussed</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {issueCard.value?.map((issue, index) => (
                    <span
                      key={`${issue}-${index}`}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[14px] text-slate-700"
                    >
                      {capitalizeFirstLetter(issue)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {actionCard ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[13px] font-bold capitalize text-slate-700">Action Taken</div>
                <div className="mt-1 text-[15px] font-normal leading-6 text-slate-700 whitespace-pre-line">
                  {String(actionCard.value)}
                </div>
              </div>
            ) : null}

          </div>
        ) : isDisclosureFallback ? (
          <p className="mt-4 text-[15px] leading-6 text-slate-700 whitespace-pre-line">{formattedParagraphText}</p>
        ) : showPreview ? (
          <div className="mt-4 space-y-2">
            <p className="text-[15px] leading-6 text-slate-700 whitespace-pre-line">{previewText}</p>
            <div className="flex items-center gap-2">
              {hasMorePreview ? <span className="text-[15px] leading-6 text-slate-500">......</span> : null}
              <Button
                size="sm"
                variant="outline"
                className="gap-2 rounded-full border-primary text-[13px] font-medium text-primary hover:bg-primary/10"
                onClick={() => setDetailsOpen(true)}
              >
                Detail
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog size="xl" open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <Dialog.Panel className="sm:w-[820px] lg:w-[1120px]">
          <Dialog.Title className="relative w-full pr-14">
            <div className="flex items-start gap-2">
              <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
                <MessageSquareQuote className="h-4 w-4 text-primary" />
              </div>
              <div className="flex min-w-0 items-start gap-2">
                <h2 className="max-w-[760px] whitespace-normal text-xl font-semibold leading-6 text-slate-900">
                  {displayYear} Proxy Disclosure: Shareholder Engagement
                </h2>
                <span className="inline-flex shrink-0 items-center rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-extrabold leading-none text-white shadow-sm">
                  BETA
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDetailsOpen(false)}
              className="absolute right-4 top-3 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close shareholder engagement details"
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </Dialog.Title>
          <Dialog.Description className="space-y-5 px-6 py-4">
            <div className="flex justify-end gap-3">
              {hasSource ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open proxy statement"
                  aria-label="Open proxy statement"
                  className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary/10 px-4 py-2 text-[14px] font-medium text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open proxy statement
                </a>
              ) : null}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[15px] font-semibold text-slate-900">Disclosure:</div>
              {modalParagraphs.length ? (
                modalParagraphs.map((paragraph, index) => (
                  <p key={index} className="text-[15px] leading-7 text-slate-700 whitespace-pre-line">
                    {paragraph}
                  </p>
                ))
              ) : (
                <div className="text-[15px] leading-7 text-slate-700">
                  No detailed narrative was provided for this shareholder engagement record.
                </div>
              )}
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>
    </>
  );
}

const normalizeProposalName = (text: string = "") =>
  text
    .toLowerCase()
    .replace(/\(proponent:.*?\)/gi, "")
    .replace(/[–—-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isPlaceholder = (value: any) => {
  const str = String(value ?? "").trim().toLowerCase();

  return (
    str === "" ||
    str === "-" ||
    str === "none" ||
    str === "null" ||
    str === "nan" ||
    str.includes("meeting not held")
  );
};

// When Say-on-Pay support is 0% for a year, the proposal was not on the ballot.
// Replace "<year> Support: 0.0%" with an explanatory message. The year is taken
// from the bullet itself, so it stays dynamic for any year (2025, 2026, ...).
function transformSayOnPayBullets(items?: string[], companyName?: string): string[] | undefined {
  if (!items) return items;
  return items.map((item) => {
    // Hotfix: Correct the halved Say-on-Pay percentage specifically for Proto Labs
    if (companyName && companyName.includes("Proto Labs") && item.includes("41.10%")) {
      return item.replace("41.10%", "82.2%");
    }

    const match = item.match(/(\d{4})\s+Support:\s*([\d.]+)\s*%/i);
    if (match && parseFloat(match[2]) === 0) {
      return `Say on Pay not on ballot at ${match[1]} shareholder meeting`;
    }
    return item;
  });
}

function ProposalList({ items }: { items?: string[] }) {
  const { agmSummaryDetails } = useAppSelector((state: any) => state.dashboard);

  const getFallbackProposal = (proposalName: string) => {

    if (
        !agmSummaryDetails?.proposals?.length ||
        !agmSummaryDetails?.proposals_headers?.length
    ) {
        return null;
    }

    const headers = agmSummaryDetails.proposals_headers;

    const proposalCol = headers[0]?.field;

    if (!proposalCol) return null;

    const target = normalizeProposalName(proposalName);

    let bestRow = null;
    let bestScore = 0;

    agmSummaryDetails.proposals.forEach((row:any) => {

        const current = normalizeProposalName(
            String(row[proposalCol] || "")
        );

        const targetWords = target.split(" ");
        const currentWords = current.split(" ");

        const score = targetWords.filter(w => currentWords.includes(w)).length;

        if (score > bestScore) {
            bestScore = score;
            bestRow = row;
        }

    });

    return bestScore >= 3 ? bestRow : null;
};

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        if (!item.includes("(Proponent:")) {
          return (
            <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[15px] text-slate-700">{item}</div>
            </div>
          );
        }

        const proponentMatch = item.match(/(.*)\(Proponent:\s*([^)]+)\)\s*–(.*)/i);

        if (proponentMatch) {
          const title = proponentMatch[1].trim();
          const proponent = proponentMatch[2].trim();
          let outcomeStr = proponentMatch[3].trim();

          const row = getFallbackProposal(title);

if (isPlaceholder(outcomeStr) && row) {

    const headers = agmSummaryDetails.proposals_headers;

    const pctKey = headers[headers.length - 1]?.field;

    outcomeStr =
        row[pctKey] ||
        row.status ||
        row.vote_outcome ||
        row.result ||
        "";

}

if (isPlaceholder(outcomeStr)) {

    outcomeStr = "Not presented";

}

          const numericString = outcomeStr.replace('%', '');
          const supportPercent = parseFloat(numericString);
          const isNumeric = !isNaN(supportPercent) && outcomeStr !== "" && !/[a-zA-Z]/.test(numericString);
          
          let renderText = outcomeStr;
          if (outcomeStr.toLowerCase().includes("withdrawn")) renderText = "Withdrawn";
          else if (outcomeStr.toLowerCase().includes("omitted")) renderText = "Omitted";
          else if (outcomeStr.toLowerCase().includes("not presented") || outcomeStr.toLowerCase().includes("meeting not held")) renderText = "Not presented";
          else if (isNumeric) renderText = outcomeStr.includes("%") ? outcomeStr : `${outcomeStr}%`;

          const isGreen = isNumeric && supportPercent >= 50;
          const pillClass = (!isNumeric || renderText === "Withdrawn" || renderText === "Omitted" || renderText === "Not presented")
            ? "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[15px] font-semibold text-slate-700"
            : isGreen
            ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[15px] font-semibold text-emerald-700"
            : "rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[15px] font-semibold text-red-700";

          return (
            <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[15px] font-semibold text-slate-900">{title}</div>
                  <div className="mt-1 text-[15px] text-slate-600">
                    <span className="font-medium">Proponent:</span> {proponent}
                  </div>
                </div>
                <div className={pillClass}>{renderText}</div>
              </div>
            </div>
          );
        }

        return (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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
  }>;
}) {
  const { agmSummaryDetails } = useAppSelector((state: any) => state.dashboard);

  const getFallbackProposal = (proposalName: string) => {

    if (
        !agmSummaryDetails?.proposals?.length ||
        !agmSummaryDetails?.proposals_headers?.length
    ) {
        return null;
    }

    const headers = agmSummaryDetails.proposals_headers;

    const proposalCol = headers[0]?.field;

    if (!proposalCol) return null;

    const target = normalizeProposalName(proposalName);

    let bestRow = null;
    let bestScore = 0;

    agmSummaryDetails.proposals.forEach((row:any) => {

        const current = normalizeProposalName(
            String(row[proposalCol] || "")
        );

        const targetWords = target.split(" ");
        const currentWords = current.split(" ");

        const score = targetWords.filter(w => currentWords.includes(w)).length;

        if (score > bestScore) {
            bestScore = score;
            bestRow = row;
        }

    });

    return bestScore >= 3 ? bestRow : null;
};

  return (
    <div className="space-y-4">
      {proposals.map((proposal, index) => {
        const allFields = [
            proposal.outcome_percentage,
            proposal.vote_outcome,
            (proposal as any).status
        ].map(val => String(val || "").trim().toLowerCase());

        let displayPercentage = proposal.outcome_percentage;

        if (allFields.some(f => f.includes("withdrawn"))) {
            displayPercentage = "Withdrawn";
        } else if (allFields.some(f => f.includes("omitted"))) {
            displayPercentage = "Omitted";
        } else {
            const isPlaceholder = !displayPercentage ||
                      displayPercentage === "-" ||
                      displayPercentage.trim() === "" ||
                      displayPercentage.toLowerCase() === 'none' ||
                      displayPercentage.includes("Meeting not held");

            if (isPlaceholder) {
                const row = getFallbackProposal(proposal.proposal_name);

            if (row) {

                const headers = agmSummaryDetails.proposals_headers;

                const pctKey = headers[headers.length - 1]?.field;

                displayPercentage =
                    row[pctKey] ||
                    row.status ||
                    row.vote_outcome ||
                    row.result ||
                    "";

                }
                  }
                    }

        const stringVal = String(displayPercentage || "").trim();
        const numericString = stringVal.replace('%', '');
        const supportPercent = parseFloat(numericString);
        
        const isNumeric = !isNaN(supportPercent) && stringVal !== "" && !/[a-zA-Z]/.test(numericString);
        const isGreen = isNumeric && supportPercent >= 50;

        let renderText = "";

        if (isPlaceholder(displayPercentage)) {

        renderText = "Not presented";

          } else {

        const value = String(displayPercentage).trim().toLowerCase();

            if (value.includes("withdrawn")) {

                renderText = "Withdrawn";

            } else if (value.includes("omitted")) {

                renderText = "Omitted";

            } else if (value.includes("not presented")) {

                renderText = "Not presented";

            } else {

                renderText = String(displayPercentage).includes("%")
                    ? String(displayPercentage)
                    : `${displayPercentage}%`;

            }

        }

        const pillClass = (!isNumeric || renderText === "Withdrawn" || renderText === "Omitted" || renderText === "Not presented")
          ? "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[15px] font-semibold text-slate-700"
          : isGreen
          ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[15px] font-semibold text-emerald-700"
          : "rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[15px] font-semibold text-red-700";

        return (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-[15px] font-semibold text-slate-900">{proposal.proposal_name}</div>
                <div className="mt-1 text-[15px] text-slate-600">
                  <span className="font-medium">Proponent:</span> {proposal.proponent}
                </div>
              </div>
              <div className={pillClass}>{renderText}</div>
            </div>

            {proposal.institution_votes?.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="mb-2 text-[13px] font-semibold text-slate-500">Top Investor Votes</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {proposal.institution_votes.map((institutionVote, institutionIndex) => (
                    <div
                      key={institutionIndex}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="truncate pr-2 text-[14px] font-medium text-slate-700">
                        {institutionVote.institution}
                      </div>
                      <Badge
                        variant={institutionVote.vote === "For" ? "secondary" : "destructive"}
                        className="shrink-0 rounded-full"
                      >
                        {institutionVote.vote}
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
  const icon =
    iconKey === "board" ? <Users className="h-4 w-4 text-primary" /> :
    iconKey === "sop" ? <Vote className="h-4 w-4 text-primary" /> :
    iconKey === "auditor" ? <FileCheck2 className="h-4 w-4 text-primary" /> :
    iconKey === "sp" ? <FileText className="h-4 w-4 text-primary" /> :
    iconKey === "esg" ? <BarChart2 className="h-4 w-4 text-primary" /> :
    <ShieldCheck className="h-4 w-4 text-primary" />;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <SectionHeader
          title={title}
          icon={icon}
          right={
            <Button
              variant="default"
              size="sm"
              onClick={() => setOpen((value) => !value)}
              className="gap-1"
            >
              {open ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
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
      <div className="mb-3 text-[15px] font-semibold text-slate-500">
        Voting Rationale Disclosures <span>(Against or Withhold votes for top 20 investors only)</span>
      </div>
      {summary && <p className="mb-3 text-[15px] text-slate-700">{summary}</p>}
      <div className="space-y-3">
        {items.map((rationale, index) => (
          <div key={index} className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[15px] font-semibold text-slate-900">{rationale.investor}</div>
              <Badge variant="secondary" className="rounded-full">
                {rationale.vote}
              </Badge>
            </div>
            <div className="mt-1 text-[15px] text-slate-700">
              <span className="font-medium">Proposal:</span> {rationale.proposal}
            </div>
            {rationale.notes ? (
              <div className="mt-2 space-y-2">
                {rationale.notes
                  .split(/<br\s*\/?>/gi)
                  .filter((note) => note.trim())
                  .map((note, noteIndex, notes) => (
                    <div key={noteIndex} className="text-[15px] text-slate-700">
                      <span className="font-medium">
                        {notes.length === 1 ? "Rationale:" : `Rationale ${noteIndex + 1}:`}
                      </span>{" "}
                      {note.trim()}
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

function ESGInvestorBlock({ inv }: { inv: ESGInvestor }) {
  const hasTopics = inv.env || inv.soc || inv.gov;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 text-[15px] font-semibold text-slate-900">{inv.name}</div>

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
        <div className="text-[15px] italic text-slate-500">
          {inv.name} doesn't disclose the engagement details.
        </div>
      )}
    </div>
  );
}

function SummaryLoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <Card className="rounded-2xl shadow-sm md:col-span-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] text-slate-900">
            <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full" variant="outline">
              <span className="h-4 w-14 animate-pulse rounded bg-slate-200" />
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-white p-3">
            <SectionHeader title="Share Price Takeaway" icon={<BarChart3 className="h-4 w-4 text-primary" />} />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-[96%] animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-[88%] animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-[70%] animate-pulse rounded bg-slate-200" />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-3">
            <SectionHeader title="Proxy Advisor Influence" icon={<ShieldCheck className="h-4 w-4 text-primary" />} />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-[92%] animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-[82%] animate-pulse rounded bg-slate-200" />
            </div>
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`proxy-bucket-skeleton-${index}`}
                  className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2"
                >
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
                <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              </div>
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="mt-4 space-y-3">
              <div className="h-4 w-[96%] animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-[90%] animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-[84%] animate-pulse rounded bg-slate-200" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6 md:col-span-8">
        <CollapsibleCard title="Board of Directors" iconKey="board" defaultOpen>
          <div className="space-y-2">
            <div className="h-4 w-[92%] animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-[84%] animate-pulse rounded bg-slate-200" />
          </div>
          <Separator className="my-4" />
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-[76%] animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-[68%] animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-[72%] animate-pulse rounded bg-slate-200" />
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Executive Compensation (Say-on-Pay)" iconKey="sop" defaultOpen>
          <div className="space-y-2">
            <div className="h-4 w-[86%] animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-[70%] animate-pulse rounded bg-slate-200" />
          </div>
          <Separator className="my-4" />
          <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-[80%] animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-[74%] animate-pulse rounded bg-slate-200" />
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Auditor Ratification" iconKey="auditor" defaultOpen>
          <div className="space-y-2">
            <div className="h-4 w-[88%] animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-[74%] animate-pulse rounded bg-slate-200" />
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Shareholder Proposals" iconKey="sp" defaultOpen>
          <div className="space-y-2">
            <div className="h-4 w-[90%] animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-[82%] animate-pulse rounded bg-slate-200" />
          </div>
          <Separator className="my-4" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-[78%] animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-[68%] animate-pulse rounded bg-slate-200" />
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}

export default function CompanyOverviewSummaryTab({
  filtered,
  yearsLoading,
  availableYears,
  selectedYear,
  onYearSwitch,
  onDownloadPdf,
  downloadLoading,
  companyOverviewLoading,
}: SummaryTabProps) {
  const isLoading = yearsLoading || companyOverviewLoading;
  const report = filtered[0];

  return (
    <div className="min-h-screen bg-white mt-3.5 p-6">
      <div className="mx-auto space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mt-2 pb-2 text-xl font-bold tracking-tight">Key Governance & Investor Summary</h1>
            {(yearsLoading || availableYears.length > 0) && (
              <div className="mt-2">
                <div className="flex flex-wrap items-center gap-2">
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
                            onClick={() => onYearSwitch(year)}
                            className={cx(
                              "w-24 whitespace-nowrap rounded-[0.6rem] font-medium cursor-pointer border transition-colors px-2 py-1.5",
                              isActiveYear
                                ? "border-primary bg-red-800 text-white font-semibold"
                                : "text-primary bg-primary/10 border-primary/10 hover:bg-primary/20"
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
          </div>
          <div className="flex items-center gap-2">
            {companyOverviewLoading && !yearsLoading ? (
              <span className="inline-flex h-6 items-center rounded-full px-3 text-[13px] font-medium text-slate-500">
                Updating...
              </span>
            ) : null}
            <Button
              variant="default"
              className="gap-2 disabled:!opacity-100 disabled:!bg-primary/80 disabled:!text-white disabled:!border-primary/80"
              onClick={() => {
                if (report) {
                  onDownloadPdf(report);
                }
              }}
              disabled={downloadLoading || isLoading || !report}
            >
              <Download className="h-4 w-4" />
              {downloadLoading ? "Downloading..." : "Download Summary"}
            </Button>
          </div>
        </header>

        {isLoading ? (
          <SummaryLoadingSkeleton />
        ) : !report ? (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-[15px] text-slate-600">
              No matches. Try a different search term.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-12">
            <Card className="rounded-2xl shadow-sm md:col-span-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] text-slate-900">{report.company}</CardTitle>

                {report.sharePriceTakeaway && report.asOf && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full" variant="outline">
                      As of {report.asOf}
                    </Badge>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {report.sharePriceTakeaway && (
                  <div className="rounded-xl border bg-white p-3">
                    <SectionHeader title="Share Price Takeaway" icon={<BarChart3 className="h-4 w-4 text-primary" />} />
                    <p className="mt-3 text-[15px] text-slate-700">{report.sharePriceTakeaway}</p>
                  </div>
                )}

                {report.proxy ? (
                  <div className="rounded-xl border bg-white p-3">
                    <SectionHeader title="Proxy Advisor Influence" icon={<ShieldCheck className="h-4 w-4 text-primary" />} />
                    <p className="mt-3 text-[15px] text-slate-700">{report.proxy.summary}</p>
                    <div className="mt-3 space-y-2">
                      {report.proxy.buckets
                        .filter((bucket) => bucket.pct > 0)
                        .map((bucket, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2"
                          >
                            <div className="text-[15px] text-slate-700">{bucket.label}</div>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[15px] font-semibold ${pctPill(bucket.pct)}`}
                            >
                              {bucket.pct.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                {report.shareholderEngagement ? (
                  <ShareholderEngagementSection engagement={report.shareholderEngagement} />
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-6 md:col-span-8">
              {!report.board && !report.sop && !report.auditor && !report.shareholderProposals && !report.shareholderEngagement && !report.esg && !report.proxy && (
                <div className="h-52 flex items-center justify-center rounded-2xl border border-slate-200 bg-white">
                  <p className="font-semibold text-slate-500">
                    No Company Overview data found for {report.company}.
                  </p>
                </div>
              )}
              {report.board ? (
                <CollapsibleCard title="Board of Directors" iconKey="board">
                  <BulletList items={report.board.headlineBullets} />
                  {report.board.lowestSupport?.length ? (
                    <>
                      <Separator className="my-4" />
                      {/* <div className="text-[15px] font-semibold text-slate-500">Lowest support</div> */}
                      <div className="text-[15px] font-semibold text-slate-500">
                        {report.board.lowestSupport?.length > 0 && (
                          <>
                            {report.board.lowestSupport.length}{" "}
                            {report.board.lowestSupport.length > 1 ? "Directors" : "Director"}{" "}
                          </>
                        )}
                        Lowest support
                      </div>
                      <BulletList items={report.board.lowestSupport} />
                    </>
                  ) : null}
                  <RationaleList items={report.board.rationales} />
                </CollapsibleCard>
              ) : null}

              {report.sop ? (
  <CollapsibleCard title="Executive Compensation (Say-on-Pay)" iconKey="sop">
    {/* Pass report.company to allow the hotfix to trigger safely */}
    <BulletList items={transformSayOnPayBullets(report.sop.headlineBullets, report.company)} />
    <RationaleList items={report.sop.rationales} summary={report.sop.rationaleSummary} />
  </CollapsibleCard>
) : null}

              {report.auditor ? (
                <CollapsibleCard title="Auditor Ratification" iconKey="auditor">
                  <BulletList items={report.auditor.headlineBullets} />
                  <RationaleList items={report.auditor.rationales} />
                </CollapsibleCard>
              ) : null}

              {report.shareholderProposals ? (
  <CollapsibleCard title="Shareholder Proposals" iconKey="sp">
    
    {/* 1. Check if the paginated 'results' format is coming from the API */}
    {(report.shareholderProposals as any).results?.length ? (
      <>
        <Separator className="my-4" />
        <div className="mb-3 text-[15px] font-semibold text-slate-500">
          Shareholder Proposals
        </div>
        <ProposalVotesList
          proposals={(report.shareholderProposals as any).results.map((p: any) => ({
            proposal_name: p.initiative || "Stockholder Proposal",
            proponent: p.proponent_name || p.proponent || "-",
            outcome_percentage: p.outcome_percentage || null,
            vote_outcome: p.vote_outcome || p.status || null, // <--- THE FIX
            year: p.year
          }))}
        />
      </>
    ) : report.shareholderProposals.proposalVotes?.length ? (
      <>
        <Separator className="my-4" />
        <div className="mb-3 text-[15px] font-semibold text-slate-500">
          Proposal Details with Top Investor Votes
        </div>
        <ProposalVotesList proposals={report.shareholderProposals.proposalVotes} />
      </>
    ) : report.shareholderProposals.selected?.length ? (
      <>
        <Separator className="my-4" />
        <div className="mb-3 text-[15px] font-semibold text-slate-500">Selected proposal results</div>
        <ProposalList items={report.shareholderProposals.selected} />
      </>
    ) : null}

  </CollapsibleCard>
) : null}

              {report.esg ? (
                <CollapsibleCard title="Engagement Details (as disclosed by investors)" iconKey="esg">
                  {report.esg.themeSummary ? <p className="text-[15px] text-slate-700">{report.esg.themeSummary}</p> : null}
                  <div className="mt-4 grid gap-3">
                    {report.esg.investors.map((investor, index) => (
                      <ESGInvestorBlock key={index} inv={investor} />
                    ))}
                  </div>
                </CollapsibleCard>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
