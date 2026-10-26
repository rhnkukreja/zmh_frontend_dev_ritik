import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import { convertToTitleCase, createDynamicURL } from "@/utils/helper";
import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
import { axiosInstance } from "@/services";
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

// Resolve the institution id for a fund-level column. The backend may expose it
// on the header object or on each cell's institution payload — try both.
const getInstitutionIdForHeader = (header: any, rows: any[]) => {
  const direct =
    header?.institution_id ??
    header?.institutionId ??
    header?.institution ??
    header?.institute_id;
  if (
    direct !== undefined &&
    direct !== null &&
    direct !== "" &&
    !isNaN(Number(direct))
  ) {
    return direct;
  }

  if (Array.isArray(rows)) {
    for (const row of rows) {
      const cell = row?.[header?.field];
      const id = cell?.institution_id ?? cell?.institutionId;
      if (id !== undefined && id !== null && id !== "") return id;
    }
  }
  return null;
};

// Fund-level icon that opens a modal on click with the per-fund vote pivot
// from /vds_proxy_voting_fund_level/.
const FundLevelVotesIcon = ({
  companyId,
  companyName,
  header,
  rows,
  meetingDate,
}: {
  companyId?: any;
  companyName?: string;
  header?: any;
  rows?: any[];
  meetingDate?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const openModal = async () => {
    setOpen(true);
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const institutionId = getInstitutionIdForHeader(header, rows ?? []);
      const params: any = {
        company_id: companyId,
        meeting_date: meetingDate,
      };
      if (institutionId) {
        params.institution_id = institutionId;
      } else {
        params.institution_name = header?.header;
      }
      const { result } = await dashboardService.getVdsProxyFundLevel(params);
      setData(result);
    } catch (e) {
      setError("Unable to load fund level votes");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!companyId || !meetingDate) return;
    setDownloading(true);
    try {
      const institutionId = getInstitutionIdForHeader(header, rows ?? []);
      const params: any = {
        company_id: companyId,
        meeting_date: meetingDate,
        download: "true",
      };
      if (institutionId) {
        params.institution_id = institutionId;
      } else {
        params.institution_name = header?.header;
      }

      const response = await axiosInstance.get(
        createDynamicURL(`${baseURL}/vds_proxy_voting_fund_level/`, params),
        { responseType: "blob" }
      );

      const companySlug = String(companyName || "Company").replace(
        /[^a-z0-9]+/gi,
        "_"
      );
      const institutionSlug = String(
        data?.institution_name || header?.header || "Institution"
      ).replace(/[^a-z0-9]+/gi, "_");
      const filename = `Voting_Data_${companySlug}_${institutionSlug}_Fund_Level_${meetingDate}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error downloading fund level export:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <span
        className="inline-flex items-center justify-center cursor-pointer hover:opacity-80 transition duration-150"
        title="Fund Level Votes"
        onClick={openModal}
      >
        <Lucide icon="Grid3x3" className="w-6 h-6 text-blue-800" />
      </span>

      <Dialog open={open} onClose={() => setOpen(false)} size="2xl">
        <Dialog.Panel className="max-h-[90vh] flex flex-col w-[95%] lg:!w-[1400px]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-none">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">
                {data?.institution_name ?? "Fund Level Votes"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Fund Level Votes{data?.count ? ` · ${data.count} proposals` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Tippy content="Download Excel" options={{ theme: "light" }}>
                <div
                  className={clsx(
                    "box p-[5px] cursor-pointer",
                    downloading && "opacity-50 pointer-events-none"
                  )}
                  onClick={handleDownload}
                >
                  <img alt="download-icon" src={downloadIcon} />
                </div>
              </Tippy>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <Lucide icon="X" className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-4">
            {loading && (
              <div className="py-16 text-center text-sm text-slate-500">
                Loading fund level votes...
              </div>
            )}
            {!loading && error && (
              <div className="py-16 text-center text-sm text-red-500">
                {error}
              </div>
            )}
            {!loading && !error && data && (
              <div className="overflow-x-auto">
                <table className="w-max min-w-full text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {data?.headers?.map((h: any, i: number) => (
                        <th
                          key={i}
                          className={clsx(
                            "bg-primary border-b border-primary/60 px-2.5 py-2.5 text-left align-top font-semibold text-white whitespace-normal break-words",
                            i === 0 &&
                              "w-[70px] min-w-[70px] max-w-[70px] sticky left-0 z-[6] rounded-tl-lg",
                            i === 1 &&
                              "w-[240px] min-w-[240px] max-w-[240px] sticky left-[70px] z-[6]",
                            i > 1 && "min-w-[140px] max-w-[190px]",
                            i === data?.headers?.length - 1 && "rounded-tr-lg"
                          )}
                        >
                          {h?.field === "proposal_num" ? "#" : h?.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.results?.map((row: any, rowIndex: number) => (
                      <tr
                        key={row?.id ?? rowIndex}
                        className="group border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        {data?.headers?.map((h: any, colIndex: number) => {
                          const value = row?.[h?.field];
                          const isNegative =
                            typeof value === "string" &&
                            (value.includes("Against") ||
                              value.includes("Withhold"));
                          return (
                            <td
                              key={colIndex}
                              className={clsx(
                                "px-2.5 py-2 align-top whitespace-normal break-words leading-tight border-b border-slate-100",
                                isNegative
                                  ? "text-red-700 font-semibold"
                                  : "text-slate-700",
                                colIndex === 0 &&
                                  "w-[70px] min-w-[70px] max-w-[70px] sticky left-0 bg-white z-[4] font-medium text-slate-500 group-hover:bg-slate-50",
                                colIndex === 1 &&
                                  "w-[240px] min-w-[240px] max-w-[240px] sticky left-[70px] bg-white z-[4] group-hover:bg-slate-50",
                                colIndex > 1 && "min-w-[140px] max-w-[190px]",
                              )}
                            >
                              {value ?? "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && !error && (!data?.results || data.results.length === 0) && (
              <div className="py-16 text-center text-sm text-slate-500">
                No fund level votes found
              </div>
            )}
          </div>
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

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

  // When the company changes via global search, the "meeting_date" URL param
  // still holds the PREVIOUS company's date for a brief moment (until
  // MeetingYearSelector resolves the new company's dates asynchronously).
  // Without this guard, the data-loading effect below fires immediately with
  // the new company id + stale meeting_date, the API returns an empty report
  // for that mismatched combination, and the "Not Found" empty state flashes
  // before the correct data arrives. Clearing the stale date (and flagging
  // the transition) prevents that premature fetch/flash.
  const prevCompanyIdRef = useRef(companyGlobalSearchId);
  const [companyTransitioning, setCompanyTransitioning] = useState(false);

  useEffect(() => {
    if (prevCompanyIdRef.current === companyGlobalSearchId) return;
    prevCompanyIdRef.current = companyGlobalSearchId;

    if (searchParams.get("meeting_date")) {
      setCompanyTransitioning(true);
      setSearchParams((previousParams) => {
        const params = new URLSearchParams(previousParams);
        params.delete("meeting_date");
        return params;
      });
    }
  }, [companyGlobalSearchId, searchParams, setSearchParams]);

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

        // Safety net: if this company genuinely has no meeting dates,
        // MeetingYearSelector will never populate "meeting_date" in the URL,
        // so the company-switch transition flag above would otherwise stay
        // stuck forever. End it here so the "Not Found" state can show.
        if (!cancelled && entries.length === 0) {
          setCompanyTransitioning(false);
        }
      } catch (error) {
        console.warn("Failed to determine proxy contest status:", error);
        if (!cancelled) {
          setIsProxyContestYear(false);
          setCompanyTransitioning(false);
        }
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

    // meetingDate is guaranteed to belong to the current company at this point
    // (stale dates are cleared by the company-switch effect above), so it's
    // safe to end the transition state now.
    setCompanyTransitioning(false);

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

  // Downloads the VDS export Excel generated server-side by
  // /vds_proxy_voting/?download=true instead of scraping the rendered table.
  const handleDownload = async (tabName: "Top-20" | "All-Investor") => {
    if (!companyGlobalSearchId || !meetingDate) return;

    try {
      const params: any = {
        company_id: companyGlobalSearchId,
        meeting_date: meetingDate,
        download: "true",
      };
      if (tabName === "All-Investor") {
        params.institution_name = filter?.length > 0 ? filter : "Top 10";
      }

      const response = await axiosInstance.get(
        createDynamicURL(`${baseURL}/vds_proxy_voting/`, params),
        { responseType: "blob" }
      );

      const companySlug = String(
        companyGlobalSearchName || companyGlobalSearchTicker || "Company"
      ).replace(/[^a-z0-9]+/gi, "_");
      const view = tabName === "Top-20" ? "Top_20" : "All_Investors";
      const filename = `Voting_Data_${companySlug}_${view}_${meetingDate}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading VDS export:", error);
    }
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

  // The API marks each institution cell with `is_fund_level`. If any row in a
  // column reports it, the institution's votes are fund-level, so we flag the
  // column header with an icon.
  const isFundLevelColumn = (rows: any[], field: string) =>
    Array.isArray(rows) &&
    rows.some((row) => row?.[field]?.is_fund_level === true);

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
                          <div className="flex flex-col items-end gap-1">
                            {
                              yearTicker !== "2025" &&
                            <h1 className="text-md font-bold">
                              Aggregate Ownership:{" "}
                              {vdsProxyDetails?.total_percent_ownership}
                            </h1>
                            }
                            {vdsProxyDetails?.vds_report_headers?.some(
                              (h: any) =>
                                isFundLevelColumn(
                                  vdsProxyDetails?.vds_report,
                                  h?.field
                                )
                            ) && (
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                                <Lucide
                                  icon="Grid3x3"
                                  className="w-4 h-4 text-blue-800"
                                />
                                Fund Level Votes
                              </div>
                            )}
                          </div>
                          <Tippy
                            content="Download Excel"
                            options={{ theme: "light" }}
                          >
                            <div
                              className="box p-[5px] cursor-pointer"
                              onClick={() => handleDownload("Top-20")}
                            >
                              <img alt="download-icon" src={downloadIcon} />
                            </div>
                          </Tippy>
                        </div>
                      )}
                  </div>

                  <div className={activeVdsView === "voting-data" ? "block" : "hidden"}>
                  <TableWrapper
                    isLoading={vdsProxyLoading || companyTransitioning}
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
                                    <span className="inline-flex items-center gap-1">
                                      {vdsHeader?.header}
                                      {isFundLevelColumn(
                                        vdsProxyDetails?.vds_report,
                                        vdsHeader?.field
                                      ) && (
                                        <FundLevelVotesIcon
                                          companyId={companyGlobalSearchId}
                                          companyName={companyGlobalSearchName}
                                          header={vdsHeader}
                                          rows={vdsProxyDetails?.vds_report}
                                          meetingDate={meetingDate}
                                        />
                                      )}
                                    </span>
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
                  {activeVdsView !== "voting-rationale" && (
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
                                      apiDropdownOptions?.map((institution: string) => {
                                        return (
                                          <option value={institution}>
                                            {institution}
                                          </option>
                                        );
                                      })}
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
                  )}
                  <div className="flex justify-end items-center gap-4 mb-4 xs:mt-4 md:mt-0">
                    {activeVdsView === "voting-data" && vdsProxyAllInvestorDetails?.vds_report?.length > 0 && (
                      <div className="flex justify-end items-center gap-4 xs:mt-4 md:mt-0">
                        {vdsProxyAllInvestorDetails?.vds_report_headers?.some(
                          (h: any) =>
                            isFundLevelColumn(
                              vdsProxyAllInvestorDetails?.vds_report,
                              h?.field
                            )
                        ) && (
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                            <Lucide
                              icon="Grid3x3"
                              className="w-4 h-4 text-blue-800"
                            />
                            Fund Level Votes
                          </div>
                        )}
                        <Tippy
                          content="Download Excel"
                          options={{ theme: "light" }}
                        >
                          <div
                            className="box p-[5px] cursor-pointer"
                            onClick={() => handleDownload("All-Investor")}
                          >
                            <img alt="download-icon" src={downloadIcon} />
                          </div>
                        </Tippy>
                      </div>
                    )}
                  </div>

                  <div className={activeVdsView === "voting-data" ? "block" : "hidden"}>
                  <TableWrapper
                    isLoading={vdsProxyAllInvestorLoading || companyTransitioning}
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
                                    <span className="inline-flex items-center gap-1">
                                      {vdsHeader?.header}
                                      {isFundLevelColumn(
                                        vdsProxyAllInvestorDetails?.vds_report,
                                        vdsHeader?.field
                                      ) && (
                                        <FundLevelVotesIcon
                                          companyId={companyGlobalSearchId}
                                          companyName={companyGlobalSearchName}
                                          header={vdsHeader}
                                          rows={vdsProxyAllInvestorDetails?.vds_report}
                                          meetingDate={meetingDate}
                                        />
                                      )}
                                    </span>
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