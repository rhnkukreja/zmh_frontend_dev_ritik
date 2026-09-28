import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { dashboardService } from "@/services/dashboard";
import { proxyContextService } from "@/services/proxyContext";
import ProxyContestModal, {
  ProxyContestPrefilledDocument,
} from "@/pages/ProxyContest/components/ProxyContestModal";

const THEME_MAROON = "#8b1828";
// Two or three at a time: enough to be quick, few enough that a page of
// selected filings doesn't open a burst of PDF downloads at the backend.
const PDF_FETCH_CONCURRENCY = 3;

// The filings the analyst ticked. Only the id is sent; the rest is for naming
// rows the backend could not match to a company.
type SelectedFiling = {
  id: string | number;
  company_name?: string;
  filer?: string;
  form_type?: string;
};

interface AddToProxyContestFlowProps {
  open: boolean;
  filings: SelectedFiling[];
  onClose: () => void;
}

// ─── Draft shape ────────────────────────────────────────────────────────────
// The draft is built by the FastAPI side, which owns the grouping (one draft
// per company, a single year each). Every field is read defensively through the
// normalisers below: this frontend must not fall over on a draft that carries a
// field under a different name, or not at all.
type DraftDocument = {
  filingId: string | number;
  documentKey: string;
  keyword: string;
  documentDate: string;
  isCompanyActivist: "Company" | "Activist";
  sourceLabel: string;
  needsKeywordCheck: boolean;
  pdfReady: boolean;
};

type DraftCampaign = {
  companyId: number | null;
  companyName: string;
  year: string;
  yearWarning: string;
  activistName: string;
  documents: DraftDocument[];
};

const firstString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const firstArray = (...values: unknown[]): any[] => {
  for (const value of values) {
    if (Array.isArray(value)) return value.filter(Boolean);
  }
  return [];
};

// Django stores document_date as the "5 Jan 26" string the modal produces, so a
// date arriving in ISO form has to be converted before it is compared with what
// is already stored, or saved alongside it.
const toDocumentDate = (value: string): string => {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!isoMatch) return trimmed;

  const parsed = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return trimmed;

  const day = parsed.getUTCDate();
  const month = parsed.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(parsed.getUTCFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
};

const sameDocumentDate = (a: string, b: string) =>
  toDocumentDate(a).toLowerCase() === toDocumentDate(b).toLowerCase();

const sameKeyword = (a: string, b: string) =>
  (a || "").trim().toLowerCase().replace(/\s+/g, " ") ===
  (b || "").trim().toLowerCase().replace(/\s+/g, " ");

const normalizeDocument = (raw: any): DraftDocument => {
  // suggested_role is what the backend sends ("Company" / "Activist"). Reading
  // it first matters: with no match every row fell back to "Company", which
  // would file an activist's exhibit as a company document.
  const role = firstString(
    raw?.suggested_role,
    raw?.is_company_activist,
    raw?.isCompanyActivist,
    raw?.role
  );
  // suggested_keyword is the backend's pick and already carries its own
  // fallback when document_type is null, so it leads.
  const keyword = firstString(
    raw?.suggested_keyword,
    raw?.document_type,
    raw?.keyword,
    raw?.documentType,
    raw?.type
  );
  const pdf = raw?.pdf;
  return {
    filingId: firstString(raw?.filing_id, raw?.filingId, raw?.id),
    documentKey: firstString(raw?.document_key, raw?.documentKey, raw?.key),
    keyword,
    documentDate: toDocumentDate(
      firstString(raw?.document_date, raw?.documentDate, raw?.date, raw?.filed_at)
    ),
    isCompanyActivist: role.toLowerCase() === "activist" ? "Activist" : "Company",
    sourceLabel: firstString(
      raw?.label,
      raw?.source_label,
      raw?.sourceLabel,
      raw?.exhibit,
      raw?.source
    ),
    // keyword_confident is the backend's own verdict and is the inverse of what
    // this flag means, so only an explicit false counts. A document with no
    // keyword at all needs checking too.
    needsKeywordCheck:
      raw?.keyword_confident === false ||
      Boolean(raw?.needs_keyword_check ?? raw?.needsKeywordCheck) ||
      !keyword,
    pdfReady: Boolean(pdf?.ready ?? raw?.pdf_ready ?? raw?.pdfReady),
  };
};

