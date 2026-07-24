import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import TableWrapper from "@/components/TableWrapper";
import Table from "@/components/Base/Table";
import clsx from "clsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { SkeletonTable } from "@/components/Base/Skeletons";
import { dashboardService } from "@/services/dashboard";
import { MdOutlineClear } from "react-icons/md";
import { FaSearch } from "react-icons/fa";
import Tippy from "@/components/Base/Tippy";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { createDynamicURL, downloadFileFromAPI } from "@/utils/helper";
import { baseURL } from "@/constant";


interface PivotColumn {
  title: string;
  sub_columns: string[];
}

interface PivotRow {
  fund_name: string;
  values: Record<string, Record<string, string>>;
}

interface PivotData {
  columns: PivotColumn[];
  rows: PivotRow[];
  grand_total?: Record<string, Record<string, string>>;
}

const formatCell = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

export default function NPXAnalyticsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const companyId = searchParams.get("company_id");
  const year = searchParams.get("year");
  const [yearOptions, setYearOptions] = useState<string[]>([]);

  // Dropdown state
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [funds, setFunds] = useState<string[]>([]);
  const [proposals, setProposals] = useState<string[]>([]);

  // Selected filter state
  const [institutionName, setInstitutionName] = useState<string[]>([]);
  const [fundName, setFundName] = useState<string[]>([]);
  const [proposalText, setProposalText] = useState<string[]>([]);

  // Table state
  const [tableLoading, setTableLoading] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pivotData, setPivotData] = useState<PivotData | null>(null);

  const [meetingDate, setMeetingDate] = useState<string>("");

  const toOptions = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

  // ------------------------------------
  // Fetch dropdown options
  // ------------------------------------
  const fetchDropdown = async (selectedInstitution?: string[]) => {
    if (!companyId || !year) return;

    try {
      setDropdownLoading(true);
      const params: any = { company_id: companyId, year };
      if (selectedInstitution && selectedInstitution.length > 0) {
        params.institution_name = selectedInstitution;
      }

      const response = await dashboardService.getNPXPivotTableDropdown(params);
      const payload = response?.result || {};

      setInstitutions(
        Array.isArray(payload.institution)
          ? payload.institution.filter(Boolean)
          : []
      );
      setFunds(
        Array.isArray(payload.fund_name)
          ? payload.fund_name.filter(Boolean)
          : []
      );
      setProposals(
        Array.isArray(payload.proposal_text)
          ? payload.proposal_text.filter(Boolean)
          : []
      );
      setMeetingDate(payload.meeting_date);
    } catch (err) {
      console.error("[NPXAnalytics] fetchDropdown error:", err);
    } finally {
      setDropdownLoading(false);
    }
  };

  // ------------------------------------
  // Fetch pivot table data
  // ------------------------------------
  const fetchPivotTable = async (filters?: {
    institution_name?: string[];
    fund_name?: string[];
    proposal_text?: string[];
    download?: boolean;
  }) => {
    if (!companyId || !year) return;
    if (filters?.download && loadingDownload) return;

    try {
      const queryParams = {
        company_id: companyId,
        year,
        institution_name: filters?.institution_name ?? institutionName,
        fund_name: filters?.fund_name ?? fundName,
        proposal_text: filters?.proposal_text ?? proposalText,
      };

      if (filters?.download) {
        setLoadingDownload(true);
        downloadFileFromAPI({
          url: createDynamicURL(`${baseURL}/api/npx_pivot_table/`, queryParams),
          fileName: "npx_analytics.xlsx",
          setLoading: setLoadingDownload,
          serviceMethod: dashboardService.getNPXPivotTableFile
        });
        return;
      }

      setTableLoading(true);
      setErrorMessage("");

      const response = await dashboardService.getNPXPivotTable(queryParams);

      const payload =
        (response as any)?.result || (response as any)?.data || response;
      setPivotData(payload);
    } catch (err) {
      console.error("[NPXAnalytics] fetchPivotTable error:", err);
      setPivotData(null);
      setErrorMessage("Failed to load pivot analytics data.");
    } finally {
      if (!filters?.download) {
        setTableLoading(false);
      }
    }
  };

  const onApplyFilters = () => {
    fetchPivotTable();
  };

  // Load available years from consolidated meeting dates endpoint
  useEffect(() => {
    const loadYears = async () => {
      try {
        if (!companyId) return;
        const { result } = await dashboardService.getVdsNpxMeetingDates(companyId);
        const npxKey = result?.NPX_Data || result?.npx_data || [];
        const years = Array.from(new Set(
          (Array.isArray(npxKey) ? npxKey : []).map((x: any) => String(x?.year)).filter(Boolean)
        )).sort((a: string, b: string) => Number(b) - Number(a));
        setYearOptions(years);
        if (years.length > 0) {
          const currentYear = searchParams.get('year');
          const defaultYear = currentYear && years.includes(currentYear) ? currentYear : years[0];
          if (defaultYear !== currentYear) {
            setSearchParams(prev => {
              const params = new URLSearchParams(prev);
              params.set('year', defaultYear);
              return params;
            });
          }
        }
      } catch (e) {
        console.warn('[NPXAnalytics] Failed to load years:', e);
      }
    };
    loadYears();
  }, [companyId]);

  // Load dropdowns on mount. Re-fetch with institution filter when it changes.
  useEffect(() => {
    fetchDropdown(institutionName.length > 0 ? institutionName : undefined);
  }, [companyId, year, institutionName]);

  // Fetch table on initial load / context change only
  useEffect(() => {
    fetchPivotTable();
  }, [companyId, year]);

  const onFilterClear = () => {
    setInstitutionName([]);
    setFundName([]);
    setProposalText([]);
    setErrorMessage("");
    setPivotData(null);
    fetchPivotTable({
      institution_name: [],
      fund_name: [],
      proposal_text: [],
    });
  };

  // ------------------------------------
  // Render
  // ------------------------------------
  return (
    <>
      <Button
        onClick={() => navigate('/', {
          state: {
            activeTab: "shareholder-meeting-results"
          }
        })}
        variant="primary"
        className="bg-theme-2 border-bg-theme-2 mb-1"
      >
        <Lucide icon="ChevronLeft" className="w-4 h-4 mr-1" />
        Back
      </Button>

      <div className="p-5 mt-1 box">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              NPX Analytics
              <span className="px-2 py-1 text-xs font-bold bg-red-800 text-white rounded-full">
                BETA
              </span>
            </h1>
            <p className="italic">
              Meeting Date: {meetingDate || "-"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-[140px]">
              <Select
                options={(yearOptions || []).map(y => ({ value: y, label: y }))}
                value={year ? { value: year, label: year } : null}
                onChange={(opt: any) => {
                  const y = opt?.value ? String(opt.value) : '';
                  if (!y) return;
                  setSearchParams(prev => {
                    const params = new URLSearchParams(prev);
                    params.set('year', y);
                    return params;
                  });
                }}
                placeholder="Meeting Date"
                isClearable={false}
              />
            </div>
            <Button
              variant="outline-secondary"
              onClick={() => {
                onFilterClear();
              }}
              className="w-full sm:w-auto flex items-center gap-2"
              type="button"
            >
              <MdOutlineClear className="text-lg mr-1" />Clear
            </Button>

            <Button
              variant="primary"
              onClick={onApplyFilters}
              className="w-full sm:w-auto flex items-center gap-2"
              type="button"
            >
              <FaSearch className="text-lg" /> Apply
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
          {/* Institution */}
          <div>
            <label className="text-sm font-semibold mb-1 block">
              Institution
            </label>
            <Select
              isMulti
              options={toOptions(institutions)}
              value={institutionName.map((i) => ({ value: i, label: i }))}
              onChange={(opts) =>
                setInstitutionName(opts ? opts.map((o) => o.value) : [])
              }
              placeholder="Select Institution(s)"
              isClearable
              closeMenuOnSelect={false}
            />
          </div>

          {/* Fund */}
          <div>
            <label className="text-sm font-semibold mb-1 block">Fund</label>
            <Select
              isMulti
              options={toOptions(funds)}
              value={fundName.map((f) => ({ value: f, label: f }))}
              onChange={(opts) =>
                setFundName(opts ? opts.map((o) => o.value) : [])
              }
              placeholder="Select Fund(s)"
              isClearable
              closeMenuOnSelect={false}
            />
          </div>

          {/* Proposal */}
          <div>
            <label className="text-sm font-semibold mb-1 block">Proposal</label>
            <Select
              isMulti
              options={toOptions(proposals)}
              value={proposalText.map((p) => ({ value: p, label: p }))}
              onChange={(opts) =>
                setProposalText(opts ? opts.map((o) => o.value) : [])
              }
              placeholder="Select Proposal(s)"
              isClearable
              closeMenuOnSelect={false}
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-right text-sm text-gray-500">
              Total Count: {pivotData?.rows?.length ? pivotData.rows.length : 0}
            </div>
            <Tippy content="Download Excel" options={{ theme: "light" }}>
              <div
                className="box p-[5px] cursor-pointer"
                onClick={() => fetchPivotTable({ download: true })}
              >
                {loadingDownload ? (
                  <Lucide
                    icon="Loader"
                    className={`w-6 h-6 stroke-[1.3] ${loadingDownload ? "animate-spin" : ""
                      }`}
                  />
                ) : (
                  <img alt="download-icon" src={downloadIcon} />
                )}
              </div>
            </Tippy>
          </div>

          {tableLoading && (
            <div className="bg-white p-5 border rounded-md">
              <SkeletonTable rows={8} columns={6} cellHeight="h-10" />
            </div>
          )}

          {/* {!dropdownLoading && !tableLoading && errorMessage && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {errorMessage}
            </div>
          )} */}

          {!tableLoading && pivotData && (
            <TableWrapper isLoading={false}>
              <Table bordered>
                <Table.Thead className="bg-slate-50">
                  {/* Row 1: Main Column Titles */}
                  <Table.Tr>
                    {pivotData.columns.map((col, idx) => (
                      <Table.Th
                        key={idx}
                        rowSpan={col.sub_columns.length === 0 ? 2 : 1}
                        colSpan={col.sub_columns.length || 1}
                        className={clsx(
                          "text-center align-middle border",
                          idx === 0 && "sticky left-0 z-20 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                        )}
                      >
                        {col.title}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                  {/* Row 2: Sub-columns (For/Against) */}
                  <Table.Tr>
                    {pivotData.columns.map((col, idx) =>
                      col.sub_columns.map((sub, sIdx) => {
                        // idx === 0 check is technically redundant for sub_columns based on your JSON format,
                        // but included for absolute robustness.
                        return (
                          <Table.Th
                            key={`${col.title}-${sIdx}`}
                            className={clsx(
                              "text-center italic text-xs border whitespace-nowrap",
                              idx === 0 && "sticky left-0 z-20 bg-slate-50"
                            )}
                          >
                            {sub}
                          </Table.Th>
                        );
                      })
                    )}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pivotData.rows.length > 0 ? (
                    <>
                      {pivotData.rows.map((row, rIdx) => {
                        const isGrandTotal = row.fund_name.toLowerCase() === "grand total";
                        return (
                          <Table.Tr
                            key={rIdx}
                            className={isGrandTotal ? "font-bold bg-slate-50" : ""}
                          >
                            {/* Fund Name Column - Sticky */}
                            <Table.Td
                              className={clsx(
                                "border sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                                isGrandTotal ? "bg-slate-50" : "bg-white"
                              )}
                            >
                              {row.fund_name}
                            </Table.Td>

                            {/* Values Columns */}
                            {pivotData.columns.slice(1).map((col) => {
                              if (col.sub_columns.length === 0) {
                                const val = (row.values[col.title] as any) || "-";
                                return (
                                  <Table.Td key={col.title} className="text-center border">
                                    {formatCell(val)}
                                  </Table.Td>
                                );
                              }

                              return col.sub_columns.map((sub) => {
                                const val = row.values[col.title]?.[sub.toLowerCase()] || "";
                                return (
                                  <Table.Td
                                    key={`${col.title}-${sub}`}
                                    className="text-center border"
                                  >
                                    {formatCell(val)}
                                  </Table.Td>
                                );
                              });
                            })}
                          </Table.Tr>
                        );
                      })}

                      {/* Explicit Grand Total Row from API */}
                      {pivotData.grand_total && (
                        <Table.Tr className="font-bold bg-slate-50">
                          <Table.Td
                            className="border sticky left-0 z-10 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                          >
                            Grand Total
                          </Table.Td>
                          {pivotData.columns.slice(1).map((col) => {
                            if (col.sub_columns.length === 0) {
                              const val = (pivotData.grand_total?.[col.title] as any) || "-";
                              return (
                                <Table.Td key={col.title} className="text-center border">
                                  {formatCell(val)}
                                </Table.Td>
                              );
                            }

                            return col.sub_columns.map((sub) => {
                              const val = pivotData.grand_total?.[col.title]?.[sub.toLowerCase()] || "";
                              return (
                                <Table.Td
                                  key={`${col.title}-${sub}`}
                                  className="text-center border"
                                >
                                  {formatCell(val)}
                                </Table.Td>
                              );
                            });
                          })}
                        </Table.Tr>
                      )}
                    </>
                  ) : (
                    <Table.Tr>
                      <Table.Td
                        colSpan={pivotData.columns.reduce(
                          (acc, col) => acc + (col.sub_columns.length || 1),
                          0
                        )}
                        className="text-center py-8"
                      >
                        No analytics data found for selected filters.
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </TableWrapper>
          )}
        </div>
      </div>
    </>
  );
}
