import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppSelector } from "@/stores/hooks";
import { dashboardService } from "@/services/dashboard";
import StandardizedTable from "@/components/StandardizedTable";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Popover from "@/components/Base/Headless/Popover";
import { FormCheck } from "@/components/Base/Form";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import FilterChips from "@/components/FilterChips";

const extractFilingYear = (value: unknown) => {
  if (typeof value !== "string") return "";

  const yearMatch = value.match(/\b(\d{4})\b/);
  if (yearMatch?.[1]) return yearMatch[1];

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? "" : String(parsedDate.getFullYear());
};

const toTrimmedString = (value: unknown) => String(value || "").trim();

const DEFAULT_EXCLUDED_FILING_TYPES = ["DEF 14A", "DEFA14A", "PRE 14A"];
const COMPANY_FILINGS_TAB = "company-filings";
const ACTIVIST_FILINGS_TAB = "activist-filings";

type FilingTab = typeof ACTIVIST_FILINGS_TAB | typeof COMPANY_FILINGS_TAB;

// ─── Document Type ──────────────────────────────────────────────────────────
// Filled in by a separate FastAPI call after the table has rendered; the table
// never waits for it. Links still pending are asked about once more after
// DOCUMENT_TYPE_RETRY_MS.
const DOCUMENT_TYPE_RETRY_MS = 5000;

const DOCUMENT_TYPES = ["Press Release", "Shareholder Letter", "Presentation"] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Schedule 13D/13D-A rows are classified by their ATTACHMENTS, not the cover
// form (the Filing Type column already says it is an ownership report). Each
// attachment's type is one of the three above, "Other" (read, and none of the
// three), or "Not read" (its note says why). For "Other", `category` carries
// the SEC monitor's own category -- "Joint Filing Agreement", "Schedule of
// Transactions in Securities", ... -- and that is what the badge prints.
const ATTACHMENT_OTHER = "Other";
const ATTACHMENT_NOT_READ = "Not read";
type AttachmentType = DocumentType | typeof ATTACHMENT_OTHER | typeof ATTACHMENT_NOT_READ;
type Attachment = { name: string; type: AttachmentType; category: string | null; note: string | null };

// Badge text for the monitor's longer category names (the column is 18% wide);
// the tooltip always shows the full name. A DISPLAY CONVENIENCE, NOT A FILTER:
// a category missing from this map prints its own raw name, so a category the
// backend adds tomorrow shows up as itself -- never hidden, never "Other".
const ATTACHMENT_CATEGORY_SHORT_LABELS: Record<string, string> = {
  "Joint Filing Agreement": "Joint Filing",
  "Confidentiality Agreement": "Confidentiality",
  "Cooperation or Standstill Agreement": "Standstill",
  "Voting or Support Agreement": "Voting Agreement",
  Warrant: "Warrant",
  "Purchase or Sale Agreement": "Purchase Agreement",
  "Financing or Loan Agreement": "Financing",
  "Power of Attorney": "Power of Attorney",
  "Director Nomination Notice": "Nomination Notice",
  "Schedule of Transactions in Securities": "Transactions",
  "Signature Page": "Signature Page",
  "Reporting Persons and Directors": "Reporting Persons",
};

// The endpoint's contract, exactly:
//   { types: { [link]: "Press Release" | "Shareholder Letter" | "Presentation" | null },
//     pending: string[],
//     attachments: { [13D link]: Attachment[] } }   -- [] = the filing has no attachment
type DocumentTypesResponse = {
  types: Record<string, DocumentType | null>;
  pending: string[];
  attachments: Record<string, Attachment[]>;
};

// Coloured, so a classified document reads differently from the grey
// Filing-Type fallback below.
const DOCUMENT_TYPE_BADGE_CLASS: Record<DocumentType, string> = {
  "Press Release": "bg-violet-100 text-violet-700",
  "Shareholder Letter": "bg-amber-100 text-amber-800",
  Presentation: "bg-sky-100 text-sky-700",
};
// "Other" is a solid grey fill: read, and boilerplate. "Not read" is a dashed
// outline: we could not check. The two must never look alike.
const OTHER_BADGE_CLASS = "bg-slate-100 text-slate-600";
const NOT_READ_BADGE_CLASS = "border border-dashed border-slate-300 bg-white text-slate-500";