// One selected filing that produced no document, with the backend's reason.
type DocumentNote = { companyName: string; filingId: string; reason: string };

const normalizeDraftResponse = (
  raw: any
): { campaigns: DraftCampaign[]; unmatched: any[]; notes: DocumentNote[] } => {
  const rawDrafts = firstArray(raw?.drafts, raw?.campaigns, raw?.results, raw);

  // Gathered from every draft BEFORE the filter below drops the ones with no
  // documents -- a draft that yielded nothing is exactly the one whose notes
  // explain why, and dropping it silently is what these notes exist to prevent.
  const notes: DocumentNote[] = rawDrafts.flatMap((draft: any) => {
    const companyName = firstString(draft?.company_name, draft?.companyName, draft?.company?.name);
    return firstArray(draft?.document_notes, draft?.documentNotes).map((note: any) => ({
      companyName,
      filingId: firstString(note?.filing_id, note?.filingId, note?.id),
      reason: firstString(note?.reason, note?.message, note?.detail),
    }));
  });

  const campaigns = rawDrafts.map((draft: any) => {
    const companyIdRaw = firstString(draft?.company_id, draft?.companyId, draft?.company?.id);
    const companyId = Number(companyIdRaw);
    return {
      companyId: Number.isFinite(companyId) && companyId > 0 ? companyId : null,
      companyName: firstString(draft?.company_name, draft?.companyName, draft?.company?.name),
      year: firstString(draft?.year, draft?.campaign_year, draft?.years?.[0]),
      yearWarning: firstString(draft?.year_warning, draft?.yearWarning),
      activistName: firstString(
        draft?.activist_name,
        draft?.activistName,
        draft?.filer,
        draft?.filer_name
      ),
      documents: firstArray(draft?.documents, draft?.docs).map(normalizeDocument),
    };
  });

  return {
    campaigns: campaigns.filter((campaign) => campaign.companyId && campaign.documents.length > 0),
    unmatched: firstArray(raw?.unmatched, raw?.unmatched_filings),
    notes,
  };
};

// A filename Django can derive an extension from. It writes the S3 object using
// the uploaded filename's extension, so this must end in .pdf.
const pdfFileName = (campaign: DraftCampaign, document: DraftDocument, index: number) => {
  const base = [campaign.companyName, document.keyword || "document", document.documentDate]
    .filter(Boolean)
    .join(" ")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  // The row number keeps two documents of the same type and date on one
  // campaign from being uploaded under one name.
  return `${base || "document"}-${index + 1}.pdf`;
};

// Runs tasks with a small number in flight at a time, reporting each one as it
// finishes so the progress line can move.
const runWithConcurrency = async <T,>(
  tasks: Array<() => Promise<T>>,
  limit: number,
  onSettled: () => void
): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let next = 0;

  const worker = async () => {
    while (next < tasks.length) {
      const current = next++;
      results[current] = await tasks[current]();
      onSettled();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  );
  return results;
};

type PreparedCampaign = {
  campaign: DraftCampaign;
  mode: "add" | "edit";
  activistName: string;
  prefilled: ProxyContestPrefilledDocument[];
  // Set when the Django lookup failed: the campaign is treated as new, and the
  // analyst is told that is an assumption rather than a fact.
  lookupFailed: boolean;
  existingCount: number;
};

