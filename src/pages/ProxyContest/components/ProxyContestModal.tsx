import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import LoadingIcon from "@/components/Base/LoadingIcon";
import TomSelect from "@/components/Base/TomSelect";
import CompanySelect from "@/components/ReactSelectAsync";
import { FormCheck, FormInput } from "@/components/Base/Form";
import { proxyContextService } from "@/services/proxyContext";
import { proxyContestAIService } from "@/services/proxyContestAI";
import { toast } from "react-toastify";

interface CompanyOption {
  id: number;
  name: string;
}

interface ProxyContextModalProps {
  open: boolean;
  mode?: "add" | "edit";
  initialData?: ProxyContextInitialData | null;
  // Documents to APPEND as new rows, in either mode -- unlike initialData,
  // which only ever describes documents already saved in Django. Used by the
  // Activist Campaigns "Add to Proxy Contest" flow, which arrives with the PDFs
  // already fetched and attached.
  prefilledDocuments?: ProxyContestPrefilledDocument[];
  onClose: () => void;
  onSuccess?: () => void;
}

// One document the analyst is about to add, already carrying its file. The
// keyword is what the source classified it as ("Press Release", "Shareholder
// Letter", "Presentation") and is matched against the Django keyword list on
// open; needsKeywordCheck marks the ones the analyst has to confirm.
export interface ProxyContestPrefilledDocument {
  keyword: string;
  documentDate: string;
  isCompanyActivist: "Company" | "Activist";
  activistName: string;
  documentFile: File | null;
  sourceLabel: string;
  needsKeywordCheck: boolean;
  possiblyAlreadyAdded: boolean;
}

interface ProxyContextInitialData {
  company?: CompanyOption;
  // The campaign's single year. Every row added in this modal inherits it, in
  // both modes -- never years[0] and never the current year.
  year?: string;
  documents?: Array<{
    id?: number;
    year: string;
    keyword: string;
    documentName: string;
    documentDate?: string;
    activistName?: string;
    isCompanyActivist?: "company" | "activist";
    existingDocumentUrl?: string;
  }>;
  advisory?: {
    iss?: {
      id?: number;
      management?: boolean;
      activist?: boolean;
      split?: boolean;
    };
    gl?: {
      id?: number;
      management?: boolean;
      activist?: boolean;
      split?: boolean;
    };
  };
}

interface ExtraDocumentUI {
  id: number;
  docId?: number;
  year: string;
  keyword: string;
  documentDate: string;
  isCompanyActivist: "company" | "activist";
  documentFile: File | null;
  existingDocumentUrl?: string;
  // Prefilled-row annotations -- all absent on a row the analyst added by hand.
  sourceLabel?: string;
  needsKeywordCheck?: boolean;
  possiblyAlreadyAdded?: boolean;
  // A prefilled row whose PDF could not be fetched. It is shown so the analyst
  // can attach the file by hand, and is skipped (not blocked) on save.
  skipIfEmpty?: boolean;
}

// Per-row save outcome, so a retry after a mid-save failure never uploads a row
// that already reached Django a second time.
type RowSaveState = { status: "saved" | "failed"; message?: string };

const PRIMARY_ROW_KEY = "primary";
const rowKeyFor = (entryId: number) => (entryId === 0 ? PRIMARY_ROW_KEY : `extra-${entryId}`);

// Matches a prefilled document's type against Django's own keyword list, which
// is the only set the Keyword dropdown can hold. `matched: false` means the
// analyst has to pick the keyword by hand.
const resolveKeyword = (
  raw: string,
  keywords: string[]
): { keyword: string; matched: boolean } => {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  const target = normalize(raw || "");
  if (!target) return { keyword: keywords[0] || "", matched: false };

  const exact = keywords.find((option) => normalize(option) === target);
  if (exact) return { keyword: exact, matched: true };

  // "Press Release" against a list entry like "Press Release / Statement".
  const partial = keywords.find(
    (option) => normalize(option).includes(target) || target.includes(normalize(option))
  );
  if (partial) return { keyword: partial, matched: true };

  // No counterpart: keep the dropdown on a valid option when there is one, and
  // flag the row. With no list at all (the dropdown fetch failed), the source's
  // own value is still what gets sent.
  return { keyword: keywords[0] || raw, matched: false };
};

interface DocumentFieldsSectionProps {
  years: string[];
  keywords: string[];
  year: string;
  keyword: string;
  documentDate: string;
  isCompanyActivist: "company" | "activist";
  documentFile: File | null;
  existingDocumentUrl?: string;
  onYearChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onDocumentDateChange: (value: string) => void;
  onIsCompanyActivistChange: (value: "company" | "activist") => void;
  onDocumentFileChange: (file: File | null) => void;
  onRemove?: () => void;
  title?: string;
  // Prefilled-row annotations and the row's save outcome. All optional, so a
  // hand-added row renders exactly as it did before.
  sourceLabel?: string;
  needsKeywordCheck?: boolean;
  possiblyAlreadyAdded?: boolean;
  skipIfEmpty?: boolean;
  saveState?: RowSaveState;
}

