import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import {
  convertToTitleCase,
  createDynamicURL,
  downloadCSV,
} from "@/utils/helper";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  clearVotingRationale,
  fetchVdsProxyAllInvestor,
  fetchVdsProxyDashboard,
  getProxyVotingRationale,
  getProxyVotingRationaleTop20,
  getProxyVotingRationaleAllInvestors,
  setTabs,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft } from "lucide-react";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";

import { Tooltip } from "react-tooltip";
import { Tab, Dialog } from "@/components/Base/Headless";
import { FaCheckCircle } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

import { dashboardService } from "@/services/dashboard";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import { setIsCompanySelected } from "@/stores/authenticationSlice";
import VotingRationale from "./VotingRationale";
import AggregateVotingView from "./AggregateVotingView";

// Cache utility types and constants
interface CacheData {
  data: any;
  timestamp: number;
  expiryMinutes: number;
}

interface CacheKey {
  type: 'top20' | 'allInvestors';
  company: string;
  year: string;
  filters?: string;
}

// Cache utility functions
const generateCacheKey = (keyObj: CacheKey): string => {
  const { type, company, year, filters } = keyObj;
  return `vds_proxy_${type}_${company}_${year}${filters ? `_${filters}` : ''}`;
};

const getCachedData = (cacheKey: string, expiryMinutes: number = 30): any | null => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const cacheData: CacheData = JSON.parse(cached);
    const now = Date.now();
    const expiryTime = cacheData.timestamp + (cacheData.expiryMinutes * 60 * 1000);

    if (now > expiryTime) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.warn('Failed to read cache:', error);
    return null;
  }
};

const setCachedData = (cacheKey: string, data: any, expiryMinutes: number = 30): void => {
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
      expiryMinutes
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to set cache:', error);
  }
};

const clearCacheForCompany = (company: string): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`vds_proxy_`) && key.includes(`_${company}_`)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear company cache:', error);
  }
};

interface VdsProxyVotingTableProps {
  view?: "voting-data" | "voting-rationale";
}