const AddToProxyContestFlow = ({ open, filings, onClose }: AddToProxyContestFlowProps) => {
  const [phase, setPhase] = useState<"loading" | "review" | "preparing" | "modal" | "done">("loading");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<DraftCampaign[]>([]);
  const [unmatched, setUnmatched] = useState<any[]>([]);
  const [documentNotes, setDocumentNotes] = useState<DocumentNote[]>([]);
  const [index, setIndex] = useState(0);
  const [prepared, setPrepared] = useState<PreparedCampaign | null>(null);
  const [pdfProgress, setPdfProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcomes, setOutcomes] = useState<
    Array<{ companyName: string; status: "saved" | "skipped"; note?: string }>
  >([]);
  // Set by the modal's onSuccess, read by its onClose -- both fire on a save,
  // and only onClose tells us the modal is finished with this campaign.
  const savedCurrentRef = useRef(false);

  // Draft the campaigns once per opening. Nothing is written by this call.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setPhase("loading");
    setDraftError(null);
    setCampaigns([]);
    setUnmatched([]);
    setDocumentNotes([]);
    setIndex(0);
    setPrepared(null);
    setOutcomes([]);

    const ids = filings.map((filing) => filing.id);

    dashboardService
      .createActivistProxyContestDraft(ids)
      .then((data) => {
        if (cancelled) return;
        const normalized = normalizeDraftResponse(data);
        setCampaigns(normalized.campaigns);
        setUnmatched(normalized.unmatched);
        setDocumentNotes(normalized.notes);
        setPhase("review");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDraftError(
          error instanceof Error ? error.message : "The draft could not be prepared."
        );
        setPhase("review");
      });

    return () => {
      cancelled = true;
    };
    // filings is a fresh array on every render of the page; the ids are fixed
    // for as long as this flow is open, so only `open` may retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Asks Django what this company-year already has, then fetches each ready
  // PDF. Neither step may block the analyst: a failed lookup means "treat as
  // new", and a failed PDF means "this row has no file".
  const prepareCampaign = async (campaign: DraftCampaign) => {
    setPhase("preparing");
    setPdfProgress({ done: 0, total: campaign.documents.filter((d) => d.pdfReady).length });

    let existing: any[] = [];
    let lookupFailed = false;
    let activistName = campaign.activistName;

    const lookupYear = Number(campaign.year);
    try {
      // A draft with no usable year cannot be looked up by company-year; that
      // counts as "could not check", not as "no campaign exists".
      if (!Number.isFinite(lookupYear) || lookupYear <= 0) throw new Error("no year");

      const data = await proxyContextService.getPressReleasePresentations({
        company_id: campaign.companyId as number,
        year: lookupYear,
      });
      existing = firstArray(data?.results, data?.documents, data);
      // The campaign's own activist name is the one already agreed on this
      // record; the filer name from the filing is only a fallback.
      const storedActivist = firstString(
        ...existing.map((row: any) => firstString(row?.activist_name, row?.activistName))
      );
      if (storedActivist) activistName = storedActivist;
    } catch {
      lookupFailed = true;
    }

    // Tracked by position in campaign.documents, never by document_key: two
    // documents on one filing can arrive with the same key, or with none at all,
    // and a key collision would attach one document's PDF to another's row.
    const readyPositions: number[] = [];
    campaign.documents.forEach((document, position) => {
      if (document.pdfReady) readyPositions.push(position);
    });

    const files = await runWithConcurrency(
      readyPositions.map((position) => async () => {
        const document = campaign.documents[position];
        try {
          const blob = await dashboardService.getActivistFilingDocumentPdf(
            document.filingId,
            document.documentKey
          );
          // The .pdf name and the application/pdf type are both required:
          // Django derives the stored object's extension from the filename.
          return new File([blob], pdfFileName(campaign, document, position), {
            type: "application/pdf",
          });
        } catch {
          return null;
        }
      }),
      PDF_FETCH_CONCURRENCY,
      () => setPdfProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
    );

    const fileByPosition = new Map<number, File | null>();
    readyPositions.forEach((position, order) => {
      fileByPosition.set(position, files[order]);
    });

    const prefilled: ProxyContestPrefilledDocument[] = campaign.documents.map((document, position) => ({
      keyword: document.keyword,
      documentDate: document.documentDate,
      isCompanyActivist: document.isCompanyActivist,
      activistName,
      documentFile: fileByPosition.get(position) || null,
      sourceLabel: document.sourceLabel,
      needsKeywordCheck: document.needsKeywordCheck,
      // Same type and same date as something already on this campaign. Only a
      // hint: adding it again is allowed by design.
      possiblyAlreadyAdded: existing.some(
        (row: any) =>
          sameKeyword(firstString(row?.keyword), document.keyword) &&
          sameDocumentDate(
            firstString(row?.document_date, row?.documentDate),
            document.documentDate
          )
      ),
    }));

    setPrepared({
      campaign,
      mode: existing.length > 0 ? "edit" : "add",
      activistName,
      prefilled,
      lookupFailed,
      existingCount: existing.length,
    });
    savedCurrentRef.current = false;
    setPhase("modal");

    // The modal covers this dialog, so what the analyst needs to know about the
    // lookup is said here, and repeated in the summary at the end.
    if (lookupFailed) {
      toast.warning(
        "Could not check whether this company already has a proxy contest for this year. Opening as a new one — check before saving."
      );
    } else if (existing.length > 0) {
      toast.info(
        `This campaign already has ${existing.length} document${existing.length === 1 ? "" : "s"}. Your documents are being added to it.`
      );
    }
  };

  const startCampaign = (position: number) => {
    const campaign = campaigns[position];
    if (!campaign) {
      setPhase("done");
      return;
    }
    setIndex(position);
    void prepareCampaign(campaign);
  };

  // Called once the modal closes, whether it saved or not.
  const finishCurrentCampaign = () => {
    const current = prepared;
    if (current) {
      setOutcomes((prev) => [
        ...prev,
        {
          companyName: current.campaign.companyName || "This company",
          status: savedCurrentRef.current ? "saved" : "skipped",
          note: current.lookupFailed
            ? "Opened as a new campaign — the existing-campaign check failed"
            : current.existingCount > 0
              ? `Added to an existing campaign (${current.existingCount} document${current.existingCount === 1 ? "" : "s"} already on it)`
              : undefined,
        },
      ]);
    }
    setPrepared(null);

    const nextPosition = index + 1;
    if (nextPosition < campaigns.length) {
      startCampaign(nextPosition);
    } else {
      setPhase("done");
    }
  };

  if (!open) return null;

  const total = campaigns.length;

  return (
    <>
      {/* The review / progress / summary dialog. Hidden while the Proxy Contest
          modal itself is open, so the analyst sees one thing at a time. */}
      {phase !== "modal" && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && phase !== "preparing") onClose();
          }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <div style={{ padding: 28, paddingBottom: 0 }}>
              <h2 style={{ margin: "0 0 16px", color: "#111827", fontSize: 17, fontWeight: 600 }}>
                {phase === "done" ? "Add to Proxy Contest — Finished" : "Add to Proxy Contest"}
              </h2>
            </div>

            <div style={{ padding: "0 28px", overflowY: "auto", flex: 1 }}>
              {phase === "loading" && (
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 16px" }}>
                  Grouping the selected filings by company…
                </p>
              )}

              {phase === "review" && (
                <>
                  {draftError && (
                    <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 6, background: "#fef2f2", border: "1px solid #fca5a5" }}>
                      <span style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.5 }}>
                        {draftError}
                      </span>
                    </div>
                  )}

                  {!draftError && total === 0 && (
                    <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 16px" }}>
                      None of the selected filings could be prepared as a proxy contest. Nothing has
                      been changed.
                    </p>
                  )}

                  {total > 0 && (
                    <>
                      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 16px" }}>
                        {total === 1
                          ? "One campaign is ready to review. Nothing is saved until you press Submit in the next step."
                          : `${total} campaigns are ready to review, one at a time. Nothing is saved until you press Submit on each.`}
                      </p>

                      <div style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 12.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 8px" }}>
                          Campaigns
                        </h3>
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 220, overflowY: "auto" }}>
                          {campaigns.map((campaign, position) => (
                            <div
                              key={`${campaign.companyId}-${position}`}
                              style={{ padding: "8px 14px", fontSize: 13, color: "#111827", borderTop: position === 0 ? "none" : "1px solid #f3f4f6" }}
                            >
                              <strong>{campaign.companyName || "Unnamed company"}</strong>
                              <span style={{ color: "#6b7280" }}>
                                {" "}— {campaign.year || "no year"} — {campaign.documents.length} document
                                {campaign.documents.length === 1 ? "" : "s"}
                              </span>
                              {campaign.yearWarning && (
                                <div style={{ marginTop: 2, fontSize: 12, color: "#92400e" }}>
                                  {campaign.yearWarning}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Selected filings that belong to a drafted campaign but
                      produced no document of their own. Listed for the same
                      reason "Left out" is: nothing selected disappears without
                      a stated reason. */}
                  {documentNotes.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ fontSize: 12.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 8px" }}>
                        No document found ({documentNotes.length})
                      </h3>
                      <div style={{ border: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: 8, maxHeight: 160, overflowY: "auto" }}>
                        {documentNotes.map((note, position) => (
                          <div
                            key={`${note.filingId}-${position}`}
                            style={{ padding: "8px 14px", fontSize: 12.5, color: "#374151", borderTop: position === 0 ? "none" : "1px solid #f3f4f6" }}
                          >
                            {note.companyName || "Unnamed company"}
                            {note.filingId && <span style={{ color: "#6b7280" }}> — filing {note.filingId}</span>}
                            {note.reason && <span style={{ color: "#6b7280" }}> — {note.reason}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {unmatched.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ fontSize: 12.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 8px" }}>
                        Left out ({unmatched.length})
                      </h3>
                      <div style={{ border: "1px solid #fcd34d", background: "#fffbeb", borderRadius: 8, maxHeight: 160, overflowY: "auto" }}>
                        {unmatched.map((item: any, position: number) => (
                          <div
                            key={position}
                            style={{ padding: "8px 14px", fontSize: 12.5, color: "#92400e", borderTop: position === 0 ? "none" : "1px solid #fef3c7" }}
                          >
                            {firstString(
                              item?.company_name,
                              item?.companyName,
                              item?.filer,
                              item?.accession_number,
                              `Filing ${firstString(item?.filing_id, item?.id) || position + 1}`
                            )}
                            {firstString(item?.reason, item?.message) && (
                              <span style={{ color: "#a16207" }}>
                                {" "}— {firstString(item?.reason, item?.message)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {phase === "preparing" && (
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 16, height: 16, border: "2px solid #e5e7eb", borderTopColor: THEME_MAROON, borderRadius: "50%", animation: "acp-proxy-spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 13.5, color: "#374151" }}>
                      Preparing {index + 1} of {total} — {campaigns[index]?.companyName || "this company"}
                    </span>
                    <style>{`@keyframes acp-proxy-spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                  {pdfProgress && pdfProgress.total > 0 && (
                    <>
                      <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                        <div
                          style={{
                            height: "100%", borderRadius: 999, background: THEME_MAROON, transition: "width 0.3s ease",
                            width: `${Math.round((pdfProgress.done / pdfProgress.total) * 100)}%`,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        Fetching PDFs — {pdfProgress.done} of {pdfProgress.total}
                      </span>
                    </>
                  )}
                </div>
              )}

              {phase === "done" && (
                <div style={{ paddingBottom: 4 }}>
                  {outcomes.length === 0 ? (
                    <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: "0 0 16px" }}>
                      Nothing was added.
                    </p>
                  ) : (
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16 }}>
                      {outcomes.map((outcome, position) => (
                        <div
                          key={position}
                          style={{ padding: "8px 14px", fontSize: 13, color: "#111827", borderTop: position === 0 ? "none" : "1px solid #f3f4f6" }}
                        >
                          <strong>{outcome.companyName}</strong>
                          <span style={{ color: outcome.status === "saved" ? "#16a34a" : "#6b7280" }}>
                            {outcome.status === "saved" ? " — saved" : " — not saved"}
                          </span>
                          {outcome.note && (
                            <div style={{ marginTop: 2, fontSize: 12, color: "#6b7280" }}>{outcome.note}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: 28, paddingTop: 20 }}>
              {phase === "review" && total > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#374151" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => startCampaign(0)}
                    style={{ padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                  >
                    {total === 1 ? "Review campaign" : `Start — 1 of ${total}`}
                  </button>
                </>
              )}

              {((phase === "review" && total === 0) || phase === "done") && (
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: "8px 16px", background: THEME_MAROON, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* The existing Proxy Contest modal, one campaign at a time. Keyed on the
          campaign so each one opens with its own state rather than inheriting
          the previous company's rows. */}
      {phase === "modal" && prepared && (
        <ProxyContestModal
          key={`${prepared.campaign.companyId}-${index}`}
          open
          mode={prepared.mode}
          initialData={{
            company: {
              id: prepared.campaign.companyId as number,
              name: prepared.campaign.companyName,
            },
            year: prepared.campaign.year,
          }}
          prefilledDocuments={prepared.prefilled}
          onSuccess={() => {
            savedCurrentRef.current = true;
          }}
          onClose={finishCurrentCampaign}
        />
      )}
    </>
  );
};

export default AddToProxyContestFlow;
