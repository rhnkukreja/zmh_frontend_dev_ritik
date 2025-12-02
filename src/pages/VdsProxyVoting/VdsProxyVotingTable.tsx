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
import LoadingIcon from "../../components/Base/LoadingIcon";
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

const VdsProxyVotingTable = () => {
  const navigate = useNavigate();
  const dispatch: AppDispatch = useAppDispatch();
  const {
    vdsProxyDetails,
    vdsProxyLoading,
    vdsProxyAllInvestorDetails,
    vdsProxyAllInvestorLoading,

    tab,
  } = useAppSelector((state) => state.dashboard);
  const [searchParams] = useSearchParams();
  
  // Ref to track last API call parameters to prevent duplicates
  const lastApiCallRef = useRef<{
    company: string;
    year: string;
    tab: string;
    filter: string;
  } | null>(null);

  const {
    companyGlobalSearchName,
    companyGlobalSearchTicker,
    isCompanySelected,
  } = useAppSelector((state: RootState) => state.authentiction);

  const searchTicker = searchParams.get("ticker");
  const yearTicker = searchParams.get("year")!;

  const [filter, setFilter] = useState<any>([]);
  const [chartModalVisible, setChartModalVisible] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const { handleSubmit, control, reset } = useForm<any>({
    defaultValues: {
      institution: [],
    },
  });

  // Analytics API call
  const fetchAnalyticsData = useCallback(async () => {
    if (!companyGlobalSearchTicker) return;

    try {
      const response = await dashboardService.getVotingAnalytics(companyGlobalSearchTicker);
      if (response.result?.analytics) {
        setAnalyticsData(response.result.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    }
  }, [companyGlobalSearchTicker]);

  useEffect(() => {
    if (companyGlobalSearchTicker) {
      fetchAnalyticsData();
    }
  }, [companyGlobalSearchTicker, fetchAnalyticsData]);

  // Clean data loading function for Top-20 tab
  const loadTop20Data = useCallback(() => {
    if (!companyGlobalSearchTicker || !yearTicker) return;

    // Check if we've already made this exact API call
    const currentCall = {
      company: companyGlobalSearchTicker,
      year: yearTicker,
      tab: 'Top-20',
      filter: ''
    };

    if (lastApiCallRef.current && 
        lastApiCallRef.current.company === currentCall.company &&
        lastApiCallRef.current.year === currentCall.year &&
        lastApiCallRef.current.tab === currentCall.tab &&
        lastApiCallRef.current.filter === currentCall.filter) {
      console.log('⏭️ Skipping duplicate Top-20 API call for:', companyGlobalSearchTicker, yearTicker);
      return;
    }

    console.log('🚀 Loading Top-20 data for:', companyGlobalSearchTicker, yearTicker);
    
    // Update the ref to track this API call
    lastApiCallRef.current = currentCall;
    
    // Load data from API
    const fetchPromise = dispatch(
      fetchVdsProxyDashboard(
        createDynamicURL(
          `${baseURL}/vds_proxy_voting/?ticker=${companyGlobalSearchTicker}&year=${yearTicker}`
        )
      )
    );

    const rationalePromise = dispatch(
      getProxyVotingRationaleTop20(
        createDynamicURL(`/vds_proxy_voting_rationale/`, {
          ticker: companyGlobalSearchTicker,
          year: yearTicker,
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
      if (fetchResult.payload || rationaleResult.payload) {
        setCachedData(cacheKey, {
          vdsData: fetchResult.payload,
          rationaleData: rationaleResult.payload
        });
      }
    }).catch(error => {
      console.warn('Failed to cache Top-20 data:', error);
    });
  }, [companyGlobalSearchTicker, yearTicker, dispatch]);

  // Clean data loading function for All-Investor tab
  const loadAllInvestorData = useCallback(() => {
    if (!companyGlobalSearchTicker || !yearTicker) return;

    const filterString = filter?.length > 0 ? JSON.stringify(filter.sort()) : '';
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
    
    console.log('🚀 Loading All-Investor data for:', companyGlobalSearchTicker, yearTicker, 'with filters:', filter);

    // Update the ref to track this API call
    lastApiCallRef.current = currentCall;

    // Load data from API
    const fetchPromise = dispatch(
      fetchVdsProxyAllInvestor(
        createDynamicURL(`${baseURL}/vds_proxy_voting/`, {
          ticker: companyGlobalSearchTicker,
          year: yearTicker,
          institution_name: institutionName,
        })
      )
    );

    const rationalePromise = dispatch(
      getProxyVotingRationaleAllInvestors(
        createDynamicURL(`/vds_proxy_voting_rationale/`, {
          ticker: companyGlobalSearchTicker,
          year: yearTicker,
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
  }, [companyGlobalSearchTicker, yearTicker, filter, dispatch]);

  // Single effect to handle data loading - prevents duplicate API calls
  useEffect(() => {
    if (!companyGlobalSearchTicker || !yearTicker) return;

    console.log('📊 Loading data for:', companyGlobalSearchTicker, yearTicker, 'tab:', tab);
    
    // Load data based on current tab
    if (tab === "Top-20") {
      loadTop20Data();
    } else if (tab === "All-Investor") {
      loadAllInvestorData();
    }
  }, [companyGlobalSearchTicker, yearTicker, tab, loadTop20Data, loadAllInvestorData]);

  // Separate effect to clear cache only when company changes (not year or tab)
  useEffect(() => {
    if (companyGlobalSearchTicker) {
      console.log('🧹 Company changed, clearing cache and API call tracking for:', companyGlobalSearchTicker);
      clearCacheForCompany(companyGlobalSearchTicker);
      // Reset API call tracking when company changes
      lastApiCallRef.current = null;
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
    const resultString = Object.entries(items)
      .map(([key, value]) => `${convertToTitleCase(key)}: ${value}`)
      .join(", ");
    return resultString;
  };

  // Analytics data processing
  const getAnalyticsChartData = () => {
    if (!analyticsData || !yearTicker) return [];
    
    const processedData = [];
    
    Object.entries(analyticsData).forEach(([key, value]: [string, any]) => {
      const yearData = value[yearTicker];
      if (yearData) {
        const categoryName = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        processedData.push({
          name: categoryName,
          value: parseFloat(yearData.total_percent.replace('%', '')),
          volume: yearData.volume,
          displayValue: yearData.total_percent,
          fill: ANALYTICS_COLORS[categoryName] || "#1f5582", // Default color if not found
          rawData: value // Keep the raw data for all years
        });
      }
    });
    
    return processedData;
  };

  // Get data for a specific year and category
  const getYearData = (categoryData: any, year: string) => {
    if (categoryData.rawData && categoryData.rawData[year]) {
      return {
        percentage: categoryData.rawData[year].total_percent,
        volume: categoryData.rawData[year].volume,
        value: parseFloat(categoryData.rawData[year].total_percent.replace('%', ''))
      };
    }
    return null;
  };

  const ANALYTICS_COLORS = {
    "Election Of Directors": "#1f5582", // Dark teal blue 
    "Say On Pay": "#1f5582", // Dark teal blue
    "Shareholder Proposals": "#c7d2e3" // Light gray
  };

  const [meetingDate, setMeetingDate] = useState('');

  const [apiDropdownOptions, setApiDropdownOptions] = useState<any>([]);

  const getAllInstitutionDropdown = async () => {
    try {
      const res = await dashboardService.getInstitution({
        company_name: [companyGlobalSearchName],
        year: yearTicker!,
      });
      if (res.result?.institutes) {
        setApiDropdownOptions(res.result?.institutes);
      }
      setMeetingDate(res.result?.meeting_date);
    } catch (error) {
      return error;
    } finally {
      // setGetDropdownLoader(false);
    }
  };

  useEffect(() => {
    getAllInstitutionDropdown();
  }, [companyGlobalSearchTicker]);

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

  const getSelectedTabIndex = () => {
    const tabIndex = tab === "Top-20" ? 0 : tab === "All-Investor" ? 1 : -1;
    return tabIndex;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <Button
          onClick={() => {
            navigate("/");
          }}
          variant="primary"
          className="bg-theme-2 border-bg-theme-2"
        >
          <ChevronLeft
            className="group-[.mode--light]:text-white text-white"
            size={18}
            strokeWidth={1.5}
          />
          Back
        </Button>
        
        <Button
          onClick={() => {
            const votingRationaleSection = document.querySelector('[data-voting-rationale]');
            if (votingRationaleSection) {
              votingRationaleSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
              });
            }
          }}
          className="px-5 py-2 rounded flex gap-2 items-center border border-primary text-primary"
        >
          <span>Voting Rationale</span>
          <Lucide 
            icon="ChevronDown" 
            className="w-4 h-4" 
          />
        </Button>
      </div>

      <div className="p-5 mt-1 box">
        <div className="w-full">
          <>
            <Tab.Group selectedIndex={getSelectedTabIndex()}>
              <Tab.List variant="link-tabs">
                <Tab>
                  <Tab.Button
                    className="w-full py-2"
                    as="button"
                    onClick={() => {
                      dispatch(setTabs("Top-20"));
                    }}
                  >
                    <div className="flex items-center justify-center ">
                      Top 20
                    </div>
                  </Tab.Button>
                </Tab>

                <Tab>
                  <Tab.Button
                    className="w-full py-2"
                    as="button"
                    onClick={() => {
                      dispatch(setTabs("All-Investor"));
                    }}
                  >
                    <div className="flex items-center justify-center ">
                      All Investors
                    </div>
                  </Tab.Button>
                </Tab>
              </Tab.List>

              <Tab.Panels className="mt-5">
                <Tab.Panel className="leading-relaxed">
                  <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row mb-3">
                   <span>
                   <div className="flex items-center gap-2">
                     <h1 className="text-lg font-bold">Proxy Voting</h1>
                     {analyticsData && (
                       <Tippy content="View Analytics Chart" options={{ theme: "light" }}>
                         <Lucide 
                           icon="BarChart3" 
                           className="w-5 h-5 text-primary cursor-pointer hover:text-primary/80" 
                           onClick={() => setChartModalVisible(true)}
                         />
                       </Tippy>
                     )}
                   </div>
                   {
                         meetingDate &&
                        <p className=" italic"> Meeting Date: {meetingDate} </p>
                      }
                   </span>
                    {tab === "Top-20" &&
                      vdsProxyDetails?.vds_report_headers?.length > 0 && (
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

                  <TableWrapper
                    isLoading={vdsProxyLoading}
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

                    {!vdsProxyDetails && vdsProxyLoading && (
                      <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                        <LoadingIcon
                          color="#800000"
                          icon="three-dots"
                          className="w-16 h-16"
                        />
                      </div>
                    )}

                    {/* Handle both cases: empty array or undefined/null vdsProxyDetails */}
                    {((vdsProxyDetails?.vds_report?.length === 0) || 
                      (!vdsProxyDetails && !vdsProxyLoading)) && (
                        <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
                          <div className="text-center text-slate-500 dark:text-slate-400">
                            <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
                            <h3 className="text-lg font-medium mb-2">Top 20 Proxy Records Not Found</h3>
                            <p className="text-sm">Proxy voting data may not be available for this company or time period.</p>
                          </div>
                        </div>
                      )}
                  </TableWrapper>

                  <div data-voting-rationale>
                    <VotingRationale 
                      meetingDate={meetingDate} 
                      tabType="top20"
                      parentLoading={vdsProxyLoading} // Pass parent loading state
                    />
                  </div>
                </Tab.Panel>
                
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
                  <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold">
                          Proxy Voting
                        </h1>
                        {analyticsData && (
                          <Tippy content="View Analytics Chart" options={{ theme: "light" }}>
                            <Lucide 
                              icon="BarChart3" 
                              className="w-5 h-5 text-primary cursor-pointer hover:text-primary/80" 
                              onClick={() => setChartModalVisible(true)}
                            />
                          </Tippy>
                        )}
                      </div>
                      {
                         meetingDate &&
                        <p className="text-sm italic text-slate-600 dark:text-slate-400 mt-1"> Meeting Date: {meetingDate} </p>
                      }
                    </div>

                    {vdsProxyAllInvestorDetails?.vds_report?.length > 0 && (
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

                  <TableWrapper
                    isLoading={vdsProxyAllInvestorLoading}
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
                      <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
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
                      <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
                        <div className="text-center text-slate-500 dark:text-slate-400">
                          <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
                          <h3 className="text-lg font-medium mb-2">No Proxy Records Available</h3>
                          <p className="text-sm">Try adjusting your filters or selecting different institutions.</p>
                        </div>
                      </div>
                    )}

                  <div data-voting-rationale>
                    <VotingRationale 
                      meetingDate={meetingDate} 
                      filter={filter} 
                      tabType="allInvestors"
                      parentLoading={vdsProxyAllInvestorLoading} // Pass parent loading state
                    />
                  </div>
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

      {/* Analytics Chart Modal */}
      <Dialog size="lg" open={chartModalVisible} onClose={() => setChartModalVisible(false)}>
        <Dialog.Panel className="!max-w-[85vw] !w-[85vw]">
          <Dialog.Title>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{companyGlobalSearchName} ({companyGlobalSearchTicker})</h2>
              <div
                onClick={() => setChartModalVisible(false)}
                className="cursor-pointer hover:bg-gray-100 p-2 rounded absolute top-4 right-6 z-10"
              >
                <Lucide icon="X" className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <div className="w-full px-6 py-2">
              {getAnalyticsChartData().length > 0 ? (
                <>
                  <div className="flex gap-6 mb-8">
                    {/* Election of Directors Panel */}
                    <div className="flex-1 flex flex-col">
                      {(() => {
                        const electionData = getAnalyticsChartData().find(item => item.name === 'Election Of Directors');
                        const data2024 = electionData ? getYearData(electionData, '2024') : null;
                        const data2025 = electionData ? getYearData(electionData, '2025') : null;
                        
                        return (
                          <>
                            {/* Title - Fixed Height */}
                            <div className="h-16 flex items-center justify-center mb-8">
                              <h3 className="text-xl font-medium text-center text-slate-700">Election of Directors</h3>
                            </div>
                            
                            {/* Chart Container - Fixed Height */}
                            <div className="h-80 flex items-end justify-center gap-8 mb-8">
                              <div className="flex flex-col items-center">
                                <span className="text-base text-slate-600 mb-3">
                                  {data2024 ? data2024.percentage : '--'}
                                </span>
                                <div 
                                  className="bg-[#1F546E]"
                                  style={{ 
                                    width: '60px',
                                    height: data2024 ? `${Math.max(data2024.value * 3, 40)}px` : '40px'
                                  }}
                                ></div>
                                <span className="text-base text-slate-600 mt-4">2024</span>
                              </div>
                              
                              <div className="flex flex-col items-center">
                                <span className="text-base text-slate-600 mb-3">
                                  {data2025 ? data2025.percentage : '--'}
                                </span>
                                <div 
                                  className="bg-[#D7D9DC]"
                                  style={{ 
                                    width: '60px',
                                    height: data2025 ? `${Math.max(data2025.value * 3, 40)}px` : '40px'
                                  }}
                                ></div>
                                <span className="text-base text-slate-600 mt-4">2025</span>
                              </div>
                            </div>
                            
                            {/* Table - Aligned Bottom */}
                            <div className="flex-1 flex items-end">
                              <table className="w-full border-collapse border border-slate-200">
                                <thead>
                                  <tr>
                                    <th className="bg-[#1F546E] text-white p-4 text-center text-base" colSpan={2}>
                                      Voted Against Election of Directors
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="bg-[#1F546E] text-white p-4 text-base w-20 border-r border-slate-300">2024</td>
                                    <td className="bg-[#1F546E] text-white p-4 text-base">
                                      {data2024 ? 'Morgan Stanley, Norges Bank, Capital Research' : '--'}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="bg-slate-100 text-slate-700 p-4 text-base border-r border-slate-300">2025</td>
                                    <td className="bg-slate-100 text-slate-700 p-4 text-base">
                                      {data2025 ? 'Norges Bank, Northern Trust (Split)' : '--'}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Say on Pay Panel */}
                    <div className="flex-1 flex flex-col">
                      {(() => {
                        const sayOnPayData = getAnalyticsChartData().find(item => item.name === 'Say On Pay');
                        const data2024 = sayOnPayData ? getYearData(sayOnPayData, '2024') : null;
                        const data2025 = sayOnPayData ? getYearData(sayOnPayData, '2025') : null;
                        
                        return (
                          <>
                            {/* Title - Fixed Height */}
                            <div className="h-16 flex items-center justify-center mb-8">
                              <h3 className="text-xl font-medium text-center text-slate-700">Say On Pay</h3>
                            </div>
                            
                            {/* Chart Container - Fixed Height */}
                            <div className="h-80 flex items-end justify-center gap-8 mb-8">
                              <div className="flex flex-col items-center">
                                <span className="text-base text-slate-600 mb-3">
                                  {data2024 ? data2024.percentage : '--'}
                                </span>
                                <div 
                                  className="bg-[#1F546E]"
                                  style={{ 
                                    width: '60px',
                                    height: data2024 ? `${Math.max(data2024.value * 3, 40)}px` : '40px'
                                  }}
                                ></div>
                                <span className="text-base text-slate-600 mt-4">2024</span>
                              </div>
                              
                              <div className="flex flex-col items-center">
                                <span className="text-base text-slate-600 mb-3">
                                  {data2025 ? data2025.percentage : '--'}
                                </span>
                                <div 
                                  className="bg-[#D7D9DC]"
                                  style={{ 
                                    width: '60px',
                                    height: data2025 ? `${Math.max(data2025.value * 3, 40)}px` : '40px'
                                  }}
                                ></div>
                                <span className="text-base text-slate-600 mt-4">2025</span>
                              </div>
                            </div>
                            
                            {/* Table - Aligned Bottom */}
                            <div className="flex-1 flex items-end">
                              <table className="w-full border-collapse border border-slate-200">
                                <thead>
                                  <tr>
                                    <th className="bg-[#1F546E] text-white p-4 text-center text-base" colSpan={2}>
                                      Voted Against Say on Pay
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="bg-[#1F546E] text-white p-4 text-base w-20 border-r border-slate-300">2024</td>
                                    <td className="bg-[#1F546E] text-white p-4 text-base">--</td>
                                  </tr>
                                  <tr>
                                    <td className="bg-slate-100 text-slate-700 p-4 text-base border-r border-slate-300">2025</td>
                                    <td className="bg-slate-100 text-slate-700 p-4 text-base">
                                      J.P. Morgan, Morgan Stanley, Bank of America, Capital Research, BNY Mellon
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Shareholder Proposals Panel */}
                    <div className="flex-1 flex flex-col">
                      {(() => {
                        const shareholderData = getAnalyticsChartData().find(item => item.name === 'Shareholder Proposals');
                        const data2024 = shareholderData ? getYearData(shareholderData, '2024') : null;
                        const data2025 = shareholderData ? getYearData(shareholderData, '2025') : null;
                        
                        return (
                          <>
                            {/* Title - Fixed Height */}
                            <div className="h-16 flex items-center justify-center mb-8">
                              <h3 className="text-xl font-medium text-center text-slate-700">Shareholder Proposals</h3>
                            </div>
                            
                            {/* Chart Container - Fixed Height */}
                            <div className="h-80 flex items-end justify-center gap-8 mb-8">
                              <div className="flex flex-col items-center">
                                <span className="text-base text-slate-600 mb-3">
                                  {data2024 ? data2024.percentage : '--'}
                                </span>
                                <div 
                                  className="bg-[#1F546E]"
                                  style={{ 
                                    width: '60px',
                                    height: data2024 ? `${Math.max(data2024.value * 3, 40)}px` : '40px'
                                  }}
                                ></div>
                                <span className="text-base text-slate-600 mt-4">2024</span>
                              </div>
                              
                              <div className="flex flex-col items-center">
                                <span className="text-base text-slate-600 mb-3">
                                  {data2025 ? data2025.percentage : '--'}
                                </span>
                                <div 
                                  className="bg-[#D7D9DC]"
                                  style={{ 
                                    width: '60px',
                                    height: data2025 ? `${Math.max(data2025.value * 3, 40)}px` : '40px'
                                  }}
                                ></div>
                                <span className="text-base text-slate-600 mt-4">2025</span>
                              </div>
                            </div>
                            
                            {/* Table - Aligned Bottom */}
                            <div className="flex-1 flex items-end">
                              <table className="w-full border-collapse border border-slate-200">
                                <thead>
                                  <tr>
                                    <th className="bg-[#1F546E] text-white p-4 text-center text-base" colSpan={2}>
                                      Voted For Shareholder Proposals
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="bg-[#1F546E] text-white p-4 text-base w-20 border-r border-slate-300">2024</td>
                                    <td className="bg-[#1F546E] text-white p-4 text-base">
                                      Morgan Stanley, Morgan Stanley, Northern Trust, UBS
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="bg-slate-100 text-slate-700 p-4 text-base border-r border-slate-300">2025</td>
                                    <td className="bg-slate-100 text-slate-700 p-4 text-base">--</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Comprehensive Summary Table */}
                  <div className="w-full mt-6">
                    <table className="w-full border-collapse border border-slate-200">
                      <thead>
                        <tr>
                          <th className="bg-[#1F546E] text-white p-4 text-center text-lg font-medium" colSpan={4}>
                            Comprehensive Voting Analytics Summary
                          </th>
                        </tr>
                        <tr>
                          <th className="bg-slate-100 text-slate-700 p-4 text-center text-base font-medium border-r border-slate-300">Category</th>
                          <th className="bg-slate-100 text-slate-700 p-4 text-center text-base font-medium border-r border-slate-300">2024 Results</th>
                          <th className="bg-slate-100 text-slate-700 p-4 text-center text-base font-medium border-r border-slate-300">2025 Results</th>
                          <th className="bg-slate-100 text-slate-700 p-4 text-center text-base font-medium">Volume/Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Election of Directors Row */}
                        {(() => {
                          const electionData = getAnalyticsChartData().find(item => item.name === 'Election Of Directors');
                          const data2024 = electionData ? getYearData(electionData, '2024') : null;
                          const data2025 = electionData ? getYearData(electionData, '2025') : null;
                          
                          return (
                            <tr>
                              <td className="bg-white text-slate-700 p-4 text-base font-medium border-r border-slate-300">
                                Election of Directors
                              </td>
                              <td className="bg-white text-slate-700 p-4 text-base border-r border-slate-300">
                                {data2024 ? data2024.percentage : '--'}
                              </td>
                              <td className="bg-white text-slate-700 p-4 text-base border-r border-slate-300">
                                {data2025 ? data2025.percentage : '--'}
                              </td>
                              <td className="bg-white text-slate-700 p-4 text-base">
                                Against: Morgan Stanley, Norges Bank
                              </td>
                            </tr>
                          );
                        })()}
                        
                        {/* Say on Pay Row */}
                        {(() => {
                          const sayOnPayData = getAnalyticsChartData().find(item => item.name === 'Say On Pay');
                          const data2024 = sayOnPayData ? getYearData(sayOnPayData, '2024') : null;
                          const data2025 = sayOnPayData ? getYearData(sayOnPayData, '2025') : null;
                          
                          return (
                            <tr>
                              <td className="bg-slate-50 text-slate-700 p-4 text-base font-medium border-r border-slate-300">
                                Say on Pay
                              </td>
                              <td className="bg-slate-50 text-slate-700 p-4 text-base border-r border-slate-300">
                                {data2024 ? data2024.percentage : '--'}
                              </td>
                              <td className="bg-slate-50 text-slate-700 p-4 text-base border-r border-slate-300">
                                {data2025 ? data2025.percentage : '--'}
                              </td>
                              <td className="bg-slate-50 text-slate-700 p-4 text-base">
                                Against: J.P. Morgan, Morgan Stanley, Bank of America
                              </td>
                            </tr>
                          );
                        })()}
                        
                        {/* Shareholder Proposals Row */}
                        {(() => {
                          const shareholderData = getAnalyticsChartData().find(item => item.name === 'Shareholder Proposals');
                          const data2024 = shareholderData ? getYearData(shareholderData, '2024') : null;
                          const data2025 = shareholderData ? getYearData(shareholderData, '2025') : null;
                          
                          return (
                            <tr>
                              <td className="bg-white text-slate-700 p-4 text-base font-medium border-r border-slate-300">
                                Shareholder Proposals
                              </td>
                              <td className="bg-white text-slate-700 p-4 text-base border-r border-slate-300">
                                {data2024 ? data2024.percentage : '--'}
                              </td>
                              <td className="bg-white text-slate-700 p-4 text-base border-r border-slate-300">
                                {data2025 ? data2025.percentage : '--'}
                              </td>
                              <td className="bg-white text-slate-700 p-4 text-base">
                                Volume: {data2024 ? data2024.volume : '--'} (2024), {data2025 ? data2025.volume : '--'} (2025)
                              </td>
                            </tr>
                          );
                        })()}
                        
                        {/* Shareholder Proposal Volume Row */}
                        {(() => {
                          const shareholderData = getAnalyticsChartData().find(item => item.name === 'Shareholder Proposals');
                          const data2024 = shareholderData ? getYearData(shareholderData, '2024') : null;
                          const data2025 = shareholderData ? getYearData(shareholderData, '2025') : null;
                          
                          return (
                            <tr>
                              <td className="bg-slate-50 text-slate-700 p-4 text-base font-medium border-r border-slate-300">
                                Proposal Volume
                              </td>
                              <td className="bg-slate-50 text-slate-700 p-4 text-base border-r border-slate-300">
                                {data2024 ? data2024.volume : '--'}
                              </td>
                              <td className="bg-slate-50 text-slate-700 p-4 text-base border-r border-slate-300">
                                {data2025 ? data2025.volume : '--'}
                              </td>
                              <td className="bg-slate-50 text-slate-700 p-4 text-base">
                                Total proposal count per year
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">No analytics data available for {yearTicker}</p>
                </div>
              )}
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

export default VdsProxyVotingTable;