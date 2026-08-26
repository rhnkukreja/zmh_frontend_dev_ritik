import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TableWrapper from "@/components/TableWrapper";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { dashboardService } from "@/services/dashboard";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { fetchNpxProposalVotingStats } from "@/stores/dashboardSlice";
import { createDynamicURL, downloadFileFromAPI } from "@/utils/helper";
import { baseURL } from "@/constant";
import CompanySelect from "@/components/ReactSelectAsync";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import CreatableInputSelect from "@/components/Base/CreatableInputSelect";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { MdOutlineClear } from "react-icons/md";
import { FaSearch, FaTimes, FaUniversity, FaCalendarAlt, FaCheckCircle, FaTags, FaLayerGroup, FaListUl } from "react-icons/fa";
import CPagination from "@/components/Pagination";
import clsx from "clsx";

interface FilterState {
  investor_company?: string[];
  fund_name?: string[];
  proposal?: string[];
  vote?: string[];
  vote_category?: string[];
  keyword?: string[];
  meeting_date?: string;
  year?: string[];
  country?: string[];
  index?: string[];
}

const toOptions = (arr: any[]) =>
  Array.isArray(arr)
    ? arr
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .map((v) => ({ value: String(v), label: String(v) }))
    : [];

const uniqueStrings = (values: any[]) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .map((v) => String(v))
    )
  );

const sortYearsDesc = (values: any[]) =>
  uniqueStrings(values).sort((a, b) => Number(b) - Number(a));

const formatValue = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number" && !Number.isInteger(value)) return value.toFixed(2);
  return String(value);
};

const DEFAULT_INVESTOR = "BlackRock, Inc.";

