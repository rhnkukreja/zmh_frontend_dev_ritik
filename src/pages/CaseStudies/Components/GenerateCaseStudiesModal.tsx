import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AI_CHATBOT_API_BASE } from "@/pages/AIChatbot/api";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { caseStudiesService } from "@/services/caseStudies";

interface ExtractedCaseStudy {
  extracted: {
    institution: string;
    theme: string;
    company: string;
    company_ticker: string;
    company_sector: string;
    year: number;
    market: string;
    proponent: string;
    resolution: string;
    engagement_details: string;
  };
  resolved_company: { id: number; name: string; symbol: string; matched_on: string } | null;
  source_link: string;
  // Item 3: whether the backend could confirm engagement_details is an exact
  // copy of the source document. Optional/defensive -- undefined (an older
  // job result, or a field-name mismatch) is treated as "no warning", not as
  // flagged; only an explicit `false` shows the warning.
  engagement_details_verbatim?: boolean;
}

interface DocumentInfo {
  id: number;
  institution_id: number;
  institution_name: string;
  year: number;
  name: string;
  document_type: string | null;
}

interface DocumentResult {
  document: DocumentInfo;
  status: "extracted" | "classified_no" | "no_text" | "error";
  case_studies: ExtractedCaseStudy[];
  error?: string;
}

interface FlatCaseStudy {
  document: DocumentInfo;
  cs: ExtractedCaseStudy;
}

interface JobSummary {
  institution_ids: number[];
  years: number[] | null;
  documents_scanned: number;
  documents_skipped_dedup: number;
  classified_yes: number;
  case_studies_found: number;
  results: DocumentResult[];
  // Item 3: count of extracted case studies whose engagement_details_verbatim
  // came back false. Optional -- an older job result won't have it.
  non_verbatim_count?: number;
  // Item 4: not live on the backend yet ("may land after yours" per the
  // task) -- field names below are a best-effort guess at what it'll be
  // called. Every read of these is defensive (optional chaining / Array.isArray
  // checks), so an absent or differently-shaped field renders nothing rather
  // than erroring.
  unreadable_documents_count?: number;
  unreadable_documents?: Array<{
    document_name?: string;
    name?: string;
    file_name?: string;
    reason?: string;
    error?: string;
    message?: string;
    [key: string]: any;
  }>;
}

interface GenerateCaseStudiesModalProps {
  isOpen: boolean;
  institutionNames: string[];
  onClose: () => void;
}

const POLL_INTERVAL_MS = 6000;

// Scoped to the most recent two years for now while extraction quality is
// being validated — full history can be enabled once this is trusted.
const GENERATION_YEARS = [2025, 2026];

// ─── Approve payload ────────────────────────────────────────────────────────
// Mirrors AddEditCaseStudies.tsx's onSubmit transformedData shape exactly:
// same field names, same null-vs-empty conventions (company/caspio_company_name
// mutual exclusivity, primary_source_link as a filtered array).
//
// The 7 fields the create form's react-hook-form `rules` mark required have no
// counterpart in the extraction (that's a client-side UX rule, not a Postgres
// constraint — confirmed against the live table, all nullable with no
// default). Six go null; the analyst fills them in via the existing edit form
// after approving, same as most of the 4,326 existing rows. The seventh,
// primary_source, is NOT one of those six -- it's set to the source
// document's own name, which we do have.
// The extractor emits the literal string "N/A" (see the render guards below,
// e.g. `e.company_ticker !== "N/A"`) rather than omitting the field, so a
// naive pass-through would write the string "N/A" into a nullable column.
// Collapses "N/A" (any case), empty, and whitespace-only values to null.
const normalizeExtractedValue = (value: string | undefined | null): string | null => {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed.toUpperCase() === "N/A") return null;
  return trimmed;
};

