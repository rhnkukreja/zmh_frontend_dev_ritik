import React, { useState, useRef } from "react";
import clsx from "clsx";
import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import { proxyContestAIService } from "@/services/proxyContestAI";
import CPagination from "@/components/Pagination";

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface VotingRecord {
  id: number;
  company_id: number;
  company_name: string;
  ticker?: string;
  company_ticker?: string;
  symbol?: string;
  ticker_symbol?: string;
  year: number;
  proposal: string;
  proposal_num: string;
  vote: string;
  mgt_rec: string;
  meeting_date: string;
  institution_id: number;
  institution_name: string;
  fund_name: string;
  proponent_type: string;
  proposal_category: string;
  is_meeting_details: boolean;
  voting_rationale?: string;
  notes?: string;
}

interface MeetingGroup {
  key: string;
  company_id: number;
  company_name: string;
  ticker: string;
  year: number;
  meeting_date: string;
  is_meeting_details: boolean;
  records: VotingRecord[];
}

const resolveTicker = (r: VotingRecord) =>
  r.ticker || r.company_ticker || r.symbol || r.ticker_symbol || "";

interface VotingRecordsListProps {
  votingRecords: {
    count?: number;
    total_companies?: number;
    page: number;
    total_pages: number;
    results: VotingRecord[];
  } | null;
  loading: boolean;
  vrLoading?: boolean;
  page: number;
  onPageChange: (p: number) => void;
  onDownload?: () => void;
  downloading?: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const VOTE_BADGE: Record<string, string> = {
  For: "bg-green-100 text-green-700",
  Against: "bg-red-100 text-red-700",
  Withhold: "bg-red-100 text-red-700",
  Abstain: "bg-yellow-100 text-yellow-700",
  "Non-Vote": "bg-gray-100 text-gray-600",
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

const groupRecords = (records: VotingRecord[]): MeetingGroup[] => {
  const map = new Map<string, MeetingGroup>();
  for (const r of records) {
    const key = `${r.company_id}::${r.meeting_date}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        company_id: r.company_id,
        company_name: r.company_name,
        ticker: resolveTicker(r),
        year: r.year,
        meeting_date: r.meeting_date,
        is_meeting_details: r.is_meeting_details,
        records: [],
      });
    }
    const g = map.get(key)!;
    g.records.push(r);
    if (r.is_meeting_details) g.is_meeting_details = true;
  }
  return Array.from(map.values());
};

/* ── Meeting Details Modal ──────────────────────────────────────────────────── */
const MeetingDetailsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  companyName: string;
  ticker: string;
  year: number;
}> = ({ open, onClose, companyName, ticker, year }) => {

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fetchId = useRef(0);

  React.useEffect(() => {
    if (!open) return;
    const id = ++fetchId.current;
    setLoading(true);
    setData(null);
    (async () => {
      try {
        const res = await proxyContestAIService.getMeetingDetailsByTicker(ticker, year, companyName);
        if (id === fetchId.current) setData(res);
      } catch {
        if (id === fetchId.current) setData(null);
      } finally {
        if (id === fetchId.current) setLoading(false);
      }
    })();
  }, [open, ticker, year]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary to-primary/80 rounded-t-xl flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">{companyName}</h2>
            <p className="text-xs text-white/80 mt-0.5">Meeting Details — 8K Report</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors">
            <Lucide icon="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[5, 4, 5, 3].map((n, i) => (
                <div key={i}>
                  <div className="h-3 bg-slate-200 rounded w-32 mb-3" />
                  {Array.from({ length: n }).map((_, j) => (
                    <div key={j} className="h-8 bg-slate-100 rounded mb-1.5" />
                  ))}
                </div>
              ))}
            </div>
          ) : !data ? (
            <div className="text-center py-12">
              <Lucide icon="FileX" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No meeting details found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Company info */}
              {data?.company?.length > 0 && (
                <div className="bg-gray-50 px-4 py-3 rounded-lg text-sm">
                  {data.company.map((info: any, i: number) => {
                    const name = Object.keys(info)[0];
                    return (
                      <div key={i} className="flex gap-2">
                        <span className="font-semibold text-slate-700">{name}:</span>
                        <span className="text-slate-600">{info[name]}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Nominees table */}
              {data?.nominees?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-primary border-b border-gray-200 pb-2">Nominees</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          {(data.nominees_headers || []).map((h: any, i: number) => (
                            <Table.Td key={i} className={clsx("py-2.5 font-semibold bg-gray-50 text-gray-700 text-sm whitespace-nowrap", i === 0 && "min-w-[220px]")}>
                              {h.header}
                            </Table.Td>
                          ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {data.nominees.map((nominee: any, i: number) => (
                          <Table.Tr key={i} className="hover:bg-gray-50 [&_td]:last:border-b-0">
                            {(data.nominees_headers || []).map((h: any, hi: number) => (
                              <Table.Td key={hi} className={clsx("py-2.5 border-dashed text-sm", hi === 0 && "min-w-[220px] font-medium")}>
                                {nominee[h.field] ?? ""}
                              </Table.Td>
                            ))}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Proposals table */}
              {data?.proposals?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-primary border-b border-gray-200 pb-2">Proposals</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          {(data.proposals_headers || []).map((h: any, i: number) => (
                            <Table.Td key={i} className={clsx("py-2.5 font-semibold bg-gray-50 text-gray-700 text-sm whitespace-nowrap", i === 0 && "min-w-[300px]")}>
                              {h.header}
                            </Table.Td>
                          ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {data.proposals.map((proposal: any, i: number) => (
                          <Table.Tr key={i} className="hover:bg-gray-50 [&_td]:last:border-b-0">
                            {(data.proposals_headers || []).map((h: any, hi: number) => (
                              <Table.Td key={hi} className={clsx("py-2.5 border-dashed text-sm", hi === 0 && "min-w-[300px]")}>
                                {proposal[h.field] ?? "N/A"}
                              </Table.Td>
                            ))}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Meeting Row (accordion item) ───────────────────────────────────────────── */
const MeetingRow: React.FC<{
  group: MeetingGroup;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ group, isExpanded, onToggle }) => {
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);

  return (
    <>
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
        {/* Row header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 bg-white hover:bg-slate-50 cursor-pointer transition-colors select-none"
          onClick={onToggle}
        >
          <span className="text-sm font-medium text-slate-800">
            {formatDate(group.meeting_date)} — {group.company_name}
          </span>
          <div className="flex items-center gap-2">
            {group.is_meeting_details && (
              <button
                onClick={(e) => { e.stopPropagation(); setMeetingModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-full transition-colors"
              >
                <Lucide icon="FileText" className="w-3.5 h-3.5" />
                Meeting Details
              </button>
            )}
            <Lucide
              icon={isExpanded ? "ChevronUp" : "ChevronDown"}
              className="w-4 h-4 text-slate-400 flex-shrink-0"
            />
          </div>
        </div>

        {/* Expanded vote records */}
        {isExpanded && (
          <div className="border-t border-slate-100 overflow-x-auto">
            <Table>
              <Table.Thead>
                <Table.Tr className="bg-primary">
                  <Table.Td className="py-2.5 font-semibold text-white text-sm w-14">No.</Table.Td>
                  <Table.Td className="py-2.5 font-semibold text-white text-sm min-w-[340px]">Proposal</Table.Td>
                  <Table.Td className="py-2.5 font-semibold text-white text-sm whitespace-nowrap">Mgmt Rec</Table.Td>
                  <Table.Td className="py-2.5 font-semibold text-white text-sm whitespace-nowrap">Vote Cast</Table.Td>
                  <Table.Td className="py-2.5 font-semibold text-white text-sm whitespace-nowrap">Institution Name</Table.Td>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {group.records.map((row, i) => {
                  const rationale = row.voting_rationale || row.notes;
                  return (
                    <React.Fragment key={row.id || i}>
                      <Table.Tr className="hover:bg-gray-50">
                        <Table.Td className="py-2.5 border-dashed text-sm text-gray-500">{row.proposal_num || (i + 1)}</Table.Td>
                        <Table.Td className="py-2.5 border-dashed text-sm min-w-[340px]">{row.proposal}</Table.Td>
                        <Table.Td className="py-2.5 border-dashed text-sm">{row.mgt_rec}</Table.Td>
                        <Table.Td className="py-2.5 border-dashed text-sm">
                          <span className={clsx("font-semibold", (row.vote === "Against" || row.vote === "Withhold") ? "text-red-600" : "text-slate-800")}>
                            {row.vote}
                          </span>
                        </Table.Td>
                        <Table.Td className="py-2.5 border-dashed text-sm whitespace-nowrap">{row.institution_name}</Table.Td>
                      </Table.Tr>
                      {rationale && (
                        <Table.Tr className="bg-slate-50">
                          <Table.Td className="border-dashed" />
                          <Table.Td colSpan={4} className="py-1.5 border-dashed text-sm text-slate-600 italic">
                            <span className="font-semibold not-italic text-slate-500">Voting Rationale: </span>{rationale}
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </div>

      <MeetingDetailsModal
        open={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        companyName={group.company_name}
        ticker={group.ticker}
        year={group.year}
      />
    </>
  );
};

/* ── Main Component ─────────────────────────────────────────────────────────── */
const VotingRecordsList: React.FC<VotingRecordsListProps> = ({
  votingRecords,
  loading,
  vrLoading,
  page,
  onPageChange,
  onDownload,
  downloading,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const groups = React.useMemo(
    () => groupRecords(votingRecords?.results || []),
    [votingRecords?.results]
  );

  const toggleRow = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleExpandAll = () => {
    if (allExpanded) {
      setExpandedKeys(new Set());
      setAllExpanded(false);
    } else {
      setExpandedKeys(new Set(groups.map((g) => g.key)));
      setAllExpanded(true);
    }
  };

  if (loading || vrLoading) {
    return (
      <div className="space-y-2 animate-pulse mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!votingRecords?.results?.length) {
    return (
      <div className="text-center py-10 text-slate-400 mt-4">
        <Lucide icon="Vote" className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No voting records found.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <Lucide icon="ClipboardList" className="w-5 h-5 text-primary" />
          Voting Records
          <span className="text-xs text-slate-400 font-normal">({votingRecords.total_companies ?? votingRecords.count} total companies)</span>
        </h3>
        <div className="flex items-center gap-2">
          {onDownload && (
            <button
              onClick={onDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary border border-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <Lucide icon="Loader" className="w-4 h-4 animate-spin" />
              ) : (
                <Lucide icon="Download" className="w-4 h-4" />
              )}
              {downloading ? "Downloading..." : "Download Now"}
            </button>
          )}
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary border border-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Lucide icon={allExpanded ? "ChevronsUp" : "ChevronsDown"} className="w-4 h-4" />
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        </div>
      </div>

      {/* Accordion list */}
      <div>
        {groups.map((group) => (
          <MeetingRow
            key={group.key}
            group={group}
            isExpanded={expandedKeys.has(group.key)}
            onToggle={() => toggleRow(group.key)}
          />
        ))}
      </div>

      {/* Pagination */}
      {(votingRecords.total_pages || 1) > 1 && (
        <div className="mt-4">
          <CPagination
            page={page}
            totalPages={votingRecords.total_pages}
            handlePageChange={onPageChange}
            handlePreviousPage={() => onPageChange(Math.max(1, page - 1))}
            handleNextPage={() => onPageChange(Math.min(votingRecords.total_pages, page + 1))}
          />
        </div>
      )}
    </div>
  );
};

export default VotingRecordsList;