const DocumentFieldsSection = ({
  years,
  keywords,
  year,
  keyword,
  documentDate,
  isCompanyActivist,
  documentFile,
  existingDocumentUrl,
  onYearChange,
  onKeywordChange,
  onDocumentDateChange,
  onIsCompanyActivistChange,
  onDocumentFileChange,
  onRemove,
  title,
  sourceLabel,
  needsKeywordCheck,
  possiblyAlreadyAdded,
  skipIfEmpty,
  saveState,
}: DocumentFieldsSectionProps) => {
  const radioGroupName = `company-or-activist-${(title || "document")
    .replace(/\s+/g, "-")
    .toLowerCase()}`;

  const dateInputRef = useRef<HTMLInputElement>(null);
  const [rawDate, setRawDate] = useState("");

  // Keyed to documentDate, not to mount: a row whose date arrives after mount
  // (a prefilled document) or is changed from outside would otherwise keep
  // showing the date it was first given, and the "Will be saved as" line below
  // would go stale.
  useEffect(() => {
    if (documentDate) {
      const monthMap: Record<string, string> = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
      };
      const trimmed = documentDate.trim();
      // Already ISO (yyyy-mm-dd) -- what the date input itself wants.
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        setRawDate(trimmed);
        return;
      }
      const parts = trimmed.split(" ");
      if (parts.length === 3) {
        const day = parts[0].padStart(2, "0");
        const month = monthMap[parts[1]] || "";
        const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        if (day && month && yr) setRawDate(`${yr}-${month}-${day}`);
      }
    } else {
      setRawDate("");
    }
  }, [documentDate]);

  return (
    <div
      className={`rounded-lg border p-3.5 ${
        needsKeywordCheck ? "border-amber-300 bg-amber-50/40" : "border-slate-300 bg-white"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            {title || "Document"}
            {sourceLabel && (
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                {sourceLabel}
              </span>
            )}
            {/* The campaign's year, shown because every row inherits it rather
                than carrying a year selector of its own. */}
            {year && (
              <span className="ml-2 text-xs font-normal text-slate-500">Year {year}</span>
            )}
          </p>
          {saveState?.status === "saved" && (
            <p className="mt-1 mb-0 flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Lucide icon="Check" className="h-3.5 w-3.5" />
              Saved — will not be uploaded again
            </p>
          )}
          {saveState?.status === "failed" && (
            <p className="mt-1 mb-0 flex items-center gap-1 text-xs font-medium text-rose-700">
              <Lucide icon="AlertCircle" className="h-3.5 w-3.5" />
              Not saved{saveState.message ? ` — ${saveState.message}` : ""}
            </p>
          )}
          {needsKeywordCheck && (
            <p className="mt-1 mb-0 text-xs text-amber-700">
              Please confirm the document type below before saving.
            </p>
          )}
          {possiblyAlreadyAdded && (
            <p className="mt-1 mb-0 text-xs text-slate-500">
              A document with this type and date is already on this campaign. Adding it again is allowed.
            </p>
          )}
          {skipIfEmpty && !documentFile && (
            <p className="mt-1 mb-0 text-xs text-amber-700">
              The PDF could not be fetched — upload it manually, or leave this row and it will be skipped.
            </p>
          )}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <Lucide icon="Trash2" className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* <div>
          <label className="text-sm font-medium text-slate-700">
            Year <span className="text-rose-600">*</span>
          </label>
          <TomSelect
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            className="mt-1 w-full"
            options={{
              placeholder: "Dropdown",
            }}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </TomSelect>
        </div> */}

        <div>
          <label className="text-sm font-medium text-slate-700">
            Keyword <span className="text-rose-600">*</span>
          </label>
          <TomSelect
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="mt-1 w-full"
            options={{
              placeholder: "Dropdown",
            }}
          >
            {keywords.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </TomSelect>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Document Date <span className="text-rose-600">*</span>
          </label>
          <div 
            className="relative mt-1 cursor-pointer" 
            onClick={() => {
              dateInputRef.current?.showPicker?.();
            }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
              <Lucide icon="Calendar" className="h-4 w-4 text-slate-400" />
            </div>
            <input
              ref={dateInputRef}
              type="date"
              value={rawDate}
              onChange={(e) => {
                const iso = e.target.value;
                setRawDate(iso);
                if (!iso) {
                  onDocumentDateChange("");
                  return;
                }
                const d = new Date(iso);
                const day = d.getUTCDate();
                const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
                const year = String(d.getUTCFullYear()).slice(-2);
                const formatted = `${day} ${month} ${year}`;
                console.log("[Document Date] Formatted value to be sent in payload:", formatted);
                onDocumentDateChange(formatted);
              }}
              required
              className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:light] cursor-pointer"
            />
          </div>
          {rawDate && (
            <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
              <Lucide icon="Check" className="h-3 w-3 text-emerald-500" />
              Will be saved as: <span className="font-medium text-slate-700">{(() => {
                const d = new Date(rawDate);
                const day = d.getUTCDate();
                const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
                const year = String(d.getUTCFullYear()).slice(-2);
                return `${day} ${month} ${year}`;
              })()}</span>
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Company/Activist <span className="text-rose-600">*</span>
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-5">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={radioGroupName}
                value="company"
                className="h-4 w-4 accent-primary"
                checked={isCompanyActivist === "company"}
                onChange={() => onIsCompanyActivistChange("company")}
              />
              <span className="text-sm text-slate-700">Company</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={radioGroupName}
                value="activist"
                className="h-4 w-4 accent-primary"
                checked={isCompanyActivist === "activist"}
                onChange={() => onIsCompanyActivistChange("activist")}
              />
              <span className="text-sm text-slate-700">Activist</span>
            </label>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Upload Doc <span className="text-rose-600">*</span>
          </label>
          <div className="mt-1 rounded-lg border border-dashed border-slate-300 bg-white p-3">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (!file) {
                  onDocumentFileChange(null);
                  return;
                }

                const isPdf =
                  file.type === "application/pdf" ||
                  file.name.toLowerCase().endsWith(".pdf");

                if (!isPdf) {
                  toast.error("Only PDF files are allowed.");
                  e.currentTarget.value = "";
                  onDocumentFileChange(null);
                  return;
                }

                onDocumentFileChange(file);
              }}
              required={!existingDocumentUrl}
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:px-3 file:py-1.5 hover:file:bg-primary/20"
            />
            <p className="text-xs text-slate-500 mt-2">
              Required: Upload PDF document only.
            </p>
            {documentFile && (
              <p className="text-xs text-emerald-700 mt-1 font-medium">
                Selected: {documentFile.name}
              </p>
            )}
            {!documentFile && existingDocumentUrl && (
              <a
                href={existingDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-1 text-xs text-primary hover:underline"
              >
                Existing PDF attached
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProxyContestModal = ({
  open,
  mode = "add",
  initialData = null,
  prefilledDocuments,
  onClose,
  onSuccess,
}: ProxyContextModalProps) => {
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [years, setYears] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

  const [companySelectValue, setCompanySelectValue] = useState<any>("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);

  const [year, setYear] = useState("");
  const [keyword, setKeyword] = useState("");
  const [activistName, setActivistName] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [isCompanyActivist, setIsCompanyActivist] = useState<"company" | "activist">("company");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState("");
  const [primaryDocId, setPrimaryDocId] = useState<number | undefined>();
  const [extraDocuments, setExtraDocuments] = useState<ExtraDocumentUI[]>([]);
  const extraDocumentIdRef = useRef(1);
  // The prefilled annotations for the primary row (Document 1). The extra rows
  // carry their own on ExtraDocumentUI; this row's fields are separate state.
  const [primaryMeta, setPrimaryMeta] = useState<{
    sourceLabel?: string;
    needsKeywordCheck?: boolean;
    possiblyAlreadyAdded?: boolean;
    skipIfEmpty?: boolean;
  }>({});

  // Which rows already reached Django in an earlier Save attempt on this open
  // modal, and which failed. A failed save used to leave every row still
  // holding its File, so pressing Save again uploaded the successful ones a
  // second time; rows marked "saved" here are skipped on every later attempt.
  const [rowSaveStates, setRowSaveStates] = useState<Record<string, RowSaveState>>({});

  const [iss, setIss] = useState({
    id: undefined as number | undefined,
    management: false,
    activist: false,
    split: false,
  });

  const [gl, setGl] = useState({
    id: undefined as number | undefined,
    management: false,
    activist: false,
    split: false,
  });

  // ── Exclusion state ────────────────────────────────────────────────────────
  const [excluded, setExcluded] = useState(false);
  const [exclusionId, setExclusionId] = useState<number | undefined>(undefined);
  const [exclusionLoading, setExclusionLoading] = useState(false);

  const allDocumentEntries = useMemo(
    () => [
      {
        id: 0,
        docId: primaryDocId,
        year,
        keyword,
        documentDate,
        isCompanyActivist,
        documentFile,
        existingDocumentUrl,
        skipIfEmpty: primaryMeta.skipIfEmpty,
      },
      ...extraDocuments,
    ],
    [year, keyword, documentDate, isCompanyActivist, documentFile, existingDocumentUrl, extraDocuments, primaryDocId, primaryMeta.skipIfEmpty]
  );

  // A prefilled row that arrived with no PDF, and still has none. It cannot be
  // saved, and it must not hold back the rows that can be -- so it is skipped
  // rather than counted as invalid.
  const isSkippedRow = (entry: { documentFile: File | null; existingDocumentUrl?: string; docId?: number; skipIfEmpty?: boolean }) =>
    Boolean(entry.skipIfEmpty) && !entry.documentFile && !entry.existingDocumentUrl && !entry.docId;

  // A row already written to Django on an earlier attempt: complete by
  // definition, and skipped on save.
  const isSavedRow = (entryId: number) => rowSaveStates[rowKeyFor(entryId)]?.status === "saved";

  const canSubmit = useMemo(() => {
    if (!selectedCompany?.id) return false;

    // In edit mode with no documents (empty documentName and no existingDocumentUrl)
    const hasNoPrimaryDoc = !documentDate.trim() && !existingDocumentUrl;
    if (mode === "edit" && hasNoPrimaryDoc && extraDocuments.length === 0) {
      // Allow submit for advisory-only updates (no documents at all)
      return true;
    }

    // Validate documents: 
    // - NEW documents require: year, keyword, documentName, AND (file OR existingUrl)
    // - EXISTING documents need: year, keyword, AND (existingUrl OR file)
    //   (documentName can be empty if already exists in DB)
    const hasValidDocuments = allDocumentEntries.every((entry) => {
      // Already written, or a prefilled row with no PDF to write: neither one
      // can block the rows that still have to be saved.
      if (isSavedRow(entry.id) || isSkippedRow(entry)) return true;

      const isExistingDoc = Boolean(entry.existingDocumentUrl || entry.docId);

      if (isExistingDoc) {
        // Existing document: require year, keyword, and existing url (documentName optional)
        return (
          entry.year &&
          entry.keyword &&
          entry.documentDate.trim() &&
          (entry.documentFile || entry.existingDocumentUrl)
        );
      } else {
        // New document: require all fields
        return (
          entry.year &&
          entry.keyword &&
          entry.documentDate.trim() &&
          (entry.documentFile || entry.existingDocumentUrl)
        );
      }
    });

    return hasValidDocuments;
  }, [selectedCompany, allDocumentEntries, documentDate, existingDocumentUrl, extraDocuments, mode, rowSaveStates]);

  // Init runs once per opening. Without this, any re-render that hands the
  // modal a new initialData/prefilledDocuments object would run it again --
  // appending the prefilled rows a second time and discarding whatever the
  // analyst had already typed.
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const init = async () => {
      try {
        setDropdownLoading(true);
        const data = await proxyContextService.getDropdowns();
        const fetchedYears = data.years || [];
        const fetchedKeywords = data.keywords || [];
        setYears(fetchedYears);
        setKeywords(fetchedKeywords);

        // The campaign year every row in this modal inherits, and whether the
        // primary row (Document 1) is still empty and can take the first
        // prefilled document instead of leaving an unfilled required row.
        let campaignYear = "";
        let primaryRowFree = true;

        if (mode === "edit" && initialData) {
          if (initialData.company?.id && initialData.company?.name) {
            setSelectedCompany(initialData.company);
            setCompanySelectValue({
              value: initialData.company.id,
              label: initialData.company.name,
            });
          }

          const docs = Array.isArray(initialData.documents)
            ? initialData.documents.filter(Boolean)
            : [];

          let effectiveYear = "";
          if (docs.length > 0) {
            const firstDoc = docs[0];
            primaryRowFree = false;
            // initialData.year is the campaign's own year when the caller knows
            // it; the first document's year is the long-standing fallback.
            effectiveYear = initialData.year || firstDoc.year || fetchedYears[0] || "";
            setYear(effectiveYear);
            setKeyword(firstDoc.keyword || fetchedKeywords[0] || "");
            setActivistName(firstDoc.activistName || "");
            setDocumentDate(firstDoc.documentDate || firstDoc.documentName || "");
            setIsCompanyActivist(firstDoc.isCompanyActivist || "company");
            setDocumentFile(null);
            setExistingDocumentUrl(firstDoc.existingDocumentUrl || "");
            setPrimaryDocId(firstDoc.id);

            const restDocs = docs.slice(1).map((doc, index) => ({
              id: index + 1,
              docId: doc.id,
              year: doc.year || fetchedYears[0] || "",
              keyword: doc.keyword || fetchedKeywords[0] || "",
              documentDate: doc.documentDate || doc.documentName || "",
              isCompanyActivist: doc.isCompanyActivist || "company",
              documentFile: null,
              existingDocumentUrl: doc.existingDocumentUrl || "",
            }));
            setExtraDocuments(restDocs);
            extraDocumentIdRef.current = restDocs.length + 1;
          } else {
            // No documents exist - initialize with dropdown defaults for adding new ones
            effectiveYear = initialData.year || fetchedYears[0] || "";
            setYear(effectiveYear);
            setKeyword(fetchedKeywords[0] || "");
            setActivistName("");
            setDocumentDate("");
            setIsCompanyActivist("company");
            setDocumentFile(null);
            setExistingDocumentUrl("");
            setPrimaryDocId(undefined);
            setExtraDocuments([]);
            extraDocumentIdRef.current = 1;
          }

          setIss({
            id: initialData.advisory?.iss?.id,
            management: Boolean(initialData.advisory?.iss?.management),
            activist: Boolean(initialData.advisory?.iss?.activist),
            split: Boolean(initialData.advisory?.iss?.split),
          });
          setGl({
            id: initialData.advisory?.gl?.id,
            management: Boolean(initialData.advisory?.gl?.management),
            activist: Boolean(initialData.advisory?.gl?.activist),
            split: Boolean(initialData.advisory?.gl?.split),
          });

          // Check if company-year is excluded (use effectiveYear: the `year`
          // state is not yet updated within this same effect run).
          if (initialData.company?.id && effectiveYear) {
            setExclusionLoading(true);
            proxyContestAIService.getSettledExclusions({
              company_id: initialData.company.id,
              year: Number(effectiveYear),
            }).then((data: any) => {
              const exclusion = data?.results?.[0];
              if (exclusion?.exclude) {
                setExcluded(true);
                setExclusionId(exclusion.id);
              } else {
                setExcluded(false);
                setExclusionId(undefined);
              }
            }).catch(() => {
              // silent fail - assume not excluded
              setExcluded(false);
              setExclusionId(undefined);
            }).finally(() => {
              setExclusionLoading(false);
            });
          }
          campaignYear = effectiveYear;
        } else {
          // ADD mode. initialData is honoured only for the company and the
          // campaign year -- it never carries saved documents here.
          if (initialData?.company?.id && initialData?.company?.name) {
            setSelectedCompany(initialData.company);
            setCompanySelectValue({
              value: initialData.company.id,
              label: initialData.company.name,
            });
          }
          campaignYear = initialData?.year || fetchedYears[0] || "";
          setYear((prev) => initialData?.year || prev || fetchedYears[0] || "");
          setKeyword((prev) => prev || fetchedKeywords[0] || "");
        }

        // ── Prefilled documents ────────────────────────────────────────────
        // Appended as NEW rows in both modes. The first one takes the primary
        // row when that row is still empty, so a fresh Add never opens with an
        // unfilled required Document 1 sitting above the prefilled rows.
        const prefills = (prefilledDocuments || []).filter(Boolean);
        if (prefills.length > 0) {
          const firstActivistName = prefills.find((p) => p.activistName?.trim())?.activistName?.trim();
          if (firstActivistName) setActivistName((prev) => prev || firstActivistName);

          const toRow = (prefill: ProxyContestPrefilledDocument) => {
            const resolved = resolveKeyword(prefill.keyword, fetchedKeywords);
            return {
              // Every prefilled row inherits the campaign's single year.
              year: campaignYear,
              keyword: resolved.keyword,
              documentDate: prefill.documentDate || "",
              isCompanyActivist:
                (prefill.isCompanyActivist || "").toLowerCase() === "activist"
                  ? ("activist" as const)
                  : ("company" as const),
              documentFile: prefill.documentFile || null,
              existingDocumentUrl: "",
              sourceLabel: prefill.sourceLabel || "",
              // Either the source could not classify it, or its keyword has no
              // counterpart in the Django list -- both need a human to confirm.
              needsKeywordCheck: Boolean(prefill.needsKeywordCheck) || !resolved.matched,
              possiblyAlreadyAdded: Boolean(prefill.possiblyAlreadyAdded),
              skipIfEmpty: !prefill.documentFile,
            };
          };

          const rows = prefills.map(toRow);
          let extras = rows;

          if (primaryRowFree) {
            const [first, ...rest] = rows;
            setKeyword(first.keyword);
            setDocumentDate(first.documentDate);
            setIsCompanyActivist(first.isCompanyActivist);
            setDocumentFile(first.documentFile);
            setExistingDocumentUrl("");
            setPrimaryDocId(undefined);
            setPrimaryMeta({
              sourceLabel: first.sourceLabel,
              needsKeywordCheck: first.needsKeywordCheck,
              possiblyAlreadyAdded: first.possiblyAlreadyAdded,
              skipIfEmpty: first.skipIfEmpty,
            });
            extras = rest;
          }

          if (extras.length > 0) {
            setExtraDocuments((prev) => {
              const appended = extras.map((row, index) => ({
                ...row,
                id: extraDocumentIdRef.current + index,
              }));
              extraDocumentIdRef.current += extras.length;
              return [...prev, ...appended];
            });
          }
        }
      } catch (error) {
        console.error("Error fetching proxy context dropdowns:", error);
      } finally {
        setDropdownLoading(false);
      }
    };

    init();
  }, [open, mode, initialData]);

  useEffect(() => {
    if (!open) {
      setCompanySelectValue("");
      setSelectedCompany(null);
      setYear("");
      setKeyword("");
      setActivistName("");
      setDocumentDate("");
      setIsCompanyActivist("company");
      setDocumentFile(null);
      setExistingDocumentUrl("");
      setPrimaryDocId(undefined);
      setExtraDocuments([]);
      extraDocumentIdRef.current = 1;
      setIss({ id: undefined, management: false, activist: false, split: false });
      setGl({ id: undefined, management: false, activist: false, split: false });
      setExcluded(false);
      setExclusionId(undefined);
      setPrimaryMeta({});
      setRowSaveStates({});
      hasInitializedRef.current = false;
    }
  }, [open]);

  // Every row in this modal belongs to the campaign's single year. Rows not yet
  // saved in Django follow the Year select; rows that already exist there keep
  // the year they were stored under until the analyst re-uploads them.
  useEffect(() => {
    if (!year) return;
    setExtraDocuments((prev) =>
      prev.some((doc) => !doc.docId && doc.year !== year)
        ? prev.map((doc) => (doc.docId ? doc : { ...doc, year }))
        : prev
    );
  }, [year]);

  const handleAddMoreDocuments = () => {
    setExtraDocuments((prev) => [
      ...prev,
      {
        id: extraDocumentIdRef.current++,
        // The campaign's year, not years[0] -- that is the newest year in the
        // dropdown (normally the current one), which would file this document
        // under the wrong campaign year.
        year: year || years[0] || "",
        keyword: keywords[0] || "",
        documentDate: "",
        isCompanyActivist: "company",
        documentFile: null,
        existingDocumentUrl: "",
      },
    ]);
  };

  const handleRemoveExtraDocument = (id: number) => {
    setExtraDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleExtraDocumentChange = (
    id: number,
    updates: Partial<Omit<ExtraDocumentUI, "id">>
  ) => {
    setExtraDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc))
    );
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedCompany?.id) {
      toast.error("Please select a company.");
      return;
    }

    // In edit mode with no documents, allow advisory-only updates
    const hasNoPrimaryDoc = !documentDate.trim() && !existingDocumentUrl;
    const isAdvisoryOnlyEdit = mode === "edit" && hasNoPrimaryDoc && extraDocuments.length === 0;

    if (!isAdvisoryOnlyEdit) {
      // Validate documents if not advisory-only
      const hasInvalidDocument = allDocumentEntries.some((entry) => {
        // Same two exemptions the Submit button uses: a row already written on
        // an earlier attempt, and a prefilled row with no PDF to write.
        if (isSavedRow(entry.id) || isSkippedRow(entry)) return false;

        const isExistingDoc = Boolean(entry.existingDocumentUrl || entry.docId);

        if (isExistingDoc) {
          // Existing document: require year, keyword, and existing url
          return !(
            entry.year &&
            entry.keyword &&
            entry.documentDate.trim() &&
            (entry.documentFile || entry.existingDocumentUrl)
          );
        } else {
          // New document: require all fields including documentName
          return !(
            entry.year &&
            entry.keyword &&
            entry.documentDate.trim() &&
            (entry.documentFile || entry.existingDocumentUrl)
          );
        }
      });

      if (hasInvalidDocument) {
        toast.error("Please fill all required fields for documents.");
        return;
      }
    }

    try {
      setSubmitting(true);

      // Process documents: POST for new, PUT for existing updates, skip if unchanged
      // Skip document processing for advisory-only updates
      //
      // Every row is attempted even after one fails, and each outcome is
      // recorded per row. A row recorded as saved is never uploaded again, so
      // pressing Save after a partial failure retries only what did not land.
      const failedRows: string[] = [];
      if (!isAdvisoryOnlyEdit) {
        for (let position = 0; position < allDocumentEntries.length; position++) {
          const entry = allDocumentEntries[position];
          const rowKey = rowKeyFor(entry.id);
          // Matches the heading on the card, which counts by position rather
          // than by row id -- removing a row renumbers what the analyst sees.
          const rowLabel = `Document ${position + 1}`;

          // Already written to Django on an earlier attempt in this modal.
          if (rowSaveStates[rowKey]?.status === "saved") continue;

          // Only process if file changed or document doesn't exist yet
          if (!entry.documentFile && !entry.docId) {
            // New document without file - skip (validation already caught this)
            continue;
          }

          if (entry.documentFile) {
            // File was selected - either create new or update existing
            const pressReleaseFormData = new FormData();
            pressReleaseFormData.append("company_id", String(selectedCompany.id));
            pressReleaseFormData.append("keyword", entry.keyword);
            pressReleaseFormData.append("year", String(Number(entry.year)));
            pressReleaseFormData.append("activist_name", activistName.trim());
            pressReleaseFormData.append("document_date", entry.documentDate.trim());
            pressReleaseFormData.append("is_company_activist", entry.isCompanyActivist);
            pressReleaseFormData.append("document", entry.documentFile as File);

            try {
              if (entry.docId) {
                // Update existing document
                await proxyContextService.updatePressReleasePresentation(entry.docId, pressReleaseFormData);
              } else {
                // Create new document
                await proxyContextService.createPressReleasePresentation(pressReleaseFormData);
              }
              setRowSaveStates((prev) => ({ ...prev, [rowKey]: { status: "saved" } }));
            } catch (documentError) {
              const message =
                documentError instanceof Error ? documentError.message : "Upload failed.";
              failedRows.push(rowLabel);
              setRowSaveStates((prev) => ({ ...prev, [rowKey]: { status: "failed", message } }));
            }
          }
          // If no new file and docId exists, keep the existing document unchanged
        }
      }

      // One or more documents did not reach Django. The modal stays open with
      // each row labelled saved or not saved, and no success is reported.
      if (failedRows.length > 0) {
        toast.error(
          `${failedRows.join(", ")} could not be saved. The rest were saved — press Submit to retry just these.`
        );
        return;
      }

      // Process advisory recommendations: PUT for existing, POST for new
      const issPayload = {
        company_id: selectedCompany.id,
        company_tent: selectedCompany.name,
        year: Number(year),
        type: "ISS" as const,
        management: iss.management,
        activist: iss.activist,
        split: iss.split,
      };

      // A recommendation is only created when the analyst actually ticked one of
      // its boxes. Creating it regardless wrote a row with all three false --
      // indistinguishable from "ISS recommended nothing" -- for every document
      // saved through this modal. An existing row is still updated either way,
      // so clearing all three boxes on it remains possible.
      const issTicked = iss.management || iss.activist || iss.split;
      if (iss.id) {
        // Update existing ISS recommendation
        await proxyContextService.updateProxyAdvisoryRecommendation(iss.id, {
          management: iss.management,
          activist: iss.activist,
          split: iss.split,
        });
      } else if (issTicked) {
        await proxyContextService.createProxyAdvisoryRecommendation(issPayload);
      }

      const glPayload = {
        company_id: selectedCompany.id,
        company_tent: selectedCompany.name,
        year: Number(year),
        type: "GL" as const,
        management: gl.management,
        activist: gl.activist,
        split: gl.split,
      };

      const glTicked = gl.management || gl.activist || gl.split;
      if (gl.id) {
        // Update existing GL recommendation
        await proxyContextService.updateProxyAdvisoryRecommendation(gl.id, {
          management: gl.management,
          activist: gl.activist,
          split: gl.split,
        });
      } else if (glTicked) {
        await proxyContextService.createProxyAdvisoryRecommendation(glPayload);
      }

      // Handle exclusion status for edit mode
      if (mode === "edit" && selectedCompany?.id && year) {
        try {
          if (excluded && !exclusionId) {
            // Create new exclusion
            await proxyContestAIService.createSettledExclusion({
              company_id: selectedCompany.id,
              year: Number(year),
              exclude: true,
              reason: "Excluded via Edit Proxy Contest modal",
            });
          } else if (!excluded && exclusionId) {
            // Remove exclusion
            await proxyContestAIService.deleteSettledExclusion(exclusionId);
          }
        } catch (exclusionError) {
          console.error("Error updating exclusion status:", exclusionError);
          // Don't block success toast for main operation
        }
      }

      toast.success(mode === "edit" ? "Proxy context updated successfully." : "Proxy context added successfully.");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error submitting proxy context:", error);
      toast.error("Failed to submit proxy context. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog size="xl" open={open} onClose={handleClose}>
      <Dialog.Panel className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl">
        <Dialog.Title className="flex justify-between items-center px-6 py-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {mode === "edit" ? "Edit Proxy Contest" : "Add Proxy Contest"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit document and proxy advisory recommendations in one flow.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 transition-colors p-1.5 rounded-md hover:bg-slate-100"
            disabled={submitting}
          >
            <Lucide icon="X" className="w-5 h-5" />
          </button>
        </Dialog.Title>

        <Dialog.Description className="p-6">
          {dropdownLoading ? (
            <div className="flex items-center justify-center min-h-[280px]">
              <div className="text-center">
                <LoadingIcon icon="three-dots" className="w-10 h-10 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">Loading dropdown options...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <h3 className="text-base font-semibold text-slate-800">Press Release / Presentation</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Company <span className="text-rose-600">*</span>
                    </label>
                    <div className="mt-1">
                      <CompanySelect
                        value={companySelectValue || ""}
                        isClearable={true}
                        placeholder="Search Company"
                        onChange={(value: any) => {
                          if (!value) {
                            setCompanySelectValue("");
                            setSelectedCompany(null);
                            return;
                          }

                          const option = Array.isArray(value) ? value[0] : value;
                          if (!option) {
                            setCompanySelectValue("");
                            setSelectedCompany(null);
                            return;
                          }

                          const optionId = Number(option?.value || option?.company?.id);
                          const optionName = option?.label || option?.company?.name || "";

                          setCompanySelectValue(option);
                          if (optionId && optionName) {
                            setSelectedCompany({ id: optionId, name: optionName });
                          } else {
                            setSelectedCompany(null);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Year <span className="text-rose-600">*</span>
                    </label>
                    <TomSelect
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="mt-1 w-full"
                      options={{
                        placeholder: "Dropdown",
                      }}
                    >
                      {years.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </TomSelect>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Activist Name <span className="text-rose-600">*</span>
                    </label>
                    <FormInput
                      value={activistName}
                      onChange={(e) => setActivistName(e.target.value)}
                      placeholder="Enter Activist Name"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <DocumentFieldsSection
                      title="Document 1"
                      years={years}
                      keywords={keywords}
                      year={year}
                      keyword={keyword}
                      documentDate={documentDate}
                      isCompanyActivist={isCompanyActivist}
                      documentFile={documentFile}
                      existingDocumentUrl={existingDocumentUrl}
                      onYearChange={setYear}
                      onKeywordChange={(value) => {
                        setKeyword(value);
                        // Confirmed by hand -- the row no longer needs checking.
                        setPrimaryMeta((prev) =>
                          prev.needsKeywordCheck ? { ...prev, needsKeywordCheck: false } : prev
                        );
                      }}
                      onDocumentDateChange={setDocumentDate}
                      onIsCompanyActivistChange={setIsCompanyActivist}
                      onDocumentFileChange={(file) => {
                        setDocumentFile(file);
                        if (file) setExistingDocumentUrl("");
                      }}
                      sourceLabel={primaryMeta.sourceLabel}
                      needsKeywordCheck={primaryMeta.needsKeywordCheck}
                      possiblyAlreadyAdded={primaryMeta.possiblyAlreadyAdded}
                      skipIfEmpty={primaryMeta.skipIfEmpty}
                      saveState={rowSaveStates[PRIMARY_ROW_KEY]}
                    />

                    {extraDocuments.map((doc, index) => (
                      <DocumentFieldsSection
                        key={doc.id}
                        title={`Document ${index + 2}`}
                        years={years}
                        keywords={keywords}
                        year={doc.year}
                        keyword={doc.keyword}
                        documentDate={doc.documentDate}
                        isCompanyActivist={doc.isCompanyActivist}
                        documentFile={doc.documentFile}
                        existingDocumentUrl={doc.existingDocumentUrl}
                        onYearChange={(value) =>
                          handleExtraDocumentChange(doc.id, { year: value })
                        }
                        onKeywordChange={(value) =>
                          handleExtraDocumentChange(doc.id, { keyword: value, needsKeywordCheck: false })
                        }
                        onDocumentDateChange={(value) =>
                          handleExtraDocumentChange(doc.id, { documentDate: value })
                        }
                        onIsCompanyActivistChange={(value) =>
                          handleExtraDocumentChange(doc.id, { isCompanyActivist: value })
                        }
                        onDocumentFileChange={(file) =>
                          handleExtraDocumentChange(doc.id, {
                            documentFile: file,
                            existingDocumentUrl: file ? "" : doc.existingDocumentUrl,
                          })
                        }
                        onRemove={() => handleRemoveExtraDocument(doc.id)}
                        sourceLabel={doc.sourceLabel}
                        needsKeywordCheck={doc.needsKeywordCheck}
                        possiblyAlreadyAdded={doc.possiblyAlreadyAdded}
                        skipIfEmpty={doc.skipIfEmpty}
                        saveState={rowSaveStates[rowKeyFor(doc.id)]}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={handleAddMoreDocuments}
                      className="w-full rounded-lg border border-dashed border-slate-400 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Add more documents
                    </button>
                  </div>
                </div>

              </div>

              {/* Exclusion Toggle - Edit Mode Only */}
              {mode === "edit" && selectedCompany?.id && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-amber-800">Exclude from Proxy Contest</h3>
                      <p className="text-xs text-amber-600 mt-0.5">
                        When enabled, this company-year will be hidden from the Proxy Contest dashboard by default.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {exclusionLoading && (
                        <Lucide icon="Loader" className="w-4 h-4 animate-spin text-amber-600" />
                      )}
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={excluded}
                          onChange={(e) => setExcluded(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        <span className="ms-3 text-sm font-medium text-amber-800">
                          {excluded ? "Excluded" : "Active"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-800">Proxy Advisory Firm Recommendation (ISS / GL)</h3>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                    <h4 className="font-medium mb-3 text-slate-700">For ISS</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="iss-management"
                            type="checkbox"
                            checked={iss.management}
                            onChange={(e) => setIss((prev) => ({ ...prev, management: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="iss-management" className="text-sm text-slate-700">
                            Management
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="iss-activist"
                            type="checkbox"
                            checked={iss.activist}
                            onChange={(e) => setIss((prev) => ({ ...prev, activist: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="iss-activist" className="text-sm text-slate-700">
                            Activist
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="iss-split"
                            type="checkbox"
                            checked={iss.split}
                            onChange={(e) => setIss((prev) => ({ ...prev, split: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="iss-split" className="text-sm text-slate-700">
                            Split
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                    <h4 className="font-medium mb-3 text-slate-700">For GL</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="gl-management"
                            type="checkbox"
                            checked={gl.management}
                            onChange={(e) => setGl((prev) => ({ ...prev, management: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="gl-management" className="text-sm text-slate-700">
                            Management
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="gl-activist"
                            type="checkbox"
                            checked={gl.activist}
                            onChange={(e) => setGl((prev) => ({ ...prev, activist: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="gl-activist" className="text-sm text-slate-700">
                            Activist
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 hover:border-primary/40 transition-colors">
                        <FormCheck>
                          <FormCheck.Input
                            id="gl-split"
                            type="checkbox"
                            checked={gl.split}
                            onChange={(e) => setGl((prev) => ({ ...prev, split: e.target.checked }))}
                          />
                          <FormCheck.Label htmlFor="gl-split" className="text-sm text-slate-700">
                            Split
                          </FormCheck.Label>
                        </FormCheck>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Dialog.Description>

        <Dialog.Footer className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/60 flex justify-end gap-3">
          <Button variant="outline-secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>
  );
};

export default ProxyContestModal;