const buildApprovedCaseStudyPayload = (item: FlatCaseStudy) => {
  const { document, cs } = item;
  const e = cs.extracted;

  return {
    institution: document.institution_id,
    company: cs.resolved_company ? cs.resolved_company.id : null,
    caspio_company_name: cs.resolved_company ? null : (e.company || null),
    esg_themes: e.theme && e.theme.trim() ? e.theme.trim() : null,
    year: e.year,
    market: e.market,
    engagement_details: e.engagement_details,
    resolution_engagement_topic: e.resolution,
    primary_source_link: cs.source_link ? [cs.source_link] : [],
    approval_status: "Approved",
    // Set, not null -- literally the source document's name, which we have.
    primary_source: document.name,
    // Also shown on the preview card and already extracted -- previously
    // dropped from the payload entirely. "N/A"/blank normalized to null.
    caspio_company_ticker: normalizeExtractedValue(e.company_ticker),
    caspio_company_sector: normalizeExtractedValue(e.company_sector),
    // Separate column from caspio_company_sector, same source value.
    industry: normalizeExtractedValue(e.company_sector),
    // Nullable in Postgres with no default; the create form's `required`
    // rules are react-hook-form UX only, not a schema constraint. The
    // analyst fills these in via the edit form after approving.
    proposal_type: null,
    voting_details: null,
    voting_rationale: null,
    page_reference: null,
    esg_category: null,
    // Deliberately null, not the blank-form's "Equity" UI default -- we never
    // extracted a holding type, and inventing one would be fabricating data.
    investment_type: null,
  };
};

