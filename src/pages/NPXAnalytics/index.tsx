import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import TableWrapper from "@/components/TableWrapper";
import Table from "@/components/Base/Table";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { dashboardService } from "@/services/dashboard";

const toOptions = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

const normalizeRows = (result: any): Record<string, any>[] => {
  if (!result || typeof result !== "object") return [];

  const dataObject = result.result || result.data || result;

  if (Array.isArray(dataObject)) return dataObject;

  const rows: Record<string, any>[] = [];
  for (const [name, data] of Object.entries(dataObject)) {
    if (typeof data === "object" && data !== null) {
      rows.push({ Institution: name, ...data });
    }
  }
  return rows;
};

const formatCell = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function NPXAnalyticsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const companyId = searchParams.get("company_id");
  const year = searchParams.get("year");

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
  const [errorMessage, setErrorMessage] = useState("");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const headers = useMemo(() => {
    if (!rows.length) return [] as string[];
    return Object.keys(rows[0]);
  }, [rows]);

  // ------------------------------------
  // Fetch dropdown options
  // ------------------------------------
  const fetchDropdown = async (selectedInstitution?: string[]) => {
    if (!companyId || !year) return;

    try {
      setDropdownLoading(true);
      const params: any = { company_id: companyId, year };
      if (selectedInstitution && selectedInstitution.length > 0) {
        params.institution_name = selectedInstitution.join(",");
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
    } catch (err) {
      console.error("[NPXAnalytics] fetchDropdown error:", err);
    } finally {
      setDropdownLoading(false);
    }
  };

  // ------------------------------------
  // Fetch pivot table data
  // ------------------------------------
  const fetchPivotTable = async () => {
    if (!companyId || !year) return;

    try {
      setTableLoading(true);
      setErrorMessage("");

      const response = await dashboardService.getNPXPivotTable({
        company_id: companyId,
        year,
        institution_name: institutionName,
        fund_name: fundName || "",
        proposal_text: proposalText,
      });

      const payload =
        (response as any)?.result || (response as any)?.data || response;
      const parsedRows = normalizeRows(payload);
      setRows(parsedRows);
    } catch (err) {
      console.error("[NPXAnalytics] fetchPivotTable error:", err);
      setRows([]);
      setErrorMessage("Failed to load pivot analytics data.");
    } finally {
      setTableLoading(false);
    }
  };

  // Load dropdowns on mount. Re-fetch with institution filter when it changes.
  useEffect(() => {
    fetchDropdown(institutionName.length > 0 ? institutionName : undefined);
  }, [companyId, year, institutionName]);

  // Re-fetch table whenever any filter changes
  useEffect(() => {
    fetchPivotTable();
  }, [companyId, year, institutionName, fundName, proposalText]);

  // ------------------------------------
  // Render
  // ------------------------------------
  return (
    <>
      <Button
        onClick={() => navigate(-1)}
        variant="primary"
        className="bg-theme-2 border-bg-theme-2 mb-1"
      >
        <Lucide icon="ChevronLeft" className="w-4 h-4 mr-1" />
        Back
      </Button>

      <div className="p-5 mt-1 box">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-bold">NPX Analytics</h1>
            <p className="italic">
              Year: {year || "-"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={fetchPivotTable}
              disabled={tableLoading || dropdownLoading}
            >
              {tableLoading ? "Loading..." : "Search"}
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
              isLoading={dropdownLoading}
              options={toOptions(institutions)}
              value={institutionName.map((i) => ({ value: i, label: i }))}
              onChange={(opts) =>
                setInstitutionName(opts ? opts.map((o) => o.value) : [])
              }
              placeholder="Select Institution(s)"
              isClearable
            />
          </div>

          {/* Fund */}
          <div>
            <label className="text-sm font-semibold mb-1 block">Fund</label>
            <Select
              isMulti
              isLoading={dropdownLoading}
              options={toOptions(funds)}
              value={fundName.map((f) => ({ value: f, label: f }))}
              onChange={(opts) =>
                setFundName(opts ? opts.map((o) => o.value) : [])
              }
              placeholder="Select Fund(s)"
              isClearable
            />
          </div>

          {/* Proposal */}
          <div>
            <label className="text-sm font-semibold mb-1 block">Proposal</label>
            <Select
              isMulti
              isLoading={dropdownLoading}
              options={toOptions(proposals)}
              value={proposalText.map((p) => ({ value: p, label: p }))}
              onChange={(opts) =>
                setProposalText(opts ? opts.map((o) => o.value) : [])
              }
              placeholder="Select Proposal(s)"
              isClearable
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-6">
          <div className="text-right text-sm text-gray-500 mb-2">
            Total Count: {rows.length}
          </div>

          {(dropdownLoading || tableLoading) && (
            <div className="flex items-center justify-center bg-white p-8 border rounded-md">
              <LoadingIcon color="#800000" icon="three-dots" className="w-12 h-12" />
            </div>
          )}

          {/* {!dropdownLoading && !tableLoading && errorMessage && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {errorMessage}
            </div>
          )} */}

          {!dropdownLoading && !tableLoading && (
            <TableWrapper isLoading={false}>
              <Table bordered>
                <Table.Thead variant="light">
                  <Table.Tr>
                    {headers.length > 0 ? (
                      headers.map((head) => (
                        <Table.Th key={head}>
                          {head.toLowerCase() === "total"
                            ? "Grand Total"
                            : head.replaceAll("_", " ").charAt(0).toUpperCase() + head.slice(1)}
                        </Table.Th>
                      ))
                    ) : (
                      <Table.Th>No Data</Table.Th>
                    )}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.length > 0 ? (
                    rows.map((row, index) => {
                      const isLastRow = index === rows.length - 1;
                      return (
                        <Table.Tr key={index} className={isLastRow ? "font-bold" : ""}>
                          {headers.map((head) => {
                            const raw = row?.[head];
                            const display =
                              head === "Institution" &&
                                typeof raw === "string" &&
                                raw.toLowerCase() === "grand_total"
                                ? "Grand Total"
                                : formatCell(raw);
                            return (
                              <Table.Td key={`${index}-${head}`}>
                                {display}
                              </Table.Td>
                            );
                          })}
                        </Table.Tr>
                      );
                    })
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={headers.length || 1}>
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