const NpxInstitutionView = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { companyGlobalSearchTicker } = useAppSelector(
    (state) => state.authentiction
  );
  const { npxProposalVotingStats, npxProposalVotingStatsLoading } = useAppSelector(
    (state) => state.dashboard
  );

  const [filters, setFilters] = useState<FilterState>({
    investor_company: [DEFAULT_INVESTOR],
    year: searchParams.get("year") ? [searchParams.get("year") as string] : [],
  });
  const [dropdowns, setDropdowns] = useState<any>({});
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [pageSize] = useState(25);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [showFundName, setShowFundName] = useState(false);
  const [getFundNameDropdownLoader, setGetFundNameDropdownLoader] = useState(false);
  const [apiFundNameDropdown, setApiFundNameDropdown] = useState<any>({ fund_name: [] });
  const [isFilterCollapse, setIsFilterCollapse] = useState(false);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});

  const viewData = useMemo(() => npxProposalVotingStats || {}, [npxProposalVotingStats]);
  const byInstitution = useMemo(() => viewData.by_institution || [], [viewData]);
  const byCompany = useMemo(() => viewData.by_company || [], [viewData]);

  const meetingDate = searchParams.get("meeting_date") || "";

  const selectedInstitution = useMemo(() => byInstitution?.[0] || {}, [byInstitution]);
  const selectedYearKey = useMemo(() => {
    const yearKeys = selectedInstitution?.years ? sortYearsDesc(Object.keys(selectedInstitution.years)) : [];
    const selectedYears = sortYearsDesc(filters.year || []);
    for (const selectedYear of selectedYears) {
      if (selectedInstitution?.years?.[selectedYear]) return selectedYear;
    }
    return yearKeys[0] || selectedYears[0] || "";
  }, [filters.year, selectedInstitution]);

  const selectedYearStats = useMemo(() => {
    if (!selectedInstitution?.years) return null;
    return selectedInstitution.years[selectedYearKey] || null;
  }, [selectedInstitution, selectedYearKey]);

  const tableRows = useMemo(() => {
    const rows: any[] = [];
    byCompany.forEach((yearBlock: any) => {
      const blockYear = yearBlock?.year;
      (yearBlock?.companies || []).forEach((company: any) => {
        (company?.sample_proposals || []).forEach((proposal: any) => {
          rows.push({
            year: blockYear,
            company_id: company?.company_id,
            company_name: company?.company_name,
            meeting_date: company?.meeting_date,
            meeting_type: company?.meeting_type,
            total_proposals: company?.total_proposals,
            ...proposal,
          });
        });
      });
    });
    return rows;
  }, [byCompany]);

  const proposalSections = useMemo(() => {
    const sections: Array<{ key: string; year: string; company: any }> = [];

    byCompany.forEach((yearBlock: any) => {
      const blockYear = String(yearBlock?.year || "");
      (yearBlock?.companies || []).forEach((company: any, companyIndex: number) => {
        sections.push({
          key: `${blockYear}-${company?.company_id ?? companyIndex}`,
          year: blockYear,
          company,
        });
      });
    });

    return sections;
  }, [byCompany]);

  useEffect(() => {
    if (!proposalSections.length) return;
    const nextOpenGroups: { [key: string]: boolean } = {};
    proposalSections.forEach((section) => {
      nextOpenGroups[section.key] = true;
    });
    setOpenGroups(nextOpenGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalSections]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const areAllGroupsExpanded = () =>
    proposalSections.length > 0 && proposalSections.every((section) => openGroups[section.key]);

  const expandAllGroups = () => {
    const shouldExpand = !areAllGroupsExpanded();
    const nextOpenGroups: { [key: string]: boolean } = {};
    proposalSections.forEach((section) => {
      nextOpenGroups[section.key] = shouldExpand;
    });
    setOpenGroups(nextOpenGroups);
  };

  const loadDropdowns = async (selectedInstitution?: string[]) => {
    setDropdownLoading(true);
    try {
      const resolvedInstitution = selectedInstitution && selectedInstitution.length > 0
        ? selectedInstitution
        : (filters.investor_company && filters.investor_company.length > 0 ? filters.investor_company : [DEFAULT_INVESTOR]);
      const params: any = { investor_company: resolvedInstitution };
      if (filters.year && filters.year.length > 0) params.year = filters.year;
      if (meetingDate) params.meeting_date = meetingDate;
      const response = await dashboardService.getDynamicNPXDropdownValues(params);
      if (response?.result) {
        setDropdowns(response.result);

        const availableYears = sortYearsDesc(response.result.year || []);
        const fallbackYear = availableYears[0] || searchParams.get("year") || new Date().getFullYear().toString();
        if ((!filters.year || filters.year.length === 0) && fallbackYear) {
          setFilters((prev) => ({
            ...prev,
            year: [fallbackYear],
          }));
        }

        const fundData = Array.isArray(response.result?.fund_name) ? response.result.fund_name : [];
        const isConnectedInstitution = response.result?.is_institution !== false;
        setApiFundNameDropdown({
          ...response.result,
          fund_name: fundData,
        });
        setShowFundName(isConnectedInstitution && fundData.length > 0);
        if (!isConnectedInstitution || fundData.length === 0) {
          setFilters((prev) => ({
            ...prev,
            fund_name: [],
          }));
        }
      }
    } catch (err) {
      console.error("[NpxInstitutionView] loadDropdowns error:", err);
    } finally {
      setDropdownLoading(false);
    }
  };

  const loadStats = (page = 1) => {
    const investor = filters.investor_company?.[0] || DEFAULT_INVESTOR;
    const resolvedYear = filters.year && filters.year.length > 0
      ? filters.year
      : [sortYearsDesc(dropdowns.year || [])[0] || searchParams.get("year") || new Date().getFullYear().toString()];
    const payload: any = {
      view: "by_institution",
      page,
      page_size: pageSize,
      investor_company: [investor],
      ...filters,
      year: resolvedYear,
    };
    if (meetingDate) payload.meeting_date = meetingDate;
    dispatch(fetchNpxProposalVotingStats({ view: "by_institution", filters: payload }));
  };

  useEffect(() => {
    loadDropdowns(filters.investor_company);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.year, filters.investor_company, meetingDate]);

  useEffect(() => {
    if (!filters.year || filters.year.length === 0) return;
    loadStats(1);
    setActivePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.year, meetingDate]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRemoveChip = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: (prev[key] as string[] | undefined)?.filter((v) => v !== value) || [],
    }));
  };

  const handleInstitutionChange = async (selected: any) => {
    const institutionValue = selected?.label ? String(selected.label) : "";
    setFilters((prev) => ({
      ...prev,
      investor_company: institutionValue ? [institutionValue] : [],
      fund_name: [],
    }));
    setShowFundName(false);
    setApiFundNameDropdown({ fund_name: [] });
    if (institutionValue) {
      await loadDropdowns([institutionValue]);
    } else {
      await loadDropdowns();
    }
  };

  const handleApply = () => {
    setActivePage(1);
    loadStats(1);
  };

  const handleClear = () => {
    const fallbackYear = sortYearsDesc(dropdowns.year || [])[0] || new Date().getFullYear().toString();
    setFilters({ investor_company: [DEFAULT_INVESTOR], year: [fallbackYear], fund_name: [] });
    setShowFundName(false);
    setApiFundNameDropdown({ fund_name: [] });
    setActivePage(1);
    dispatch(
      fetchNpxProposalVotingStats({
        view: "by_institution",
        filters: {
          year: fallbackYear,
          meeting_date: meetingDate,
          page: 1,
          page_size: pageSize,
          investor_company: [DEFAULT_INVESTOR],
        },
      })
    );
  };

  const handleDownload = () => {
    const params: any = { view: "by_institution", download: true, investor_company: [DEFAULT_INVESTOR], ...filters };
    params.year = filters.year && filters.year.length > 0
      ? filters.year
      : [sortYearsDesc(dropdowns.year || [])[0] || new Date().getFullYear().toString()];
    if (meetingDate) params.meeting_date = meetingDate;
    downloadFileFromAPI({
      url: createDynamicURL(`${baseURL}/api/npx-proposal-voting-stats/`, params),
      fileName: `npx_institution_${companyGlobalSearchTicker || "export"}.xlsx`,
      serviceMethod: dashboardService.getNpxProposalVotingStats,
      setLoading: setDownloadLoading,
    });
  };

  const totalPages = useMemo(() => viewData.pagination?.total_pages || 1, [viewData]);
  const yearOptions = useMemo(() => toOptions(sortYearsDesc(dropdowns.year || [])), [dropdowns.year]);
  const defaultYear = useMemo(
    () => yearOptions[0]?.value || filters.year?.[0] || searchParams.get("year") || new Date().getFullYear().toString(),
    [filters.year, searchParams, yearOptions]
  );

  const fundOptions = useMemo(
    () => toOptions(uniqueStrings(apiFundNameDropdown.fund_name || dropdowns.fund_name || [])),
    [apiFundNameDropdown.fund_name, dropdowns.fund_name]
  );
  const voteOptions = useMemo(() => toOptions(uniqueStrings(dropdowns.vote || [])), [dropdowns.vote]);
  const voteCategoryOptions = useMemo(
    () => toOptions(uniqueStrings(dropdowns.vote_category || [])),
    [dropdowns.vote_category]
  );
  const keywordOptions = useMemo(
    () => toOptions(uniqueStrings(dropdowns.synonyms || dropdowns.keyword || [])),
    [dropdowns.synonyms, dropdowns.keyword]
  );

  const selectedInstitutionValue = useMemo(
    () => {
      const selected = filters.investor_company?.[0];
      return selected ? { value: selected, label: selected } : null;
    },
    [filters.investor_company]
  );

  const filterChips = useMemo(() => {
    const chips: Array<{ label: string; value: string; key: keyof FilterState | null }> = [
      ...(filters.investor_company || []).map((value) => ({ label: "Institution", value, key: "investor_company" as keyof FilterState })),
      ...(filters.fund_name || []).map((value) => ({ label: "Fund", value, key: "fund_name" as keyof FilterState })),
      ...(filters.year || []).map((value) => ({ label: "Year", value, key: "year" as keyof FilterState })),
      ...(filters.vote || []).map((value) => ({ label: "Vote", value, key: "vote" as keyof FilterState })),
      ...(filters.vote_category || []).map((value) => ({ label: "Vote Category", value, key: "vote_category" as keyof FilterState })),
      ...(filters.keyword || []).map((value) => ({ label: "Keyword", value, key: "keyword" as keyof FilterState })),
      ...(meetingDate ? [{ label: "Meeting Date", value: meetingDate, key: null }] : []),
    ];
    return chips;
  }, [filters, meetingDate]);

  const filtersLength = filterChips.length;

  const renderFilterChips = () => {
    if (!filterChips.length) return null;
    return (
      <div className="mb-4 flex flex-wrap gap-2">
        {filterChips.map((chip, index) => (
          <span
            key={`${chip.label}-${chip.value}-${index}`}
            className="flex items-center bg-primary/10 text-primary font-medium px-3 py-1 rounded-full shadow-sm transition-all hover:bg-primary/20"
          >
            {chip.label}: {chip.value}
            {chip.key ? (
              <button
                type="button"
                className="ml-2 text-primary hover:text-red-600 transition-colors"
                onClick={() => handleRemoveChip(chip.key as keyof FilterState, chip.value)}
              >
                <FaTimes className="text-xs" />
              </button>
            ) : null}
          </span>
        ))}
      </div>
    );
  };

  const renderSummaryCard = () => {
    if (!selectedInstitution) return null;

    const summaryRows = [
      {
        label: "No. of unique companies",
        value: formatValue(selectedYearStats?.unique_companies),
      },
      {
        label: "No of proposals",
        value: formatValue(selectedYearStats?.total_proposals),
      },
      {
        label: "No. of FOR votes",
        value: `${formatValue(selectedYearStats?.for_votes)} (${formatValue(selectedYearStats?.for_percentage)}%)`,
      },
      {
        label: "No. of SPLIT votes",
        value: `${formatValue(selectedYearStats?.split_votes)} (${formatValue(selectedYearStats?.split_percentage)}%)`,
      },
      {
        label: "No. of AGAINST/WITHHOLD votes",
        value: `${formatValue(selectedYearStats?.against_votes)} (${formatValue(selectedYearStats?.against_percentage)}%)`,
      },
      {
        label: "No. of Abstain votes",
        value: `${formatValue(selectedYearStats?.abstain_votes)} (${formatValue(selectedYearStats?.abstain_percentage)}%)`,
      },
      {
        label: "Alignment with management (Votes Cast/Management Recommendation)",
        value: formatValue(selectedYearStats?.aligned_with_mgmt),
      },
      {
        label: "Alignment percentage",
        value: `${formatValue(selectedYearStats?.alignment_percentage)}%`,
      },
    ];

    const dateRange = selectedYearStats?.date_range
      ? `(${selectedYearStats.date_range.start_meeting || "-"} - ${selectedYearStats.date_range.end_meeting || "-"})`
      : "";

    return (
      <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 mb-8">
        <table className="w-full mx-auto rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-primary text-white text-base">
              <th className="px-6 py-3 text-left font-semibold rounded-tl-2xl" rowSpan={2}>
                Summary
              </th>
              <th className="px-6 py-3 pb-2 text-center font-semibold rounded-tr-2xl">
                {selectedInstitution.institution_name || "-"}
              </th>
            </tr>
            <tr className="bg-primary text-white text-base">
              <th className="px-6 py-3 pt-0 text-center font-semibold">
                {dateRange && <div className="text-xs font-semibold mt-1">{dateRange}</div>}
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-base divide-y divide-gray-100">
            {summaryRows.map((row) => (
              <tr key={row.label}>
                <td className="px-6 py-3 font-medium">{row.label}</td>
                <td className="px-6 py-3 text-center">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderProposalSections = () => {
    if (!proposalSections.length) return null;

    return (
      <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
        <div className="flex justify-end gap-3 mb-4 px-4 pt-4">
          <Tippy content="Download Excel">
            <div
              className={`box p-[5px] ${downloadLoading ? "cursor-wait opacity-50 pointer-events-none" : "cursor-pointer"}`}
              onClick={downloadLoading ? undefined : handleDownload}
            >
              <img alt="download-icon" src={downloadIcon} className="w-6 h-6" />
            </div>
          </Tippy>
          <button
            onClick={expandAllGroups}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium text-sm"
          >
            <span>{areAllGroupsExpanded() ? "Collapse All" : "Expand All"}</span>
            <Lucide icon={areAllGroupsExpanded() ? "ChevronUp" : "ChevronDown"} className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {proposalSections.map(({ company, key }) => {
            const proposals = Array.isArray(company?.sample_proposals) ? company.sample_proposals : [];
            const headerText = `${company?.meeting_date || "-"} - ${company?.company_name || "-"}${company?.meeting_type ? ` (${company.meeting_type})` : ""}`;
            const isOpen = !!openGroups[key];

            return (
              <div key={key} className="py-2">
                <div
                  className="flex flex-row justify-between items-center cursor-pointer px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 font-medium text-base"
                  onClick={() => toggleGroup(key)}
                >
                  <span className="text-gray-800">{headerText}</span>
                  <button className="text-primary hover:text-primary/80 transition-colors duration-200">
                    <Lucide icon={isOpen ? "ChevronUp" : "ChevronDown"} className="w-5 h-5" />
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-2 mb-4 bg-gray-50 overflow-x-auto">
                    <table className="min-w-[1200px] w-full table-auto">
                      <thead>
                        <tr className="bg-primary text-white text-sm">
                          <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">No.</th>
                          <th className="px-4 py-2 text-left font-semibold">Proposal</th>
                          <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Mgmt Rec</th>
                          <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Vote Cast</th>
                          <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Institution Name</th>
                          <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Fund Name</th>
                          <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Vote Category</th>
                          <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Shares Voted</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                        {proposals.map((proposal: any, proposalIndex: number) => (
                          <tr key={`${company?.company_id}-${proposalIndex}`} className="hover:bg-primary/10">
                            <td className="px-2 py-2 align-middle text-center whitespace-nowrap">
                              {proposalIndex + 1}
                            </td>
                            <td className="px-4 py-2 align-middle">{formatValue(proposal.proposal)}</td>
                            <td className="px-2 py-2 align-middle whitespace-nowrap">{formatValue(proposal.mgt_rec)}</td>
                            <td className="px-2 py-2 align-middle whitespace-nowrap">
                              <span
                                className={clsx(
                                  (String(proposal.vote).includes("Against") || String(proposal.vote).includes("Withhold")) &&
                                    "text-red-700 font-semibold"
                                )}
                              >
                                {formatValue(proposal.vote)}
                              </span>
                            </td>
                            <td className="px-2 py-2 align-middle whitespace-nowrap">{formatValue(proposal.institution_name)}</td>
                            <td className="px-2 py-2 align-middle whitespace-nowrap">{formatValue(proposal.fund_name)}</td>
                            <td className="px-2 py-2 align-middle whitespace-nowrap">{formatValue(proposal.vote_category)}</td>
                            <td className="px-2 py-2 align-middle whitespace-nowrap">{formatValue(proposal.shares_voted)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
        <CPagination
          page={activePage}
          totalPages={totalPages}
          handlePageChange={(page) => {
            setActivePage(page);
            loadStats(page);
          }}
          handlePreviousPage={() => {
            if (activePage > 1) {
              const newPage = activePage - 1;
              setActivePage(newPage);
              loadStats(newPage);
            }
          }}
          handleNextPage={() => {
            if (activePage < totalPages) {
              const newPage = activePage + 1;
              setActivePage(newPage);
              loadStats(newPage);
            }
          }}
        />
      </div>
    );
  };

  return (
    <>
      {/* Page header card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <span className="text-slate-500">Institution Insights</span>
          <span className="text-slate-400">›</span>
          <span>N-PX Voting Data</span>
          <span className="px-2 py-1 text-xs font-bold bg-red-800 text-white rounded-full">BETA</span>
        </h1>
      </div>

      <div className="p-5 mt-1 box">
        <div className="flex flex-col p-5 sm:flex-row gap-y-2">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row" />
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <Tippy content="Download Excel">
                  <div
                    className={`box p-[5px] ${downloadLoading ? "cursor-wait opacity-50 pointer-events-none" : "cursor-pointer"}`}
                    onClick={downloadLoading ? undefined : handleDownload}
                  >
                    <img alt="download-icon" src={downloadIcon} className="w-6 h-6" />
                  </div>
                </Tippy>
                <Button
                  variant="outline-secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setIsFilterCollapse((prev) => !prev)}
                >
                  <Lucide icon="ArrowDownWideNarrow" className="stroke-[1.3] w-4 h-4 mr-2" />
                  Filter
                  <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
                    {filtersLength}
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {renderFilterChips()}

        {isFilterCollapse && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={handleClear}
                  className="w-full sm:w-auto flex items-center gap-2"
                  type="button"
                >
                  <MdOutlineClear /> Clear All
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApply}
                  className="w-full sm:w-auto flex items-center gap-2"
                  type="button"
                >
                  <FaSearch className="text-lg" /> Apply
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4 grid-cols-1">
              <div>
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaUniversity className="text-gray-400" /> Institution
                </label>
                <CompanySelect
                  isInstitution={true}
                  value={selectedInstitutionValue}
                  year={filters.year?.[0] || defaultYear}
                  isClearable={true}
                  onChange={(option: any) => handleInstitutionChange(option)}
                  placeholder="Select Investor Company(s)"
                  showDefaultOptions={true}
                />
              </div>
              {showFundName ? (
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaLayerGroup className="text-gray-400" /> Fund
                  </label>
                  <MultiSelectDropdown
                    data={fundOptions}
                    loading={dropdownLoading || getFundNameDropdownLoader}
                    selectedOption={filters.fund_name || []}
                    onChange={(opts) => handleFilterChange("fund_name", opts.map((o) => o.value))}
                    placeholder="Select Fund(s)"
                  />
                </div>
              ) : null}
              <div>
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaCalendarAlt className="text-gray-400" /> Year
                </label>
                <MultiSelectDropdown
                  data={yearOptions}
                  loading={dropdownLoading}
                  selectedOption={(filters.year && filters.year.length > 0 ? filters.year : [defaultYear]).filter(Boolean)}
                  onChange={(opts) => handleFilterChange("year", opts.map((o) => o.value))}
                  placeholder="Select Year"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaCheckCircle className="text-gray-400" /> Vote
                </label>
                <MultiSelectDropdown
                  data={voteOptions}
                  loading={dropdownLoading}
                  selectedOption={filters.vote || []}
                  onChange={(opts) => handleFilterChange("vote", opts.map((o) => o.value))}
                  placeholder="Select Vote(s)"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaListUl className="text-gray-400" /> Vote Category
                </label>
                <MultiSelectDropdown
                  data={voteCategoryOptions}
                  loading={dropdownLoading}
                  selectedOption={filters.vote_category || []}
                  onChange={(opts) => handleFilterChange("vote_category", opts.map((o) => o.value))}
                  placeholder="Select Category(s)"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                  <FaTags className="text-gray-400" /> Keywords (Beta)
                </label>
                <CreatableInputSelect
                  placeholder="Type and press Enter to add keywords"
                  value={filters.keyword || []}
                  onChange={(vals) => handleFilterChange("keyword", vals)}
                  options={keywordOptions.map((o) => o.value)}
                  loading={dropdownLoading}
                />
              </div>
            </div>
          </div>
        )}

        <TableWrapper isLoading={npxProposalVotingStatsLoading} rows={6} columns={5}>
          <>
            {renderSummaryCard()}
            {renderProposalSections()}
            {tableRows.length === 0 && !npxProposalVotingStatsLoading ? (
              <div className="h-52 flex items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <div className="text-center text-slate-500">
                  <Lucide icon="FileX" className="w-10 h-10 mx-auto mb-2" />
                  <p>No data found</p>
                </div>
              </div>
            ) : (
              <>{renderPagination()}</>
            )}
          </>
        </TableWrapper>
      </div>
    </>
  );
};

export default NpxInstitutionView;
