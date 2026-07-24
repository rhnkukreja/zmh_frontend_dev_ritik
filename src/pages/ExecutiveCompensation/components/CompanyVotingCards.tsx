import React, { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import CPagination from "@/components/Pagination";

interface SampleProposal {
  proposal: string;
  vote: string;
  mgt_rec: string;
  proposal_num?: string;
  notes?: string | null;
  institution_id?: number;
  institution_name?: string;
}

interface CompanyEntry {
  company_id: number;
  company_name: string;
  company_ticker?: string;
  meeting_date?: string;
  meeting_type?: string;
  total_proposals?: number;
  sample_proposals?: SampleProposal[];
}

interface YearGroup {
  year: number;
  companies: CompanyEntry[];
}

interface CompanyVotingCardsProps {
  byCompany?: YearGroup[];
  loading?: boolean;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  // If the backend already returns a formatted date like "25 Mar, 2026", use it directly.
  if (/^\d{1,2}\s+[A-Za-z]{3},\s*\d{4}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

const VOTE_BADGE: Record<string, string> = {
  For: "text-blue-600",
  Against: "text-red-600",
  Withhold: "text-red-600",
  Abstain: "text-yellow-600",
  "Split Vote": "text-purple-600",
  Other: "text-slate-600",
};

const CompanyVotingCards: React.FC<CompanyVotingCardsProps> = ({ byCompany, loading }) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const allGroups = useMemo(() => {
    const groups: {
      key: string;
      year: number;
      company: CompanyEntry;
      proposals: SampleProposal[];
    }[] = [];
    (byCompany || []).forEach((yearGroup) => {
      (yearGroup.companies || []).forEach((company) => {
        const proposals = company.sample_proposals || [];
        if (proposals.length > 0) {
          groups.push({
            key: `${yearGroup.year}-${company.company_id}-${company.meeting_date || "no-date"}`,
            year: yearGroup.year,
            company,
            proposals,
          });
        }
      });
    });
    // Sort by latest meeting date first
    return groups.sort((a, b) => {
      const dateA = a.company.meeting_date ? new Date(a.company.meeting_date).getTime() : 0;
      const dateB = b.company.meeting_date ? new Date(b.company.meeting_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [byCompany]);

  const totalPages = Math.ceil(allGroups.length / pageSize) || 1;
  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allGroups.slice(start, start + pageSize);
  }, [allGroups, page]);

  // Reset to first page when underlying data changes
  useEffect(() => {
    setPage(1);
  }, [byCompany]);

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
      setExpandedKeys(new Set(allGroups.map((g) => g.key)));
      setAllExpanded(true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!allGroups.length) {
    return (
      <div className="text-center py-10 text-slate-400 mt-4">
        <Lucide icon="Vote" className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No company voting data found.</p>
      </div>
    );
  }

  return (
    <div className="mt-0">
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#8b1828]" />
          Company Voting Records
          <span className="text-xs text-slate-600 font-normal">({allGroups.length} total companies)</span>
        </h3>
        <button
          onClick={handleExpandAll}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary border border-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Lucide icon={allExpanded ? "ChevronsUp" : "ChevronsDown"} className="w-4 h-4" />
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Accordion list */}
      <div>
        {paginatedGroups.map((group) => {
          const { company, proposals, key } = group;
          const isExpanded = expandedKeys.has(key);
          const displayDate = formatDate(company.meeting_date);
          const headerText = displayDate
            ? `${displayDate} - ${company.company_name}${company.meeting_type ? ` (${company.meeting_type})` : ""}`
            : `${company.company_name}${company.meeting_type ? ` (${company.meeting_type})` : ""}`;

          return (
            <div key={key} className="border border-slate-200 rounded-lg overflow-hidden mb-2">
              {/* Row header */}
              <div
                className="flex items-center justify-between px-5 py-3.5 bg-white hover:bg-slate-50 cursor-pointer transition-colors select-none"
                onClick={() => toggleRow(key)}
              >
                <span className="text-sm font-medium text-slate-800">{headerText}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-normal">
                    {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
                  </span>
                  <Lucide
                    icon={isExpanded ? "ChevronUp" : "ChevronDown"}
                    className="w-4 h-4 text-slate-400 flex-shrink-0"
                  />
                </div>
              </div>

              {/* Expanded vote records */}
              {isExpanded && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <Table.Thead>
                      <Table.Tr className="bg-primary">
                        <Table.Td className="py-2.5 font-semibold text-white text-sm w-[60px]">No.</Table.Td>
                        <Table.Td className="py-2.5 font-semibold text-white text-sm w-[40%]">Proposal</Table.Td>
                        <Table.Td className="py-2.5 font-semibold text-white text-sm w-[100px]">Mgmt Rec</Table.Td>
                        <Table.Td className="py-2.5 font-semibold text-white text-sm w-[110px]">Vote Cast</Table.Td>
                        <Table.Td className="py-2.5 font-semibold text-white text-sm w-[30%]">Institution Name</Table.Td>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {proposals.map((row, i) => {
                        const rationale = row.notes;
                        return (
                          <React.Fragment key={`${group.key}-${i}`}>
                            <Table.Tr className="hover:bg-gray-50">
                              <Table.Td className="py-2.5 border-dashed text-sm text-gray-500">{row.proposal_num || (i + 1)}</Table.Td>
                              <Table.Td className="py-2.5 border-dashed text-sm leading-snug">{row.proposal}</Table.Td>
                              <Table.Td className="py-2.5 border-dashed text-sm">{row.mgt_rec}</Table.Td>
                              <Table.Td className="py-2.5 border-dashed text-sm">
                                <span className={clsx("font-semibold", VOTE_BADGE[row.vote] || "text-slate-800")}>
                                  {row.vote}
                                </span>
                              </Table.Td>
                              <Table.Td className="py-2.5 border-dashed text-sm leading-snug">{row.institution_name}</Table.Td>
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
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <CPagination
            page={page}
            totalPages={totalPages}
            handlePageChange={setPage}
            handlePreviousPage={() => setPage(Math.max(1, page - 1))}
            handleNextPage={() => setPage(Math.min(totalPages, page + 1))}
          />
        </div>
      )}
    </div>
  );
};

export default CompanyVotingCards;
