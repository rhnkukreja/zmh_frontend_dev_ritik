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
import { toast } from "react-toastify";

const THEME_MAROON = "#8b1828";

type CampaignItem = {
  id: string | number;
  company_name?: string;
  cik?: string;
  ticker?: string;
  filer?: string;
  in_activism_flow?: boolean;
  status?: string;
  notes?: string;
  filing_type?: string;
  first_filed_date?: string;
  last_updated?: string;
  [key: string]: any;
};

const toTrimmedString = (value: unknown) => String(value ?? "").trim();

// ─── Filing category buckets ──────────────────────────────────────────────
// The backend stores filing_type as free-form strings ("Schedule 13D",
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

const getFilingCategory = (filingType: unknown): string => {
  const normalized = normalizeFilingType(filingType);
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

function ActivistCampaigns() {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedFilers, setSelectedFilers] = useState<string[]>([]);
  const [selectedFilingCategories, setSelectedFilingCategories] = useState<string[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<string[]>([]);
  const [draftTickers, setDraftTickers] = useState<string[]>([]);
  const [draftFilers, setDraftFilers] = useState<string[]>([]);
  const [draftFilingCategories, setDraftFilingCategories] = useState<string[]>([]);

  // Local-only, per-row "send an alert for this campaign" flag (Item 2) --
  // deliberately plain React state, not persisted anywhere: there is no
  // backend field for it, so it must honestly reset on refresh rather than
  // pretend to be saved via localStorage.
  const [sendAlertFlags, setSendAlertFlags] = useState<Record<string, boolean>>({});

  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);
  const [editStatus, setEditStatus] = useState("ongoing");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const dropzoneRef = useRef<DropzoneElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getActivistCampaigns();
      const list = Array.isArray(response)
        ? response
        : response?.results || response?.campaigns || response?.data || [];
      setCampaigns(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to load activist campaigns:", error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

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

  const statusOptions = useMemo(
    () => Array.from(new Set(campaigns.map((c) => toTrimmedString(c.status)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [campaigns]
  );
  const tickerOptions = useMemo(
    () => Array.from(new Set(campaigns.map((c) => toTrimmedString(c.ticker)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [campaigns]
  );
  const filerOptions = useMemo(
    () => Array.from(new Set(campaigns.map((c) => toTrimmedString(c.filer)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [campaigns]
  );
  const filingCategoryOptions = useMemo(() => {
    const present = new Set(campaigns.map((c) => getFilingCategory(c.filing_type)));
    // Fixed order (not alpha) so "Other" always trails the two named
    // buckets instead of sorting wherever "O" happens to land.
    return FILING_CATEGORY_ORDER.filter((category) => present.has(category));
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const status = toTrimmedString(campaign.status);
      const ticker = toTrimmedString(campaign.ticker);
      const filer = toTrimmedString(campaign.filer);
      const filingCategory = getFilingCategory(campaign.filing_type);

      if (selectedStatuses.length > 0 && !selectedStatuses.includes(status)) return false;
      if (selectedTickers.length > 0 && !selectedTickers.includes(ticker)) return false;
      if (selectedFilers.length > 0 && !selectedFilers.includes(filer)) return false;
      if (selectedFilingCategories.length > 0 && !selectedFilingCategories.includes(filingCategory)) return false;

      return true;
    });
  }, [campaigns, selectedStatuses, selectedTickers, selectedFilers, selectedFilingCategories]);

  const activeFiltersCount =
    selectedStatuses.length + selectedTickers.length + selectedFilers.length + selectedFilingCategories.length;

  const syncDraftFilters = useCallback(() => {
    setDraftStatuses(selectedStatuses);
    setDraftTickers(selectedTickers);
    setDraftFilers(selectedFilers);
    setDraftFilingCategories(selectedFilingCategories);
  }, [selectedStatuses, selectedTickers, selectedFilers, selectedFilingCategories]);

  const applyFilters = useCallback(
    (close?: () => void) => {
      setSelectedStatuses(draftStatuses);
      setSelectedTickers(draftTickers);
      setSelectedFilers(draftFilers);
      setSelectedFilingCategories(draftFilingCategories);
      close?.();
    },
    [draftStatuses, draftTickers, draftFilers, draftFilingCategories]
  );

  const clearFilters = useCallback((close?: () => void) => {
    setDraftStatuses([]);
    setDraftTickers([]);
    setDraftFilers([]);
    setDraftFilingCategories([]);
    setSelectedStatuses([]);
    setSelectedTickers([]);
    setSelectedFilers([]);
    setSelectedFilingCategories([]);
    close?.();
  }, []);

  const handleRemoveChip = useCallback((removeKey: string, removeValue: string | number) => {
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
    }
  }, []);

  const openEditModal = (campaign: CampaignItem) => {
    setEditingCampaign(campaign);
    setEditStatus(toTrimmedString(campaign.status).toLowerCase() === "closed" ? "closed" : "ongoing");
    setEditNotes(campaign.notes || "");
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setEditingCampaign(null);
  };

  const saveEdit = async () => {
    if (!editingCampaign) return;
    setIsSavingEdit(true);
    try {
      await dashboardService.updateActivistCampaign(editingCampaign.id, {
        status: editStatus,
        notes: editNotes,
      });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === editingCampaign.id ? { ...c, status: editStatus, notes: editNotes } : c))
      );
      toast.success("Campaign updated.");
      setEditingCampaign(null);
    } catch (error) {
      console.error("Failed to update activist campaign:", error);
      toast.error("Failed to update the campaign.");
    } finally {
      setIsSavingEdit(false);
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
      await fetchCampaigns();
    } catch (error: any) {
      console.error("Failed to upload activist campaigns Excel:", error);
      toast.error(error?.response?.data?.detail || error?.message || "Failed to upload the file.");
    } finally {
      setIsUploading(false);
    }
  };

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
                  {filteredCampaigns.length}
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
                          <p className="text-xs text-slate-500 mt-1">Filter the campaigns shown below.</p>
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
                  ]}
                  onRemove={handleRemoveChip}
                />
              </div>
            )}

            <StandardizedTable isLoading={loading} skeletonRows={6} skeletonCols={11} maxHeight="68vh" className="table-fixed">
              <StandardizedTable.Header>
                <StandardizedTable.Cell isHeader width="13%">Company Name</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">CIK</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">Ticker</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="11%">Filer</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="9%">In Activism Flow</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">Status</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="14%">Notes</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">Filing Type</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">First Filed</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">Last Updated</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="7%">
                  <div className="flex flex-col">
                    <span>Send Alert</span>
                    <span className="text-[10px] font-normal normal-case text-slate-400"></span>
                  </div>
                </StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader width="4%"> </StandardizedTable.Cell>
              </StandardizedTable.Header>
              <Table.Tbody>
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((campaign, index) => (
                    <StandardizedTable.Row key={campaign.id ?? index} index={index}>
                      <StandardizedTable.Cell>
                        <span className="text-sm font-medium text-slate-700">{campaign.company_name || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{campaign.cik || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{campaign.ticker || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{campaign.filer || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            campaign.in_activism_flow ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {campaign.in_activism_flow ? "Yes" : "No"}
                        </span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            toTrimmedString(campaign.status).toLowerCase() === "closed"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {campaign.status || "-"}
                        </span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600 line-clamp-2">{campaign.notes || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{campaign.filing_type || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{campaign.first_filed_date || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="text-sm text-slate-600">{campaign.last_updated || "-"}</span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <input
                          type="checkbox"
                          checked={!!sendAlertFlags[String(campaign.id)]}
                          onChange={(e) =>
                            setSendAlertFlags((prev) => ({ ...prev, [String(campaign.id)]: e.target.checked }))
                          }
                          title="Send an alert for this campaign — not saved, resets on refresh"
                          className="w-4 h-4 cursor-pointer"
                          style={{ accentColor: THEME_MAROON }}
                        />
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <button
                          type="button"
                          onClick={() => openEditModal(campaign)}
                          title="Edit status / notes"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME_MAROON, padding: 4 }}
                        >
                          <Lucide icon="Pencil" className="w-4 h-4" />
                        </button>
                      </StandardizedTable.Cell>
                    </StandardizedTable.Row>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={12} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Lucide icon="FileSearch" className="w-10 h-10 opacity-40" />
                        <span className="text-sm font-medium text-slate-600">No activist campaigns found</span>
                      </div>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </StandardizedTable>
          </div>
        </div>
      </div>

      {editingCampaign && (
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
              Edit Campaign{editingCampaign.company_name ? ` — ${editingCampaign.company_name}` : ""}
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
    </div>
  );
}

export default ActivistCampaigns;
