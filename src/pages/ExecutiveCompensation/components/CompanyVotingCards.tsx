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

const getVoteClassName = (vote?: string) => {
  const normalized = String(vote || "");
  return normalized.includes("Against") || normalized.includes("Withhold")
    ? "text-red-700 font-semibold"
    : "";
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
      <div className="rounded-2xl shadow-lg bg-white p-4 border border-gray-100 space-y-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!allGroups.length) {
    return (
      <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
        <div className="text-center py-10 text-slate-400">
          <Lucide icon="Vote" className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No company voting data found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
      <div className="flex justify-end gap-3 mb-4 px-4 pt-4">
        <button
          onClick={handleExpandAll}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium text-sm"
        >
          <span>{allExpanded ? "Collapse All" : "Expand All"}</span>
          <Lucide icon={allExpanded ? "ChevronUp" : "ChevronDown"} className="w-4 h-4" />
        </button>
      </div>

      {/* Accordion list */}
      <div className="divide-y divide-gray-100">
        {paginatedGroups.map((group) => {
          const { company, proposals, key } = group;
          const isExpanded = expandedKeys.has(key);
          const displayDate = formatDate(company.meeting_date);
          const headerText = displayDate
            ? `${displayDate} - ${company.company_name}${company.meeting_type ? ` (${company.meeting_type})` : ""}`
            : `${company.company_name}${company.meeting_type ? ` (${company.meeting_type})` : ""}`;

          return (
            <div key={key} className="py-2">
              {/* Row header */}
              <div
                className="flex flex-row justify-between items-center cursor-pointer px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 font-medium text-base"
                onClick={() => toggleRow(key)}
              >
                <span className="text-gray-800">{headerText}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-normal">
                    {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
                  </span>
                  <button className="text-primary hover:text-primary/80 transition-colors duration-200">
                    <Lucide icon={isExpanded ? "ChevronUp" : "ChevronDown"} className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expanded vote records */}
              {isExpanded && (
                <div className="mt-2 mb-4 bg-gray-50 overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <Table.Thead>
                      <Table.Tr className="bg-primary text-white text-sm">
                        <Table.Td className="px-4 py-2 font-semibold text-white text-sm w-[60px]">No.</Table.Td>
                        <Table.Td className="px-4 py-2 font-semibold text-white text-sm w-[40%]">Proposal</Table.Td>
                        <Table.Td className="px-4 py-2 font-semibold text-white text-sm w-[100px]">Mgmt Rec</Table.Td>
                        <Table.Td className="px-4 py-2 font-semibold text-white text-sm w-[110px]">Vote Cast</Table.Td>
                        <Table.Td className="px-4 py-2 font-semibold text-white text-sm w-[30%]">Institution Name</Table.Td>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                      {proposals.map((row, i) => {
                        const rationale = row.notes;
                        return (
                          <React.Fragment key={`${group.key}-${i}`}>
                            <Table.Tr className="hover:bg-primary/10">
                              <Table.Td className="px-4 py-2 align-top text-sm text-gray-500">{row.proposal_num || (i + 1)}</Table.Td>
                              <Table.Td className="px-4 py-2 align-top text-sm break-words whitespace-normal leading-tight">{row.proposal}</Table.Td>
                              <Table.Td className="px-4 py-2 align-top text-sm break-words whitespace-normal leading-tight">{row.mgt_rec}</Table.Td>
                              <Table.Td className="px-4 py-2 align-top text-sm">
                                <span className={clsx(getVoteClassName(row.vote))}>
                                  {row.vote}
                                </span>
                              </Table.Td>
                              <Table.Td className="px-4 py-2 align-top text-sm break-words whitespace-normal leading-tight">{row.institution_name}</Table.Td>
                            </Table.Tr>
                            {rationale && (
                              <Table.Tr className="bg-slate-50">
                                <Table.Td className="px-4 py-2" />
                                <Table.Td colSpan={4} className="px-4 py-2 text-sm text-slate-600 italic">
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
        <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
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