// DRF validation errors come back as {field: ["msg", ...], ...} rather than a
// single string -- surfaced field-by-field rather than collapsed into a
// generic "failed to save" message, per the requirement to show the real
// server error.
const extractServerErrorMessage = (err: any): string => {
  const data = err?.response?.data;
  if (!data) return err?.message || "Failed to save this case study.";
  if (typeof data === "string") return data;
  if (data.detail) return String(data.detail);
  if (typeof data === "object") {
    const parts = Object.entries(data).map(
      ([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(" ") : String(messages)}`
    );
    if (parts.length > 0) return parts.join(" | ");
  }
  return "Failed to save this case study.";
};

const GenerateCaseStudiesModal: React.FC<GenerateCaseStudiesModalProps> = ({
  isOpen,
  institutionNames,
  onClose,
}) => {
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [step, setStep] = useState<string>("Queued...");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const jobIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-item Approve state, keyed by that item's index into flatCaseStudies
  // below (stable for the lifetime of a given `summary`, since flatCaseStudies
  // is derived from it deterministically) -- lives here rather than inside
  // CaseStudyDetailCard so it survives the pager swapping which item is on
  // screen, not just a single card's local state.
  const [approvalState, setApprovalState] = useState<Record<number, "saving" | "saved" | "error">>({});
  const [approvalErrors, setApprovalErrors] = useState<Record<number, string>>({});

  const flatCaseStudies = useMemo<FlatCaseStudy[]>(() => {
    if (!summary) return [];
    return summary.results
      .filter((r) => r.status === "extracted")
      .flatMap((r) => r.case_studies.map((cs) => ({ document: r.document, cs })));
  }, [summary]);

  const handleApprove = async (index: number) => {
    const item = flatCaseStudies[index];
    if (!item) return;
    // Already saving or already saved -- an approved item can't be approved
    // twice, and a second click mid-flight can't start a duplicate request.
    if (approvalState[index] === "saving" || approvalState[index] === "saved") return;

    setApprovalState((prev) => ({ ...prev, [index]: "saving" }));
    setApprovalErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    try {
      const payload = buildApprovedCaseStudyPayload(item);
      await caseStudiesService.addNewCaseStudies(payload);
      // The POST above is the real, server-side save -- once it resolves,
      // this case study exists in the database regardless of anything that
      // happens to this modal afterward (including closing it).
      setApprovalState((prev) => ({ ...prev, [index]: "saved" }));
    } catch (err: any) {
      console.error("Failed to approve case study:", err);
      setApprovalErrors((prev) => ({ ...prev, [index]: extractServerErrorMessage(err) }));
      setApprovalState((prev) => ({ ...prev, [index]: "error" }));
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startGeneration = async () => {
    setPhase("running");
    setStep("Queued...");
    setErrorMsg("");
    setSummary(null);
    // A fresh run produces a fresh set of items -- any approval state from a
    // previous run in this same modal instance no longer maps to anything.
    setApprovalState({});
    setApprovalErrors({});

    try {
      const startRes = await axios.post(`${AI_CHATBOT_API_BASE}/api/case-studies/generate`, {
        institution_names: institutionNames,
        years: GENERATION_YEARS,
      });
      const { job_id } = startRes.data;
      jobIdRef.current = job_id;

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await axios.get(
            `${AI_CHATBOT_API_BASE}/api/case-studies/generate/${job_id}/status`
          );
          const jobData = statusRes.data;
          if (jobData.state === "running") {
            setStep(jobData.step || "Processing...");
          } else if (jobData.state === "done") {
            stopPolling();
            setSummary(jobData.data);
            setCurrentIndex(0);
            setPhase("done");
          } else if (jobData.state === "error") {
            stopPolling();
            setErrorMsg(jobData.message || "Generation failed.");
            setPhase("error");
          }
        } catch (pollErr) {
          // 404 while the job status file hasn't been written yet — keep polling
          console.warn("Case study generation poll warning:", pollErr);
        }
      }, POLL_INTERVAL_MS);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || err?.message || "Failed to start generation.");
      setPhase("error");
    }
  };

  useEffect(() => {
    if (isOpen && phase === "idle") {
      startGeneration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleClose = async () => {
    stopPolling();
    const jobId = jobIdRef.current;
    if (jobId) {
      try {
        await axios.delete(`${AI_CHATBOT_API_BASE}/api/case-studies/generate/${jobId}`);
      } catch {
        // best-effort cleanup of the scratch status file — nothing to show the user either way
      }
    }
    jobIdRef.current = null;
    setPhase("idle");
    setStep("Queued...");
    setErrorMsg("");
    setSummary(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-primary">
          <div>
            <h2 className="text-lg font-semibold text-white">Generate Case Studies</h2>
            <p className="text-sm text-white/80">
              {institutionNames.join(", ") || "No institution selected"}
            </p>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white">
            <Lucide icon="X" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {phase === "running" && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-slate-600">{step}</span>
            </div>
          )}

          {phase === "error" && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {phase === "done" && summary && (() => {
            if (flatCaseStudies.length === 0) {
              return (
                <div className="space-y-4">
                  <StatPillRow summary={summary} />
                  <div className="text-sm text-slate-500 py-8 text-center">
                    No case studies were found in this institution's documents.
                  </div>
                </div>
              );
            }

            const current = flatCaseStudies[currentIndex];
            return (
              <div className="space-y-4">
                <StatPillRow summary={summary} />
                <CaseStudyDetailCard
                  item={current}
                  status={approvalState[currentIndex] || "idle"}
                  errorMessage={approvalErrors[currentIndex]}
                  onApprove={() => handleApprove(currentIndex)}
                />
              </div>
            );
          })()}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t">
          {phase === "done" && summary ? (
            <CaseStudyPager
              summary={summary}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
            />
          ) : (
            <div />
          )}
          <Button variant="outline-secondary" onClick={handleClose}>
            {phase === "running" ? "Cancel" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const StatPillRow: React.FC<{ summary: JobSummary }> = ({ summary }) => (
  <div className="flex flex-wrap gap-3 text-xs">
    <StatPill label="Documents scanned" value={summary.documents_scanned} />
    <StatPill label="Skipped (already extracted)" value={summary.documents_skipped_dedup} />
    <StatPill label="Classified as case-study source" value={summary.classified_yes} />
    <StatPill label="Case studies found" value={summary.case_studies_found} />
  </div>
);

const StatPill: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700">
    <span className="font-semibold">{value}</span> <span className="text-slate-500">{label}</span>
  </div>
);

const CaseStudyPager: React.FC<{
  summary: JobSummary;
  currentIndex: number;
  setCurrentIndex: (updater: (i: number) => number) => void;
}> = ({ summary, currentIndex, setCurrentIndex }) => {
  const total = summary.results
    .filter((r) => r.status === "extracted")
    .reduce((sum, r) => sum + r.case_studies.length, 0);

  if (total === 0) return <div />;

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline-secondary"
        disabled={currentIndex === 0}
        onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
      >
        <Lucide icon="ChevronLeft" className="w-4 h-4" />
      </Button>
      <span className="text-sm text-slate-600">
        {currentIndex + 1} of {total}
      </span>
      <Button
        variant="outline-secondary"
        disabled={currentIndex >= total - 1}
        onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
      >
        <Lucide icon="ChevronRight" className="w-4 h-4" />
      </Button>
    </div>
  );
};

const getDocumentName = (url: string) => {
  try {
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    const decoded = decodeURIComponent(filename);
    const withoutPrefix = decoded.replace(/^\d+_/, "");
    return withoutPrefix.replace(/\.[^/.]+$/, "");
  } catch {
    return url;
  }
};

const CaseStudyDetailCard: React.FC<{
  item: FlatCaseStudy;
  status: "idle" | "saving" | "saved" | "error";
  errorMessage?: string;
  onApprove: () => void;
}> = ({ item, status, errorMessage, onApprove }) => {
  const { document, cs } = item;
  const e = cs.extracted;
  return (
    <div className="p-6 bg-white border rounded-lg space-y-4">
      <div className="pb-3 border-b border-slate-200 flex items-start justify-between gap-4">
        <h1 className="font-semibold text-lg">Case Studies</h1>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {status === "saved" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
              <Lucide icon="CheckCircle2" className="w-4 h-4" />
              Approved — saved
            </span>
          ) : (
            <Button variant="primary" onClick={onApprove} disabled={status === "saving"}>
              {status === "saving" ? (
                <>
                  <Lucide icon="Loader" className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Approve"
              )}
            </Button>
          )}
          {status === "error" && errorMessage && (
            <span className="text-xs text-red-600 max-w-xs text-right">{errorMessage}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <h3 className="font-semibold mb-2 text-sm">Institution</h3>
          <p>{e.institution || document.institution_name}</p>
        </div>
        {e.theme && (
          <div>
            <h3 className="font-semibold mb-2 text-sm">Theme</h3>
            <p>{e.theme}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <h3 className="font-semibold mb-2 text-sm">Company</h3>
          <p>{e.company}</p>
        </div>
        {e.company_ticker && e.company_ticker !== "N/A" && (
          <div>
            <h3 className="font-semibold mb-2 text-sm">Company Ticker</h3>
            <p>{e.company_ticker}</p>
          </div>
        )}
        {e.company_sector && e.company_sector !== "N/A" && (
          <div>
            <h3 className="font-semibold mb-2 text-sm">Company Sector</h3>
            <p>{e.company_sector}</p>
          </div>
        )}
        <div>
          <h3 className="font-semibold mb-2 text-sm">Year</h3>
          <p>{e.year}</p>
        </div>
        {e.market && (
          <div>
            <h3 className="font-semibold mb-2 text-sm">Market</h3>
            <p>{e.market}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {e.proponent && (
          <div>
            <h3 className="font-semibold mb-2 text-sm">Proponent</h3>
            <p>{e.proponent}</p>
          </div>
        )}
        {e.resolution && (
          <div>
            <h3 className="font-semibold mb-2 text-sm">Resolution</h3>
            <p>{e.resolution}</p>
          </div>
        )}
      </div>

      {e.engagement_details && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">Engagement/Voting Details</h3>
          {e.engagement_details.split("\n").map(
            (paragraph, idx) =>
              paragraph.trim() !== "" && (
                <p key={idx} className="mb-3 text-justify">
                  {paragraph}
                </p>
              )
          )}
        </div>
      )}

      <div className="pt-4 border-t border-slate-200">
        <h3 className="font-semibold mb-2 text-sm">Company Match</h3>
        {cs.resolved_company ? (
          <p className="text-emerald-600 text-sm">
            Matched to company_id {cs.resolved_company.id} ({cs.resolved_company.matched_on}:{" "}
            {cs.resolved_company.name})
          </p>
        ) : (
          <p className="text-slate-500 text-sm">
            No company match — would use text fallback fields ({e.company} / {e.company_sector})
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-slate-200">
        <h3 className="font-semibold mb-2 text-sm">References</h3>
        <div className="flex items-center gap-2">
          <Lucide icon="FileText" className="w-4 h-4 text-slate-500" />
          <a
            href={cs.source_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
          >
            {getDocumentName(cs.source_link)} ({document.year})
          </a>
        </div>
      </div>
    </div>
  );
};

export default GenerateCaseStudiesModal;
