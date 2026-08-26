import { useEffect, useRef, useState } from "react";
import _, { head } from "lodash";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  CompanyDashboard,
  fetchCompanyByName,
  fetchCompanyDashboard,
  fetchCompanyOverview,
  fetchAGMSummaryDashboard,
  getBoardDirectorMembers,
  setPage,
  setTempSearch,
} from "@/stores/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch, RootState } from "@/stores/store";
import { Helmet } from "react-helmet-async";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import InvestorCard from "@/components/InvestorCard";
import CaseStudiesCard from "@/components/CaseStudiesCard";
import AGMSummaryCard from "@/components/AGMSummaryCard";
import CompanyOverview from "@/components/CompanyOverview";
import CompanyOverviewGPT from "@/components/CompanyOverviewGPT";
import InvestorOverview from "@/components/InvestorOverview";
import VdsProxyVoting from "@/pages/VdsProxyVoting";
import MeetingYearSelector from "@/pages/VdsProxyVoting/MeetingYearSelector";
import YearSelector from "@/pages/VdsProxyVoting/YearSelector";
import NPXPage from "@/pages/NPX";
import NPXAnalyticsPage from "@/pages/NPXAnalytics";
import { setIsCompanySelected } from "@/stores/authenticationSlice";
import { selectDashboardNav, setActiveSection } from "@/stores/dashboardNavSlice";
import BoardDirectorMembers from "@/components/BoardDirectorMembers";
import LoadingIcon from "@/components/Base/LoadingIcon";
import TableWrapper from "@/components/TableWrapper";
import Table from "@/components/Base/Table";
import { dashboardService } from "@/services/dashboard";
import useCompanySearch from "@/hooks/useCompanySearch";
import { CompanyData } from "@/types/company";
import { ModulesCount } from "@/types/dashboard";
import Pill from "@/components/Pill";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import {
  ChevronRight,
} from "lucide-react";
import { generateWhaleWisdomId, scrapeQuickWhaleWisdom } from "@/pages/AIChatbot/api";
import { toast } from "react-toastify";
import {  scrapeBulkWhaleWisdom } from "@/pages/AIChatbot/api";
import {  pollWhaleWisdomStatus } from "@/pages/AIChatbot/api";

