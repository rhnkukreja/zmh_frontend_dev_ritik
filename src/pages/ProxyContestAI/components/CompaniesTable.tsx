import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CPagination from "@/components/Pagination";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import StandardizedTable from "@/components/StandardizedTable";
import Table from "@/components/Base/Table";
import { proxyContestAIService } from "@/services/proxyContestAI";
import { dashboardService } from "@/services/dashboard";

interface CompaniesTableProps {
  data: any;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  institutionIds: number[];
  institutions?: { institution_id: number; institution_name: string }[];
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
  data, loading, page, onPageChange, institutionIds, institutions = [], isAdminOrAnalyst, onEdit,
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

  // ── Voting modal institution filter (local to the modal) ──────────────────
  const [modalInstIds, setModalInstIds] = useState<number[]>([]);
  const [instDDOpen, setInstDDOpen] = useState(false);
  const [instQuery, setInstQuery] = useState("");
  const [expandedInsts, setExpandedInsts] = useState<string[]>([]);

  const instNameMap = React.useMemo(() => {
    const m = new Map<number, string>();
    institutions.forEach((i) => m.set(i.institution_id, i.institution_name));
    return m;
  }, [institutions]);
  const instName = (id: number) => instNameMap.get(id) ?? `Institution ${id}`;

  const fetchVotingData = async (company: any, ids: number[]) => {
    setModalLoading(true);
    const id = ++fetchIdRef.current;
    try {
      const result = await proxyContestAIService.getVotingData(
        company.company_id,
        company.year,
        ids.length > 0 ? ids : undefined
      );
      if (id !== fetchIdRef.current) return;
      setModalData(result);
    } catch {
      if (id === fetchIdRef.current) setModalData(null);
    } finally {
      if (id === fetchIdRef.current) setModalLoading(false);
    }
  };

  const toggleModalInst = (id: number) => {
    const next = modalInstIds.includes(id)
      ? modalInstIds.filter((x) => x !== id)
      : [...modalInstIds, id];
    setModalInstIds(next);
    if (modalCompany) fetchVotingData(modalCompany, next);
  };

  // ── 8-K document links (same condition as the Shareholder Meeting page:
  //    resolve CIK via sec_filing URL, then fetch per-year filing links and
  //    only show the button when links exist for the meeting year) ────────────
  const [eightKLinks, setEightKLinks] = useState<string[]>([]);
  const [eightKLoading, setEightKLoading] = useState(false);
  const eightKCache = useRef<Map<string, string[]>>(new Map());
  const eightKFetchId = useRef(0);

  const extractCikFromSecUrl = (secUrl?: string) => {
    const match = secUrl?.match(/CIK=(\d+)/i);
    return match?.[1] ? match[1].padStart(10, "0") : null;
  };

  const fetchEightKLinks = async (company: any) => {
    const cacheKey = `${company.company_id}_${company.year}`;
    const cached = eightKCache.current.get(cacheKey);
    if (cached) {
      setEightKLinks(cached);
      return;
    }
    const id = ++eightKFetchId.current;
    setEightKLinks([]);
    setEightKLoading(true);
    try {
      const res = await dashboardService.getModulesCount({
        global_search: company.company_name,
      });
      const payload = res?.result;
      const secUrl =
        (typeof payload?.sec_filing === "string" && payload.sec_filing) ||
        (typeof payload?.sec_filings === "string" && payload.sec_filings) ||
        "";
      const cik = extractCikFromSecUrl(secUrl);
      let links: string[] = [];
      if (cik) {
        const resp = await fetch(
          `https://dashboard-holders-api-4e81a2861a3c.herokuapp.com/api/get_proxy_voting_data_v2/?cik=${encodeURIComponent(cik)}`
        );
        if (resp.ok) {
          const data = await resp.json();
          const linksByYear = (Array.isArray(data?.all_meeting_data) ? data.all_meeting_data : [])
            .reduce((result: Record<string, string[]>, item: any) => {
              Object.entries(item || {}).forEach(([key, value]) => {
                const urls = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
                result[key] = urls.filter((url: any) => typeof url === "string" && url.trim() !== "");
              });
              return result;
            }, {});
          links = linksByYear[`url_${company.year}`] || [];
        }
      }
      eightKCache.current.set(cacheKey, links);
      if (id === eightKFetchId.current) setEightKLinks(links);
    } catch {
      eightKCache.current.set(cacheKey, []);
      if (id === eightKFetchId.current) setEightKLinks([]);
    } finally {
      if (id === eightKFetchId.current) setEightKLoading(false);
    }
  };