// Why a 13D row shows "Not read" when its whole lookup did not produce an answer.
const NOT_READ_REASON_FAILED = "The attachment lookup failed. Reload the page to try again.";
const NOT_READ_REASON_TIMED_OUT = "SEC did not answer in time. Reload the page to try again.";
const NOT_READ_REASON_UNRECOGNISED = "This filing link could not be checked for attachments.";
const NOT_READ_REASON_NO_LINK = "This filing has no link to check.";

// "SC 13D", "Schedule 13D/A", "SCHEDULE 13D/A" -> "SC13D" / "SC13D/A".
const filingTypeKey = (filingType: unknown): string =>
  toTrimmedString(filingType).toUpperCase().replace(/\s+/g, "").replace(/^SCHEDULE/, "SC");

const isAttachmentFilingType = (filingType: unknown): boolean => {
  const key = filingTypeKey(filingType);
  return key === "SC13D" || key === "SC13D/A";
};

// What a row shows when its document type is null (or the call failed): an
// honest label from its Filing Type instead of a blank. Keys are filingTypeKey.
// Anything not listed is "Other Soliciting Material". Schedule 13D/13D-A are
// deliberately absent: they never fall back (Waheed rejected "Ownership
// Report") -- their cell comes from their attachments, see renderAttachments.
const FILING_TYPE_FALLBACK_LABELS: Record<string, string> = {
  "DEF14A": "Proxy Statement",
  "PRE14A": "Proxy Statement",
  "DEFC14A": "Proxy Statement",
  "PREC14A": "Proxy Statement",
  "PRRN14A": "Proxy Statement",
  "DEFN14A": "Proxy Statement",
  "DEF14C": "Information Statement",
  "PRE14C": "Information Statement",
  "DFAN14A": "Other Soliciting Material",
  "DEFA14A": "Other Soliciting Material",
};
const FILING_TYPE_FALLBACK_DEFAULT = "Other Soliciting Material";

const getFilingTypeFallbackLabel = (filingType: unknown): string =>
  FILING_TYPE_FALLBACK_LABELS[filingTypeKey(filingType)] || FILING_TYPE_FALLBACK_DEFAULT;

const isDocumentType = (value: unknown): value is DocumentType =>
  typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value);

const isOptionalString = (value: unknown) => value === null || value === undefined || typeof value === "string";

const isAttachment = (value: unknown): value is Attachment => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { name, type, category, note } = value as Partial<Attachment>;
  return (
    typeof name === "string" &&
    (isDocumentType(type) || type === ATTACHMENT_OTHER || type === ATTACHMENT_NOT_READ) &&
    isOptionalString(category) &&
    isOptionalString(note)
  );
};

// Reads that one shape and nothing else. Anything off-contract returns null,
// so the caller shows the Filing-Type label (and "Not read" for 13D rows) and
// warns -- a contract break should surface, not be papered over by reading
// some other shape.
const parseDocumentTypesResponse = (
  data: unknown
): {
  types: Record<string, DocumentType | null>;
  pending: Set<string>;
  attachments: Record<string, Attachment[]>;
} | null => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const { types, pending, attachments = {} } = data as Partial<DocumentTypesResponse>;

  if (!types || typeof types !== "object" || Array.isArray(types)) return null;
  if (!Object.values(types).every((value) => value === null || isDocumentType(value))) return null;
  if (!Array.isArray(pending) || !pending.every((link) => typeof link === "string")) return null;
  if (!attachments || typeof attachments !== "object" || Array.isArray(attachments)) return null;
  if (!Object.values(attachments).every((list) => Array.isArray(list) && list.every(isAttachment))) return null;

  return { types, pending: new Set(pending), attachments };
};

