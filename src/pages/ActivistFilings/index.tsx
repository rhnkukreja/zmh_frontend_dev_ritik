import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppSelector } from "@/stores/hooks";
import { dashboardService } from "@/services/dashboard";
import StandardizedTable from "@/components/StandardizedTable";
import Table from "@/components/Base/Table";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Popover from "@/components/Base/Headless/Popover";
import { FormCheck } from "@/components/Base/Form";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import FilterChips from "@/components/FilterChips";

const extractFilingYear = (value: unknown) => {
  if (typeof value !== "string") return "";

  const yearMatch = value.match(/\b(\d{4})\b/);
  if (yearMatch?.[1]) return yearMatch[1];

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? "" : String(parsedDate.getFullYear());
};

const toTrimmedString = (value: unknown) => String(value || "").trim();

const DEFAULT_EXCLUDED_FILING_TYPES = ["DEF 14A", "DEFA14A", "PRE 14A"];

function ActivistFilings() {
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source") || "";
  const isCompanySource = source === "company";

  const { companyGlobalSearchId } = useAppSelector((state) => state.authentiction);

  const [loading, setLoading] = useState(false);
  const [filings, setFilings] = useState<any[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedFilingTypes, setSelectedFilingTypes] = useState<string[]>([]);
  const [draftYears, setDraftYears] = useState<string[]>([]);
  const [draftFilingTypes, setDraftFilingTypes] = useState<string[]>([]);

  const fetchFilings = useCallback(async () => {
    if (!companyGlobalSearchId) {
      setFilings([]);
      return;
    }

    setLoading(true);
    try {
      const response = await dashboardService.getActivistFilings(companyGlobalSearchId);
      const result = response?.result || response || {};
      setFilings(Array.isArray(result?.filings) ? result.filings : []);
    } catch (error) {
      console.error("Failed to load activist filings:", error);
      setFilings([]);
    } finally {
      setLoading(false);
    }
  }, [companyGlobalSearchId]);

  useEffect(() => {
    if (!isCompanySource) return;
    fetchFilings();
  }, [fetchFilings, isCompanySource]);

  useEffect(() => {
    setSelectedYears([]);
    setSelectedFilingTypes([]);
    setDraftYears([]);
    setDraftFilingTypes([]);
  }, [companyGlobalSearchId]);

  const hasCompany = Boolean(companyGlobalSearchId);
  const filingsData = useMemo(() => filings || [], [filings]);

  const yearOptions = useMemo(() => {
    const years = filingsData
      .map((filing) => extractFilingYear(filing?.["Filing Date"]))
      .filter(Boolean);

    return Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a));
  }, [filingsData]);

  const filingTypeOptions = useMemo(() => {
    const filingTypes = filingsData
      .map((filing) => toTrimmedString(filing?.["Filing Type"]))
      .filter(Boolean);

    return Array.from(new Set(filingTypes)).sort((a, b) => a.localeCompare(b));
  }, [filingsData]);

  const filteredFilings = useMemo(() => {
    return filingsData.filter((filing) => {
      const filingYear = extractFilingYear(filing?.["Filing Date"]);
      const filingType = toTrimmedString(filing?.["Filing Type"]);
      const isDefaultExcludedType = DEFAULT_EXCLUDED_FILING_TYPES.includes(filingType);

      if (selectedYears.length > 0 && !selectedYears.includes(filingYear)) return false;
      if (selectedFilingTypes.length > 0) {
        if (!selectedFilingTypes.includes(filingType)) return false;
      } else if (isDefaultExcludedType) {
        return false;
      }

      return true;
    });
  }, [filingsData, selectedYears, selectedFilingTypes]);

  const activeFiltersCount = selectedYears.length + selectedFilingTypes.length;

  const syncDraftFilters = useCallback(() => {
    setDraftYears(selectedYears);
    setDraftFilingTypes(selectedFilingTypes);
  }, [selectedYears, selectedFilingTypes]);

  const applyFilters = useCallback(
    (close?: () => void) => {
      setSelectedYears(draftYears);
      setSelectedFilingTypes(draftFilingTypes);
      close?.();
    },
    [draftFilingTypes, draftYears]
  );

  const clearFilters = useCallback((close?: () => void) => {
    setDraftYears([]);
    setDraftFilingTypes([]);
    setSelectedYears([]);
    setSelectedFilingTypes([]);
    close?.();
  }, []);

  const handleRemoveChip = useCallback((removeKey: string, removeValue: string | number) => {
    const value = String(removeValue);

    if (removeKey === "year") {
      setSelectedYears((prev) => prev.filter((item) => item !== value));
      setDraftYears((prev) => prev.filter((item) => item !== value));
      return;
    }

    if (removeKey === "filing_type") {
      setSelectedFilingTypes((prev) => prev.filter((item) => item !== value));
      setDraftFilingTypes((prev) => prev.filter((item) => item !== value));
    }
  }, []);

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        <div className="mt-3.5 relative">
          {!hasCompany ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-500">
              <Lucide icon="Building2" className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Select a company from the top search bar to view activist filings.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span className="text-slate-500">Company</span>
                  <Lucide icon="ChevronRight" className="w-4 h-4 text-slate-400" />
                  <span className="flex items-center gap-2">
                    <span>Activist Filings</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      BETA
                    </span>
                  </span>
                </h2>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="inline-flex w-fit max-w-[72%] items-baseline gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Note:</span>
                    <span className="italic">
                      Initial screen excludes <span className="font-semibold not-italic">DEF 14A</span>,{" "}
                      <span className="font-semibold not-italic">DEFA14A</span>, and{" "}
                      <span className="font-semibold not-italic">PRE 14A</span>. Use the filter to select these filings if available.
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Count:</span>
                    <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                      {filteredFilings.length}
                    </span>
                  </div>

                  <Popover className="inline-block">
                    {({ close }) => (
                      <>
                        <Popover.Button
                          as={Button}
                          variant="outline-secondary"
                          className="w-full sm:w-auto"
                          onClick={syncDraftFilters}
                        >
                          <Lucide icon="Filter" className="stroke-[1.3] w-4 h-4 mr-2" />
                          Filter
                          <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100 text-slate-600">
                            {activeFiltersCount}
                          </div>
                        </Popover.Button>

                        <Popover.Panel className="w-[44rem] max-w-[90vw] p-5" placement="bottom-end">
                          <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
                              <p className="text-xs text-slate-500 mt-1">Filter the filings shown below.</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline-secondary" onClick={() => clearFilters(close)}>
                                Clear
                              </Button>
                              <Button type="button" variant="primary" onClick={() => applyFilters(close)}>
                                Apply
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 text-slate-600 font-semibold">
                                  <Lucide icon="CalendarDays" className="w-4 h-4 text-slate-400" />
                                  Year
                                </div>

                                {yearOptions.length > 0 && (
                                  <FormCheck className="mr-2">
                                    <FormCheck.Label>Select All</FormCheck.Label>
                                    <FormCheck.Input
                                      className="ml-1"
                                      checked={draftYears.length === yearOptions.length && yearOptions.length > 0}
                                      type="checkbox"
                                      onChange={(e) => {
                                        setDraftYears(e.target.checked ? yearOptions : []);
                                      }}
                                    />
                                  </FormCheck>
                                )}
                              </div>

                              <MultiSelectDropdown
                                data={yearOptions}
                                placeholder="Select Year"
                                loading={loading}
                                onChange={(selectedOptions) => {
                                  setDraftYears(selectedOptions.map((option) => String(option.value)));
                                }}
                                selectedOption={draftYears}
                                size="compact"
                                alignLeft
                              />
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 text-slate-600 font-semibold">
                                  <Lucide icon="Tags" className="w-4 h-4 text-slate-400" />
                                  Filing Type
                                </div>

                                {filingTypeOptions.length > 0 && (
                                  <FormCheck className="mr-2">
                                    <FormCheck.Label>Select All</FormCheck.Label>
                                    <FormCheck.Input
                                      className="ml-1"
                                      checked={draftFilingTypes.length === filingTypeOptions.length && filingTypeOptions.length > 0}
                                      type="checkbox"
                                      onChange={(e) => {
                                        setDraftFilingTypes(e.target.checked ? filingTypeOptions : []);
                                      }}
                                    />
                                  </FormCheck>
                                )}
                              </div>

                              <MultiSelectDropdown
                                data={filingTypeOptions}
                                placeholder="Select Filing Type"
                                loading={loading}
                                onChange={(selectedOptions) => {
                                  setDraftFilingTypes(selectedOptions.map((option) => String(option.value)));
                                }}
                                selectedOption={draftFilingTypes}
                                size="compact"
                                alignLeft
                              />
                            </div>
                          </div>
                        </Popover.Panel>
                      </>
                    )}
                  </Popover>
                </div>
              </div>

                {activeFiltersCount > 0 && (
                  <div className="-mx-1 mb-3">
                    <FilterChips
                      filters={[
                        ...selectedYears.map((year) => ({ key: "year", value: year })),
                        ...selectedFilingTypes.map((filingType) => ({ key: "filing_type", value: filingType })),
                      ]}
                      onRemove={handleRemoveChip}
                    />
                  </div>
                )}

                <StandardizedTable isLoading={loading} skeletonRows={6} skeletonCols={4} maxHeight="68vh" className="table-fixed">
                  <StandardizedTable.Header>
                    <StandardizedTable.Cell isHeader width="26%">Filing Type</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="26%">Filing Date</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="28%">Filing Entity/Person</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="20%">Filing Link</StandardizedTable.Cell>
                  </StandardizedTable.Header>
                  <Table.Tbody>
                    {filteredFilings.length > 0 ? (
                      filteredFilings.map((filing, index) => (
                        <StandardizedTable.Row key={`${filing?.["Filing Type"] || "filing"}-${index}`} index={index}>
                          <StandardizedTable.Cell>
                            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                              {filing?.["Filing Type"] || "-"}
                            </span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell>
                            <span className="text-sm text-slate-700">{filing?.["Filing Date"] || "-"}</span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell>
                            <span className="text-sm font-medium text-slate-700">{filing?.["Investor Name"] || "-"}</span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell>
                            <div className="flex items-center justify-start gap-3">
                              {filing?.["Filing Link"] ? (
                                <Button
                                  variant="outline-primary"
                                  className="shrink-0 whitespace-nowrap"
                                  onClick={() => window.open(filing["Filing Link"], "_blank", "noopener,noreferrer")}
                                >
                                  <Lucide icon="ExternalLink" className="w-4 h-4 mr-2" />
                                  Open Filing
                                </Button>
                              ) : (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                            </div>
                          </StandardizedTable.Cell>
                        </StandardizedTable.Row>
                      ))
                    ) : (
                      <Table.Tr>
                        <Table.Td colSpan={4} className="text-center py-12 text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Lucide icon="FileSearch" className="w-10 h-10 opacity-40" />
                            <span className="text-sm font-medium text-slate-600">No relevant activist filings</span>
                          </div>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </StandardizedTable>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivistFilings;
