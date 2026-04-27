"use client";

import React, { useEffect, useState } from "react";
import { governanceService } from "@/services/governance";
import { CorporateGovernanceData, CorporateGovernanceDataWithDocs, DocumentItem, GovernanceRow } from "@/types/governance";
import { ExternalLink, X } from "lucide-react";

type GovernanceTabProps = {
  ticker: string;
  companyId?: number;
};
function GovernanceTable({ rows }: { rows: GovernanceRow[] }) {
  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "30%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-[14px] font-semibold text-slate-900">
              Category
            </th>
            <th className="px-4 py-3 text-left text-[14px] font-semibold text-slate-900">
              Yes / No
            </th>
            <th className="px-4 py-3 text-left text-[14px] font-semibold text-slate-900">
              Key Provisions
            </th>
            <th className="px-4 py-3 text-left text-[14px] font-semibold text-slate-900">
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const yesNo = row["Yes/No"];
            const isYes = typeof yesNo === "boolean" ? yesNo : yesNo?.toLowerCase() === "yes";
            const isNo = typeof yesNo === "boolean" ? !yesNo : yesNo?.toLowerCase() === "no";
            const fontTone = (row.Font || "").toLowerCase();
            const yesNoColorClass =
              fontTone === "red" ? "text-red-700 font-semibold" : "text-slate-900 font-medium";
            const sourceName = row.Source?.name;
            const sourceLink = row.Source?.link;

            return (
              <tr
                key={idx}
                className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 text-[14px] text-slate-900 font-medium">
                  {row.Category}
                </td>
                <td className={`px-4 py-3 text-[14px] ${yesNoColorClass}`}>
                  {isYes ? (
                    <span>Yes</span>
                  ) : isNo ? (
                    <span>No</span>
                  ) : (
                    <span className="text-slate-600">{yesNo || "–"}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[14px] text-slate-700 break-words">
                  {row["Key Provisions"]}
                </td>
                <td className="px-4 py-3 text-[14px] text-slate-700">
                  {sourceName && sourceLink ? (
                    <a
                      href={sourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {sourceName}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : sourceName ? (
                    <span>{sourceName}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function FilingLink({
  label,
  dateItems,
  onViewClick,
  iconType = "default",
}: {
  label: string;
  dateItems?: Array<{ date?: string; link?: string }>;
  onViewClick: () => void;
  iconType?: "coi" | "bylaws" | "default";
}) {
  const items = dateItems && dateItems.length > 0 ? dateItems : [{ date: undefined, link: undefined }];

  return (
    <div className="grid grid-cols-12 items-center rounded-2xl border border-slate-300 px-4 py-3.5">
      <div className="col-span-4">
        <p className="text-[14px] font-medium text-slate-900">{label}</p>
      </div>

      <div className="col-span-5 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-1 text-[13px]">
          {items.map((item, idx) => (
            <React.Fragment key={`${label}-${idx}`}>
              {item.date && item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {item.date}
                </a>
              ) : (
                <span className="text-slate-400">-</span>
              )}
              {idx < items.length - 1 && <span className="mx-1 text-slate-400">|</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="col-span-3 flex justify-end">
        <button
          onClick={onViewClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-400 text-[13px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          View
        </button>
      </div>
    </div>
  );
}


function DocumentsModal({
  isOpen,
  onClose,
  companyName,
  documentTitle,
  documents,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  documentTitle: string;
  documents: DocumentItem[];
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50"   style={{ zIndex: 99999 }}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl mx-4">
        {/* Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-primary to-primary px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">{companyName}</h2>
            <p className="text-sm text-white/80">{documentTitle} Documents</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full w-8 h-8 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900 uppercase tracking-wide">
                    Date
                  </th>
                  {/* <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900 uppercase tracking-wide">
                    Document
                  </th> */}
                  <th className="px-4 py-3 text-right text-[13px] font-semibold text-slate-900 uppercase tracking-wide">
                    Document
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[14px] text-slate-600">
                      {doc.date || "–"}
                    </td>
                    {/* <td className="px-4 py-3 text-[14px] font-medium text-slate-900">
                      {doc.name}
                    </td> */}
                    <td className="px-4 py-3 text-right">
                      {doc.link ? (
                        <a
                          href={doc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary text-primary text-[13px] font-medium hover:bg-primary/5 transition-colors"
                        >
                          View
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[13px]">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-primary text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className ?? ""}`} />;
}

function GovernanceSkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <SkeletonBlock className="mb-4 h-6 w-72" />
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-3 gap-0 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-20 mx-auto" />
            <SkeletonBlock className="h-4 w-28" />
          </div>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-0 border-b border-slate-200 px-4 py-4 last:border-b-0">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-5 w-16 mx-auto rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GovernanceLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <SkeletonBlock className="mb-4 h-6 w-52" />
        <div className="space-y-3">
          <SkeletonBlock className="h-14 w-full rounded-lg" />
          <SkeletonBlock className="h-14 w-full rounded-lg" />
        </div>
      </div>

      <GovernanceSkeletonCard />
      <GovernanceSkeletonCard />
      <GovernanceSkeletonCard />
      <GovernanceSkeletonCard />
    </div>
  );
}

export default function GovernanceTab({
  ticker,
  companyId,
}: GovernanceTabProps) {
  const [data, setData] = useState<CorporateGovernanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<"coi" | "bylaws" | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchGovernanceData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await governanceService.getCorporateGovernance(companyId);
        setData(result);
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
          err.message ||
          "Failed to load governance data"
        );
        console.error("Governance data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGovernanceData();
  }, [companyId]);

  const governanceData = data as CorporateGovernanceDataWithDocs | null;

  const coiDocuments: DocumentItem[] = (governanceData?.certificate_of_incorporation ?? []).map(
    (item) => ({
      name: `Certificate of Incorporation`,
      date: item.filing_date,
      link: item.proxy_link,
    })
  );

  const bylawsDocuments: DocumentItem[] = (governanceData?.bylaws ?? []).map(
    (item) => ({
      name: `Bylaws`,
      date: item.filing_date,
      link: item.proxy_link,
    })
  );

  const getModalDocuments = () => {
    if (modalType === "coi") return coiDocuments;
    if (modalType === "bylaws") return bylawsDocuments;
    return [];
  };

  const getModalTitle = () => {
    if (modalType === "coi") return "Certificate of Incorporation";
    if (modalType === "bylaws") return "Bylaws";
    return "";
  };

  if (!companyId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        <p className="text-[15px] text-slate-600">
          Select a company to view governance details.
        </p>
      </div>
    );
  }

  if (loading) {
    return <GovernanceLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="text-[15px] font-semibold text-red-900 mb-2">
          Error Loading Governance Data
        </div>
        <p className="text-[14px] text-red-700">{error}</p>
      </div>
    );
  }

  if (!data || !data.profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        <p className="text-[15px] text-slate-600">
          No governance data available for {ticker}.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        
        {/* Governance Sections */}
        {Object.entries(data.profile).map(([sectionTitle, rows]) => (
          <div
            key={sectionTitle}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              {sectionTitle}
            </h3>
            <GovernanceTable rows={rows} />
          </div>
        ))}
      </div>

      {/* Filing Links Section */}
        {((governanceData?.certificate_of_incorporation?.length ?? 0) > 0 || (governanceData?.bylaws?.length ?? 0) > 0) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mt-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
              {(governanceData?.certificate_of_incorporation?.length ?? 0) > 0 && (
                <FilingLink
                  label="Certificate of Incorporation"
                  dateItems={coiDocuments.map((item) => ({
                    date: item.date,
                    link: item.link,
                  }))}
                  onViewClick={() => setModalType("coi")}
                />
              )}
              {(governanceData?.bylaws?.length ?? 0) > 0 && (
                <FilingLink
                  label="Bylaws"
                  dateItems={bylawsDocuments.map((item) => ({
                    date: item.date,
                    link: item.link,
                  }))}
                  onViewClick={() => setModalType("bylaws")}
                />
              )}
            </div>
          </div>
        )}

      {/* Documents Modal */}
      <DocumentsModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        companyName={data.company}
        documentTitle={getModalTitle()}
        documents={getModalDocuments()}
      />
    </>
  );
}
