import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dashboardService } from "@/services/dashboard";
import StandardizedTable from "@/components/StandardizedTable";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import Lucide, { AppIconName } from "@/components/Base/Lucide";
import Popover from "@/components/Base/Headless/Popover";
import { FormCheck } from "@/components/Base/Form";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import FilterChips from "@/components/FilterChips";
import Dropzone, { DropzoneElement } from "@/components/Base/Dropzone";
import CPagination from "@/components/Pagination";
import { toast } from "react-toastify";

const THEME_MAROON = "#8b1828";
const PAGE_SIZE = 50;

// One row per captured SEC filing -- NOT one row per company+filer campaign.
// The same investor filing three times against one company shows as three
// separate rows here. status/notes/campaign_id are joined in from a campaign
// record when one exists for this company+filer pair, and are null otherwise.
type FilingItem = {
  id: string | number;
  accession_number?: string;
  form_type?: string;
  company_name?: string;
  subject_cik?: string;
  ticker?: string;
  filer?: string;
  filer_cik?: string;
  in_activism_flow?: boolean;
  filing_url?: string;
  filed_at?: string;
  alert_sent_at?: string | null;
  alert_sent_by?: string | null;
  status?: string | null;
  notes?: string | null;
  campaign_id?: string | number | null;
  // Local-only: set when send-alert returns sent:true with alert_sent_at
  // still null and a `warning` -- the email genuinely went out, only the
  // database write of when recording it failed. Never comes from a GET; only
  // ever set from a send-alert response, and never cleared by a refetch.
  alertSendWarning?: string | null;
  [key: string]: any;
};

const toTrimmedString = (value: unknown) => String(value ?? "").trim();

const formatDateOnly = (value: any): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatDateTime = (value: any): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

// ─── Filing category buckets ──────────────────────────────────────────────
// The backend stores form_type as free-form strings ("Schedule 13D",
// "DEF 14A", ...) with inconsistent case/spacing seen in the data, so
// matching is done on a normalized (uppercased, whitespace-collapsed) form
// rather than the raw string. Anything that doesn't match either named
// bucket still gets its own "Other" bucket rather than being dropped, so no
// row becomes unreachable through this filter.
const OWNERSHIP_FILING_TYPES = new Set(["SCHEDULE 13D", "SCHEDULE 13D/A"]);
const PROXY_FILING_TYPES = new Set(["DEF 14A", "DEFA14A", "DEF 14C"]);
const FILING_CATEGORY_OTHER = "Other";
const FILING_CATEGORY_ORDER = ["Ownership filings", "Proxy filings", FILING_CATEGORY_OTHER];

const normalizeFilingType = (value: unknown) => toTrimmedString(value).toUpperCase().replace(/\s+/g, " ");

const getFilingCategory = (formType: unknown): string => {
  const normalized = normalizeFilingType(formType);
  if (OWNERSHIP_FILING_TYPES.has(normalized)) return "Ownership filings";
  if (PROXY_FILING_TYPES.has(normalized)) return "Proxy filings";
  return FILING_CATEGORY_OTHER;
};