const VdsProxyVotingTable = ({ view }: VdsProxyVotingTableProps) => {
  const navigate = useNavigate();
  const dispatch: AppDispatch = useAppDispatch();
  const {
    vdsProxyDetails,
    vdsProxyLoading,
    vdsProxyAllInvestorDetails,
    vdsProxyAllInvestorLoading,
    votingRationaleTop20,
    getProxyVotingRationaleLoading,

    tab,
  } = useAppSelector((state) => state.dashboard);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Ref to track last API call parameters to prevent duplicates
  const lastApiCallRef = useRef<{
    company: string;
    year: string;
    tab: string;
    filter: string;
  } | null>(null);

  const {
    companyGlobalSearchName,
    companyGlobalSearchId,
    companyGlobalSearchTicker,
    isCompanySelected,
  } = useAppSelector((state: RootState) => state.authentiction);

  const searchTicker = searchParams.get("ticker");
  const yearTicker = searchParams.get("year")!;

  const [filter, setFilter] = useState<any>([]);
  const meetingDate = searchParams.get("meeting_date") || "";
  const [activeVdsView, setActiveVdsView] = useState<"voting-data" | "voting-rationale">(view || "voting-data");
  const [top20Loaded, setTop20Loaded] = useState(false);
  const [isProxyContestYear, setIsProxyContestYear] = useState(false);

  // Keep the view locked to the prop when a specific sub-tab is selected via the sidebar.
  useEffect(() => {
    if (view) {
      setActiveVdsView(view);
    }
  }, [view]);

  // Detect whether the selected meeting year is a proxy contest year. When it is,
  // the page switches to the aggregate (institution-based) view instead of the
  // Top 20 / All Investors tabs.
  useEffect(() => {
    let cancelled = false;

    const checkProxyContestYear = async () => {
      if (!companyGlobalSearchId || !yearTicker) {
        if (!cancelled) setIsProxyContestYear(false);
        return;
      }

      try {
        const { result } = await dashboardService.getVdsNpxMeetingDates(companyGlobalSearchId);
        const entries = Array.isArray(result?.VDS_data)
          ? result.VDS_data
          : Array.isArray(result?.VDS_Data)
            ? result.VDS_Data
            : Array.isArray(result?.vds_data)
              ? result.vds_data
              : [];

        const match = entries.find((item: any) => String(item?.year) === String(yearTicker));
        if (!cancelled) setIsProxyContestYear(!!match?.proxy_contest);
      } catch (error) {
        console.warn("Failed to determine proxy contest status:", error);
        if (!cancelled) setIsProxyContestYear(false);
      }
    };

    checkProxyContestYear();

    return () => {
      cancelled = true;
    };
  }, [companyGlobalSearchId, yearTicker]);

  const emptyStateAnimationStyle: React.CSSProperties = {
    animationDelay: "120ms",
    animationFillMode: "both",
  };

  const { handleSubmit, control, reset } = useForm<any>({
    defaultValues: {
      institution: [],
    },
  });

  // Clean data loading function for Top-20 tab
  const loadTop20Data = useCallback(() => {
    if (!companyGlobalSearchId || !meetingDate) return;

    // Check if we've already made this exact API call
    const currentCall = {
      company: companyGlobalSearchTicker,
      year: yearTicker,
      tab: 'Top-20',
      filter: meetingDate || ''
    };

    if (lastApiCallRef.current && 
        lastApiCallRef.current.company === currentCall.company &&
        lastApiCallRef.current.year === currentCall.year &&
        lastApiCallRef.current.tab === currentCall.tab &&
        lastApiCallRef.current.filter === currentCall.filter) {
      console.log('⏭️ Skipping duplicate Top-20 API call for:', companyGlobalSearchTicker, yearTicker);
      return;
    }

    console.log('🚀 Loading Top-20 data for:', companyGlobalSearchId, meetingDate);
    
    // Update the ref to track this API call
    lastApiCallRef.current = currentCall;
    
    // Load data from API
    const fetchPromise = dispatch(
      fetchVdsProxyDashboard(
        createDynamicURL(
          `${baseURL}/vds_proxy_voting/`,
          {
            company_id: companyGlobalSearchId,
            meeting_date: meetingDate,
          }
        )
      )
    );

    const rationalePromise = dispatch(
      getProxyVotingRationaleTop20(
        createDynamicURL(`/vds_proxy_voting_rationale/`, {
          company_id: companyGlobalSearchId,
          meeting_date: meetingDate,
        })
      )
    );

    // Cache the results when both API calls complete
    const cacheKey = generateCacheKey({
      type: 'top20',
      company: companyGlobalSearchTicker,
      year: yearTicker
    });

    Promise.all([fetchPromise, rationalePromise]).then(([fetchResult, rationaleResult]) => {
      setTop20Loaded(true);
      if (fetchResult.payload || rationaleResult.payload) {
        setCachedData(cacheKey, {
          vdsData: fetchResult.payload,
          rationaleData: rationaleResult.payload
        });
      }
    }).catch(error => {
      setTop20Loaded(true);
      console.warn('Failed to cache Top-20 data:', error);
    });
  }, [companyGlobalSearchId, meetingDate, companyGlobalSearchTicker, yearTicker, dispatch]);

  // Clean data loading function for All-Investor tab
  const loadAllInvestorData = useCallback(() => {
    if (!companyGlobalSearchId || !meetingDate) return;

    const filterString = (filter?.length > 0 ? JSON.stringify(filter.sort()) : '') + `|${meetingDate}`;
    const institutionName = filter?.length > 0 ? filter : "Top 10";
    
    // Check if we've already made this exact API call
    const currentCall = {
      company: companyGlobalSearchTicker,
      year: yearTicker,
      tab: 'All-Investor',
      filter: filterString
    };

    if (lastApiCallRef.current && 
        lastApiCallRef.current.company === currentCall.company &&
        lastApiCallRef.current.year === currentCall.year &&
        lastApiCallRef.current.tab === currentCall.tab &&
        lastApiCallRef.current.filter === currentCall.filter) {
      console.log('⏭️ Skipping duplicate All-Investor API call for:', companyGlobalSearchTicker, yearTicker, 'with filters:', filter);
      return;
    }
    
    console.log('🚀 Loading All-Investor data for:', companyGlobalSearchId, meetingDate, 'with filters:', filter);

    // Update the ref to track this API call
    lastApiCallRef.current = currentCall;

    // Load data from API
    const fetchPromise = dispatch(
      fetchVdsProxyAllInvestor(
        createDynamicURL(`${baseURL}/vds_proxy_voting/`, {
          company_id: companyGlobalSearchId,
          meeting_date: meetingDate,
          institution_name: institutionName,
        })
      )
    );

    const rationalePromise = dispatch(
      getProxyVotingRationaleAllInvestors(
        createDynamicURL(`/vds_proxy_voting_rationale/`, {
          company_id: companyGlobalSearchId,
          meeting_date: meetingDate,
          institution_name: institutionName,
        })
      )
    );

    // Cache the results when both API calls complete
    const cacheKey = generateCacheKey({
      type: 'allInvestors',
      company: companyGlobalSearchTicker,
      year: yearTicker,
      filters: filterString
    });

    Promise.all([fetchPromise, rationalePromise]).then(([fetchResult, rationaleResult]) => {
      if (fetchResult.payload || rationaleResult.payload) {
        setCachedData(cacheKey, {
          vdsData: fetchResult.payload,
          rationaleData: rationaleResult.payload
        });
      }
    }).catch(error => {
      console.warn('Failed to cache All-Investor data:', error);
    });
  }, [companyGlobalSearchId, meetingDate, filter, dispatch, companyGlobalSearchTicker, yearTicker]);

  // Single effect to handle data loading - prevents duplicate API calls
  useEffect(() => {
    if (!companyGlobalSearchId || !meetingDate) return;

    console.log('📊 Loading data for:', companyGlobalSearchId, meetingDate, 'tab:', tab);

    // Always load top-20 data so we can decide whether to show the tab
    loadTop20Data();

    // Load active tab data if it's the All-Investor tab
    if (tab === "All-Investor") {
      loadAllInvestorData();
    }
  }, [companyGlobalSearchId, meetingDate, tab, loadTop20Data, loadAllInvestorData]);

  // Separate effect to clear cache only when company changes (not year or tab)
  useEffect(() => {
    if (companyGlobalSearchTicker) {
      console.log('🧹 Company changed, clearing cache and API call tracking for:', companyGlobalSearchTicker);
      clearCacheForCompany(companyGlobalSearchTicker);
      // Reset API call tracking when company changes
      lastApiCallRef.current = null;
      setTop20Loaded(false);
    }
  }, [companyGlobalSearchTicker]);

  const isObject = (item: any) => {
    if (typeof item === "object") {
      return true;
    } else {
      false;
    }
  };

  const convertDivTableToCSV = (tabName: string) => {
    const table = document.querySelector(".table_2");
    const rows = table?.querySelectorAll(".row_2");
    const tableProposal = document.querySelector(".table_3");

    const rowsProposal = tableProposal?.querySelectorAll(".row_3");
    let csvContent = "\uFEFF";

    rows?.forEach((row) => {
      const cells = row.querySelectorAll(".cell_2");
      let rowData: any = [];

      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim();
        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }

        const tooltip = cell.querySelector("[data-tooltip-html]");
        const tooltipText = tooltip?.getAttribute("data-tooltip-html")?.trim();

        if (tooltipText) {
          cellText += ` (voting rationale: ${tooltipText})`;
        }

        if (cellText) {
          cellText = `"${cellText.replace(/"/g, '""')}"`;
        }

        rowData.push(cellText);
      });

      csvContent += rowData.join(",") + "\n";
    });

    rowsProposal?.forEach((row) => {
      const cells = row.querySelectorAll(".cell_3");
      let rowData: any = [];

      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim();

        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }

        const tooltip = cell.querySelector("[data-tooltip-html]");
        const tooltipText = tooltip?.getAttribute("data-tooltip-html")?.trim();

        if (tooltipText) {
          cellText += ` (voting rationale: ${tooltipText})`;
        }

        if (cellText) {
          cellText = `"${cellText.replace(/"/g, '""')}"`;
        }

        rowData.push(cellText);
      });

      csvContent += rowData.join(",") + "\n";
    });

    downloadCSV(csvContent, `${tabName}-${companyGlobalSearchTicker}`);
  };

  const getSplitContents = (items: any) => {
    // Guard: API can return null/undefined for split_vote_counts which crashes Object.entries
    if (!items || typeof items !== "object") {
      return "";
    }
    const resultString = Object.entries(items)
      .map(([key, value]) => `${convertToTitleCase(key)}: ${value}`)
      .join(", ");
    return resultString;
  };

  const [apiDropdownOptions, setApiDropdownOptions] = useState<any>([]);

  const getAllInstitutionDropdown = async () => {
    if (!companyGlobalSearchId || !meetingDate) return;
    try {
      const res = await dashboardService.getInstitution({
        company_id: companyGlobalSearchId,
        meeting_date: meetingDate,
      });
      if (res.result?.institutes) {
        setApiDropdownOptions(res.result?.institutes);
      }
      if (!meetingDate && res.result?.meeting_date) {
        setSearchParams((previousParams) => {
          const params = new URLSearchParams(previousParams);
          params.set("meeting_date", String(res.result.meeting_date));
          return params;
        });
      }
    } catch (error) {
      return error;
    } finally {
      // setGetDropdownLoader(false);
    }
  };

  useEffect(() => {
    getAllInstitutionDropdown();
  }, [companyGlobalSearchId, meetingDate]);

  const onSubmit = async (investorProfileFilter: any) => {
    if (investorProfileFilter?.institution) {
      setFilter(investorProfileFilter?.institution);
    }
  };

  const onFilterClear = () => {
    setFilter([]);
    // Clear cache for All-Investor data to force reload with empty filter
    if (companyGlobalSearchTicker && yearTicker) {
      const allInvestorCacheKey = generateCacheKey({
        type: 'allInvestors',
        company: companyGlobalSearchTicker,
        year: yearTicker,
        filters: JSON.stringify(filter.sort())
      });
      localStorage.removeItem(allInvestorCacheKey);
    }
    dispatch(clearVotingRationale());
    reset();
  };

  const hasTop20Data = activeVdsView === "voting-data"
    ? (vdsProxyDetails !== "" && vdsProxyDetails?.vds_report?.length > 0)
    : (votingRationaleTop20?.length > 0);

  const isTop20Empty = top20Loaded && !hasTop20Data;
  const showTop20Tab = !isTop20Empty;

  const getSelectedTabIndex = () => {
    if (!showTop20Tab) return 0;
    return tab === "Top-20" ? 0 : tab === "All-Investor" ? 1 : 0;
  };

  // If top-20 truly has no data after loading completes, switch to All-Investor.
  // Don't do this while the Top-20 request is in flight because the pending reducer
  // temporarily clears vdsProxyDetails, which would otherwise force an unwanted switch.
  useEffect(() => {
    if (top20Loaded && !vdsProxyLoading && !hasTop20Data && tab === "Top-20") {
      dispatch(setTabs("All-Investor"));
    }
  }, [top20Loaded, vdsProxyLoading, hasTop20Data, tab, dispatch]);

  // Proxy contest years use an aggregate, institution-based view instead of the
  // usual Top 20 / All Investors tabs.
  if (isProxyContestYear) {
    return (
      <div className="p-5 mt-1 box">
        <div className="w-full">
          <AggregateVotingView
            key={`${companyGlobalSearchTicker}-${yearTicker}`}
            companyName={companyGlobalSearchName}
            year={yearTicker}
            institutionOptions={apiDropdownOptions}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-5 mt-1 box">
        <div className="w-full">
          <>
            {!view && (
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="VDS views">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeVdsView === "voting-data"}
                    onClick={() => setActiveVdsView("voting-data")}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                      activeVdsView === "voting-data"
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Lucide icon="BarChart3" className="w-4 h-4" />
                    Voting Data
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeVdsView === "voting-rationale"}
                    onClick={() => setActiveVdsView("voting-rationale")}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                      activeVdsView === "voting-rationale"
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Lucide icon="FileText" className="w-4 h-4" />
                    Voting Rationale
                  </button>
                </div>
              </div>
            )}

            <Tab.Group
              selectedIndex={getSelectedTabIndex()}
              onChange={(index) => {
                dispatch(setTabs(showTop20Tab ? (index === 0 ? "Top-20" : "All-Investor") : "All-Investor"));
              }}
            >
              <Tab.List variant="link-tabs" className="mt-4">
                {showTop20Tab && (
                  <Tab>
                    <Tab.Button className="w-full py-2" as="button">
                      <div className="flex items-center justify-center ">
                        Top 20
                      </div>
                    </Tab.Button>
                  </Tab>
                )}

                <Tab>
                  <Tab.Button className="w-full py-2" as="button">
                    <div className="flex items-center justify-center ">
                      All Investors
                    </div>
                  </Tab.Button>
                </Tab>
              </Tab.List>

              <Tab.Panels className="mt-5">
                {showTop20Tab && (
                <Tab.Panel className="leading-relaxed">
                  <div className="flex justify-end items-center gap-4 mb-3 xs:mt-4 md:mt-0">
                    {activeVdsView === "voting-data" && vdsProxyDetails?.vds_report_headers?.length > 0 && (
                        <div className="flex justify-end items-center gap-4 mb-5 xs:mt-4 md:mt-0">
                          {
                            yearTicker !== "2025" &&
                          <h1 className="text-md font-bold">
                            Aggregate Ownership:{" "}
                            {vdsProxyDetails?.total_percent_ownership}
                          </h1>
                          }
                          <Tippy
                            content="Download Excel"
                            options={{ theme: "light" }}
                          >
                            <div
                              className="box p-[5px] cursor-pointer"
                              onClick={() =>
                                convertDivTableToCSV("Top-20-Proxy-voting")
                              }
                            >
                              <img alt="download-icon" src={downloadIcon} />
                            </div>
                          </Tippy>
                        </div>
                      )}
                  </div>

                  <div className={activeVdsView === "voting-data" ? "block" : "hidden"}>
                  <TableWrapper
                    isLoading={vdsProxyLoading}
                    rows={8}
                    columns={vdsProxyDetails?.vds_report_headers?.length || 8}
                  >
                    <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                      <Table className="table_2 w-full">
                        <Table.Thead className="sticky top-50 z-10">
                          <Table.Tr className="row_2">
                            {vdsProxyDetails?.vds_report_headers?.length > 0 &&
                              vdsProxyDetails?.vds_report_headers?.map(
                                (vdsHeader: any, headerIndex: number) => (
                                  <Table.Td
                                    key={headerIndex}
                                    className={clsx([
                                      "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] text-left",
                                      "sticky top-0",
                                      headerIndex === 0 &&
                                        "sticky left-0 bg-header z-[5000] ",
                                      headerIndex === 1 &&
                                        "sticky left-[50px] min-w-[200px] max-w-[250px] bg-header z-[5000] ",
                                      headerIndex !== 0 &&
                                        headerIndex !== 1 &&
                                        "min-w-[150px] max-w-[170px] ",
                                    ])}
                                  >
                                    {vdsHeader?.header}
                                  </Table.Td>
                                )
                              )}
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {vdsProxyDetails?.vds_report?.length > 0 &&
                            vdsProxyDetails?.vds_report?.map(
                              (vdsProxy: any, vdsProxyIndex: number) => (
                                <Table.Tr
                                  key={vdsProxyIndex}
                                  className="row_2 [&_td]:last:border-b-0"
                                >
                                  {vdsProxyDetails?.vds_report_headers?.length >
                                    0 &&
                                    vdsProxyDetails?.vds_report_headers?.map(
                                      (vdsHeader: any, headerIndex: number) => (
                                        <Table.Td
                                          key={headerIndex}
                                          className={clsx([
                                            "cell_2 py-2 border-dashed dark:bg-darkmode-600text-left",
                                            headerIndex === 0 &&
                                              "sticky left-0 bg-white z-[9]", // Fix first column
                                            headerIndex === 1 &&
                                              "sticky left-[50px] min-w-[200px] max-w-[250px]  bg-white z-[9]", // Fix second column
                                            headerIndex !== 0 &&
                                              headerIndex !== 1 &&
                                              "min-w-[150px] max-w-[170px] ",
                                          ])}
                                        >
                                          {isObject(
                                            vdsProxy[vdsHeader?.field]
                                          ) &&
                                          vdsProxy[vdsHeader?.field]?.notes !==
                                            null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  vdsHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    vdsHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                  "text-red-700 font-semibold ",
                                                "flex items-center ",
                                              ])}
                                            >
                                              {vdsProxy[vdsHeader?.field]
                                                ?.vote === "Split Vote" ? (
                                                <div className="flex items-center">
                                                  <span className="for">
                                                    {vdsProxy[vdsHeader?.field]?.vote}
                                                  </span>
                                                  <div
                                                    data-tooltip-id="my-tooltip-data-html"
                                                    data-tooltip-html={
                                                      isObject(vdsProxy[vdsHeader?.field]) &&
                                                      getSplitContents(
                                                        vdsProxy[vdsHeader?.field]?.split_vote_counts
                                                      )
                                                    }
                                                  >
                                                    <Lucide
                                                      icon="Info"
                                                      className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <span className="for ">
                                                  {
                                                    vdsProxy[vdsHeader?.field]
                                                      ?.vote
                                                  }
                                                </span>
                                              )}

                                              {/* <Tippy content={<span dangerouslySetInnerHTML={{ __html: getContent(vdsProxy[vdsHeader?.field]?.notes) ?? '' }}/>}> */}
                                              <div
                                                data-tooltip-id="my-tooltip-data-html"
                                                data-tooltip-html={
                                                  vdsProxy[vdsHeader?.field]
                                                    ?.notes
                                                }
                                              >
                                                <Lucide
                                                  icon="Info"
                                                  className=" w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                />
                                                {/* <span className="tooltiptext shadow-md" >
                                                  </span> */}
                                                {/* </Tippy> */}
                                              </div>
                                            </h1>
                                          ) : isObject(
                                              vdsProxy[vdsHeader?.field]
                                            ) &&
                                            vdsProxy[vdsHeader?.field]
                                              ?.notes === null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  vdsHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    vdsHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                  "text-red-700 font-semibold ",
                                              ])}
                                            >
                                              {vdsProxy[vdsHeader?.field]
                                                ?.vote !== "Split Vote"
                                                ? vdsProxy[vdsHeader?.field]
                                                    ?.vote
                                                : (
                                                  <div className="flex items-center">
                                                    <span className="for">
                                                      {vdsProxy[vdsHeader?.field]?.vote}
                                                    </span>
                                                    <div
                                                      data-tooltip-id="my-tooltip-data-html"
                                                      data-tooltip-html={
                                                        isObject(vdsProxy[vdsHeader?.field]) &&
                                                        getSplitContents(
                                                          vdsProxy[vdsHeader?.field]?.split_vote_counts
                                                        )
                                                      }
                                                    >
                                                      <Lucide
                                                        icon="Info"
                                                        className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                            </h1>
                                          ) : (
                                            <h1 className="check ">
                                              {vdsProxy[vdsHeader?.field]}
                                            </h1>
                                          )}
                                        </Table.Td>
                                      )
                                    )}
                                </Table.Tr>
                              )
                            )}
                        </Table.Tbody>
                      </Table>
                    </div>

                    {/* Handle both cases: empty array or undefined/null vdsProxyDetails */}
                    {((vdsProxyDetails?.vds_report?.length === 0) || 
                      (!vdsProxyDetails && !vdsProxyLoading)) && (
                        <div
                          className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400 animate-fade-in"
                          style={emptyStateAnimationStyle}
                        >
                          <div className="text-center text-slate-500 dark:text-slate-400">
                            <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
                            <h3 className="text-lg font-medium mb-2">Top 20 Proxy Records Not Found</h3>
                            <p className="text-sm">Proxy voting data may not be available for this company or time period.</p>
                          </div>
                        </div>
                      )}
                  </TableWrapper>

                  </div>

                  {activeVdsView === "voting-rationale" && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-voting-rationale>
                      <VotingRationale
                        meetingDate={meetingDate}
                        tabType="top20"
                        parentLoading={vdsProxyLoading}
                      />
                    </div>
                  )}
                </Tab.Panel>
                )}

                <Tab.Panel className="leading-relaxed">
                  <div className="bg-slate-50 dark:bg-darkmode-700 p-4 rounded-lg mb-6">
                    <form onSubmit={handleSubmit(onSubmit)}>
                      <div className="flex items-end gap-4">
                        <div className="w-4/12">
                          <div className="text-left text-slate-600 dark:text-slate-400 flex justify-between mb-2">
                            <span className="font-medium text-sm">Use the dropdown below to view more Institutions.</span>
                          </div>
                        

                        <Controller
                          name="institution"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect

                              value={field.value || []}
                              onChange={(event) => {
                                field.onChange(event);
                              }}
                              options={{ placeholder: "Institution" }}
                              className="w-full"
                              multiple
                            >
                              {apiDropdownOptions.length > 0 &&
                                  apiDropdownOptions?.map(
                                    (institution: string) => {
                                      return (
                                        <option value={institution}>
                                          {institution}
                                        </option>
                                      );
                                    }
                                  )}
                            </TomSelect>
                          )}
                        />
                      </div>
                      <div className="flex items-center mt-7">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            onFilterClear();
                          }}
                          className="w-32 ml-auto"
                        >
                          Clear
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          className="w-32 ml-2"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </form>
                  </div>
                  <div className="flex justify-end items-center gap-4 mb-4 xs:mt-4 md:mt-0">
                    {activeVdsView === "voting-data" && vdsProxyAllInvestorDetails?.vds_report?.length > 0 && (
                      <div className="flex justify-end items-center gap-4 xs:mt-4 md:mt-0">
                        <Tippy
                          content="Download Excel"
                          options={{ theme: "light" }}
                        >
                          <div
                            className="box p-[5px] cursor-pointer"
                            onClick={() => convertDivTableToCSV("All Investor")}
                          >
                            <img alt="download-icon" src={downloadIcon} />
                          </div>
                        </Tippy>
                      </div>
                    )}
                  </div>

                  <div className={activeVdsView === "voting-data" ? "block" : "hidden"}>
                  <TableWrapper
                    isLoading={vdsProxyAllInvestorLoading}
                    rows={8}
                    columns={vdsProxyAllInvestorDetails?.vds_report_headers?.length || 8}
                  >
                    <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                      <Table className="table_3 w-full">
                        <Table.Thead className="sticky top-50 z-10">
                          <Table.Tr className="row_3">
                            {vdsProxyAllInvestorDetails?.vds_report_headers
                              ?.length > 0 &&
                              vdsProxyAllInvestorDetails?.vds_report_headers?.map(
                                (vdsHeader: any, headerIndex: number) => (
                                  <Table.Td
                                    key={headerIndex}
                                    className={clsx([
                                      "cell_3 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] text-left",
                                      "sticky top-0", // Ensure the header remains sticky at the top
                                      headerIndex === 0 &&
                                        "sticky left-0 bg-header z-[5000] ", // Fix first column
                                      headerIndex === 1 &&
                                        "sticky left-[50px] min-w-[200px] max-w-[250px] bg-header z-[5000] ", // Fix second column (adjust 'left' value according to width)
                                      headerIndex !== 0 &&
                                        headerIndex !== 1 &&
                                        "min-w-[150px] max-w-[170px] ",
                                    ])}
                                  >
                                    {vdsHeader?.header}
                                  </Table.Td>
                                )
                              )}
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {vdsProxyAllInvestorDetails?.vds_report?.length > 0 &&
                            vdsProxyAllInvestorDetails?.vds_report?.map(
                              (vdsProxy: any, vdsProxyIndex: number) => (
                                <Table.Tr
                                  key={vdsProxyIndex}
                                  className="row_3 [&_td]:last:border-b-0"
                                >
                                  {vdsProxyAllInvestorDetails
                                    ?.vds_report_headers?.length > 0 &&
                                    vdsProxyAllInvestorDetails?.vds_report_headers?.map(
                                      (vdsHeader: any, headerIndex: number) => (
                                        <Table.Td
                                          key={headerIndex}
                                          className={clsx([
                                            "cell_3 py-2 border-dashed dark:bg-darkmode-600text-left",
                                            headerIndex === 0 &&
                                              "sticky left-0 bg-white z-[9]", // Fix first column
                                            headerIndex === 1 &&
                                              "sticky left-[50px] min-w-[200px] max-w-[250px]  bg-white z-[9]", // Fix second column
                                            headerIndex !== 0 &&
                                              headerIndex !== 1 &&
                                              "min-w-[150px] max-w-[170px] ",
                                          ])}
                                        >
                                          {isObject(
                                            vdsProxy[vdsHeader?.field]
                                          ) &&
                                          vdsProxy[vdsHeader?.field]?.notes !==
                                            null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  vdsHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    vdsHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                  "text-red-700 font-semibold",
                                                "flex items-center",
                                              ])}
                                            >
                                              {vdsProxy[vdsHeader?.field]
                                                ?.vote === "Split Vote" ? (
                                                <div className="flex items-center">
                                                  <span className="for">
                                                    {vdsProxy[vdsHeader?.field]?.vote}
                                                  </span>
                                                  <div
                                                    data-tooltip-id="my-tooltip-data-html"
                                                    data-tooltip-html={
                                                      isObject(vdsProxy[vdsHeader?.field]) &&
                                                      getSplitContents(
                                                        vdsProxy[vdsHeader?.field]?.split_vote_counts
                                                      )
                                                    }
                                                  >
                                                    <Lucide
                                                      icon="Info"
                                                      className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <span className="for">
                                                  {
                                                    vdsProxy[vdsHeader?.field]
                                                      ?.vote
                                                  }
                                                </span>
                                              )}

                                              {/* <Tippy content={<span dangerouslySetInnerHTML={{ __html: getContent(vdsProxy[vdsHeader?.field]?.notes) ?? '' }}/>}> */}
                                              <div
                                                data-tooltip-id="my-tooltip-data-html"
                                                data-tooltip-html={
                                                  vdsProxy[vdsHeader?.field]
                                                    ?.notes
                                                }
                                              >
                                                <Lucide
                                                  icon="Info"
                                                  className=" w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                />
                                                {/* <span className="tooltiptext shadow-md" >
                                                  </span> */}
                                                {/* </Tippy> */}
                                              </div>
                                            </h1>
                                          ) : isObject(
                                              vdsProxy[vdsHeader?.field]
                                            ) &&
                                            vdsProxy[vdsHeader?.field]
                                              ?.notes === null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  vdsHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    vdsHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                  "text-red-700 font-semibold",
                                              ])}
                                            >
                                              {vdsProxy[vdsHeader?.field]
                                                ?.vote !== "Split Vote"
                                                ? vdsProxy[vdsHeader?.field]
                                                    ?.vote
                                                : (
                                                  <div className="flex items-center">
                                                    <span className="for">
                                                      {vdsProxy[vdsHeader?.field]?.vote}
                                                    </span>
                                                    <div
                                                      data-tooltip-id="my-tooltip-data-html"
                                                      data-tooltip-html={
                                                        isObject(vdsProxy[vdsHeader?.field]) &&
                                                        getSplitContents(
                                                          vdsProxy[vdsHeader?.field]?.split_vote_counts
                                                        )
                                                      }
                                                    >
                                                      <Lucide
                                                        icon="Info"
                                                        className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                            </h1>
                                          ) : (
                                            <h1 className="check">
                                              {vdsProxy[vdsHeader?.field]}
                                            </h1>
                                          )}
                                        </Table.Td>
                                      )
                                    )}
                                </Table.Tr>
                              )
                            )}
                        </Table.Tbody>
                      </Table>
                    </div>
                  </TableWrapper>
                  {/* Handle both cases: empty array or undefined/null vdsProxyAllInvestorDetails */}
                  {((vdsProxyAllInvestorDetails?.vds_report?.length === 0) ||
                    (!vdsProxyAllInvestorDetails && !vdsProxyAllInvestorLoading)) &&
                    filter?.length === 0 && (
                      <div
                        className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400 animate-fade-in"
                        style={emptyStateAnimationStyle}
                      >
                        <div className="text-center text-slate-500 dark:text-slate-400">
                          <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
                          <h3 className="text-lg font-medium mb-2">No Top 10 Proxy Records Available</h3>
                          <p className="text-sm">Data may not be available for this company or time period.</p>
                        </div>
                      </div>
                    )}

                  {/* Handle both cases: empty array or undefined/null vdsProxyAllInvestorDetails */}
                  {((vdsProxyAllInvestorDetails?.vds_report?.length === 0) ||
                    (!vdsProxyAllInvestorDetails && !vdsProxyAllInvestorLoading)) &&
                    filter?.length > 0 && (
                      <div
                        className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400 animate-fade-in"
                        style={emptyStateAnimationStyle}
                      >
                        <div className="text-center text-slate-500 dark:text-slate-400">
                          <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
                          <h3 className="text-lg font-medium mb-2">No Proxy Records Available</h3>
                          <p className="text-sm">Try adjusting your filters or selecting different institutions.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {activeVdsView === "voting-rationale" && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-voting-rationale>
                      <VotingRationale
                        meetingDate={meetingDate}
                        filter={filter}
                        tabType="allInvestors"
                        parentLoading={vdsProxyAllInvestorLoading}
                      />
                    </div>
                  )}

                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </>
        </div>
      </div>

      <Tooltip
        id="my-tooltip-data-html"
        style={{
          zIndex: 10,
          backgroundColor: "white",
          color: "#000000",
          width: "maxContent",
          maxWidth: 700,
          boxShadow: "2px 4px 6px rgba(0, 0, 0, 0.2)",
          cursor: "pointer"
        }}
      />

    </>
  );
};

export default VdsProxyVotingTable;