import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CPagination from "@/components/Pagination";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import StandardizedTable from "@/components/StandardizedTable";
import Table from "@/components/Base/Table";
import { proxyContestAIService } from "@/services/proxyContestAI";

interface CompaniesTableProps {
  data: any;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  institutionIds: number[];
  isAdminOrAnalyst?: boolean;
  onEdit?: (company: any) => void;
}


type ModalType = "documents" | "proxy_advisory" | "meeting_details" | "case_studies" | "voting";

const MODAL_TITLES: Record<ModalType, string> = {
  documents: "Documents",
  proxy_advisory: "Proxy Advisory Recommendation",
  meeting_details: "Meeting Details",
  case_studies: "Case Studies",
  voting: "Voting Data",
};

const VOTE_BADGE: Record<string, string> = {
  For: "bg-green-100 text-green-700",
  Against: "bg-red-100 text-red-700",
  Withhold: "bg-red-100 text-red-700",
  Abstain: "bg-yellow-100 text-yellow-700",
};

const ActionIcon: React.FC<{
  active: boolean;
  tooltip: string;
  icon: any;
  onClick?: () => void;
}> = ({ active, tooltip, icon, onClick }) =>
  active ? (
    <Tippy content={tooltip} options={{ theme: "light" }}>
      <div
        className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-primary hover:text-white"
        onClick={onClick}
      >
        <Lucide icon={icon} className="w-4 h-4" />
      </div>
    </Tippy>
  ) : (
    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-300 cursor-not-allowed">
      <Lucide icon={icon} className="w-4 h-4" />
    </div>
  );