// ─── Filter panel — one MultiSelectDropdown + "Select All" checkbox, reused
// for Status/Ticker/Filer (ActivistFilings only needed two of these inline;
// a third made the copy-pasted block worth factoring out). ──────────────────
const CampaignFilterPanel = ({
  label,
  icon,
  options,
  draft,
  onDraftChange,
  loading,
}: {
  label: string;
  icon: AppIconName;
  options: string[];
  draft: string[];
  onDraftChange: (next: string[]) => void;
  loading: boolean;
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 text-slate-600 font-semibold">
        <Lucide icon={icon} className="w-4 h-4 text-slate-400" />
        {label}
      </div>

      {options.length > 0 && (
        <FormCheck className="mr-2">
          <FormCheck.Label>Select All</FormCheck.Label>
          <FormCheck.Input
            className="ml-1"
            checked={draft.length === options.length && options.length > 0}
            type="checkbox"
            onChange={(e) => onDraftChange(e.target.checked ? options : [])}
          />
        </FormCheck>
      )}
    </div>

    <MultiSelectDropdown
      data={options}
      placeholder={`Select ${label}`}
      loading={loading}
      onChange={(selectedOptions) => onDraftChange(selectedOptions.map((option) => String(option.value)))}
      selectedOption={draft}
      size="compact"
      alignLeft
    />
  </div>
);

// Date range filter, same visual container as CampaignFilterPanel above.
// Native <input type="date"> -- same date-input pattern already used
// elsewhere in this codebase (e.g. ProxyContestModal.tsx), no new
// date-picker dependency.
const DateRangeFilterPanel = ({
  draftFrom,
  draftTo,
  onDraftFromChange,
  onDraftToChange,
}: {
  draftFrom: string;
  draftTo: string;
  onDraftFromChange: (value: string) => void;
  onDraftToChange: (value: string) => void;
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
    <div className="flex items-center gap-2 text-slate-600 font-semibold mb-3">
      <Lucide icon="Calendar" className="w-4 h-4 text-slate-400" />
      First Filed
    </div>

    <div className="flex flex-col gap-3">
      <label className="block">
        <span className="block text-xs text-slate-500 mb-1">From</span>
        <input
          type="date"
          value={draftFrom}
          onChange={(e) => onDraftFromChange(e.target.value)}
          className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="block text-xs text-slate-500 mb-1">To</span>
        <input
          type="date"
          value={draftTo}
          onChange={(e) => onDraftToChange(e.target.value)}
          className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 bg-white focus:border-primary focus:outline-none"
        />
      </label>
    </div>
  </div>
);

function ActivistCampaigns() {
  const [loading, setLoading] = useState(false);
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [totalFilings, setTotalFilings] = useState(0);
  const [page, setPage] = useState(1);

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedFilers, setSelectedFilers] = useState<string[]>([]);
  const [selectedFilingCategories, setSelectedFilingCategories] = useState<string[]>([]);
  const [selectedDateFrom, setSelectedDateFrom] = useState("");
  const [selectedDateTo, setSelectedDateTo] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<string[]>([]);
  const [draftTickers, setDraftTickers] = useState<string[]>([]);
  const [draftFilers, setDraftFilers] = useState<string[]>([]);
  const [draftFilingCategories, setDraftFilingCategories] = useState<string[]>([]);
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");

  // Send Alert -- replaces the old local-only sendAlertFlags entirely. The
  // checkbox's checked state now reflects the real alert_sent_at on the row,
  // not unsent local intent; clicking it opens a confirm dialog rather than
  // toggling anything directly.
  const [alertConfirmTarget, setAlertConfirmTarget] = useState<FilingItem | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | number | null>(null);
  const [alertSendError, setAlertSendError] = useState<string | null>(null);

  const [editingFiling, setEditingFiling] = useState<FilingItem | null>(null);
  const [editStatus, setEditStatus] = useState("ongoing");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const dropzoneRef = useRef<DropzoneElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Server-side pagination + date filtering, per the backend contract --
  // never fetch everything and paginate/filter dates in the browser, since
  // this table will hold thousands of rows.
  const fetchFilings = useCallback(async (targetPage: number, dateFrom: string, dateTo: string) => {
    setLoading(true);
    try {
      const response = await dashboardService.getActivistCampaignFilings({
        limit: PAGE_SIZE,
        offset: (targetPage - 1) * PAGE_SIZE,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      const list = response?.filings || response?.results || response?.data || [];
      const results = Array.isArray(list) ? list : [];
      setFilings(results);
      setTotalFilings(typeof response?.total === "number" ? response.total : results.length);
    } catch (error) {
      console.error("Failed to load activist campaign filings:", error);
      setFilings([]);
      setTotalFilings(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilings(1, "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchFilings(newPage, selectedDateFrom, selectedDateTo);
  };

  // ─── Excel upload dropzone — mirrors src/components/UploadFile/index.tsx's
  // addedfile/error handling exactly. ───────────────────────────────────────
  useEffect(() => {
    const el = dropzoneRef.current;
    if (!el) return;

    const dz = el.dropzone;
    const handleAddedFile = (file: any) => {
      if (file?.status === "added") {
        const fileExtension = file?.name?.split(".").pop()?.toLowerCase();

        if (!fileExtension || fileExtension !== "xlsx") {
          toast.error("Only Excel files (.xlsx) are allowed!");
        } else {
          setUploadFile(file);
          setUploadErrors([]);
        }

        dz.removeFile(file);
      }

      if (file?.status === "error") {
        toast.error("Something went wrong during file upload!");
      }
    };

    dz.on("addedfile", handleAddedFile);
    return () => {
      dz.off("addedfile", handleAddedFile);
    };
  }, []);

  // NOTE: Status/Ticker/Filer/Filing Category filters below are client-side,
  // applied only to the currently-loaded page of filings -- the documented
  // backend contract for GET .../filings has no query params for exact
  // status/ticker/filer matching (only date_from/date_to, form_type,
  // in_activism_flow, and a single fuzzy `search`). This is a pre-existing
  // limitation carried over from before this change, just made more visible
  // now that the table is genuinely paginated -- flagged rather than
  // silently left, since it's the same "only filters the current page" trap
  // the date filter was explicitly required to avoid.
  const statusOptions = useMemo(
    () => Array.from(new Set(filings.map((f) => toTrimmedString(f.status)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [filings]
  );
  const tickerOptions = useMemo(
    () => Array.from(new Set(filings.map((f) => toTrimmedString(f.ticker)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [filings]
  );
  const filerOptions = useMemo(
    () => Array.from(new Set(filings.map((f) => toTrimmedString(f.filer)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [filings]
  );
  const filingCategoryOptions = useMemo(() => {
    const present = new Set(filings.map((f) => getFilingCategory(f.form_type)));
    // Fixed order (not alpha) so "Other" always trails the two named
    // buckets instead of sorting wherever "O" happens to land.
    return FILING_CATEGORY_ORDER.filter((category) => present.has(category));
  }, [filings]);

  const filteredFilings = useMemo(() => {
    return filings.filter((filing) => {
      const status = toTrimmedString(filing.status);
      const ticker = toTrimmedString(filing.ticker);
      const filer = toTrimmedString(filing.filer);
      const filingCategory = getFilingCategory(filing.form_type);

      if (selectedStatuses.length > 0 && !selectedStatuses.includes(status)) return false;
      if (selectedTickers.length > 0 && !selectedTickers.includes(ticker)) return false;
      if (selectedFilers.length > 0 && !selectedFilers.includes(filer)) return false;
      if (selectedFilingCategories.length > 0 && !selectedFilingCategories.includes(filingCategory)) return false;

      return true;
    });
  }, [filings, selectedStatuses, selectedTickers, selectedFilers, selectedFilingCategories]);

  const activeFiltersCount =
    selectedStatuses.length +
    selectedTickers.length +
    selectedFilers.length +
    selectedFilingCategories.length +
    (selectedDateFrom ? 1 : 0) +
    (selectedDateTo ? 1 : 0);

  const syncDraftFilters = useCallback(() => {
    setDraftStatuses(selectedStatuses);
    setDraftTickers(selectedTickers);
    setDraftFilers(selectedFilers);
    setDraftFilingCategories(selectedFilingCategories);
    setDraftDateFrom(selectedDateFrom);
    setDraftDateTo(selectedDateTo);
  }, [selectedStatuses, selectedTickers, selectedFilers, selectedFilingCategories, selectedDateFrom, selectedDateTo]);

  const applyFilters = useCallback(
    (close?: () => void) => {
      setSelectedStatuses(draftStatuses);
      setSelectedTickers(draftTickers);
      setSelectedFilers(draftFilers);
      setSelectedFilingCategories(draftFilingCategories);
      setSelectedDateFrom(draftDateFrom);
      setSelectedDateTo(draftDateTo);
      setPage(1);
      // Only date_from/date_to actually need a refetch (server-side); the
      // other filters just re-narrow whatever page is already loaded. Still
      // safe/cheap to always refetch page 1 here since Apply is an explicit,
      // infrequent action, not something firing on every keystroke.
      fetchFilings(1, draftDateFrom, draftDateTo);
      close?.();
    },
    [draftStatuses, draftTickers, draftFilers, draftFilingCategories, draftDateFrom, draftDateTo, fetchFilings]
  );

  const clearFilters = useCallback(
    (close?: () => void) => {
      setDraftStatuses([]);
      setDraftTickers([]);
      setDraftFilers([]);
      setDraftFilingCategories([]);
      setDraftDateFrom("");
      setDraftDateTo("");
      setSelectedStatuses([]);
      setSelectedTickers([]);
      setSelectedFilers([]);
      setSelectedFilingCategories([]);
      setSelectedDateFrom("");
      setSelectedDateTo("");
      setPage(1);
      fetchFilings(1, "", "");
      close?.();
    },
    [fetchFilings]
  );

  const handleRemoveChip = useCallback(
    (removeKey: string, removeValue: string | number) => {
      const value = String(removeValue);

      if (removeKey === "status") {
        setSelectedStatuses((prev) => prev.filter((item) => item !== value));
        setDraftStatuses((prev) => prev.filter((item) => item !== value));
        return;
      }
      if (removeKey === "ticker") {
        setSelectedTickers((prev) => prev.filter((item) => item !== value));
        setDraftTickers((prev) => prev.filter((item) => item !== value));
        return;
      }
      if (removeKey === "filer") {
        setSelectedFilers((prev) => prev.filter((item) => item !== value));
        setDraftFilers((prev) => prev.filter((item) => item !== value));
        return;
      }
      if (removeKey === "filing_category") {
        setSelectedFilingCategories((prev) => prev.filter((item) => item !== value));
        setDraftFilingCategories((prev) => prev.filter((item) => item !== value));
        return;
      }
      if (removeKey === "date_from") {
        setSelectedDateFrom("");
        setDraftDateFrom("");
        setPage(1);
        fetchFilings(1, "", selectedDateTo);
        return;
      }
      if (removeKey === "date_to") {
        setSelectedDateTo("");
        setDraftDateTo("");
        setPage(1);
        fetchFilings(1, selectedDateFrom, "");
      }
    },
    [fetchFilings, selectedDateFrom, selectedDateTo]
  );

  const openEditModal = (filing: FilingItem) => {
    if (filing.campaign_id == null) return;
    setEditingFiling(filing);
    setEditStatus(toTrimmedString(filing.status).toLowerCase() === "closed" ? "closed" : "ongoing");
    setEditNotes(filing.notes || "");
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setEditingFiling(null);
  };

  const saveEdit = async () => {
    if (!editingFiling || editingFiling.campaign_id == null) return;
    const campaignId = editingFiling.campaign_id;
    setIsSavingEdit(true);
    try {
      await dashboardService.updateActivistCampaign(campaignId, {
        status: editStatus,
        notes: editNotes,
      });
      // Every filing row sharing this campaign_id reflects the same
      // underlying campaign, so all of them get the update, not just the
      // one row that was clicked.
      setFilings((prev) =>
        prev.map((f) => (f.campaign_id != null && f.campaign_id === campaignId ? { ...f, status: editStatus, notes: editNotes } : f))
      );
      toast.success("Campaign updated.");
      setEditingFiling(null);
    } catch (error) {
      console.error("Failed to update activist campaign:", error);
      toast.error("Failed to update the campaign.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openAlertConfirm = (filing: FilingItem) => {
    setAlertSendError(null);
    setAlertConfirmTarget(filing);
  };

  const closeAlertConfirm = () => {
    if (sendingAlertId != null) return;
    setAlertConfirmTarget(null);
    setAlertSendError(null);
  };

  const confirmSendAlert = async () => {
    if (!alertConfirmTarget) return;
    const target = alertConfirmTarget;
    setSendingAlertId(target.id);
    setAlertSendError(null);
    try {
      const response = await dashboardService.sendActivistCampaignFilingAlert(target.id);

      if (!response?.sent) {
        // A 2xx response that isn't actually a success (sent:false, or a
        // shape we don't recognize) -- treated exactly like a thrown error:
        // the row stays not-sent, and the server's own message is shown.
        setAlertSendError(response?.detail || response?.message || "Failed to send the alert.");
        return;
      }

      setFilings((prev) =>
        prev.map((f) =>
          f.id === target.id
            ? {
                ...f,
                alert_sent_at: response?.alert_sent_at ?? f.alert_sent_at,
                alert_sent_by: response?.alert_sent_by ?? f.alert_sent_by,
                // sent:true with alert_sent_at still null + a `warning` means
                // the email genuinely went out -- only the database write of
                // *when* it was sent failed. Cleared once a real
                // alert_sent_at comes back, so a later successful send
                // doesn't leave a stale warning on the row.
                alertSendWarning: response?.alert_sent_at ? null : response?.warning || null,
              }
            : f
        )
      );
      toast.success(
        response?.warning
          ? `Alert sent for ${target.company_name || "this filing"} — ${response.warning}`
          : `Alert sent for ${target.company_name || "this filing"}.`
      );
      setAlertConfirmTarget(null);
    } catch (error: any) {
      console.error("Failed to send alert:", error);
      // Never optimistically mark the row as sent -- on failure it's left
      // exactly as it was (still shows its previous alert_sent_at, if any).
      setAlertSendError(error?.response?.data?.detail || error?.message || "Failed to send the alert.");
    } finally {
      setSendingAlertId(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || isUploading) return;

    const formData = new FormData();
    formData.append("file", uploadFile);

    setIsUploading(true);
    setUploadErrors([]);
    try {
      const response = await dashboardService.uploadActivistCampaignsExcel(formData);
      const rowErrors: any[] = Array.isArray(response?.errors)
        ? response.errors
        : Array.isArray(response?.row_errors)
          ? response.row_errors
          : [];

      if (rowErrors.length > 0) {
        setUploadErrors(rowErrors.map((err) => (typeof err === "string" ? err : err?.message || JSON.stringify(err))));
        toast.error(`Upload completed with ${rowErrors.length} row error(s).`);
      } else {
        toast.success("Campaigns uploaded successfully.");
      }

      setUploadFile(null);
      await fetchFilings(page, selectedDateFrom, selectedDateTo);
    } catch (error: any) {
      console.error("Failed to upload activist campaigns Excel:", error);
      toast.error(error?.response?.data?.detail || error?.message || "Failed to upload the file.");
    } finally {
      setIsUploading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalFilings / PAGE_SIZE));

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="mt-3.5 relative">
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">Activist Campaigns</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Upload Campaigns (Excel)</h3>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-full max-w-md">
                {uploadFile ? (
                  <div className="flex items-center w-full relative px-3 py-2.5 rounded-[0.6rem] border border-slate-200/80 hover:bg-slate-50 transition sm:px-5 shadow-sm">
                    <Lucide icon="FileSpreadsheet" className="w-8 h-8 shrink-0 stroke-[1.7] stroke-slate-400/70" />
                    <div className="flex flex-col w-full ml-3 gap-y-1 overflow-hidden">
                      <p className="block font-medium truncate text-sm text-slate-700">{uploadFile.name}</p>
                    </div>
                    <Lucide
                      onClick={() => setUploadFile(null)}
                      icon="Trash2"
                      className="w-5 h-5 shrink-0 cursor-pointer stroke-[1.7] stroke-slate-400/70"
                    />
                  </div>
                ) : (
                  <Dropzone
                    ref={dropzoneRef}
                    options={{
                      url: "/",
                      autoProcessQueue: false,
                      clickable: true,
                      thumbnailWidth: 100,
                      maxFilesize: 5000,
                      maxFiles: 1,
                      acceptedFiles: ".xlsx",
                    }}
                    className="dropzone w-full flex flex-col justify-center items-center h-[110px]"
                  >
                    <div className="text-sm font-semibold text-gray-800 mb-1">Drop file here or click to upload.</div>
                    <div className="text-xs text-slate-500">
                      Only <span className="font-medium">.xlsx</span> files are allowed.
                    </div>
                  </Dropzone>
                )}
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                style={{
                  padding: "10px 18px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", color: "#fff",
                  background: THEME_MAROON,
                  opacity: !uploadFile || isUploading ? 0.5 : 1,
                  cursor: !uploadFile || isUploading ? "not-allowed" : "pointer",
                  height: "fit-content",
                }}
              >
                {isUploading ? "Uploading…" : "Upload"}
              </button>
            </div>

            {uploadErrors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs font-semibold text-red-700 mb-1.5">Some rows could not be processed:</p>
                <ul className="text-xs text-red-700 list-disc pl-4 space-y-0.5">
                  {uploadErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-slate-500">Count:</span>
                <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                  {totalFilings}
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

                    <Popover.Panel className="w-[54rem] max-w-[90vw] p-5" placement="bottom-end">
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

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <CampaignFilterPanel
                          label="Status"
                          icon="Flag"
                          options={statusOptions}
                          draft={draftStatuses}
                          onDraftChange={setDraftStatuses}
                          loading={loading}
                        />
                        <CampaignFilterPanel
                          label="Ticker"
                          icon="Tag"
                          options={tickerOptions}
                          draft={draftTickers}
                          onDraftChange={setDraftTickers}
                          loading={loading}
                        />
                        <CampaignFilterPanel
                          label="Filer"
                          icon="User"
                          options={filerOptions}
                          draft={draftFilers}
                          onDraftChange={setDraftFilers}
                          loading={loading}
                        />
                        <CampaignFilterPanel
                          label="Filing Category"
                          icon="Tags"
                          options={filingCategoryOptions}
                          draft={draftFilingCategories}
                          onDraftChange={setDraftFilingCategories}
                          loading={loading}
                        />
                        <DateRangeFilterPanel
                          draftFrom={draftDateFrom}
                          draftTo={draftDateTo}
                          onDraftFromChange={setDraftDateFrom}
                          onDraftToChange={setDraftDateTo}
                        />
                      </div>
                    </Popover.Panel>
                  </>
                )}
              </Popover>
            </div>

            {activeFiltersCount > 0 && (
              <div className="-mx-1 mb-3">
                <FilterChips
                  filters={[
                    ...selectedStatuses.map((status) => ({ key: "status", value: status })),
                    ...selectedTickers.map((ticker) => ({ key: "ticker", value: ticker })),
                    ...selectedFilers.map((filer) => ({ key: "filer", value: filer })),
                    ...selectedFilingCategories.map((category) => ({ key: "filing_category", value: category })),
                    ...(selectedDateFrom ? [{ key: "date_from", value: selectedDateFrom }] : []),
                    ...(selectedDateTo ? [{ key: "date_to", value: selectedDateTo }] : []),
                  ]}
                  onRemove={handleRemoveChip}
                />
              </div>
            )}

            <StandardizedTable isLoading={loading} skeletonRows={6} skeletonCols={13} maxHeight="68vh" className="table-fixed">
              <StandardizedTable.Header>
                <StandardizedTable.Cell isHeader width="12%">Company Name</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="6%">CIK</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="6%">Ticker</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="10%">Filer</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="8%">In Activism Flow</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="6%">Status</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="12%">Notes</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="6%">Filing Type</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">First Filed</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="6%">Last Updated</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="8%">Alert Sent</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">Send Alert</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="4%"> </StandardizedTable.Cell>
              </StandardizedTable.Header>
              <Table.Tbody>
                {filteredFilings.length > 0 ? (
                  filteredFilings.map((filing, index) => (
                    <StandardizedTable.Row key={filing.id ?? index} index={index}>
                      <StandardizedTable.Cell>
                        <span className="text-sm font-medium text-slate-700">{filing.company_name || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{filing.subject_cik || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{filing.ticker || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{filing.filer || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            filing.in_activism_flow ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {filing.in_activism_flow ? "Yes" : "No"}
                        </span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {filing.status ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              toTrimmedString(filing.status).toLowerCase() === "closed"
                                ? "bg-slate-200 text-slate-600"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {filing.status}
                          </span>
                        ) : null}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600 line-clamp-2">{filing.notes || ""}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{filing.form_type || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{formatDateOnly(filing.filed_at) || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {/* No field for a filing-level "last updated" timestamp
                            in the documented filings response -- left blank
                            rather than guessing a field name. Flagged in the
                            handoff; needs a decision (drop the column, or the
                            backend adds the field). */}
                        <span className="text-sm text-slate-600"></span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {filing.alert_sent_at ? (
                          <span className="text-sm text-slate-600">{formatDateTime(filing.alert_sent_at)}</span>
                        ) : filing.alertSendWarning ? (
                          <div className="flex items-start gap-1.5 text-xs text-amber-700">
                            <Lucide icon="AlertTriangle" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <span className="font-semibold">Sent, not recorded:</span> {filing.alertSendWarning}
                            </span>
                          </div>
                        ) : null}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <input
                          type="checkbox"
                          checked={!!(filing.alert_sent_at || filing.alertSendWarning)}
                          readOnly
                          disabled={sendingAlertId === filing.id}
                          onClick={(e) => {
                            e.preventDefault();
                            openAlertConfirm(filing);
                          }}
                          title={
                            filing.alert_sent_at
                              ? `Alert already sent ${formatDateTime(filing.alert_sent_at)} — click to send again`
                              : filing.alertSendWarning
                              ? `Alert already sent (not recorded: ${filing.alertSendWarning}) — click to send again`
                              : "Send an alert for this filing"
                          }
                          className="w-4 h-4 cursor-pointer"
                          style={{ accentColor: THEME_MAROON }}
                        />
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {filing.campaign_id != null && (
                          <button
                            type="button"
                            onClick={() => openEditModal(filing)}
                            title="Edit status / notes"
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME_MAROON, padding: 4 }}
                          >
                            <Lucide icon="Pencil" className="w-4 h-4" />
                          </button>
                        )}
                      </StandardizedTable.Cell>
                    </StandardizedTable.Row>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={13} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Lucide icon="FileSearch" className="w-10 h-10 opacity-40" />
                        <span className="text-sm font-medium text-slate-600">No filings found</span>
                      </div>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </StandardizedTable>

            {totalPages > 1 && (
              <div className="flex justify-end mt-4">
                <CPagination
                  page={page}
                  totalPages={totalPages}
                  handlePageChange={handlePageChange}
                  handlePreviousPage={() => { if (page > 1) handlePageChange(page - 1); }}
                  handleNextPage={() => { if (page < totalPages) handlePageChange(page + 1); }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {editingFiling && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", padding: 28, borderRadius: 12, width: "100%", maxWidth: 440, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <h2 style={{ margin: "0 0 20px", color: "#111827", fontSize: 17, fontWeight: 600 }}>
              Edit Campaign{editingFiling.company_name ? ` — ${editingFiling.company_name}` : ""}
            </h2>

            <label style={{ display: "block", marginBottom: 18, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Status
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                disabled={isSavingEdit}
                style={{
                  width: "100%", marginTop: 8, padding: "10px 14px", fontSize: 14,
                  borderRadius: 6, border: "1px solid #d1d5db", boxSizing: "border-box", background: "white",
                }}
              >
                <option value="ongoing">Ongoing</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <label style={{ display: "block", marginBottom: 24, fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Notes
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={isSavingEdit}
                rows={4}
                style={{
                  width: "100%", marginTop: 8, padding: "10px 14px", fontSize: 14,
                  borderRadius: 6, border: "1px solid #d1d5db", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
                }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSavingEdit}
                style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: isSavingEdit ? "wait" : "pointer", fontWeight: 600, color: "#374151" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={isSavingEdit}
                style={{
                  padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6,
                  cursor: isSavingEdit ? "wait" : "pointer", fontWeight: 600, opacity: isSavingEdit ? 0.7 : 1,
                }}
              >
                {isSavingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertConfirmTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAlertConfirm();
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", padding: 28, borderRadius: 12, width: "100%", maxWidth: 460, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <h2 style={{ margin: "0 0 16px", color: "#111827", fontSize: 17, fontWeight: 600 }}>Send Alert?</h2>

            {(alertConfirmTarget.alert_sent_at || alertConfirmTarget.alertSendWarning) && (
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", marginBottom: 16, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6 }}>
                <span style={{ color: "#b91c1c", flexShrink: 0, lineHeight: 1 }}>⚠</span>
                <span style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.5 }}>
                  {alertConfirmTarget.alert_sent_at ? (
                    <>
                      An alert has <strong>already been sent</strong> for this filing, on{" "}
                      {formatDateTime(alertConfirmTarget.alert_sent_at)}.
                    </>
                  ) : (
                    <>
                      An alert has <strong>already been sent</strong> for this filing — it was not recorded
                      ({alertConfirmTarget.alertSendWarning}), but the email did go out.
                    </>
                  )}{" "}
                  Sending again will email the configured alert recipients a second time.
                </span>
              </div>
            )}

            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 16px" }}>
              Confirming will <strong>immediately email the configured alert recipients</strong> about this filing:
            </p>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13.5, color: "#111827", lineHeight: 1.7 }}>
              <div><strong>Company:</strong> {alertConfirmTarget.company_name || "-"}</div>
              <div><strong>Filer:</strong> {alertConfirmTarget.filer || "-"}</div>
              <div><strong>Form Type:</strong> {alertConfirmTarget.form_type || "-"}</div>
            </div>

            {alertSendError && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6 }}>
                <span style={{ flexShrink: 0, lineHeight: 1, color: "#b91c1c" }}>⚠</span>
                <span style={{ fontSize: 12.5, color: "#b91c1c", lineHeight: 1.5 }}>{alertSendError}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={closeAlertConfirm}
                disabled={sendingAlertId != null}
                style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: sendingAlertId != null ? "wait" : "pointer", fontWeight: 600, color: "#374151" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSendAlert}
                disabled={sendingAlertId != null}
                style={{
                  padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6,
                  cursor: sendingAlertId != null ? "wait" : "pointer", fontWeight: 600, opacity: sendingAlertId != null ? 0.7 : 1,
                }}
              >
                {sendingAlertId != null ? "Sending…" : "Confirm and Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivistCampaigns;