  const openModal = async (company: any, type: ModalType) => {
    setModalCompany(company);
    setModalType(type);
    setModalData(null);
    setModalOpen(true);
    setModalLoading(true);
    setInstDDOpen(false);
    setInstQuery("");
    setExpandedInsts([]);
    setEightKLinks([]);

    if (type === "voting") {
      setModalInstIds(institutionIds);
      fetchVotingData(company, institutionIds);
      return;
    }

    if (type === "meeting_details") {
      fetchEightKLinks(company);
    }

    const id = ++fetchIdRef.current;
    try {
      let result: any = null;
      if (type === "documents" || type === "proxy_advisory" || type === "case_studies") {
        result = await proxyContestAIService.getActivismTables(company.company_name, [company.year]);
      } else if (type === "meeting_details") {
        result = await proxyContestAIService.getMeetingDetails(company.company_name, company.year);
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

  const votingGroupKeys = React.useMemo(() => {
    if (modalType !== "voting") return [] as string[];
    return [
      ...new Set(
        ((modalData?.results) || []).map(
          (r: any) => r.institution_name || "Unknown Institution"
        )
      ),
    ] as string[];
  }, [modalType, modalData]);

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
          <div className={`bg-white rounded-xl shadow-2xl w-full overflow-hidden flex flex-col ${
            modalType === "voting" ? "max-w-7xl max-h-[92vh]" : "max-w-4xl max-h-[80vh]"
          }`}>
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
              {/* Institution filter — Voting Data modal only */}
              {modalType === "voting" && (
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex-none">
                      <Lucide icon="Building2" className="w-3.5 h-3.5" />
                      Institutions
                    </span>

                    {/* Selected institution chips */}
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 items-center">
                      {modalInstIds.length === 0 && (
                        <span className="text-xs text-slate-400 py-1">All institutions</span>
                      )}
                      {modalInstIds.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-white border border-primary/30 text-primary text-xs font-medium shadow-sm"
                        >
                          {instName(id)}
                          <button
                            onClick={() => toggleModalInst(id)}
                            className="p-0.5 rounded-full hover:bg-primary/10 transition-colors"
                          >
                            <Lucide icon="X" className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Institution dropdown */}
                    {institutions.length > 0 && (
                      <div className="relative flex-none">
                        <button
                          onClick={() => { setInstDDOpen((o) => !o); setInstQuery(""); }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:border-primary/50 text-slate-600 hover:text-primary transition-colors"
                        >
                          <Lucide icon="Plus" className="w-3.5 h-3.5" />
                          Add Institution
                          <Lucide icon="ChevronDown" className={`w-3.5 h-3.5 transition-transform ${instDDOpen ? "rotate-180" : ""}`} />
                        </button>
                        {instDDOpen && (
                          <>
                          <div className="fixed inset-0 z-20" onClick={() => setInstDDOpen(false)} />
                          <div className="absolute right-0 z-30 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg">
                            <div className="p-2 border-b border-slate-100">
                              <div className="relative">
                                <Lucide icon="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Search institutions..."
                                  value={instQuery}
                                  onChange={(e) => setInstQuery(e.target.value)}
                                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                              </div>
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                              {institutions
                                .filter((i) => !instQuery.trim() || i.institution_name.toLowerCase().includes(instQuery.toLowerCase()))
                                .map((i) => {
                                  const isSel = modalInstIds.includes(i.institution_id);
                                  return (
                                    <button
                                      key={i.institution_id}
                                      onClick={() => toggleModalInst(i.institution_id)}
                                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                                        isSel ? "bg-primary/5 text-primary font-semibold" : "hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      <span className={`w-4 h-4 flex-none rounded border flex items-center justify-center ${
                                        isSel ? "bg-primary border-primary" : "border-slate-300"
                                      }`}>
                                        {isSel && <Lucide icon="Check" className="w-2.5 h-2.5 text-white" />}
                                      </span>
                                      <span className="leading-tight break-words flex-1">{i.institution_name}</span>
                                    </button>
                                  );
                                })}
                              {institutions.filter((i) => !instQuery.trim() || i.institution_name.toLowerCase().includes(instQuery.toLowerCase())).length === 0 && (
                                <div className="px-3 py-3 text-sm text-slate-400 text-center">No results found</div>
                              )}
                            </div>
                          </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modalLoading ? (
                <ModalSkeleton type={modalType} />
              ) : (
                <ModalContent
                  type={modalType}
                  data={modalData}
                  companyName={modalCompany?.company_name || ""}
                  eightK={{ links: eightKLinks, loading: eightKLoading }}
                  voting={{
                    expanded: expandedInsts,
                    allExpanded:
                      votingGroupKeys.length > 0 &&
                      expandedInsts.length >= votingGroupKeys.length,
                    onToggle: (k: string) =>
                      setExpandedInsts((p) =>
                        p.includes(k) ? p.filter((x) => x !== k) : [...p, k]
                      ),
                    onToggleAll: () =>
                      setExpandedInsts(
                        votingGroupKeys.length > 0 &&
                          expandedInsts.length >= votingGroupKeys.length
                          ? []
                          : votingGroupKeys
                      ),
                  }}
                />
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

interface VotingGroupUI {
  expanded: string[];
  allExpanded: boolean;
  onToggle: (key: string) => void;
  onToggleAll: () => void;
}

const ModalContent: React.FC<{
  type: ModalType;
  data: any;
  companyName: string;
  eightK?: { links: string[]; loading: boolean };
  voting?: VotingGroupUI;
}> = ({
  type, data, companyName, eightK, voting,
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
            <div className="flex items-center justify-between gap-3 mb-3 border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-primary">Company Information</h3>
              {eightK?.loading ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-red-800 text-red-800 text-sm font-bold opacity-60">
                  <Lucide icon="Loader" className="w-4 h-4 animate-spin" />
                  8-K
                </span>
              ) : (
                (eightK?.links?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {eightK!.links.map((url, i) => (
                      <button
                        key={url}
                        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-red-800 bg-white text-red-800 text-sm font-bold hover:bg-red-800 hover:text-white transition-colors shadow-sm"
                      >
                        <Lucide icon="FileText" className="w-4 h-4" />
                        8-K{eightK!.links.length > 1 ? ` ${i + 1}` : ""}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
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
    const groupMap = new Map<string, any[]>();
    results.forEach((r: any) => {
      const k = r.institution_name || "Unknown Institution";
      if (!groupMap.has(k)) groupMap.set(k, []);
      groupMap.get(k)!.push(r);
    });
    const groups = [...groupMap.entries()];
    const expanded = voting?.expanded ?? [];

    return (
      <div>
        {/* Count + Expand/Collapse All */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500">
            {data.count} record{data.count !== 1 ? "s" : ""} · {groups.length} institution{groups.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={voting?.onToggleAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            {voting?.allExpanded ? "Collapse All" : "Expand All"}
            <Lucide
              icon="ChevronDown"
              className={`w-3.5 h-3.5 transition-transform ${voting?.allExpanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Institution groups */}
        <div className="space-y-2">
          {groups.map(([name, rows]) => {
            const isOpen = expanded.includes(name);
            return (
              <div key={name} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => voting?.onToggle(name)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <span className="font-semibold text-sm text-slate-800 leading-snug break-words">
                    {name}
                  </span>
                  <span className="flex items-center gap-2 flex-none text-xs text-slate-400 font-medium">
                    {rows.length} proposal{rows.length !== 1 ? "s" : ""}
                    <Lucide
                      icon="ChevronDown"
                      className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                {isOpen && (
                  <div className="overflow-x-auto border-t border-slate-200">
                    <Table>
                      <Table.Thead>
                        <Table.Tr className="bg-primary">
                          <Table.Td className="py-2.5 font-semibold text-white text-sm w-10">No.</Table.Td>
                          <Table.Td className="py-2.5 font-semibold text-white text-sm">Proposal</Table.Td>
                          <Table.Td className="py-2.5 font-semibold text-white text-sm whitespace-nowrap">Mgmt Rec</Table.Td>
                          <Table.Td className="py-2.5 font-semibold text-white text-sm whitespace-nowrap">Vote Cast</Table.Td>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {rows.map((row: any, i: number) => (
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
                            </Table.Tr>
                            {(row.voting_rationale || row.notes) && (
                              <Table.Tr className="bg-gray-50">
                                <Table.Td className="pb-2 pt-0 border-dashed" />
                                <Table.Td colSpan={3} className="pb-2 pt-0 border-dashed text-xs text-gray-500 italic">
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export default CompaniesTable;