const CompaniesTable: React.FC<CompaniesTableProps> = ({
  data, loading, page, onPageChange, institutionIds, isAdminOrAnalyst, onEdit,
}) => {
  const pageSize = 20;
  const totalPages = data ? Math.ceil(data.count / pageSize) : 1;

  // ── Details modal state ────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>("documents");
  const [modalCompany, setModalCompany] = useState<any>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchIdRef = useRef(0);

  const openModal = async (company: any, type: ModalType) => {
    setModalCompany(company);
    setModalType(type);
    setModalData(null);
    setModalOpen(true);
    setModalLoading(true);

    const id = ++fetchIdRef.current;
    try {
      let result: any = null;
      if (type === "documents" || type === "proxy_advisory" || type === "case_studies") {
        result = await proxyContestAIService.getActivismTables(company.company_name, [company.year]);
      } else if (type === "meeting_details") {
        result = await proxyContestAIService.getMeetingDetails(company.company_name, company.year);
      } else if (type === "voting") {
        result = await proxyContestAIService.getVotingData(
          company.company_id,
          company.year,
          institutionIds.length > 0 ? institutionIds : undefined
        );
      }
      if (id !== fetchIdRef.current) return;
      setModalData(result);
    } catch {
      if (id === fetchIdRef.current) setModalData(null);
    } finally {
      if (id === fetchIdRef.current) setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
  };

  const navigate = useNavigate();

  return (
    <>
      <StandardizedTable
        isLoading={loading}
        skeletonCols={4}
        skeletonRows={10}
        maxHeight="70vh"
      >
        <StandardizedTable.Header>
          <StandardizedTable.Cell isHeader width="10%">Year</StandardizedTable.Cell>
          <StandardizedTable.Cell isHeader width="35%">Company Name</StandardizedTable.Cell>
          <StandardizedTable.Cell isHeader width="20%">Meeting Date</StandardizedTable.Cell>
          <StandardizedTable.Cell isHeader width="35%">Actions</StandardizedTable.Cell>
        </StandardizedTable.Header>

        <Table.Tbody>
          {data?.results?.length > 0 ? (
            data.results.map((company: any, index: number) => (
              <StandardizedTable.Row key={`${company.company_id}-${company.year}-${index}`} index={index}>
                <StandardizedTable.Cell>
                  <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {company.year}
                  </span>
                </StandardizedTable.Cell>
                <StandardizedTable.Cell>
                  <button
                    onClick={() => navigate(`/proxy-contest-detail/${company.company_id}`, { state: { company } })}
                    className="font-semibold text-slate-800 hover:underline text-left"
                  >
                    {company.company_name}
                  </button>
                </StandardizedTable.Cell>
                <StandardizedTable.Cell>
                  {company.meeting_date && (
                    <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                      {company.meeting_date}
                    </span>
                  )}
                </StandardizedTable.Cell>
                <StandardizedTable.Cell>
                  <div className="flex gap-2 flex-wrap">
                    <ActionIcon
                      active={!!company.is_documents}
                      tooltip="Documents"
                      icon="FileText"
                      onClick={() => openModal(company, "documents")}
                    />
                    <ActionIcon
                      active={!!company.is_proxy_advisory_firm_recommendation}
                      tooltip="Proxy Advisory Recommendation"
                      icon="Shield"
                      onClick={() => openModal(company, "proxy_advisory")}
                    />
                    <ActionIcon
                      active={!!company.is_meeting_details}
                      tooltip="Meeting Details"
                      icon="Calendar"
                      onClick={() => openModal(company, "meeting_details")}
                    />
                    <ActionIcon
                      active={!!company.is_case_studies}
                      tooltip="Case Studies"
                      icon="BookOpen"
                      onClick={() => openModal(company, "case_studies")}
                    />
                    <ActionIcon
                      active={!!company.is_voting}
                      tooltip="Voting Data"
                      icon="Vote"
                      onClick={() => openModal(company, "voting")}
                    />
                    {isAdminOrAnalyst && (
                      <ActionIcon
                        active={true}
                        tooltip="Edit"
                        icon="Pencil"
                        onClick={() => onEdit?.(company)}
                      />
                    )}
                  </div>
                </StandardizedTable.Cell>
              </StandardizedTable.Row>
            ))
          ) : (
            <StandardizedTable.Row>
              <StandardizedTable.Cell colSpan={4} className="text-center py-10 text-gray-400 text-lg font-semibold">
                <Lucide icon="Search" className="mx-auto mb-2 w-8 h-8 text-primary/40" />
                No companies available.
              </StandardizedTable.Cell>
            </StandardizedTable.Row>
          )}
        </Table.Tbody>
      </StandardizedTable>

      {!loading && totalPages > 1 && (
        <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
          <CPagination
            page={page}
            totalPages={totalPages}
            handlePageChange={onPageChange}
            handlePreviousPage={() => onPageChange(Math.max(1, page - 1))}
            handleNextPage={() => onPageChange(Math.min(totalPages, page + 1))}
          />
        </div>
      )}

      {/* ── Unified Details Modal ──────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary/80 text-white flex-none">
              <div>
                <h2 className="text-lg font-semibold">{MODAL_TITLES[modalType]}</h2>
                <p className="text-sm text-white/80 mt-0.5">
                  {modalCompany?.company_name} · {modalCompany?.year}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
              >
                <Lucide icon="X" className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {modalLoading ? (
                <ModalSkeleton type={modalType} />
              ) : (
                <ModalContent type={modalType} data={modalData} companyName={modalCompany?.company_name || ""} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Modal skeleton ─────────────────────────────────────────────────────────── */
const ModalSkeleton: React.FC<{ type: ModalType }> = ({ type }) => (
  <div className="space-y-4 animate-pulse">
    {type === "voting" ? (
      <>
        <div className="h-8 bg-gray-200 rounded w-full mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2 border-b border-gray-100">
            <div className="h-4 bg-gray-100 rounded flex-[3]" />
            <div className="h-4 bg-gray-100 rounded flex-1" />
            <div className="h-4 bg-gray-100 rounded flex-1" />
            <div className="h-4 bg-gray-100 rounded flex-1" />
          </div>
        ))}
      </>
    ) : (
      <>
        <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg flex items-center gap-3 px-3">
            <div className="h-4 bg-gray-200 rounded flex-1" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </>
    )}
  </div>
);

/* ── Modal content renderers ────────────────────────────────────────────────── */
const CheckCircle = () => (
  <div className="bg-green-500 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white">
    &#10004;
  </div>
);

const ModalContent: React.FC<{ type: ModalType; data: any; companyName: string }> = ({
  type, data, companyName,
}) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <Lucide icon="FileX" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
        <p className="text-gray-500">No data found for {companyName}.</p>
      </div>
    );
  }

  /* ── DOCUMENTS ────────────────────────────────────────────────────────────── */
  if (type === "documents") {
    const presentations = data?.Activism_Presentation || [];
    const pressReleases = data?.Activism_Press_Release || [];
    if (!presentations.length && !pressReleases.length) {
      return (
        <div className="text-center py-12">
          <Lucide icon="FileX" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Documents Available</h3>
          <p className="text-gray-500">No documents found for {companyName}.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {presentations.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">
              Company and Investor Presentations
            </h3>
            <div className="space-y-2">
              {presentations.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{item.document_name || "Unnamed Document"}</span>
                  {item.document_url && (
                    <a href={item.document_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {pressReleases.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">
              Press Releases
            </h3>
            <div className="space-y-2">
              {pressReleases.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{item.document_name || "Unnamed Document"}</span>
                  {item.document_url && (
                    <a href={item.document_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── PROXY ADVISORY ───────────────────────────────────────────────────────── */
  if (type === "proxy_advisory") {
    const recommendations = data?.Activism_ISS_GL || [];
    if (!recommendations.length) {
      return (
        <div className="text-center py-12">
          <Lucide icon="Shield" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Recommendations Available</h3>
          <p className="text-gray-500">No proxy advisory firm recommendations found for {companyName}.</p>
        </div>
      );
    }
    const companies = [...new Set(recommendations.map((r: any) => r.company_tent))] as string[];
    return (
      <div className="overflow-x-auto">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Td rowSpan={2} className="px-6 py-3 font-semibold h-[60px] border-r border-gray-200 bg-gray-50 text-gray-700 text-left">
                Company
              </Table.Td>
              <Table.Td colSpan={3} className="px-6 py-3 font-semibold h-[30px] border-r border-gray-200 bg-gray-50 text-gray-700 text-center">
                ISS
              </Table.Td>
              <Table.Td colSpan={3} className="px-6 py-3 font-semibold h-[30px] bg-gray-50 text-gray-700 text-center">
                GL
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              {["Management", "Activist", "Split"].map((h) => (
                <Table.Td key={`iss-${h}`} className="px-4 py-2 font-medium h-[30px] border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">{h}</Table.Td>
              ))}
              <Table.Td className="px-4 py-2 font-medium h-[30px] border-l border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">Management</Table.Td>
              <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">Activist</Table.Td>
              <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">Split</Table.Td>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {companies.map((name, i) => {
              const iss = recommendations.find((r: any) => r.type === "ISS" && r.company_tent === name);
              const gl = recommendations.find((r: any) => r.type === "GL" && r.company_tent === name);
              return (
                <Table.Tr key={i} className="hover:bg-gray-50 border-b border-gray-100">
                  <Table.Td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-100">{name || ""}</Table.Td>
                  <Table.Td className="px-4 py-4 text-center">{iss?.management && <div className="flex justify-center"><CheckCircle /></div>}</Table.Td>
                  <Table.Td className="px-4 py-4 text-center">{iss?.activist && <div className="flex justify-center"><CheckCircle /></div>}</Table.Td>
                  <Table.Td className="px-4 py-4 text-center border-r border-gray-100">{iss?.split && <div className="flex justify-center"><CheckCircle /></div>}</Table.Td>
                  <Table.Td className="px-4 py-4 text-center">{gl?.management && <div className="flex justify-center"><CheckCircle /></div>}</Table.Td>
                  <Table.Td className="px-4 py-4 text-center">{gl?.activist && <div className="flex justify-center"><CheckCircle /></div>}</Table.Td>
                  <Table.Td className="px-4 py-4 text-center">{gl?.split && <div className="flex justify-center"><CheckCircle /></div>}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
    );
  }

  /* ── MEETING DETAILS ─────────────────────────────────────────────────────── */
  if (type === "meeting_details") {
    if (!data?.company?.length && !data?.nominees?.length && !data?.proposals?.length) {
      return (
        <div className="text-center py-12">
          <Lucide icon="Calendar" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Meeting Details Available</h3>
          <p className="text-gray-500">No meeting details found for {companyName}.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {data?.company?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">Company Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {data.company.map((companyInfo: any, i: number) => {
                const name = Object.keys(companyInfo)[0];
                return (
                  <div key={i} className="text-sm">
                    <p><strong>Company:</strong> {name}</p>
                    <p><strong>Meeting:</strong> {companyInfo[name]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {data?.nominees?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">Nominees</h3>
            <div className="overflow-x-auto">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    {data.nominees_headers?.map((h: any, i: number) => (
                      <Table.Td key={i} className={`py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700 ${i === 0 ? "min-w-[200px]" : ""}`}>
                        {h.header}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.nominees.map((nominee: any, i: number) => (
                    <Table.Tr key={i} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                      {data.nominees_headers?.map((h: any, hi: number) => (
                        <Table.Td key={hi} className={`py-2 border-dashed text-sm ${hi === 0 ? "min-w-[200px]" : ""}`}>
                          {nominee[h.field] || ""}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          </div>
        )}
        {data?.proposals?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">Proposals</h3>
            <div className="overflow-x-auto">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    {data.proposals_headers?.map((h: any, i: number) => (
                      <Table.Td key={i} className={`py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700 ${i === 0 ? "min-w-[200px]" : ""}`}>
                        {h.header}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.proposals.map((proposal: any, i: number) => (
                    <Table.Tr key={i} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                      {data.proposals_headers?.map((h: any, hi: number) => (
                        <Table.Td key={hi} className={`py-2 border-dashed text-sm ${hi === 0 ? "min-w-[200px]" : ""}`}>
                          {proposal[h.field] || "N/A"}
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
    );
  }

  /* ── CASE STUDIES ─────────────────────────────────────────────────────────── */
  if (type === "case_studies") {
    const presentations = data?.Activism_Presentation || [];
    const pressReleases = data?.Activism_Press_Release || [];
    const allDocs = [...presentations, ...pressReleases];
    if (!allDocs.length) {
      return (
        <div className="text-center py-12">
          <Lucide icon="BookOpen" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Case Studies Found</h3>
          <p className="text-gray-500">No case studies available for {companyName}.</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {allDocs.map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">{item.document_name || "Unnamed Document"}</span>
            {item.document_url && (
              <a href={item.document_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View PDF
              </a>
            )}
          </div>
        ))}
      </div>
    );
  }

  /* ── VOTING DATA ─────────────────────────────────────────────────────────── */
  if (type === "voting") {
    const results = data?.results || [];
    if (!results.length) {
      return (
        <div className="text-center py-12">
          <Lucide icon="Vote" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Voting Data Available</h3>
          <p className="text-gray-500">No voting records found for {companyName}.</p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <p className="text-xs text-gray-500 mb-3">{data.count} record{data.count !== 1 ? "s" : ""}</p>
        <Table>
          <Table.Thead>
            <Table.Tr className="bg-primary">
              <Table.Td className="py-2.5 font-semibold text-white text-sm w-10">No.</Table.Td>
              <Table.Td className="py-2.5 font-semibold text-white text-sm">Proposal</Table.Td>
              <Table.Td className="py-2.5 font-semibold text-white text-sm whitespace-nowrap">Mgmt Rec</Table.Td>
              <Table.Td className="py-2.5 font-semibold text-white text-sm whitespace-nowrap">Vote Cast</Table.Td>
              <Table.Td className="py-2.5 font-semibold text-white text-sm whitespace-nowrap">Institution Name</Table.Td>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {results.map((row: any, i: number) => (
              <React.Fragment key={row.id || i}>
                <Table.Tr className="hover:bg-gray-50">
                  <Table.Td className="py-2 border-dashed text-gray-400 text-sm align-top">{i + 1}</Table.Td>
                  <Table.Td className="py-2 border-dashed text-sm">{row.proposal}</Table.Td>
                  <Table.Td className="py-2 border-dashed text-sm text-center">{row.mgt_rec}</Table.Td>
                  <Table.Td className="py-2 border-dashed">
                    <span className={`text-sm font-medium ${
                      row.vote === "Against" || row.vote === "Withhold" ? "text-red-600" : ""
                    }`}>{row.vote}</span>
                  </Table.Td>
                  <Table.Td className="py-2 border-dashed text-sm whitespace-nowrap">{row.institution_name}</Table.Td>
                </Table.Tr>
                {(row.voting_rationale || row.notes) && (
                  <Table.Tr className="bg-gray-50">
                    <Table.Td className="pb-2 pt-0 border-dashed" />
                    <Table.Td colSpan={4} className="pb-2 pt-0 border-dashed text-xs text-gray-500 italic">
                      <span className="font-semibold not-italic text-gray-600">Voting Rationale: </span>
                      {row.voting_rationale || row.notes}
                    </Table.Td>
                  </Table.Tr>
                )}
              </React.Fragment>
            ))}
          </Table.Tbody>
        </Table>
      </div>
    );
  }

  return null;
};

export default CompaniesTable;