// One attachment as the tooltip names it: "ex99-1.htm - Joint Filing Agreement".
const describeAttachment = (attachment: Attachment): string => {
  if (attachment.type === ATTACHMENT_NOT_READ) {
    return `${attachment.name} - Not read${attachment.note ? ` (${attachment.note})` : ""}`;
  }
  const kind = isDocumentType(attachment.type) ? attachment.type : attachment.category || ATTACHMENT_OTHER;
  return `${attachment.name} - ${kind}${attachment.note ? ` (${attachment.note})` : ""}`;
};

type AttachmentBadge = { key: string; label: string; className: string };

// One attachment's badge. The style comes from the attachment's TYPE, never
// from its label text, so a category whose name happened to be "Not read" or
// "Presentation" could not borrow another state's look:
//   the three types   -> their coloured badge;
//   "Not read"        -> dashed outline (we could not check);
//   anything else     -> grey fill with the category's (short) name, or
//                        "Other" only when the categoriser placed it nowhere.
const attachmentBadge = (attachment: Attachment): AttachmentBadge => {
  if (isDocumentType(attachment.type)) {
    return { key: `type:${attachment.type}`, label: attachment.type, className: DOCUMENT_TYPE_BADGE_CLASS[attachment.type] };
  }
  if (attachment.type === ATTACHMENT_NOT_READ) {
    return { key: "not-read", label: ATTACHMENT_NOT_READ, className: NOT_READ_BADGE_CLASS };
  }
  const category = toTrimmedString(attachment.category);
  const label = category && category !== ATTACHMENT_OTHER ? ATTACHMENT_CATEGORY_SHORT_LABELS[category] || category : ATTACHMENT_OTHER;
  return { key: `category:${label}`, label, className: OTHER_BADGE_CLASS };
};

// A badge per DISTINCT badge, in the order the attachments appear in the filing.
const attachmentBadges = (attachments: Attachment[]): AttachmentBadge[] => {
  const badges: AttachmentBadge[] = [];
  attachments.forEach((attachment) => {
    const badge = attachmentBadge(attachment);
    if (!badges.some((existing) => existing.key === badge.key)) badges.push(badge);
  });
  return badges;
};

const BADGE_BASE_CLASS = "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium";

const NotReadBadge = ({ reason }: { reason: string }) => (
  <span className={`${BADGE_BASE_CLASS} ${NOT_READ_BADGE_CLASS}`} title={`Not read: ${reason}`}>
    {ATTACHMENT_NOT_READ}
  </span>
);

// A 13D row's cell once its attachments are known. An empty list is a BLANK
// cell -- Waheed: no attachment, leave the Document Type blank. Blank means
// exactly that and nothing else: loading and failures never reach here.
// Several distinct types wrap onto more lines rather than clip (the column is
// 18% wide), and the attachment count is shown whenever it exceeds the number
// of badges, so two decks and a release never read as one of each.
const renderAttachments = (attachments: Attachment[]) => {
  const badges = attachmentBadges(attachments);
  if (badges.length === 0) return null;
  const tooltip = attachments.map(describeAttachment).join("; ");
  return (
    <div className="flex flex-wrap items-center gap-1" title={tooltip}>
      {badges.map((badge) => (
        <span key={badge.key} className={`${BADGE_BASE_CLASS} ${badge.className}`}>
          {badge.label}
        </span>
      ))}
      {attachments.length > badges.length && (
        <span className="text-xs text-slate-500">{attachments.length} files</span>
      )}
    </div>
  );
};

