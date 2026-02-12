import { forwardRef, useRef, useState } from "react";
import { CompanyReportData } from "@/types/companyReport";
import zmhLogo from "@/assets/images/logo/zmh-logo.jpg";
import html2canvas from "html2canvas";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import "./CompanyReport.css";

// Section Components
import {
  SharePricePerformanceSection,
  Top20InvestorsSection,
  InvestorsVotingAgainstSection,
  EngagementStatsSection,
  ShareholderProposalsSection,
  KeyTakeawaysSection,
  MeetingDetailsSection
} from "./sections";

(pdfMake as { vfs: Record<string, string> }).vfs =
  (pdfFonts as { pdfMake?: { vfs?: Record<string, string> }; vfs?: Record<string, string> }).pdfMake?.vfs ||
  (pdfFonts as { vfs?: Record<string, string> }).vfs ||
  {};

type Content = any;
type TableCell = any;
type TDocumentDefinitions = any;

interface CompanyReportProps {
  data: CompanyReportData;
  onClose?: () => void;
}

const CompanyReport = forwardRef<HTMLDivElement, CompanyReportProps>(
  ({ data, onClose }, ref) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const formatUSDate = (dateValue?: string | null) => {
      if (!dateValue) return "";
      const dt = new Date(dateValue);
      if (Number.isNaN(dt.getTime())) return String(dateValue);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(dt);
    };

    const formatValue = (value: unknown) => {
      if (value === null || value === undefined) return "";
      if (Array.isArray(value)) return value.map(v => formatValue(v)).join(", ");
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    };

    const formatPercent = (value: unknown, digits = 1) => {
      if (value === null || value === undefined || value === "") return "";
      const num = typeof value === "number" ? value : parseFloat(String(value).replace("%", ""));
      if (Number.isNaN(num)) return String(value);
      return `${num.toFixed(digits)}%`;
    };

    const normalizeToArray = (value: any) => {
      if (!value) return [] as any[];
      if (Array.isArray(value)) return value;
      if (typeof value === "object") {
        const possibleArrayKeys = ["data", "results", "items", "engagements", "records"];
        for (const key of possibleArrayKeys) {
          if (Array.isArray(value[key])) return value[key];
        }
        const keys = Object.keys(value);
        if (keys.length > 0 && keys.every(k => /^\d{4}$/.test(k))) {
          const flattened: any[] = [];
          keys.forEach(year => {
            const items = Array.isArray(value[year]) ? value[year] : [];
            items.forEach((item: any) => flattened.push({ ...item, year: item.year || year }));
          });
          return flattened;
        }
        return [value];
      }
      return [] as any[];
    };

    const parseSplitVoteCounts = (value: unknown): { for?: number; against?: number } | null => {
      if (!value) return null;
      if (typeof value === "object") return value as { for?: number; against?: number };
      if (typeof value === "string") {
        try {
          const normalized = value
            .trim()
            .replace(/'/g, '"')
            .replace(/\bNone\b/g, "null")
            .replace(/\bTrue\b/g, "true")
            .replace(/\bFalse\b/g, "false");
          const parsed = JSON.parse(normalized);
          if (parsed && typeof parsed === "object") return parsed as { for?: number; against?: number };
        } catch {
          return null;
        }
      }
      return null;
    };

    const buildTable = (
      headerRow: TableCell[],
      bodyRows: TableCell[][],
      widths?: Array<string | number>,
      layout?: any
    ) => ({
      table: {
        headerRows: 0,
        dontBreakRows: true,
        widths: widths || headerRow.map(() => "*"),
        body: [headerRow, ...bodyRows]
      },
      layout: layout || "lightHorizontalLines",
      unbreakable: false
    });

    const getCssValue = (cssVar: string, fallback = "") => {
      if (typeof window === "undefined") return fallback;
      const themeRoot =
        (document.querySelector(
          ".theme-1,.theme-2,.theme-3,.theme-4,.theme-5,.theme-6"
        ) as HTMLElement | null) || document.documentElement;
      const raw = getComputedStyle(themeRoot).getPropertyValue(cssVar).trim();
      return raw || fallback;
    };

    const getComputedColorFromClass = (className: string, fallback: string) => {
      if (typeof window === "undefined") return fallback;
      const el = document.createElement("div");
      el.className = className;
      el.style.position = "absolute";
      el.style.left = "-9999px";
      el.style.top = "-9999px";
      el.style.borderTopWidth = "2px";
      el.style.borderTopStyle = "solid";
      document.body.appendChild(el);
      const color = getComputedStyle(el).borderTopColor || fallback;
      document.body.removeChild(el);
      return color;
    };

    const resolveColor = (value: string, fallback: string) => {
      const raw = value?.trim();
      if (!raw) return fallback;
      if (raw.startsWith("#") || raw.startsWith("rgb(")) return raw;
      const parts = raw.split(/[\s,/]+/).filter(Boolean);
      if (parts.length >= 3) return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
      return fallback;
    };

    const captureChartImages = async (container: HTMLElement) => {
      const chartNodes = Array.from(container.querySelectorAll("[data-pdf-chart]")) as HTMLElement[];
      const images: { title?: string; dataUrl: string }[] = [];

      for (const node of chartNodes) {
        const title = node.getAttribute("data-title") || undefined;
        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff"
        });
        images.push({ title, dataUrl: canvas.toDataURL("image/png") });
      }

      return images;
    };

    const handleExportToPDF = async () => {
      setIsGeneratingPDF(true);
      try {
        const companyName = data.finnhub_data?.company_name || "Company";
        const asOf = formatUSDate(data.data_as_of) || formatUSDate(new Date().toISOString());

        const input = reportRef.current;
        const chartImages = input ? await captureChartImages(input) : [];
        const chartImageMap = new Map(
          chartImages
            .filter(img => img.title)
            .map(img => [img.title as string, img.dataUrl])
        );

        const primaryColor = "#b91c1c";
        const successColor = resolveColor(getCssValue("--color-success"), "#16a34a");
        const dangerColor = resolveColor(getCssValue("--color-danger"), "#b91c1c");
        const gray50 = "#f9fafb";
        const gray200 = "#e5e7eb";
        const gray600 = "#4b5563";
        const gray700 = "#374151";
        const gray900 = "#111827";

        const iconCheck = (color: string) =>
          `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="${color}" />
            <path d="M7 12l3 3 7-7" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>`;

        const iconNoData = (color: string) =>
          `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <polygon points="4,9 12,5 12,19 4,15" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" />
            <rect x="12" y="9" width="3" height="6" fill="none" stroke="${color}" stroke-width="2" />
            <line x1="3" y1="5" x2="17" y2="19" stroke="${color}" stroke-width="2" stroke-linecap="round" />
          </svg>`;

        const getStatusIcon = (value: any, positiveColor: string, showNoData: boolean) => {
          const normalizedString = typeof value === "string" ? value.trim().toLowerCase() : "";
          const notDisclosedValues = new Set(["none", "nd", "nse", "nsd", "n/d", "not disclosed", "not disclosed in npx"]);

          if (value === null || value === undefined || value === "" || notDisclosedValues.has(normalizedString)) {
            if (!showNoData) return "";
            return { svg: iconNoData(dangerColor), width: 12, height: 12, alignment: "center" };
          }

          if (Array.isArray(value)) {
            return value.length > 0
                    ? { svg: iconCheck(positiveColor), width: 12, height: 12, alignment: "center" }
              : "";
          }

          const normalized = String(value).trim().toLowerCase();
          const truthy = new Set(["true", "yes", "y", "1", "t"]);
          const falsy = new Set(["false", "no", "n", "0", "f"]);

          if (value === true || truthy.has(normalized) || (typeof value === "number" && value > 0)) {
            return { svg: iconCheck(positiveColor), width: 12, height: 12, alignment: "center" };
          }

          if (value === false || falsy.has(normalized) || (typeof value === "number" && value === 0)) return "";
          return "";
        };

        const tableLayout = {
          hLineWidth: (i: number) => {
            if (i <= 1) return 0;
            return 0.5;
          },
          vLineWidth: () => 0,
          hLineColor: () => gray200,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4
        };
        const addSectionTitle = (title: string) => {
          content.push({ text: title, style: "sectionTitle" });
          content.push({
            table: {
              widths: ["*"],
              body: [[{ text: "", margin: [0, 0, 0, 0] }]]
            },
            layout: {
              hLineWidth: (i: number) => (i === 1 ? 1 : 0),
              vLineWidth: () => 0,
              hLineColor: () => primaryColor,
              paddingTop: () => 0,
              paddingBottom: () => 0
            },
            margin: [0, 0, 0, 0]
          });
        };
        const content: Content[] = [
          { text: `${companyName} - Company Report`, style: "title" },
          { text: `Data as of: ${asOf}`, style: "subtitle" },
          { text: " ", margin: [0, 6] }
        ];

        if (data.key_takeaways && data.key_takeaways.length > 0) {
          addSectionTitle("Key Takeaways");
          const headerRow: TableCell[] = [
            { text: "Topic", style: "tableHeader" },
            { text: "Key Takeaways", style: "tableHeader" },
            { text: "Activism/Governance Lens", style: "tableHeader" }
          ];
          const bodyRows = data.key_takeaways.map(item => [
            item.topic || "",
            item.key_takeaways || "",
            item.activism_governance_lens || ""
          ]);
          content.push(buildTable(headerRow, bodyRows, ["22%", "39%", "39%"], tableLayout));
          content.push({ text: " ", margin: [0, 6] });
        }

        if (data.share_price_performance_data) {
          const perfData = data.share_price_performance_data;
          const entities = Object.keys(perfData).filter(key => key !== "data_as_of");
          const companyKey = entities.find(key =>
            !key.toLowerCase().includes("nasdaq") &&
            !key.toLowerCase().includes("s&p") &&
            !key.toLowerCase().includes("sp500")
          );
          const nasdaqKey = entities.find(key => key.toLowerCase().includes("nasdaq"));
          const sp500Key = entities.find(key => key.toLowerCase().includes("s&p") || key.toLowerCase().includes("sp500"));

          const getReturn = (entityKey: string | undefined, period: "1yr" | "3yr" | "5yr" | "10yr") => {
            if (!entityKey) return null;
            const entityData = perfData[entityKey] as { [k: string]: any } | string | undefined;
            if (!entityData || typeof entityData === "string") return null;
            return entityData[period]?.pct_return ?? null;
          };

          addSectionTitle("Share Price Performance");
          const headerRow: TableCell[] = [
            { text: "Name", style: "tableHeader" },
            { text: "1-Year", style: "tableHeader", alignment: "center" },
            { text: "3-Year", style: "tableHeader", alignment: "center" },
            { text: "5-Year", style: "tableHeader", alignment: "center" }
          ];
          const rows: TableCell[][] = [];
          const addRow = (name?: string, r1?: number | null, r3?: number | null, r5?: number | null) => {
            if (!name) return;
            const r1IsBad = r1 !== null && r1 !== undefined && r1 < 0;
            const r3IsBad = r3 !== null && r3 !== undefined && r3 < 0;
            const r5IsBad = r5 !== null && r5 !== undefined && r5 < 0;
            rows.push([
              name,
              { text: formatPercent(r1, 1), alignment: "center", bold: r1IsBad, color: r1IsBad ? "#b91c1c" : gray700 },
              { text: formatPercent(r3, 1), alignment: "center", bold: r3IsBad, color: r3IsBad ? "#b91c1c" : gray700 },
              { text: formatPercent(r5, 1), alignment: "center", bold: r5IsBad, color: r5IsBad ? "#b91c1c" : gray700 }
            ]);
          };
          addRow(companyKey, getReturn(companyKey, "1yr"), getReturn(companyKey, "3yr"), getReturn(companyKey, "5yr"));
          addRow(nasdaqKey, getReturn(nasdaqKey, "1yr"), getReturn(nasdaqKey, "3yr"), getReturn(nasdaqKey, "5yr"));
          addRow(sp500Key, getReturn(sp500Key, "1yr"), getReturn(sp500Key, "3yr"), getReturn(sp500Key, "5yr"));
          content.push(buildTable(headerRow, rows, ["40%", "20%", "20%", "20%"], tableLayout));
          const sourceAsOf = (perfData.data_as_of as string) || data.data_as_of || new Date().toISOString();
          content.push({ text: `Source: Marketstack. Data as of ${formatUSDate(sourceAsOf)}`, style: "caption" });
          content.push({ text: " ", margin: [0, 6] });
        }

        if (data.meeting_details_data && typeof data.meeting_details_data === "object") {
          const details = data.meeting_details_data as Record<string, any>;
          const nominees = Array.isArray(details.nominees) ? details.nominees : [];
          const nomineesHeaders = Array.isArray(details.nominees_headers) ? details.nominees_headers : [];
          const proposals = Array.isArray(details.proposals) ? details.proposals : [];
          const proposalsHeaders = Array.isArray(details.proposals_headers) ? details.proposals_headers : [];

          let meetingDate = "";
          if (details.company && Array.isArray(details.company) && details.company.length > 0) {
            const companyObj = details.company[0];
            const companyKey = Object.keys(companyObj)[0];
            const meetingInfo = companyObj[companyKey];
            if (typeof meetingInfo === "string" && meetingInfo.includes(" - ")) {
              meetingDate = meetingInfo.split(" - ").pop() || "";
            }
          }

          if (nominees.length > 0 || proposals.length > 0) {
            addSectionTitle("Shareholder Meeting Summary");
            if (meetingDate) content.push({ text: `Meeting Date: ${meetingDate}`, style: "caption" });

            if (nominees.length > 0 && nomineesHeaders.length > 0) {
              const headerRow = nomineesHeaders.map((h: any) => ({ text: h.header, style: "tableHeader" }));
              const bodyRows = nominees.map((row: Record<string, any>) =>
                nomineesHeaders.map((h: any, colIdx: number) => {
                  const cellValue = formatValue(row[h.field]);
                  const isLastCol = colIdx === nomineesHeaders.length - 1;
                  const numericValue = parseFloat(String(cellValue));
                  const isLowPercentage = isLastCol && !isNaN(numericValue) && numericValue < 85;
                  return isLowPercentage 
                    ? { text: cellValue, color: "#b91c1c", bold: true }
                    : cellValue;
                })
              );
              // First column 35%, rest share 65% equally
              const colWidths = ["35%", ...Array(nomineesHeaders.length - 1).fill(`${65 / (nomineesHeaders.length - 1)}%`)];
              content.push(buildTable(headerRow, bodyRows, colWidths, tableLayout));
              content.push({ text: " ", margin: [0, 6] });
            }

            if (proposals.length > 0 && proposalsHeaders.length > 0) {
              const headerRow = proposalsHeaders.map((h: any) => ({ text: h.header, style: "tableHeader" }));
              const bodyRows = proposals.map((row: Record<string, any>) =>
                proposalsHeaders.map((h: any, colIdx: number) => {
                  const cellValue = formatValue(row[h.field]);
                  const isLastCol = colIdx === proposalsHeaders.length - 1;
                  const numericValue = parseFloat(String(cellValue));
                  const isLowPercentage = isLastCol && !isNaN(numericValue) && numericValue < 85;
                  return isLowPercentage 
                    ? { text: cellValue, color: "#b91c1c", bold: true }
                    : cellValue;
                })
              );
              // First column 35%, rest share 65% equally
              const colWidths = ["35%", ...Array(proposalsHeaders.length - 1).fill(`${65 / (proposalsHeaders.length - 1)}%`)];
              content.push(buildTable(headerRow, bodyRows, colWidths, tableLayout));
              content.push({ text: " ", margin: [0, 6] });
            }
          }
        }

        if (Array.isArray(data.percent_ownership_data) && data.percent_ownership_data.length > 0) {
          const top20 = data.percent_ownership_data.slice(0, 20);
          addSectionTitle(
            `Top 20 Ownership${data.total_percent_ownership ? ` (${data.total_percent_ownership.replace("%", "")}% of Shares Outstanding)` : ""}`
          );

          const headerRow: TableCell[] = [
            { text: "No.", style: "tableHeader", alignment: "center" },
            { text: "Shareholder", style: "tableHeader" },
            { text: "Ownership", style: "tableHeader", alignment: "center" },
            { text: "Proxy Advisory Influence", style: "tableHeader" },
            { text: "UN PRI Signatory", style: "tableHeader", alignment: "center" },
            { text: "Voted Against Directors", style: "tableHeader", alignment: "center" },
            { text: "Voted Against Say on Pay", style: "tableHeader", alignment: "center" }
          ];

          const bodyRows = top20.map((item, index) => {
            const ownership = parseFloat(item.percent_ownership?.replace("%", "") || "0");
            const shareholder = item.institution_name || item.institution__institution || "";
            return [
              { text: String(index + 1), alignment: "center" },
              shareholder,
              { text: `${ownership.toFixed(2)}%`, alignment: "center" },
              item.proxy_advisor_influence || "",
              getStatusIcon(item.unpri_signatory, successColor, true),
              getStatusIcon((item as any).voted_against_directors, dangerColor, true),
              getStatusIcon((item as any).voted_against_say_on_pay, dangerColor, true)
            ];
          });

          const ownershipTable = {
            ...buildTable(
              headerRow,
              bodyRows,
              ["6%", "26%", "10%", "18%", "10%", "15%", "15%"],
              tableLayout
            ),
            style: "tableSmall"
          };

          const proxyChart = chartImageMap.get("Proxy Advisor Influence");

          if (proxyChart) {
            content.push({ ...ownershipTable, pageOrientation: "landscape" });
            content.push({
              image: proxyChart, 
              width: 260, 
              alignment: "center", 
              margin: [0, 6, 0, 10],
              pageOrientation: "landscape"
            });
          } else {
            content.push({ ...ownershipTable, pageOrientation: "landscape" });
          }
          content.push({ text: "Source: Whalewisdom. Data as of latest filings.", style: "caption" });
          content.push({ text: " ", margin: [0, 6] });
        }

        if (Array.isArray(data.voted_against_rationale)) {
          addSectionTitle("Voting Rationale");
          if (data.voted_against_rationale.length === 0) {
            content.push({ text: "No investors voted against directors or Say on Pay.", style: "caption" });
          } else {
            const headerRow: TableCell[] = [
              { text: "Investor", style: "tableHeader" },
              { text: "Proposal", style: "tableHeader" },
              { text: "Vote", style: "tableHeader", alignment: "center" },
              { text: "Vote Counts", style: "tableHeader" },
              { text: "Rationale", style: "tableHeader" }
            ];
            const bodyRows = data.voted_against_rationale.map(item => {
              const investorName = item.institution__institution || item.investor || "";
              const voteCounts = parseSplitVoteCounts(item.split_vote_counts);
              const voteCountsText = voteCounts
                ? `For: ${voteCounts.for ?? 0} | Against: ${voteCounts.against ?? 0}`
                : "";
              const voteText = item.vote || "";
              const isAgainst = voteText.toLowerCase() === "against" || voteText.toLowerCase() === "withhold";
              return [
                investorName,
                item.proposal || "",
                { text: voteText, alignment: "center", bold: isAgainst, color: isAgainst ? "#b91c1c" : gray700 }, 
                voteCountsText,
                item.notes || item.rationale || ""
              ];
            });
            content.push(buildTable(headerRow, bodyRows, ["18%", "20%", "8%", "16%", "38%"], tableLayout));
          }
          content.push({ text: " ", margin: [0, 6] });
        }

        if (data.charts_data) {
          const trendTitles = [
            "Election of Directors",
            "Say on Pay",
            "Other Proposals",
            "Ratification of Auditor"
          ];
          const trendCards = trendTitles.map(title => {
            const img = chartImageMap.get(title);
            return img
              ? {
                  stack: [
                    { text: title, style: "subSectionTitle", alignment: "center" },
                    { image: img, width: 220, alignment: "center", margin: [0, 6, 0, 0] }
                  ],
                  margin: [6, 6, 6, 6]
                }
              : { text: `${title}: No chart available`, style: "caption" };
          });

          // Wrap heading + charts together as unbreakable unit
          content.push({
            stack: [
              { text: "Trend in Investor Support", style: "sectionTitle" },
              {
                table: {
                  widths: ["*"],
                  body: [[{ text: "", margin: [0, 0, 0, 0] }]]
                },
                layout: {
                  hLineWidth: (i: number) => (i === 1 ? 1 : 0),
                  vLineWidth: () => 0,
                  hLineColor: () => primaryColor,
                  paddingTop: () => 0,
                  paddingBottom: () => 0
                },
                margin: [0, 0, 0, 0]
              },
              {
                table: {
                  widths: ["*", "*"],
                  body: [
                    [trendCards[0], trendCards[1]],
                    [trendCards[2], trendCards[3]]
                  ]
                },
                layout: {
                  hLineWidth: () => 0.8,
                  vLineWidth: () => 0.8,
                  hLineColor: () => gray200,
                  vLineColor: () => gray200,
                  paddingLeft: () => 6,
                  paddingRight: () => 6,
                  paddingTop: () => 6,
                  paddingBottom: () => 6
                },
                margin: [0, 2, 0, 6]
              }
            ],
            unbreakable: true
          });
        }

        const companyEngagements = normalizeToArray(data.engagement_stats_data);
        const peerEngagements = normalizeToArray(data.engagement_stats_ex_global_data);

        if (companyEngagements.length > 0) {
          addSectionTitle("Investor Disclosed Engagement History");
          const headerRow: TableCell[] = [
            { text: "Year", style: "tableHeader" },
            { text: "Investor", style: "tableHeader" },
            { text: "Environmental", style: "tableHeader" },
            { text: "Social", style: "tableHeader" },
            { text: "Governance", style: "tableHeader" }
          ];
          const bodyRows = companyEngagements.map(item => [
            item.year || "",
            item.institution__institution || "",
            formatValue(item.env_list || ""),
            formatValue(item.soc_list || ""),
            formatValue(item.gov_list || "")
          ]);
          content.push(buildTable(headerRow, bodyRows, ["10%", "22%", "22%", "22%", "24%"], tableLayout));
          content.push({ text: " ", margin: [0, 6] });
        }

        if (peerEngagements.length > 0) {
          addSectionTitle("Engagement Topics for Peers");
          const headerRow: TableCell[] = [
            { text: "Year", style: "tableHeader" },
            { text: "Investor", style: "tableHeader" },
            { text: "Company", style: "tableHeader" },
            { text: "Environmental", style: "tableHeader" },
            { text: "Social", style: "tableHeader" },
            { text: "Governance", style: "tableHeader" }
          ];
          const bodyRows = peerEngagements.map(item => [
            item.year || "",
            item.institution__institution || "",
            item.company__name || "",
            formatValue(item.env_list || ""),
            formatValue(item.soc_list || ""),
            formatValue(item.gov_list || "")
          ]);
          content.push(buildTable(headerRow, bodyRows, ["8%", "18%", "18%", "18%", "18%", "20%"], tableLayout));
          content.push({ text: " ", margin: [0, 6] });
        }

        if (Array.isArray(data.sp_data) && data.sp_data.length > 0) {
          const NON_INSTITUTION_FIELDS = [
            "proxy_season",
            "proponent",
            "proposal_name",
            "proposal_num",
            "outcome_percentage",
            "proposal_title",
            "mgt_rec",
            "major_institutions_vote",
            "company",
            "year",
            "id",
            "ticker"
          ];

          const firstItem = data.sp_data[0];
          const institutionNames = Object.keys(firstItem).filter(key =>
            !NON_INSTITUTION_FIELDS.includes(key) && typeof (firstItem as any)[key] !== "object"
          );

          const headerRow: TableCell[] = [
            { text: "Proponent", style: "tableHeader" },
            { text: "Proposal", style: "tableHeader" },
            { text: "Outcome", style: "tableHeader", alignment: "center" },
            ...institutionNames.map(name => ({ text: name, style: "tableHeader", alignment: "center" }))
          ];

          const bodyRows = data.sp_data.map(item => [
            item.proponent || "",
            item.proposal_name || item.proposal_title || "",
            { text: item.outcome_percentage || "", alignment: "center" },
            ...institutionNames.map(name => {
              const cellValue = (item as any)[name] || "";
              const vote = String(cellValue);
              const lower = vote.toLowerCase();
              const isAgainst = lower === "against" || lower === "withhold";
              const isPercentage = vote.includes("%");
              
              // Color red for: Against, Withhold votes OR percentage values
              const shouldBeRed = isAgainst || isPercentage;
              return { 
                text: vote, 
                alignment: "center", 
                bold: shouldBeRed,
                color: shouldBeRed ? "#b91c1c" : gray700 
              };
            })
          ]);

          addSectionTitle("Shareholder Proposals");
          content[content.length - 1] = {
            ...content[content.length - 1],
            pageBreak: "before",
            pageOrientation: "landscape"
          };
          content.push(buildTable(headerRow, bodyRows, undefined, tableLayout));
        }

        const docDefinition: TDocumentDefinitions = {
          pageSize: "A4",
          pageMargins: [16, 30, 16, 30],
          defaultStyle: { fontSize: 9 },
          footer: (currentPage, pageCount) => ({
            columns: [
              { text: `${companyName} | Data as of: ${asOf}`, alignment: "left", fontSize: 7, color: "#888" },
              { text: `Page ${currentPage} of ${pageCount}`, alignment: "right", fontSize: 7, color: "#888" }
            ],
            margin: [32, 0, 32, 12]
          }),
          styles: {
            title: { fontSize: 16, bold: true, color: gray900 },
            subtitle: { fontSize: 9, color: gray600 },
            sectionTitle: { fontSize: 11, bold: true, color: primaryColor, margin: [0, 20, 0, 2] },
            subSectionTitle: { fontSize: 9, bold: true, color: gray700, margin: [0, 6, 0, 4] },
            tableHeader: { fontSize: 9, bold: true, fillColor: gray50, color: gray700 },
            tableSmall: { fontSize: 8 },
            caption: { fontSize: 7, color: gray600, italics: true, margin: [0, 4, 0, 8] }
          },
          content
        };

        const fileName = `${companyName}_Report_${new Date().toISOString().split("T")[0]}.pdf`;
        pdfMake.createPdf(docDefinition).download(fileName);
      } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Error generating PDF. Please check console for details.");
      } finally {
        setIsGeneratingPDF(false);
      }
    };

    return (
      <div className="w-full max-w-[1200px] mx-auto">
        {/* Report Content */}
        <div
          ref={reportRef}
          className="bg-white report-content px-8 py-6"
          style={{ fontFamily: "inherit" }}
        >
          {/* Report Header - Logo, Title and Download Button */}
          <div className="report-header border-b-2 border-primary pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={zmhLogo}
                  alt="ZMH Logo"
                  className="h-16 w-auto object-contain"
                />
                <h1 className="text-2xl font-bold text-gray-900">
                  {data.finnhub_data?.company_name || 'Company'} - Company Report
                </h1>
              </div>
              <button
                onClick={handleExportToPDF}
                disabled={isGeneratingPDF}
                className="download-btn exclude-from-pdf flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPDF ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table of Contents / Index Section */}
          <section className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200 exclude-from-pdf">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Table of Contents</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <a 
                href="#share-price-performance" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('share-price-performance');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                1. Share Price Performance
              </a>
              <a 
                href="#meeting-details" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('meeting-details');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                2. Shareholder Meeting Summary
              </a>
              <a 
                href="#total-ownership" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('total-ownership');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                3. Top 20 Ownership
              </a>
              <a 
                href="#voting-rationale" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('voting-rationale');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                4. Voting Rationale
              </a>
              <a 
                href="#trend-investor-support" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('trend-investor-support');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                5. Trend in Investor Support
              </a>
              <a 
                href="#engagement-history" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('engagement-history');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                6. Engagement History
              </a>
              <a 
                href="#shareholder-proposals" 
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const el = document.getElementById('shareholder-proposals');
                  if (el) {
                    const yOffset = -20;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
              >
                7. Shareholder Proposals
              </a>
            </div>
          </section>

          {/* Section 1: Key Takeaways Table - Hidden for now */}
          {/* {data.key_takeaways && data.key_takeaways.length > 0 && (
            <KeyTakeawaysSection data={data.key_takeaways} />
          )} */}

          {/* Section 1: Share Price Performance */}
          <div id="share-price-performance">
            {data.share_price_performance_data && (
              <SharePricePerformanceSection 
                data={data.share_price_performance_data} 
                dataAsOf={data.data_as_of}
                companyName={data.finnhub_data?.company_name}
              />
            )}
          </div>

          {/* Section 2: Meeting Details */}
          <div id="meeting-details">
            <MeetingDetailsSection data={data.meeting_details_data} />
          </div>

          {/* Section 3: Investors with Pie Chart and Proxy Influence */}
          <div id="total-ownership">
            <Top20InvestorsSection 
              data={data.percent_ownership_data || []} 
              totalPercentOwnership={data.total_percent_ownership}
            />
          </div>

          {/* Section 4: Voting Rationale + Trend Charts */}
          <div id="voting-rationale">
            {data.charts_data && (
              <InvestorsVotingAgainstSection 
                data={data.charts_data}
                votedAgainstRationale={data.voted_against_rationale}
              />
            )}
          </div>

          {/* Section 5: Engagement Stats (Company + Peers) */}
          <div id="engagement-history">
            <EngagementStatsSection
              data={data.engagement_stats_data}
              exGlobalData={data.engagement_stats_ex_global_data}
              companyName={data.finnhub_data?.company_name}
              isGeneratingPDF={isGeneratingPDF}
            />
          </div>

          {/* Section 7: Shareholder Proposals */}
          <div id="shareholder-proposals">
            <ShareholderProposalsSection data={data.sp_data || []} />
          </div>

          {/* Report Footer */}
          <div className="report-footer mt-12 pt-6 border-t-2 border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                {isGeneratingPDF && (
                  <img src={zmhLogo} alt="ZMH Logo" className="h-6 w-auto" />
                )}
                <span>© {new Date().getFullYear()} ZMH Advisors. All rights reserved.</span>
              </div>
              <div>
                <span>This report is for informational purposes only.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CompanyReport.displayName = "CompanyReport";

export default CompanyReport;