function Main() {
  const dispatch: AppDispatch = useAppDispatch();

  const { user } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const [headerHeight, setHeaderHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHeaderHeightChange = (event: CustomEvent) => {
      const height = event.detail.height;
      setHeaderHeight(height);
    };
    window.addEventListener('headerHeightChange' as any, handleHeaderHeightChange);
    return () => {
      window.removeEventListener('headerHeightChange' as any, handleHeaderHeightChange);
    };
  }, []);


  // Check if user is admin
  const isAdmin = user?.user_type === 'Admin';

  // Active section now lives in Redux and is driven by the Koyfin-style sidebar.
  const location = useLocation();
  const navigate = useNavigate();
  const { activeSection, activeSubSection } = useAppSelector(selectDashboardNav);
  const activeTab = activeSection;
  const activeVotingSubTab = activeTab === 'voting-data' ? (activeSubSection ?? 'vds') : null;
  const headerGroup =
    activeTab === 'investor-overview' && activeSubSection === 'engagement_priorities'
      ? 'Company'
      : activeTab === 'investor-overview'
        ? 'Institution Insights'
        : 'Company';
  const showHeaderSeparator = activeTab !== 'shareholder-meeting-results';
  const headerLabel =
    activeTab === 'company-overview' ? 'Overview' :
    activeTab === 'governance-profile' ? 'Governance Profile' :
    activeTab === 'compensation' ? 'Compensation' :
    activeTab === 'investor-overview'
      ? activeSubSection === 'engagement_priorities'
        ? 'Engagement Priorities'
        : activeSubSection === 'reporting_expectations'
          ? 'Reporting Expectations'
          : 'Overview'
      : activeTab === 'ownership' ? 'Ownership' :
      activeTab === 'shareholder-meeting-results' ? 'Shareholder Meeting' :
      activeTab === 'voting-data'
        ? activeSubSection === 'voting-rationale'
          ? 'Voting Rationale'
          : activeSubSection === 'npx'
            ? 'N-PX'
            : activeSubSection === 'npx-analytics'
              ? 'N-PX Analytics'
              : 'By Fund Family'
        : 'Overview';

  // Apply active section from back-navigation state / sessionStorage once on mount.
  useEffect(() => {
    const ssReturnTab = sessionStorage.getItem('dashboardReturnTab');
    if (ssReturnTab) {
      sessionStorage.removeItem('dashboardReturnTab');
      dispatch(setActiveSection(ssReturnTab as any));
    } else if (location.state?.activeTab) {
      dispatch(setActiveSection(location.state.activeTab));
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modules count state
  const [modulesCount, setModulesCount] = useState<ModulesCount | null>(null);

  // Loading states for both components
  const [isOwnershipLoaded, setIsOwnershipLoaded] = useState(false);
  const [isMeetingLoaded, setIsMeetingLoaded] = useState(false);

  // Format date function - Month and Year only
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  // Calculate tenure function
  const calculateTenure = (startDateString: string, endDateString?: string) => {
    if (!startDateString) return '-';

    let startDate = new Date(startDateString);

    // If month is missing, assume January
    if (startDateString.length === 4) {
      startDate = new Date(`${startDateString}-01-01`);
    }

    let endDate = endDateString ? new Date(endDateString) : new Date();

    // If end date month is missing, assume January
    if (endDateString && endDateString.length === 4) {
      endDate = new Date(`${endDateString}-01-01`);
    }

    const diffInMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    if (diffInMonths < 12) {
      return '<1 year';
    } else {
      const years = Math.floor(diffInMonths / 12);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  const { isCompanySelected, companyGlobalSearchName, companyGlobalSearchBoardName, companyGlobalSearchTicker, companyGlobalSearchId } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  const [searchParams] = useSearchParams();

  const { companySearchAndUpdate } = useCompanySearch();
  const { dashboardDataList, tempSearch, graphQLBoardData, graphQLBoardDataLoading, agmSummaryDetails } =
    useAppSelector((state) => state.dashboard);
  const searchTicker = searchParams.get("ticker");

  // Extract meeting date from AGM summary to show next to the main heading
  const _companyDetails = agmSummaryDetails?.company ? (agmSummaryDetails.company[0] as any) : undefined;
  const _companyNameKey = _companyDetails ? Object.keys(_companyDetails)[0] : undefined;
  const _meetingDetailsStr = _companyNameKey ? _companyDetails[_companyNameKey] : undefined;
  const meetingDateHeader = typeof _meetingDetailsStr === 'string' ? _meetingDetailsStr.split(" - ").pop() : undefined;

  const [autoScrapedData, setAutoScrapedData] = useState<Record<string, any>>({});
  const [autoScrapeQueue, setAutoScrapeQueue] = useState<string[]>([]);
  const autoScrapeInProgress = useRef(false);
  const processedInstitutions = useRef<Set<string>>(new Set());
  // Names that the backend is still scraping in the background — show spinners for these.
  const [pendingInvestors, setPendingInvestors] = useState<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // When each name entered the pending queue. The backend has its own 60s
  // scrape timeout plus a ~90s staleness grace period before /poll-status
  // gives up on a name, but this is a client-side last-resort: if a name
  const pendingStartTimesRef = useRef<Map<string, number>>(new Map());
  const MAX_POLL_DURATION_MS = 120000;

  // Initial bulk fetch on data load.
  useEffect(() => {
    const processBulkScrape = async () => {
      const currentData = dashboardDataList?.all_year_data?.[0]?.holdings_data;
      if (!currentData || currentData.length === 0) return;

      const uniqueMissingProfiles = Array.from(new Set(
        currentData
          .filter((d: any) => !d.investor_profile_id && !processedInstitutions.current.has(d.institution_name))
          .map((d: any) => d.institution_name)
      )) as string[];

      if (uniqueMissingProfiles.length === 0) return;

      uniqueMissingProfiles.forEach((name) => processedInstitutions.current.add(name));

      try {
        const validInvestorsToScrape = uniqueMissingProfiles.map(name => ({ name, link: "" }));

        console.log(`🚀 Sending ${validInvestorsToScrape.length} investors to Parallel Bulk Scraper...`);
        const bulkResults = await scrapeBulkWhaleWisdom(validInvestorsToScrape);

        // Separate investors the backend is still scraping (background task, no data yet)
        // from those that returned real data.
        const pending: string[] = [];
        Object.entries(bulkResults || {}).forEach(([name, info]: [string, any]) => {
          // 🌟 FIX: The backend returns an error string when it kicks off a background scrape, not a status!
          if (info?.error === "Not found in S3 cache." || info?.status === "scraping") {
            pending.push(name);
          }
        });

        setAutoScrapedData(prev => ({ ...prev, ...bulkResults }));
        if (pending.length > 0) {
          const startedAt = Date.now();
          pending.forEach((name) => {
            if (!pendingStartTimesRef.current.has(name)) {
              pendingStartTimesRef.current.set(name, startedAt);
            }
          });
          setPendingInvestors(new Set(pending));
        }
      } catch (error) {
        console.error("Bulk auto-scrape process failed:", error);
      }
    };

    processBulkScrape();
  }, [dashboardDataList]);

  // Poll every 6 seconds for investors the backend is still scraping.
  useEffect(() => {
    if (pendingInvestors.size === 0) return;

    const poll = async () => {
      const names = Array.from(pendingInvestors);
      const stillPending: string[] = [];
      const newResults: Record<string, any> = {};

      try {
        // Run completely in parallel using Promise.all
        await Promise.all(
          names.map(async (name) => {
            const startedAt = pendingStartTimesRef.current.get(name);
            if (startedAt && Date.now() - startedAt > MAX_POLL_DURATION_MS) {
              // Give up client-side — never send another request for this
              // name, regardless of what the server would have said.
              newResults[name] = { status: "failed", error: "Scrape timed out." };
              pendingStartTimesRef.current.delete(name);
              return;
            }

            try {
              // Hit the lightweight status endpoint, not the heavy bulk endpoint
              const response = await pollWhaleWisdomStatus(name);

              // If the backend has finished scraping (success or failed)
              if (response.status === "success" || response.status === "failed") {
                newResults[name] = { ...response.data, status: response.status, error: null };
                pendingStartTimesRef.current.delete(name);
              } else {
                // If it's still "scraping", keep it in the queue for the next tick
                stillPending.push(name);
              }
            } catch (error) {
              console.error(`Polling failed for ${name}:`, error);
              stillPending.push(name); // Keep trying on network blips
            }
          })
        );

        // Batch update the UI with any newly finished data
        if (Object.keys(newResults).length > 0) {
          setAutoScrapedData((prev) => ({ ...prev, ...newResults }));
        }

        // Update the queue with names that are still processing
        setPendingInvestors(new Set(stillPending));
      } catch (error) {
        console.error("Critical polling error", error);
      }
    };

    pollTimerRef.current = setTimeout(poll, 6000);
    
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [pendingInvestors]);

  // 2. Process the Queue sequentially in the background
  useEffect(() => {
    const processQueue = async () => {
      // if (autoScrapeInProgress.current || autoScrapeQueue.length === 0) return;

      // autoScrapeInProgress.current = true; 
      // const institutionToScrape = autoScrapeQueue[0];

      // try {
      //   const genResult = await generateWhaleWisdomId(institutionToScrape);

      //   if (genResult && genResult.filers && genResult.filers.length === 1) {
      //     const data = await scrapeQuickWhaleWisdom(institutionToScrape, genResult.filers[0].link);
      //     setAutoScrapedData(prev => ({ ...prev, [institutionToScrape]: data }));
      //   } else {
      //     setAutoScrapedData(prev => ({ ...prev, [institutionToScrape]: { proxy_influence: "-" } }));
      //   }
      // } catch (error) {
      //   setAutoScrapedData(prev => ({ ...prev, [institutionToScrape]: { proxy_influence: "-" } }));
      // } finally {
      //   setTimeout(() => {
      //     setAutoScrapeQueue(prev => prev.slice(1)); 
      //     autoScrapeInProgress.current = false;      
      //   }, 3000);
      // }
    };

    if (autoScrapeQueue.length > 0 && !autoScrapeInProgress.current) {
      processQueue();
    }
  }, [autoScrapeQueue]);



  useEffect(() => {
    dispatch(setIsCompanySelected(false));
  }, [isCompanySelected]);

  // useEffect(() => {
  //   // Use board_name if available, otherwise fallback to company name
  //   const searchValue = companyGlobalSearchBoardName || companyGlobalSearchName;
  //   if (searchValue) {
  //     // Clean the search value by removing "Class A", "Class B", etc.
  //     const cleanSearchValue = searchValue.replace(/\s+(Class\s+[A-Z]|Common\s+Stock).*$/i, '').trim();
  //     console.log('Making API call with clean search value:', cleanSearchValue);
  //     dispatch(getGraphQLBoardData(cleanSearchValue));
  //   }
  // }, [companyGlobalSearchBoardName, companyGlobalSearchName, dispatch]);

  // Determine whether the current company has ANY voting data at all
  // (VDS or NPX). When neither exists, the three Voting Data sub-tabs
  // (By Fund Family, Voting Rationale, N-PX) should show a "no data"
  // message instead of spinning forever waiting for a meeting date/year
  // that will never arrive.
  const [votingDataAvailability, setVotingDataAvailability] = useState<{
    checkedFor: string;
    hasData: boolean;
  } | null>(null);
  const [checkingVotingData, setCheckingVotingData] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkVotingDataAvailability = async () => {
      if (!companyGlobalSearchId) {
        setVotingDataAvailability(null);
        return;
      }

      setCheckingVotingData(true);
      try {
        const { result } = await dashboardService.getVdsNpxMeetingDates(companyGlobalSearchId);
        const vdsEntries = Array.isArray(result?.VDS_data)
          ? result.VDS_data
          : Array.isArray(result?.VDS_Data)
            ? result.VDS_Data
            : Array.isArray(result?.vds_data)
              ? result.vds_data
              : [];
        const npxEntries = Array.isArray(result?.NPX_Data)
          ? result.NPX_Data
          : Array.isArray(result?.npx_data)
            ? result.npx_data
            : [];

        if (cancelled) return;
        setVotingDataAvailability({
          checkedFor: String(companyGlobalSearchId),
          hasData: vdsEntries.length > 0 || npxEntries.length > 0,
        });
      } catch (error) {
        console.warn("Failed to check voting data availability:", error);
        if (!cancelled) {
          // Fail open so we don't hide the tabs on a transient network error.
          setVotingDataAvailability({ checkedFor: String(companyGlobalSearchId), hasData: true });
        }
      } finally {
        if (!cancelled) setCheckingVotingData(false);
      }
    };

    checkVotingDataAvailability();

    return () => {
      cancelled = true;
    };
  }, [companyGlobalSearchId]);

  const hasVotingData =
    votingDataAvailability?.checkedFor === String(companyGlobalSearchId)
      ? votingDataAvailability.hasData
      : true; // assume available until we know otherwise, to avoid a flash of the empty state

  // Fetch modules count when company changes
  useEffect(() => {
    const fetchModulesCount = async () => {
      if (companyGlobalSearchName) {
        try {
          const response = await dashboardService.getModulesCount({
            global_search: companyGlobalSearchName
          });
          setModulesCount(response.result);
        } catch (error) {
          console.error('Error fetching modules count:', error);
        }
      }
    };

    fetchModulesCount();
  }, [companyGlobalSearchName]);

  // Fetch all tab data on initial load
  useEffect(() => {
    const fetchAllForCompany = async () => {
      if (companyGlobalSearchTicker && companyGlobalSearchId) {
        // Only fetch if data doesn't exist (first load or company changed)
        if (companyGlobalSearchTicker !== tempSearch) {
          // Collect any background promises here if needed
          const requests: Promise<any>[] = [];

          // 1. Fetch Ownership data
          dispatch(
            fetchCompanyDashboard(
              createDynamicURL(
                `${baseURL}/company-dashboard/?ticker=${companyGlobalSearchTicker}`
              )
            )
          );

          // 2. Fetch Company Overview data (for all users)
          dispatch(
            fetchCompanyOverview(
              `${baseURL}/company_report/key_findings/?company_id=${companyGlobalSearchId}&year=${new Date().getFullYear()}`
            )
          );

      // GPT-based key findings disabled temporarily per request.
      // if (isAdmin) {
      //   requests.push(
      //     dispatch(
      //       fetchCompanyOverviewGPT(
      //         `${baseURL}/company_report/key_findings_gpt/?company_id=${companyGlobalSearchId}&year=${new Date().getFullYear()}`
      //       )
      //     ).unwrap()
      //   );
      // }

          // 4. Fetch Shareholder Meeting Results data
          dispatch(
            fetchAGMSummaryDashboard(
              createDynamicURL(
                `${baseURL}/voting_report_8k/`,
                { ticker: companyGlobalSearchTicker }
              )
            )
          );

          // Set tempSearch to mark data as loaded for this company
          dispatch(setTempSearch(companyGlobalSearchTicker));
        }
      }
    };

    fetchAllForCompany();
  }, [companyGlobalSearchTicker, companyGlobalSearchId, tempSearch, dispatch, isAdmin]);

  // No scroll-based tab update - tabs now show/hide content instead


  if (window.clarity && user?.user_id) {
    window.clarity("identify", user?.user_id.toString(), {
      email: user.email,
      name: user.first_name,
    });
  }

  console.log("modulesCount:", modulesCount)


  // useEffect(() => {
  //   if (companyGlobalSearchTicker === tempSearch) {
  //     getCompanyHeader();
  //   }
  // }, [companyGlobalSearchTicker]);


  // const getCompanyHeader = async () => {
  //   try {
  //     const res = await dashboardService.getCompanyName(searchTicker);
  //     if (res.result) {
  //       const data = res.result[0];
  //       const companyData: CompanyData = {id: data?.id, name: data?.name, symbol: data?.symbol};
  //       if (companyData?.id) {
  //         await companySearchAndUpdate(companyData);
  //       }
  //       console.log(res.result);
  //     }
  //   } catch (error) {
  //     return error;
  //   } finally {
  //   }

  // };


  return (
    <>
      <section>
        {/* Contextual section header (navigation moved to the Koyfin-style sidebar) */}
        <div className="w-full sticky z-30 header-card transition-all duration-300 ease-in-out bg-white shadow-md" style={{ top: `${headerHeight + 50}px` }}>
          <div ref={contentRef} className="bg-gradient-to-r from-white to-gray-50 flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <span className="text-slate-500">{headerGroup}</span>
                {showHeaderSeparator && <ChevronRight className="w-4 h-4 text-slate-400" />}
                <span>{headerLabel}</span>
              </h2>
              {activeTab === 'shareholder-meeting-results' && meetingDateHeader && (
                <div className="text-sm font-medium text-slate-600 mt-1">Meeting Date: {meetingDateHeader}</div>
              )}
            </div>
            {activeTab === 'voting-data' && activeVotingSubTab !== 'npx-analytics' && (
              <MeetingYearSelector
                key={activeVotingSubTab}
                source={activeVotingSubTab === 'npx' ? "NPX" : "VDS"}
              />
            )}
            {activeTab === 'shareholder-meeting-results' && agmSummaryDetails?.total_year?.length > 0 && (
              <YearSelector
                years={agmSummaryDetails.total_year.map(String)}
                label="Meeting Year"
              />
            )}
            {activeTab === 'ownership' && dashboardDataList?.total_year?.length > 0 && (
              <YearSelector
                years={dashboardDataList.total_year.map(String)}
                label="Meeting Year"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-y-10 gap-x-6">
          {(activeTab === 'company-overview' || activeTab === 'governance-profile' || activeTab === 'compensation') && (
            <div id="company-overview" className="col-span-12 xl:col-span-12">
              <CompanyOverview />
            </div>
          )}

          {activeTab === 'company-overview-gpt' && isAdmin && (
            <div id="company-overview-gpt" className="col-span-12 xl:col-span-12">
              <CompanyOverviewGPT />
            </div>
          )}

          {activeTab === 'ownership' && (
            <div id="ownership" className="col-span-12 xl:col-span-12">
              {/* 🌟 PASS AUTOSCRAPEDDATA HERE */}
              <InvestorCard onLoaded={() => setIsOwnershipLoaded(true)} autoScrapedData={autoScrapedData} pendingInvestors={pendingInvestors} />
            </div>
          )}

          {activeTab === 'investor-overview' && (
            <div id="investor-overview" className="col-span-12 xl:col-span-12">
              {/* Combine the name and ticker to format it exactly how your backend expects it! */}
              <InvestorOverview companyTicker={`${companyGlobalSearchName} (${companyGlobalSearchTicker})`} />
            </div>
          )}

          {activeTab === 'shareholder-meeting-results' && (
            <div id="shareholder-meeting-results" className="col-span-12 xl:col-span-12">
              <AGMSummaryCard
                companyGlobalSearchTicker={companyGlobalSearchTicker}
                companyGlobalSearchName={companyGlobalSearchName}
                isMeetingModal={false}
                proxyContest={modulesCount?.proxy_contest || false}
                proxyContest2024={modulesCount?.proxy_contest_2024 || false}
                proxyContest2025={modulesCount?.proxy_contest_2025 || false}
                onLoaded={() => setIsMeetingLoaded(true)}
              />
            </div>
          )}

          {activeTab === 'voting-data' && (
            <div id="voting-data" className="col-span-12 xl:col-span-12">
              {activeVotingSubTab !== 'npx-analytics' && checkingVotingData ? (
                <div className="p-5 mt-1 box">
                  <div className="h-52 flex items-center justify-center">
                    <LoadingIcon icon="three-dots" className="w-10 h-10 text-primary" />
                  </div>
                </div>
              ) : activeVotingSubTab !== 'npx-analytics' && !hasVotingData ? (
                <div className="p-5 mt-1 box">
                  <div className="h-52 flex items-center justify-center">
                    <div className="text-center text-gray-400 text-lg font-semibold">
                      <div>No such company data available</div>
                    </div>
                  </div>
                </div>
              ) : activeVotingSubTab === 'npx' ? (
                <NPXPage />
              ) : activeVotingSubTab === 'npx-analytics' && isAdmin ? (
                <NPXAnalyticsPage embedded />
              ) : activeVotingSubTab === 'voting-rationale' ? (
                <VdsProxyVoting view="voting-rationale" />
              ) : (
                <VdsProxyVoting view="voting-data" />
              )}
            </div>
          )}

          {/* <div id="board-composition" className="col-span-12 xl:col-span-12">
            <div className="p-5 mt-3.5 box">
              <div className="w-full">
                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                  <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                    <span>
                      <h1 className="text-lg font-bold">Board Composition <Pill text="Beta"></Pill></h1>
                    </span>
                  </div>
                </div>

                <div id="board-composition" className="mt-5">
                  <TableWrapper isLoading={graphQLBoardDataLoading}>
                    <div>
                      <Table className="w-full">
                        <Table.Thead className="sticky top-0 z-10">
                          <Table.Tr>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] border-header text-[#000000B2] w-[200px] text-left">
                              Person Name
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[150px] text-left">
                              Title
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[100px] text-left">
                              Age
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[130px] text-left">
                              Start Date
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[130px] text-center">
                              Tenure (years)
                            </Table.Td>
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {(() => {
                            const boardItems = graphQLBoardData?.data?.data?.organizationKeywordSearch?.items?.[0]?.rolesBoard?.items;

                            console.log('GraphQL Response:', graphQLBoardData);
                            console.log('Board Items:', boardItems);

                            if (boardItems && boardItems.length > 0) {
                              const activeMembers = boardItems
                                .filter((member: any) =>
                                  !member.endDate?.displayDate &&
                                  member.startDate?.displayDate 
                                )
                                .map((member: any) => ({
                                  ...member,
                                  tenureValue: (() => {
                                    if (!member.startDate?.displayDate) return 0;
                                    let startDate = new Date(member.startDate.displayDate);
                                    if (member.startDate.displayDate.length === 4) {
                                      startDate = new Date(`${member.startDate.displayDate}-01-01`);
                                    }
                                    const diffInMonths = (new Date().getFullYear() - startDate.getFullYear()) * 12 +
                                      (new Date().getMonth() - startDate.getMonth());
                                    return Math.floor(diffInMonths / 12);
                                  })()
                                }))
                                .sort((a: any, b: any) => b.tenureValue - a.tenureValue);

                              return activeMembers.map((member: any, index: number) => (
                                <Table.Tr key={index} className="[&_td]:last:border-b-0">
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px] text-left">
                                    <h1 className="font-semibold">{member.person?.name || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left">
                                    <h1>{member.title || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[100px] text-left">
                                    <h1>{member.person?.age}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[130px] text-left">
                                    <h1>{formatDate(member.startDate?.displayDate) || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[130px] text-center">
                                    <h1 className={(() => {
                                      const tenure = calculateTenure(member.startDate?.displayDate, member.endDate?.displayDate);
                                      const tenureMatch = tenure.match(/(\d+)\s+year/);
                                      const years = tenureMatch ? parseInt(tenureMatch[1]) : 0;
                                      return years > 10 ? "text-red-700 font-semibold" : "";
                                    })()}>
                                      {calculateTenure(member.startDate?.displayDate, member.endDate?.displayDate)}
                                    </h1>
                                  </Table.Td>
                                </Table.Tr>
                              ));
                            } else {
                              console.log('No board items found. Loading:', graphQLBoardDataLoading, 'Company:', companyGlobalSearchName);
                              return !graphQLBoardDataLoading ? (
                                <Table.Tr>
                                  <Table.Td colSpan={4} className="py-4 text-center text-gray-500">
                                    {companyGlobalSearchName
                                      ? `No board members data available for ${companyGlobalSearchName}`
                                      : "Please select a company to view board members"
                                    }
                                  </Table.Td>
                                </Table.Tr>
                              ) : null;
                            }
                          })()}
                        </Table.Tbody>
                      </Table>
                    </div>
                  </TableWrapper>

                  <div className="mt-3">
                    <p className="text-sm italic text-gray-500">Source: Altrata</p>
                  </div>
                </div>
              </div>
            </div>
          </div> */}

          {/* <div className="col-span-12 xl:col-span-12">
            <CaseStudiesCard />
          </div> */}
        </div>
      </section>
      {/* </>
      } */}
    </>
  );
}

export default Main;