function ActivistFilings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const source = searchParams.get("source") || "";
  const isCompanySource = source === "company";
  const initialTab: FilingTab = searchParams.get("tab") === COMPANY_FILINGS_TAB ? COMPANY_FILINGS_TAB : ACTIVIST_FILINGS_TAB;

  const { companyGlobalSearchId } = useAppSelector((state) => state.authentiction);

  const [activeTab, setActiveTab] = useState<FilingTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [filings, setFilings] = useState<any[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedFilingTypes, setSelectedFilingTypes] = useState<string[]>([]);
  const [draftYears, setDraftYears] = useState<string[]>([]);
  const [draftFilingTypes, setDraftFilingTypes] = useState<string[]>([]);

  const fetchFilings = useCallback(async () => {
    if (!companyGlobalSearchId) {
      setFilings([]);
      return;
    }

    setLoading(true);
    try {
      const response = await dashboardService.getActivistFilings(companyGlobalSearchId);
      const result = response?.result || response || {};
      setFilings(Array.isArray(result?.filings) ? result.filings : []);
    } catch (error) {
      console.error("Failed to load activist filings:", error);
      setFilings([]);
    } finally {
      setLoading(false);
    }
  }, [companyGlobalSearchId]);

  useEffect(() => {
    if (!isCompanySource) return;
    fetchFilings();
  }, [fetchFilings, isCompanySource]);

  useEffect(() => {
    setSelectedYears([]);
    setSelectedFilingTypes([]);
    setDraftYears([]);
    setDraftFilingTypes([]);
  }, [companyGlobalSearchId]);

  // Document types by filing link, and the links still waiting on an answer
  // (their cells show a skeleton). A link in neither shows its Filing-Type label.
  const [documentTypes, setDocumentTypes] = useState<Record<string, string | null>>({});
  const [documentTypeLoadingLinks, setDocumentTypeLoadingLinks] = useState<Set<string>>(new Set());
  // Schedule 13D rows: the attachments of each link whose answer is KNOWN ([]
  // = no attachment), and, for a link with no answer, why ("Not read"). A 13D
  // link not loading, not in attachmentsByLink and not here has no answer yet
  // and also renders "Not read" -- never blank.
  const [attachmentsByLink, setAttachmentsByLink] = useState<Record<string, Attachment[]>>({});
  const [attachmentFailures, setAttachmentFailures] = useState<Record<string, string>>({});
  // Bumped whenever a run is superseded; a response or retry belonging to an
  // older run checks it and does nothing.
  const documentTypeRunRef = useRef(0);

  // A company change supersedes any run in flight straight away -- not only
  // once the new company's filings arrive -- so a late answer for the previous
  // company is ignored.
  useEffect(() => {
    documentTypeRunRef.current += 1;
    setDocumentTypes({});
    setDocumentTypeLoadingLinks(new Set());
    setAttachmentsByLink({});
    setAttachmentFailures({});
  }, [companyGlobalSearchId]);

  // Runs once per loaded set of filings -- after the Django load, never
  // before or instead of it.
  useEffect(() => {
    const runId = ++documentTypeRunRef.current;
    const isCurrentRun = () => documentTypeRunRef.current === runId;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // Only the Activism Related Filings rows -- the only table with this
    // column -- one entry per distinct link.
    const items: Array<{ link: string; filing_type: string }> = [];
    const seenLinks = new Set<string>();
    filings.forEach((filing) => {
      const link = toTrimmedString(filing?.["Filing Link"]);
      const filingType = toTrimmedString(filing?.["Filing Type"]);
      if (!link || seenLinks.has(link) || DEFAULT_EXCLUDED_FILING_TYPES.includes(filingType)) return;
      seenLinks.add(link);
      items.push({ link, filing_type: filingType });
    });

    setDocumentTypes({});
    setDocumentTypeLoadingLinks(new Set(seenLinks));
    setAttachmentsByLink({});
    setAttachmentFailures({});
    if (items.length === 0) return;

    // Records why each 13D link in `links` has no answer -- shown as "Not read".
    const markAttachmentsNotRead = (links: string[], reason: string) => {
      if (links.length === 0) return;
      setAttachmentFailures((prev) => {
        const next = { ...prev };
        links.forEach((link) => {
          next[link] = reason;
        });
        return next;
      });
    };
    const attachmentLinksIn = (batch: typeof items) =>
      batch.filter((item) => isAttachmentFilingType(item.filing_type)).map((item) => item.link);

    // Every cell in the batch falls back to its Filing-Type label -- except a
    // 13D row, which shows "Not read": it has no fallback, and blank would
    // claim "no attachment".
    const showNoTypes = (batch: typeof items) => {
      setDocumentTypes((prev) => {
        const next = { ...prev };
        batch.forEach(({ link }) => {
          next[link] = null;
        });
        return next;
      });
      markAttachmentsNotRead(attachmentLinksIn(batch), NOT_READ_REASON_FAILED);
      setDocumentTypeLoadingLinks(new Set());
    };

    const requestDocumentTypes = async (batch: typeof items, isRetry: boolean) => {
      try {
        const response = await dashboardService.getActivistFilingDocumentTypes(batch);
        if (!isCurrentRun()) return;

        const parsed = parseDocumentTypesResponse(response);
        if (!parsed) {
          console.warn("Document types response does not match the expected { types, pending } shape:", response);
          showNoTypes(batch);
          return;
        }
        const { types, pending, attachments } = parsed;
        // One retry only: a link still pending after it shows its Filing-Type
        // label, or "Not read" for a 13D row.
        const retryBatch = isRetry ? [] : batch.filter((item) => pending.has(item.link));
        const retryLinks = new Set(retryBatch.map((item) => item.link));

        setDocumentTypes((prev) => {
          const next = { ...prev };
          batch.forEach(({ link }) => {
            if (!retryLinks.has(link)) next[link] = types[link] ?? null;
          });
          return next;
        });
        setAttachmentsByLink((prev) => {
          const next = { ...prev };
          Object.entries(attachments).forEach(([link, list]) => {
            next[link] = list;
          });
          return next;
        });
        // 13D links with no answer and no retry coming: still pending (SEC did
        // not answer in time) or never listed (a link the backend cannot check).
        const unanswered = attachmentLinksIn(batch).filter(
          (link) => !retryLinks.has(link) && !Array.isArray(attachments[link])
        );
        markAttachmentsNotRead(unanswered.filter((link) => pending.has(link)), NOT_READ_REASON_TIMED_OUT);
        markAttachmentsNotRead(unanswered.filter((link) => !pending.has(link)), NOT_READ_REASON_UNRECOGNISED);
        setDocumentTypeLoadingLinks(retryLinks);

        if (retryBatch.length > 0) {
          retryTimer = setTimeout(() => {
            if (isCurrentRun()) requestDocumentTypes(retryBatch, true);
          }, DOCUMENT_TYPE_RETRY_MS);
        }
      } catch (error) {
        // Silent by design: the cells fall back to the Filing-Type label, no toast.
        console.error("Failed to load filing document types:", error);
        if (!isCurrentRun()) return;
        showNoTypes(batch);
      }
    };

    requestDocumentTypes(items, false);

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      documentTypeRunRef.current += 1;
    };
  }, [filings]);

  useEffect(() => {
    const nextTab: FilingTab = searchParams.get("tab") === COMPANY_FILINGS_TAB ? COMPANY_FILINGS_TAB : ACTIVIST_FILINGS_TAB;
    setActiveTab(nextTab);
  }, [searchParams]);

  const hasCompany = Boolean(companyGlobalSearchId);

  // Document Type belongs to the Activism Related Filings table only; Company
  // Filings keeps its four columns and widths exactly as before.
  const showDocumentTypeColumn = activeTab === ACTIVIST_FILINGS_TAB;
  const columnWidths = showDocumentTypeColumn
    ? { filingType: "18%", filingDate: "15%", entity: "31%", filingLink: "18%", documentType: "18%" }
    : { filingType: "26%", filingDate: "26%", entity: "28%", filingLink: "20%", documentType: "0%" };
  const filingsData = useMemo(() => filings || [], [filings]);

  const isCompanyFilingType = useCallback(
    (filingType: string) => DEFAULT_EXCLUDED_FILING_TYPES.includes(filingType),
    []
  );

  const activeTabFilings = useMemo(() => {
    return filingsData.filter((filing) => {
      const filingType = toTrimmedString(filing?.["Filing Type"]);
      return activeTab === COMPANY_FILINGS_TAB
        ? isCompanyFilingType(filingType)
        : !isCompanyFilingType(filingType);
    });
  }, [activeTab, filingsData, isCompanyFilingType]);

  const yearOptions = useMemo(() => {
    const years = activeTabFilings
      .map((filing) => extractFilingYear(filing?.["Filing Date"]))
      .filter(Boolean);

    return Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a));
  }, [activeTabFilings]);

  const filingTypeOptions = useMemo(() => {
    const filingTypes = activeTabFilings
      .map((filing) => toTrimmedString(filing?.["Filing Type"]))
      .filter(Boolean);

    return Array.from(new Set(filingTypes)).sort((a, b) => a.localeCompare(b));
  }, [activeTabFilings]);

  const filteredFilings = useMemo(() => {
    return activeTabFilings.filter((filing) => {
      const filingYear = extractFilingYear(filing?.["Filing Date"]);
      const filingType = toTrimmedString(filing?.["Filing Type"]);

      if (selectedYears.length > 0 && !selectedYears.includes(filingYear)) return false;
      if (selectedFilingTypes.length > 0 && !selectedFilingTypes.includes(filingType)) return false;

      return true;
    });
  }, [activeTabFilings, selectedYears, selectedFilingTypes]);

  const activeFiltersCount = selectedYears.length + selectedFilingTypes.length;
  const activistFilingsCount = useMemo(
    () => filingsData.filter((filing) => !isCompanyFilingType(toTrimmedString(filing?.["Filing Type"])) ).length,
    [filingsData, isCompanyFilingType]
  );
  const companyFilingsCount = useMemo(
    () => filingsData.filter((filing) => isCompanyFilingType(toTrimmedString(filing?.["Filing Type"])) ).length,
    [filingsData, isCompanyFilingType]
  );

  const syncDraftFilters = useCallback(() => {
    setDraftYears(selectedYears);
    setDraftFilingTypes(selectedFilingTypes);
  }, [selectedYears, selectedFilingTypes]);

  const applyFilters = useCallback(
    (close?: () => void) => {
      setSelectedYears(draftYears);
      setSelectedFilingTypes(draftFilingTypes);
      close?.();
    },
    [draftFilingTypes, draftYears]
  );

  const clearFilters = useCallback((close?: () => void) => {
    setDraftYears([]);
    setDraftFilingTypes([]);
    setSelectedYears([]);
    setSelectedFilingTypes([]);
    close?.();
  }, []);

  const handleRemoveChip = useCallback((removeKey: string, removeValue: string | number) => {
    const value = String(removeValue);

    if (removeKey === "year") {
      setSelectedYears((prev) => prev.filter((item) => item !== value));
      setDraftYears((prev) => prev.filter((item) => item !== value));
      return;
    }

    if (removeKey === "filing_type") {
      setSelectedFilingTypes((prev) => prev.filter((item) => item !== value));
      setDraftFilingTypes((prev) => prev.filter((item) => item !== value));
    }
  }, []);

  const switchTab = useCallback(
    (tab: FilingTab) => {
      setActiveTab(tab);
      setSelectedYears([]);
      setSelectedFilingTypes([]);
      setDraftYears([]);
      setDraftFilingTypes([]);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", tab);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="mt-3.5 relative">
          {!hasCompany ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-500">
              <Lucide icon="Building2" className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Select a company from the top search bar to view activist filings.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span className="text-slate-500">Company</span>
                  <Lucide icon="ChevronRight" className="w-4 h-4 text-slate-400" />
                  <span className="flex items-center gap-2">
                    <span>{activeTab === COMPANY_FILINGS_TAB ? "Company Filings" : "Activist Filings"}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      BETA
                    </span>
                  </span>
                </h2>
              </div>

              <div className="mb-4 flex gap-2 rounded-xl bg-slate-100 p-1 w-fit shadow-sm border border-slate-200">
                <button
                  type="button"
                  onClick={() => switchTab(ACTIVIST_FILINGS_TAB)}
                  className={"rounded-lg px-4 py-2 text-sm font-semibold transition-all " +
                    (activeTab === ACTIVIST_FILINGS_TAB
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700")}
                >
                  Activism Related Filings
                  <span className="ml-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {activistFilingsCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => switchTab(COMPANY_FILINGS_TAB)}
                  className={"rounded-lg px-4 py-2 text-sm font-semibold transition-all " +
                    (activeTab === COMPANY_FILINGS_TAB
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700")}
                >
                  Company Filings
                  <span className="ml-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {companyFilingsCount}
                  </span>
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  {/* {activeTab === ACTIVIST_FILINGS_TAB && (
                    <div className="inline-flex w-fit max-w-[72%] items-baseline gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <span className="font-semibold text-slate-700">Note:</span>
                      <span className="italic">
                        Initial screen excludes <span className="font-semibold not-italic">DEF 14A</span>,{" "}
                        <span className="font-semibold not-italic">DEFA14A</span>, and{" "}
                        <span className="font-semibold not-italic">PRE 14A</span>. Use the filter to select these filings if available.
                      </span>
                    </div>
                  )} */}

                  <div className="ml-auto flex shrink-0 items-center gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Count:</span>
                    <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                      {filteredFilings.length}
                    </span>
                  </div>

                  <Popover className="inline-block">
                    {({ close }) => (
                      <>
                        <Popover.Button
                          as={Button}
                          variant="outline-secondary"
                          className="w-full sm:w-auto"
                          onClick={syncDraftFilters}
                        >
                          <Lucide icon="Filter" className="stroke-[1.3] w-4 h-4 mr-2" />
                          Filter
                          <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100 text-slate-600">
                            {activeFiltersCount}
                          </div>
                        </Popover.Button>

                        <Popover.Panel className="w-[44rem] max-w-[90vw] p-5" placement="bottom-end">
                          <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
                              <p className="text-xs text-slate-500 mt-1">Filter the filings shown below.</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline-secondary" onClick={() => clearFilters(close)}>
                                Clear
                              </Button>
                              <Button type="button" variant="primary" onClick={() => applyFilters(close)}>
                                Apply
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 text-slate-600 font-semibold">
                                  <Lucide icon="CalendarDays" className="w-4 h-4 text-slate-400" />
                                  Year
                                </div>

                                {yearOptions.length > 0 && (
                                  <FormCheck className="mr-2">
                                    <FormCheck.Label>Select All</FormCheck.Label>
                                    <FormCheck.Input
                                      className="ml-1"
                                      checked={draftYears.length === yearOptions.length && yearOptions.length > 0}
                                      type="checkbox"
                                      onChange={(e) => {
                                        setDraftYears(e.target.checked ? yearOptions : []);
                                      }}
                                    />
                                  </FormCheck>
                                )}
                              </div>

                              <MultiSelectDropdown
                                data={yearOptions}
                                placeholder="Select Year"
                                loading={loading}
                                onChange={(selectedOptions) => {
                                  setDraftYears(selectedOptions.map((option) => String(option.value)));
                                }}
                                selectedOption={draftYears}
                                size="compact"
                                alignLeft
                              />
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 text-slate-600 font-semibold">
                                  <Lucide icon="Tags" className="w-4 h-4 text-slate-400" />
                                  Filing Type
                                </div>

                                {filingTypeOptions.length > 0 && (
                                  <FormCheck className="mr-2">
                                    <FormCheck.Label>Select All</FormCheck.Label>
                                    <FormCheck.Input
                                      className="ml-1"
                                      checked={draftFilingTypes.length === filingTypeOptions.length && filingTypeOptions.length > 0}
                                      type="checkbox"
                                      onChange={(e) => {
                                        setDraftFilingTypes(e.target.checked ? filingTypeOptions : []);
                                      }}
                                    />
                                  </FormCheck>
                                )}
                              </div>

                              <MultiSelectDropdown
                                data={filingTypeOptions}
                                placeholder="Select Filing Type"
                                loading={loading}
                                onChange={(selectedOptions) => {
                                  setDraftFilingTypes(selectedOptions.map((option) => String(option.value)));
                                }}
                                selectedOption={draftFilingTypes}
                                size="compact"
                                alignLeft
                              />
                            </div>
                          </div>
                        </Popover.Panel>
                      </>
                    )}
                  </Popover>
                </div>
              </div>

                {activeFiltersCount > 0 && (
                  <div className="-mx-1 mb-3">
                    <FilterChips
                      filters={[
                        ...selectedYears.map((year) => ({ key: "year", value: year })),
                        ...selectedFilingTypes.map((filingType) => ({ key: "filing_type", value: filingType })),
                      ]}
                      onRemove={handleRemoveChip}
                    />
                  </div>
                )}

                <StandardizedTable isLoading={loading} skeletonRows={6} skeletonCols={showDocumentTypeColumn ? 5 : 4} maxHeight="68vh" className="table-fixed">
                  <StandardizedTable.Header>
                    <StandardizedTable.Cell isHeader width={columnWidths.filingType}>Filing Type</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width={columnWidths.filingDate}>Filing Date</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width={columnWidths.entity}>Filing Entity/Person</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width={columnWidths.filingLink}>Filing Link</StandardizedTable.Cell>
                    {showDocumentTypeColumn && (
                      <StandardizedTable.Cell isHeader width={columnWidths.documentType}>Document Type</StandardizedTable.Cell>
                    )}
                  </StandardizedTable.Header>
                  <Table.Tbody>
                    {filteredFilings.length > 0 ? (
                      filteredFilings.map((filing, index) => (
                        <StandardizedTable.Row key={`${filing?.["Filing Type"] || "filing"}-${index}`} index={index}>
                          <StandardizedTable.Cell>
                            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                              {filing?.["Filing Type"] || "-"}
                            </span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell>
                            <span className="text-sm text-slate-700">{filing?.["Filing Date"] || "-"}</span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell>
                            <span className="text-sm font-medium text-slate-700">{filing?.["Entity"] || "-"}</span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell>
                            <div className="flex items-center justify-start gap-3">
                              {filing?.["Filing Link"] ? (
                                <Button
                                  variant="outline-primary"
                                  className="shrink-0 whitespace-nowrap"
                                  onClick={() => window.open(filing["Filing Link"], "_blank", "noopener,noreferrer")}
                                >
                                  <Lucide icon="ExternalLink" className="w-4 h-4 mr-2" />
                                  Open Filing
                                </Button>
                              ) : (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                            </div>
                          </StandardizedTable.Cell>
                          {showDocumentTypeColumn && (
                            <StandardizedTable.Cell>
                              {(() => {
                                const link = toTrimmedString(filing?.["Filing Link"]);
                                if (link && documentTypeLoadingLinks.has(link)) {
                                  return (
                                    <div
                                      className="h-5 w-24 max-w-full rounded-full bg-slate-200 animate-pulse"
                                      aria-label="Loading document type"
                                    />
                                  );
                                }
                                // Schedule 13D: its attachments. Blank ONLY for a
                                // known empty list; anything without an answer is
                                // "Not read" with its reason.
                                if (isAttachmentFilingType(filing?.["Filing Type"])) {
                                  if (!link) return <NotReadBadge reason={NOT_READ_REASON_NO_LINK} />;
                                  const attachments = attachmentsByLink[link];
                                  if (Array.isArray(attachments)) return renderAttachments(attachments);
                                  return <NotReadBadge reason={attachmentFailures[link] || NOT_READ_REASON_FAILED} />;
                                }
                                // documentTypes holds only contract values, but
                                // re-check so the badge colour lookup is safe.
                                const documentType = link ? documentTypes[link] : null;
                                if (isDocumentType(documentType)) {
                                  return (
                                    <span
                                      className={`inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium ${DOCUMENT_TYPE_BADGE_CLASS[documentType]}`}
                                      title={documentType}
                                    >
                                      {documentType}
                                    </span>
                                  );
                                }
                                // Null, a failed call, or no link: never a
                                // blank -- a muted label from the Filing Type.
                                const fallbackLabel = getFilingTypeFallbackLabel(filing?.["Filing Type"]);
                                return (
                                  <span className="block truncate text-xs text-slate-400" title={fallbackLabel}>
                                    {fallbackLabel}
                                  </span>
                                );
                              })()}
                            </StandardizedTable.Cell>
                          )}
                        </StandardizedTable.Row>
                      ))
                    ) : (
                      <Table.Tr>
                        <Table.Td colSpan={showDocumentTypeColumn ? 5 : 4} className="text-center py-12 text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Lucide icon="FileSearch" className="w-10 h-10 opacity-40" />
                            <span className="text-sm font-medium text-slate-600">
                              {activeTab === COMPANY_FILINGS_TAB
                                ? "No company filings found"
                                : "No relevant activist filings"}
                            </span>
                          </div>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </StandardizedTable>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivistFilings;
