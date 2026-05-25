import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import Tippy from "../Base/Tippy";
import { createDynamicURL, downloadCSV } from "@/utils/helper";
import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchAGMSummaryDashboard,
  setTempSearch,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import { axiosInstance } from "@/services";
import { AppDispatch } from "@/stores/store";
import { dashboardService } from "@/services/dashboard";
import { Tab } from "@/components/Base/Headless";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";

const index = ({ companyGlobalSearchTicker, companyGlobalSearchName, isMeetingModal, institutionId = undefined, proxyContest = false, proxyContest2024 = false, proxyContest2025 = false, onLoaded = undefined }) => {

  const location = useLocation();
  const locationPathName = location?.pathname;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch: AppDispatch = useAppDispatch();
  const { agmSummaryDetails, loading, dashboardDataList, tempSearch, agmRequestStatus, agmHasData, agmErrorMessage } =
    useAppSelector((state) => state.dashboard);
  const { user } = useAppSelector((state) => state.authentiction);

  const [hasLoadingStarted, setHasLoadingStarted] = useState<boolean>(false);
  const [hasNotifiedLoaded, setHasNotifiedLoaded] = useState<boolean>(false);
  const lastRequestedYearRef = useRef<string>("");

  const { finhub, companyGlobalSearchId } = useAppSelector((state) => state.authentiction);

  const companyDetails = agmSummaryDetails?.company
    ? agmSummaryDetails?.company[0]
    : "";
  const companyName = Object.keys(companyDetails)[0];
  const meetingDetails = companyDetails[companyName];
  const meetingDate = meetingDetails?.split(" - ").pop();

  // Extract year from query parameters
  const yearFromQuery = searchParams.get("year");
  const [selectedYear, setSelectedYear] = useState<string>(
    yearFromQuery || ""
  );

  const resetCompanyScopedState = useCallback(() => {
    setSelectedYear(yearFromQuery || "");
    setHasLoadingStarted(false);
    setHasNotifiedLoaded(false);
    lastRequestedYearRef.current = "";
  }, [yearFromQuery]);

  // Reset scoped state only when the company/ticker changes (not on every agmSummaryDetails update)
  const prevTickerRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevTickerRef.current !== companyGlobalSearchTicker) {
      prevTickerRef.current = companyGlobalSearchTicker || null;
      resetCompanyScopedState();
    }
  }, [companyGlobalSearchTicker, resetCompanyScopedState]);

  // Initial fetch: when component mounts or ticker becomes available, trigger AGM fetch
  useEffect(() => {
    // If no ticker, nothing to fetch
    if (!companyGlobalSearchTicker) return;

    // If a request is already in progress, skip
    if (agmRequestStatus === 'loading') return;

    // If we already have data for this ticker and year, skip initial fetch
    const alreadyHasData = Boolean(
      agmSummaryDetails && (
        (agmSummaryDetails.Year && agmSummaryDetails.Year.toString()) ||
        (Array.isArray(agmSummaryDetails.total_year) && agmSummaryDetails.total_year.length > 0) ||
        agmSummaryDetails.company
      )
    );

    const key = `${companyGlobalSearchTicker}:${selectedYear || ''}`;
    if (lastRequestedYearRef.current === key) return;

    if (!alreadyHasData) {
      lastRequestedYearRef.current = key;
      const url = createDynamicURL(`${baseURL}/voting_report_8k/`, {
        ticker: companyGlobalSearchTicker,
        ...(selectedYear && { year: selectedYear }),
      });
      dispatch(fetchAGMSummaryDashboard(url));
    }
  }, [companyGlobalSearchTicker, selectedYear, agmSummaryDetails, agmRequestStatus, dispatch]);

  // Keep selectedYear in sync with loaded agmSummaryDetails, but do NOT reset refs here
  useEffect(() => {
    if (agmSummaryDetails?.Year && selectedYear !== agmSummaryDetails.Year.toString()) {
      setSelectedYear(agmSummaryDetails.Year.toString());
    } else if (!selectedYear && agmSummaryDetails?.total_year?.length > 0) {
      setSelectedYear(agmSummaryDetails.total_year[0].toString());
    }
  }, [agmSummaryDetails]);

  const convertDivTableToCSV = () => {
    const table = document.querySelector(".table_2");
    const rows = table?.querySelectorAll(".row_2");
    const tableProposal = document.querySelector(".table_3");
    const rowsProposal = tableProposal?.querySelectorAll(".row_3");
    let csvContent = "\uFEFF"; // Add BOM for UTF-8 encoding

    // Iterate over each row in the first table
    rows?.forEach((row) => {
      const cells = row.querySelectorAll(".cell_2");
      let rowData: any = [];

      // Iterate over each cell and get the text content
      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim(); // Get text content and trim any extra spaces

        // Check if the cell contains a comma, wrap it in double quotes
        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }

        rowData.push(cellText);
      });

      // Join cells with commas to form a CSV row
      csvContent += rowData.join(",") + "\n";
    });

    // Iterate over each row in the second table
    rowsProposal?.forEach((row) => {
      const cells = row.querySelectorAll(".cell_3");
      let rowData: any = [];

      // Iterate over each cell and get the text content
      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim();

        // Check if the cell contains a comma, wrap it in double quotes
        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }

        rowData.push(cellText);
      });

      csvContent += rowData.join(",") + "\n";
    });

    downloadCSV(csvContent, `Agm-Summary-${companyGlobalSearchTicker}-${agmSummaryDetails?.Year}`);
  };

  useEffect(() => {
    // Only handle year changes, not initial fetch (dashboard handles that)
    if (!yearFromQuery || !companyGlobalSearchTicker) {
      return;
    }

    const nextYear = yearFromQuery.toString();
    const currentYear = agmSummaryDetails?.Year?.toString();
    const requestKey = `${companyGlobalSearchTicker}:${nextYear}`;

    // If we've already requested this key, skip
    if (lastRequestedYearRef.current === requestKey) return;

    // If current loaded year already matches, skip dispatch
    if (currentYear === nextYear) {
      lastRequestedYearRef.current = requestKey;
      setSelectedYear(nextYear);
      return;
    }

    // Avoid dispatching if a request is already in-flight
    if (agmRequestStatus === 'loading') return;

    lastRequestedYearRef.current = requestKey;
    setSelectedYear(nextYear);
    const url = createDynamicURL(
      `${baseURL}/voting_report_8k/`,
      { ticker: companyGlobalSearchTicker, ...(nextYear && { year: nextYear }) }
    );
    dispatch(fetchAGMSummaryDashboard(url));
  }, [yearFromQuery, agmSummaryDetails, companyGlobalSearchTicker, dispatch]);

  useEffect(() => {
    setHasLoadingStarted(false);
    setHasNotifiedLoaded(false);
    lastRequestedYearRef.current = "";
  }, [companyGlobalSearchTicker, yearFromQuery]);

  useEffect(() => {
    if (loading) {
      setHasLoadingStarted(true);
    }
  }, [loading]);

  useEffect(() => {
    const hasData = Boolean(
      agmSummaryDetails?.company ||
      agmSummaryDetails?.Year ||
      agmSummaryDetails?.total_year?.length
    );

    if (onLoaded && !loading && !hasNotifiedLoaded && hasData) {
      onLoaded();
      setHasNotifiedLoaded(true);
    }
  }, [onLoaded, loading, hasNotifiedLoaded, agmSummaryDetails]);

  useEffect(() => {
    if (onLoaded && hasLoadingStarted && !loading && !hasNotifiedLoaded) {
      onLoaded();
      setHasNotifiedLoaded(true);
    }
  }, [onLoaded, hasLoadingStarted, loading, hasNotifiedLoaded]);

  // Handle year query parameter changes
  useEffect(() => {
    if (yearFromQuery && yearFromQuery !== selectedYear) {
      setSelectedYear(yearFromQuery);
    }
  }, [yearFromQuery]);

  useEffect(() => {
    if (selectedYear) {
      // Check if we already have data for this year in Redux
      const isAlreadyLoaded = agmSummaryDetails && agmSummaryDetails.Year?.toString() === selectedYear.toString();
      const requestKey = `${companyGlobalSearchTicker}:${selectedYear.toString()}`;

      if (!isAlreadyLoaded && lastRequestedYearRef.current !== requestKey && agmRequestStatus !== 'loading') {
        lastRequestedYearRef.current = requestKey;
        dispatch(
          fetchAGMSummaryDashboard(
            createDynamicURL(
              `${baseURL}/voting_report_8k/`, { ticker: companyGlobalSearchTicker, year: selectedYear }
            )
          )
        );
      }
    }
  }, [selectedYear, agmSummaryDetails, companyGlobalSearchTicker, dispatch])


  const handleViewMore = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    const yearToCheck = selectedYear || agmSummaryDetails?.Year;
    // Debug log for troubleshooting
    console.log('Voting Data click:', { yearToCheck, proxyContest2024, proxyContest2025, proxyContest });
    if (yearToCheck === "2025") {
      if (Boolean(proxyContest2025) === true) {
        const institutionArr = ["The Vanguard Group", "BlackRock, Inc.", "AllianceBernstein"];
        const companyArr = [companyGlobalSearchName];
        const institutions = institutionArr.map(inst => encodeURIComponent(inst)).join('||');
        const company = companyArr.map(comp => encodeURIComponent(comp)).join('||');
        const year = encodeURIComponent(yearToCheck ?? new Date().getFullYear());
        const url = `/voting-data?institution=${institutions}&company=${company}&year=${year}`;
        window.open(url, "_blank");
      } else {
        window.open(
          `vds-details/?ticker=${companyGlobalSearchTicker.split("-")[0]}&year=${yearToCheck ?? new Date().getFullYear()}`,
          "_blank"
        );
      }
    } else if (yearToCheck === "2024") {
      if (Boolean(proxyContest2024) === true) {
        const institutionArr = ["The Vanguard Group", "BlackRock, Inc.", "AllianceBernstein"];
        const companyArr = [companyGlobalSearchName];
        const institutions = institutionArr.map(inst => encodeURIComponent(inst)).join('||');
        const company = companyArr.map(comp => encodeURIComponent(comp)).join('||');
        const year = encodeURIComponent(yearToCheck ?? new Date().getFullYear());
        const url = `/voting-data?institution=${institutions}&company=${company}&year=${year}`;
        window.open(url, "_blank");
      } else {
        window.open(
          `vds-details/?ticker=${companyGlobalSearchTicker.split("-")[0]}&year=${yearToCheck ?? new Date().getFullYear()}`,
          "_blank"
        );
      }
    } else {
      if (Boolean(proxyContest) === true) {
        const institutionArr = ["The Vanguard Group", "BlackRock, Inc.", "AllianceBernstein"];
        const companyArr = [companyGlobalSearchName];
        const institutions = institutionArr.map(inst => encodeURIComponent(inst)).join('||');
        const company = companyArr.map(comp => encodeURIComponent(comp)).join('||');
        const year = encodeURIComponent(yearToCheck ?? new Date().getFullYear());
        const url = `/voting-data?institution=${institutions}&company=${company}&year=${year}`;
        window.open(url, "_blank");
      } else {
        window.open(
          `vds-details/?ticker=${companyGlobalSearchTicker.split("-")[0]}&year=${yearToCheck ?? new Date().getFullYear()}`,
          "_blank"
        );
      }
    }
  };

  const handleViewNPX = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // event.preventDefault();
    //     navigate(`npx-details/?ticker=${companyGlobalSearchTicker.split("-")[0]}`, {
    //       state: {
    //         globeSearch: companyGlobalSearchTicker,
    //       },
    // })

    // Format meeting date to YYYY-MM-DD if available
    const formatMeetingDateForURL = (dateString: string) => {
      if (!dateString) return '';
      try {
        // If it's already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          return dateString;
        }
        // Parse the date and convert to YYYY-MM-DD format
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        // Use local date to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Error formatting meeting date for URL:', error);
        return '';
      }
    };

    const formattedMeetingDate = formatMeetingDateForURL(meetingDate);
    const urlParams = new URLSearchParams({
      ticker: companyGlobalSearchTicker.split("-")[0],
      year: (agmSummaryDetails?.Year ?? new Date().getFullYear()).toString(),
      ...(formattedMeetingDate && { meeting_date: formattedMeetingDate })
    });

    window.open(`npx-details/?${urlParams.toString()}`, "_blank");
  };

  const handleViewNPXAnalytics = () => {
    const idToUse = institutionId || companyGlobalSearchId;
    if (!idToUse) return;
    const urlParams = new URLSearchParams({
      company_id: String(idToUse),
      year: (agmSummaryDetails?.Year ?? new Date().getFullYear()).toString(),
    });

    window.open(`npx-analytics/?${urlParams.toString()}`, "_blank");
  };

  const [isInstitutionList, setIsInstitutionList] = useState<boolean>(false);
  const [chartModalVisible, setChartModalVisible] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [animateChart, setAnimateChart] = useState<boolean>(false);
  const [is8kLoading, setIs8kLoading] = useState<boolean>(false);
  const [isNpxLoading, setIsNpxLoading] = useState<boolean>(false);
  const [expandedYearModal, setExpandedYearModal] = useState<{
    visible: boolean;
    year: string;
    categoryName: string;
    investors: string[];
    actionLabel: string;
    percentage: string;
  } | null>(null);

  const extractCikFromSecFilingUrl = (secUrl?: string) => {
    if (!secUrl) return null;

    const match = secUrl.match(/CIK=(\d+)/i);
    if (!match?.[1]) return null;
    return match[1].padStart(10, "0");
  };

  const handle8kLink = async () => {
    const yearToCheck = (selectedYear || agmSummaryDetails?.Year)?.toString();
    const cik = extractCikFromSecFilingUrl(finhub?.sec_filing);

    if (!yearToCheck || !cik) return;

    try {
      setIs8kLoading(true);
      const res = await fetch(
        `https://temp-8k-fetch-cd130a407e9b.herokuapp.com/api/get_proxy_voting_data_v2/?cik=${cik}`
      );

      if (!res.ok) return;

      const data = await res.json();
      const key = `url_${yearToCheck}`;
      const url = Array.isArray(data?.all_meeting_data)
        ? data.all_meeting_data
          .map((x: any) => x?.[key])
          .find((u: any) => typeof u === "string" && u.trim() !== "")
        : null;

      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("Failed to fetch 8-K link:", e);
    } finally {
      setIs8kLoading(false);
    }
  };

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

  // Download analytics handler
  const handleDownloadAnalytics = async () => {
    try {
      const response = await axiosInstance.get(
        `${baseURL}/voting_report_8k/?ticker=${companyGlobalSearchTicker}&download=true`,
        { responseType: 'blob' }
      );

      const filename = `Voting Analytics (${companyGlobalSearchTicker}).xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading analytics:', error);
    }
  };

  // Download NPX data handler
  const handleDownloadNPXData = async () => {
    const idToUse = institutionId || companyGlobalSearchId;
    const dynamicYear = (selectedYear || agmSummaryDetails?.Year || new Date().getFullYear()).toString();

    if (!idToUse) {
      console.error('Institution or Company ID not available');
      return;
    }

    try {
      setIsNpxLoading(true);
      const response = await axiosInstance.get(
        `${baseURL}/api/top20_investor_fund_level/?company_id=${idToUse}&year=${encodeURIComponent(dynamicYear)}`,
        { responseType: 'blob' }
      );

      const filename = `NPX Fund Level Data (${companyGlobalSearchTicker}).xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading NPX data:', error);
    } finally {
      setIsNpxLoading(false);
    }
  };

  // Trigger animation when modal opens
  useEffect(() => {
    if (chartModalVisible) {
      setAnimateChart(false);
      const timer = setTimeout(() => {
        setAnimateChart(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chartModalVisible]);


  // Analytics data processing
  const getAnalyticsChartData = () => {
    if (!analyticsData || !selectedYear) return [];

    const processedData = [];

    Object.entries(analyticsData).forEach(([key, value]: [string, any]) => {
      const yearData = value[selectedYear];
      if (yearData) {
        const categoryName = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        processedData.push({
          name: categoryName,
          value: parseFloat(yearData.total_percent.replace('%', '')),
          volume: yearData.volume,
          displayValue: yearData.total_percent,
          fill: ANALYTICS_COLORS[categoryName] || "#1f5582",
          rawData: value
        });
      }
    });

    return processedData;
  };

  const formatAnalyticsCategoryName = (rawKey: string) => {
    const lowerWords = new Set(["of", "on", "and", "the", "a", "an", "to", "for"]);
    const words = rawKey.replace(/_/g, " ").toLowerCase().split(" ").filter(Boolean);
    const formattedName = words
      .map((w: string, idx: number) => {
        if (idx > 0 && lowerWords.has(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");

    // Map "Shareholder Proposal" or "Shareholder Proposals" to "Other Proposals"
    if (formattedName === "Shareholder Proposal" || formattedName === "Shareholder Proposals") {
      return "Other Proposals";
    }

    return formattedName;
  };

  const getAnalyticsCategories = () => {
    if (!analyticsData) return [];

    return Object.entries(analyticsData)
      .map(([key, value]: [string, any]) => {
        const categoryName = formatAnalyticsCategoryName(key);

        return {
          name: categoryName,
          fill: ANALYTICS_COLORS[categoryName] || "#1f5582",
          rawData: value,
        };
      })
      .filter((category: any) => category?.rawData && Object.keys(category.rawData).length > 0);
  };

  // Get data for a specific year and category
  const getYearData = (categoryData: any, year: string) => {
    if (categoryData.rawData && categoryData.rawData[year]) {
      const yearData = categoryData.rawData[year];

      const investors =
        Object.entries(yearData).find(
          ([k, v]) => k.endsWith("_investors") && Array.isArray(v)
        )?.[1] || [];

      const investorsKey =
        Object.entries(yearData).find(
          ([k, v]) => k.endsWith("_investors") && Array.isArray(v)
        )?.[0] || "";

      const actionLabel = investorsKey.includes("voted_for")
        ? "Voted For"
        : investorsKey.includes("vote_against") || investorsKey.includes("voted_against")
          ? "Voted Against"
          : "Investors";

      return {
        percentage: yearData.total_percent,
        volume: yearData.volume,
        value: parseFloat(yearData.total_percent.replace('%', '')),
        investors,
        actionLabel,
      };
    }
    return null;
  };

  const ANALYTICS_COLORS = {
    "Election of Directors": "#991b1b", // Maroon (bg-primary/red-800) - Most critical voting item
    "Say on Pay": "#ea580c", // Orange - Executive compensation
    "Other Proposals": "#2563eb", // Blue - Shareholder proposals
    "Ratification of Auditor": "#16a34a" // Green - Standard procedure
  };

  const analyticsCategories = getAnalyticsCategories();

  useEffect(() => {
    // getAllInstitutionDropdown();
  }, [companyGlobalSearchTicker]);

  const getAllInstitutionDropdown = async () => {
    try {
      const res = await dashboardService.getInstitution({
        company_name: [companyGlobalSearchName],
      });
      if (res.result?.institutes?.length > 0) {
        setIsInstitutionList(true);
      }
      else {
        setIsInstitutionList(false);

      }
    } catch (error) {
      return error;
    } finally {
      // setGetDropdownLoader(false);
    }
  };

  const handleAGMYearTab = (tab: string) => {
    setSelectedYear(tab);
  };

  const handleRetryAGMFetch = () => {
    console.log('[AGM Retry] Retrying AGM summary fetch...');
    const retryYear = selectedYear || yearFromQuery || agmSummaryDetails?.Year;
    const url = createDynamicURL(`${baseURL}/voting_report_8k/`, {
      ticker: companyGlobalSearchTicker,
      ...(retryYear && { year: retryYear }),
    });
    dispatch(fetchAGMSummaryDashboard(url));
  };

  // Generate available year tabs - only show years that actually have data
  const getAvailableYears = () => {
    if (!agmSummaryDetails?.total_year?.length) return [];

    // Return the actual years that have data
    return agmSummaryDetails.total_year.map((year: any) => year.toString());
  };

  const getSelectedTabIndex = () => {
    const availableYears = getAvailableYears();
    const tabIndex = availableYears.findIndex((year: string) => year === (selectedYear?.toString() !== "" ? selectedYear?.toString() : agmSummaryDetails?.Year.toString()));
    return tabIndex >= 0 ? tabIndex : 0;
  };

  const showNpxActions = Boolean(agmSummaryDetails?.npx_check);

  return (
    <>
      {/* RENDER STATE: ERROR */}
      {agmRequestStatus === 'error' && (
        <div className="p-5 mt-3.5 box bg-white">
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <Lucide icon="AlertCircle" className="w-12 h-12 text-red-800" />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Unable to Load AGM Summary</h2>
              <p className="text-gray-600 mb-4">
                {agmErrorMessage || "An error occurred while fetching AGM summary data. Please try again."}
              </p>
            </div>
            <button
              onClick={handleRetryAGMFetch}
              className="px-6 py-2 bg-red-800 text-white rounded-md hover:bg-red-900 font-semibold flex items-center gap-2 transition-colors"
            >
              <Lucide icon="RotateCcw" className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* RENDER STATE: SUCCESS - NO DATA */}
      {agmRequestStatus === 'success' && !agmHasData && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            <h1 className="font-semibold">
              No Shareholder Meetings Found for: {companyGlobalSearchName ? companyGlobalSearchName : companyGlobalSearchTicker}.
            </h1>
        </div>
      )}

      {/* RENDER STATE: SUCCESS - WITH DATA */}
      {agmRequestStatus === 'success' && agmHasData && agmSummaryDetails?.Year && (
        <div className="p-5 mt-3.5 box ">
          <div className="w-full">
            <>
              <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                  <span>
                    <h1 className="text-lg font-bold">
                      Shareholder Meeting Summary
                    </h1>
                    <p className=" italic"> Meeting Date: {meetingDate}</p>
                  </span>

                  {!isMeetingModal && <>   {

                    agmSummaryDetails?.vds_check &&
                    dashboardDataList?.total_year?.length > 0 && (
                      <button
                        onClick={(event: any) => handleViewMore(event)}
                        className="p-2 cursor-pointer bg-white rounded-md xs:w-[240px] 
                                    md:w-auto flex items-center justify-center border-red-800 border-2
                                     font-semibold text-red-800 border-solid hover:bg-red-800 hover:border-white hover:text-white"
                      >
                        Voting Data
                      </button>
                    )}
                    {showNpxActions && (
                      <button
                        onClick={(event: any) => handleViewNPX(event)}
                        className="p-2 cursor-pointer bg-white rounded-md xs:w-[240px] 
                                   md:w-auto flex items-center justify-center border-red-800 border-2
                                    font-semibold text-red-800 border-solid hover:bg-red-800 hover:border-white hover:text-white"
                      >
                        View N-PX
                      </button>
                    )}
                    {/* NPX download and NPX analytics for admin only */}
                    {showNpxActions && user?.user_type === 'Admin' && (
                      <Tippy content="Download N-PX Data" options={{ theme: "light" }}>
                        <div className="relative">
                          <button
                            onClick={handleDownloadNPXData}
                            disabled={isNpxLoading}
                            className={clsx([
                              "p-2 bg-white rounded-md w-auto flex items-center gap-2 justify-center border-red-800 border-2 font-semibold text-red-800 border-solid",
                              isNpxLoading
                                ? "opacity-60 cursor-not-allowed"
                                : "cursor-pointer hover:bg-red-800 hover:border-white hover:text-white"
                            ])}
                          >
                            {isNpxLoading ? (
                              <Lucide icon="Loader" className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Lucide icon="Download" className="w-4 h-4" />
                                <span>N-PX</span>
                              </>
                            )}
                          </button>
                          <span className="absolute -top-1 -right-1 text-[5px] font-bold text-white bg-orange-500 rounded-full px-1 py-0 animate-pulse">
                            NEW
                          </span>
                        </div>
                      </Tippy>
                    )}
                    {showNpxActions && (
                      <div className="relative">
                        <button
                          onClick={handleViewNPXAnalytics}
                          className="p-2 cursor-pointer bg-white rounded-md xs:w-[240px] md:w-auto flex items-center justify-center border-red-800 border-2 font-semibold text-red-800 border-solid hover:bg-red-800 hover:border-white hover:text-white"
                        >
                          NPX Analytics
                        </button>
                        <span className="absolute -top-1 -right-1 text-[5px] font-bold text-white bg-orange-500 rounded-full px-1 py-0 animate-pulse">
                          BETA
                        </span>
                      </div>
                    )}
                    <button
                      disabled={
                        is8kLoading ||
                        !extractCikFromSecFilingUrl(finhub?.sec_filing) ||
                        !(selectedYear || agmSummaryDetails?.Year)
                      }
                      onClick={handle8kLink}
                      className={clsx([
                        "p-2 bg-white rounded-md min-w-[40px] h-[40px] flex items-center justify-center border-red-800 border-2 font-semibold text-red-800 border-solid",
                        is8kLoading ||
                          !extractCikFromSecFilingUrl(finhub?.sec_filing) ||
                          !(selectedYear || agmSummaryDetails?.Year)
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer hover:bg-red-800 hover:border-white hover:text-white",
                      ])}
                    >
                      {is8kLoading ? (
                        <Lucide icon="Loader" className="w-4 h-4 animate-spin" />
                      ) : (
                        "8-K"
                      )}
                    </button>
                    {analyticsData && (
                      <Tippy content="View Analytics Chart" options={{ theme: "light" }}>
                        <button
                          onClick={() => setChartModalVisible(true)}
                          className="p-2 cursor-pointer bg-white rounded-md min-w-[40px] h-[40px] flex items-center justify-center border-red-800 border-2 font-semibold text-red-800 border-solid hover:bg-red-800 hover:border-white hover:text-white"
                        >
                          <Lucide icon="BarChart3" className="w-4 h-4" />
                        </button>
                      </Tippy>
                    )}
                  </>}
                </div>
                <div className="flex justify-between items-center gap-4 xs:mt-4 md:mt-0">
                  <div className="flex justify-between items-center gap-2">
                    <h4
                      className="font-semibold cursor-pointer"
                      onClick={() => {
                        window.scrollBy({
                          top: 650,
                          behavior: "smooth",
                        });
                      }}
                    >
                      {agmSummaryDetails.Quorum ? `*Quorum: ${agmSummaryDetails?.Quorum}` : ''}
                    </h4>
                  </div>
                  <Tippy content="Download Excel" options={{ theme: "light" }}>
                    <div
                      className="box p-[5px] cursor-pointer"
                      onClick={convertDivTableToCSV}
                    >
                      <img alt="download-icon" src={downloadIcon} />
                    </div>
                  </Tippy>
                  {locationPathName === "/" && (
                    <Tippy content="Open in New Tab" options={{ theme: "light" }}>
                      <div
                        className="box p-2 cursor-pointer"
                        // onClick={() => window.open("summary-details", "_blank")}
                        onClick={() => window.open("summary-details", "_blank")}
                      >
                        <img alt="tab-icon" src={tabIcon} />
                      </div>
                    </Tippy>
                  )}
                </div>
              </div>
              {
                agmSummaryDetails.total_year?.length > 0 &&
                <div >
                  <Tab.Group selectedIndex={getSelectedTabIndex()} defaultIndex={0}>
                    <Tab.List
                      variant="boxed-tabs"
                      className="w-[100px] border-none bg-transparent"
                    >
                      {
                        getAvailableYears().map((tab: string, index: number) => (
                          <Tab key={index} className="active px-1 border-primary/10 first:rounded-l-[0.6rem] cursor-pointer
                     last:rounded-r-[0.6rem] [&[aria-selected='true']_button]:text-white [&[aria-selected='true']_button]:bg-red-800">
                            <Tab.Button
                              className="w-24 whitespace-nowrap rounded-[0.6rem] font-medium text-primary bg-primary/10 border border-primary/10 cursor-pointer"
                              as="button"
                              onClick={() => handleAGMYearTab(tab)}>
                              {tab}
                            </Tab.Button>
                          </Tab>
                        ))
                      }

                    </Tab.List>
                  </Tab.Group>
                </div>
              }

              <div className="mt-5">
                <TableWrapper 
                  isLoading={loading}
                  rows={4}
                  columns={5}
                >
                  <div
                    className={clsx([
                      locationPathName === "/" && "max-h-[400px] overflow-y-scroll"])}
                  >
                    <Table className="table_2 w-full">
                      <Table.Thead className="sticky top-0 z-10">
                        <Table.Tr className="row_2">
                          {agmSummaryDetails?.nominees_headers?.length > 0 &&
                            agmSummaryDetails?.nominees_headers?.map(
                              (nomineeHeader: any, headerIndex: number) => (
                                <Table.Td
                                  key={headerIndex}
                                  // className="cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[150px] text-right"
                                  className={clsx([
                                    "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[130px] text-left",
                                    headerIndex === 0 && "w-[200px]",
                                  ])}
                                >
                                  {nomineeHeader.header}
                                </Table.Td>
                              )
                            )}
                        </Table.Tr>
                      </Table.Thead>

                      <Table.Tbody>
                        {agmSummaryDetails?.nominees?.length > 0 &&
                          agmSummaryDetails?.nominees?.map(
                            (nominee: any, nomineeIndex: number) => (
                              <Table.Tr
                                key={nomineeIndex}
                                className="row_2 [&_td]:last:border-b-0"
                              >
                                {agmSummaryDetails?.nominees_headers?.length >
                                  0 &&
                                  agmSummaryDetails?.nominees_headers?.map(
                                    (
                                      nomineeHeader: any,
                                      headerIndex: number
                                    ) => (
                                      <Table.Td
                                        key={headerIndex}
                                        className={clsx([
                                          "cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left",
                                          headerIndex === 0 && "w-[200px]",
                                        ])}
                                      >
                                        <h1
                                          className={clsx([
                                            headerIndex === 0 &&
                                            "font-semibold ",
                                            headerIndex ===
                                            agmSummaryDetails
                                              ?.nominees_headers?.length -
                                            1 &&
                                            parseFloat(
                                              nominee[nomineeHeader?.field]
                                            ) < 85 &&
                                            "text-red-700 font-semibold",
                                          ])}
                                        >
                                          {nominee[nomineeHeader?.field]}
                                        </h1>
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
                <br />
                <TableWrapper 
                  isLoading={loading}
                  rows={4}
                  columns={5}
                >
                  <div
                    className={clsx([
                      locationPathName === "/" &&
                      " max-h-[400px] overflow-y-scroll",
                    ])}
                  >
                    <Table className="table_3 w-full">
                      <Table.Thead className="sticky top-0 z-10">
                        <Table.Tr className="row_3">
                          {agmSummaryDetails?.proposals_headers?.map(
                            (proposalHeader: any, headerIndex: number) => (
                              <Table.Td
                                key={headerIndex}
                                className={clsx([
                                  "cell_3 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[140px] text-left",
                                  headerIndex === 0 && "w-[220px]",
                                ])}
                              >
                                {proposalHeader?.header}
                              </Table.Td>
                            )
                          )}
                        </Table.Tr>
                      </Table.Thead>

                      <Table.Tbody>
                        {agmSummaryDetails?.proposals?.length > 0 &&
                          agmSummaryDetails?.proposals?.map(
                            (proposal: any, proposalIndex: number) => (
                              <Table.Tr
                                key={proposalIndex}
                                className="row_3 [&_td]:last:border-b-0"
                              >
                                {agmSummaryDetails?.proposals_headers?.length >
                                  0 &&
                                  agmSummaryDetails?.proposals_headers?.map(
                                    (
                                      proposalHeader: any,
                                      headerIndex: number
                                    ) => (
                                      <Table.Td
                                        key={headerIndex}
                                        className={clsx([
                                          "cell_3 py-2 border-dashed dark:bg-darkmode-600 text-left",
                                          headerIndex === 0 && "w-[220px]",
                                        ])}
                                      >
                                        <h1
                                          className={clsx([
                                            headerIndex === 0 &&
                                            "font-semibold ",
                                            headerIndex ===
                                            agmSummaryDetails
                                              ?.proposals_headers?.length -
                                            1 &&
                                            parseFloat(
                                              proposal[proposalHeader?.field]
                                            ) < 85 &&
                                            "text-red-700 font-semibold",
                                          ])}
                                        >
                                          {proposal[proposalHeader?.field]}
                                        </h1>
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

                <footer className="!pt-3 flex items-start flex-col">
                  <span className="!pt-3 flex items-center p-2">
                    <sup
                      className="bold-sup cursor-pointer ml-1"
                      style={{ fontSize: "0.8em" }}
                    >*</sup>
                    <p id="footnote " className="">
                      [(For + Against or Withhold + Abstain)/Shares Outstanding] (Based on Class A shares only for dual-class companies)
                    </p>
                  </span>
                </footer>
              </div>
            </>
          </div>
        </div>
      )}

      {!agmSummaryDetails && loading && (
        <div className="p-5 mt-3.5 box bg-white">
          <div className="w-full">
            <div className="flex justify-between items-center xs:flex-col md:flex-row py-3 gap-4">
              <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                <span>
                  <h1 className="text-lg font-bold">Shareholder Meeting Summary</h1>
                  <p className="italic flex items-center gap-2">
                    <span>Meeting Date:</span>
                    <span className="inline-block h-4 w-28 rounded bg-slate-200 animate-pulse" />
                  </p>
                </span>
              </div>

              <div className="flex justify-between items-center gap-4 xs:mt-4 md:mt-0">
                <div className="flex justify-between items-center gap-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span>*Quorum:</span>
                    <span className="inline-block h-4 w-20 rounded bg-slate-200 animate-pulse" />
                  </h4>
                </div>
                <div className="box p-[5px] opacity-70">
                  <img alt="download-icon" src={downloadIcon} />
                </div>
                {locationPathName === "/" && (
                  <div className="box p-2 opacity-70">
                    <img alt="tab-icon" src={tabIcon} />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Tab.Group selectedIndex={0} defaultIndex={0}>
                <Tab.List variant="boxed-tabs" className="w-[100px] border-none bg-transparent">
                  {[1, 2].map((tab) => (
                    <Tab key={tab} className="active px-1 border-primary/10 first:rounded-l-[0.6rem] last:rounded-r-[0.6rem]">
                      <Tab.Button
                        className="w-24 whitespace-nowrap rounded-[0.6rem] font-medium text-primary bg-primary/10 border border-primary/10"
                        as="button"
                      >
                        <span className="inline-block h-4 w-12 rounded bg-slate-200 animate-pulse" />
                      </Tab.Button>
                    </Tab>
                  ))}
                </Tab.List>
              </Tab.Group>
            </div>

            <div className="mt-5">
              <div className={clsx([locationPathName === "/" && "max-h-[400px] overflow-y-scroll"])}>
                <Table className="table_2 w-full">
                  <Table.Thead className="sticky top-0 z-10">
                    <Table.Tr className="row_2">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Table.Td
                          key={`agm-loading-head-1-${idx}`}
                          className={clsx([
                            "cell_2 py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[130px] text-left",
                            idx === 0 && "w-[200px]",
                          ])}
                        >
                          <div className="h-4 w-[70%] rounded bg-slate-200 animate-pulse" />
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {Array.from({ length: 4 }).map((_, rowIdx) => (
                      <Table.Tr key={`agm-loading-row-1-${rowIdx}`} className="row_2 [&_td]:last:border-b-0">
                        {Array.from({ length: 5 }).map((__, cellIdx) => (
                          <Table.Td
                            key={`agm-loading-cell-1-${rowIdx}-${cellIdx}`}
                            className={clsx([
                              "cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left",
                              cellIdx === 0 && "w-[200px]",
                            ])}
                          >
                            <div className={clsx([
                              "h-4 rounded bg-slate-200 animate-pulse",
                              cellIdx === 0 ? "w-[85%]" : "w-[60%]",
                            ])} />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>

              <br />

              <div className={clsx([locationPathName === "/" && "max-h-[400px] overflow-y-scroll"])}>
                <Table className="table_3 w-full">
                  <Table.Thead className="sticky top-0 z-10">
                    <Table.Tr className="row_3">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Table.Td
                          key={`agm-loading-head-2-${idx}`}
                          className={clsx([
                            "cell_3 py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[140px] text-left",
                            idx === 0 && "w-[220px]",
                          ])}
                        >
                          <div className="h-4 w-[70%] rounded bg-slate-200 animate-pulse" />
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {Array.from({ length: 4 }).map((_, rowIdx) => (
                      <Table.Tr key={`agm-loading-row-2-${rowIdx}`} className="row_3 [&_td]:last:border-b-0">
                        {Array.from({ length: 5 }).map((__, cellIdx) => (
                          <Table.Td
                            key={`agm-loading-cell-2-${rowIdx}-${cellIdx}`}
                            className={clsx([
                              "cell_3 py-2 border-dashed dark:bg-darkmode-600 text-left",
                              cellIdx === 0 && "w-[220px]",
                            ])}
                          >
                            <div className={clsx([
                              "h-4 rounded bg-slate-200 animate-pulse",
                              cellIdx === 0 ? "w-[85%]" : "w-[60%]",
                            ])} />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>

              <footer className="!pt-3 flex items-start flex-col">
                <span className="!pt-3 flex items-center p-2">
                  <sup className="bold-sup cursor-pointer ml-1" style={{ fontSize: "0.8em" }}>*</sup>
                  <p id="footnote " className="">
                    [(For + Against or Withhold + Abstain)/Shares Outstanding] (Based on Class A shares only for dual-class companies)
                  </p>
                </span>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* Dialog for expanded year modal */}
      <Dialog size="lg" open={chartModalVisible} onClose={() => {
        if (!expandedYearModal?.visible) {
          setChartModalVisible(false);
        }
      }}>
        <Dialog.Panel className="!max-w-[85vw] !w-[85vw]">
          <Dialog.Title>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{companyGlobalSearchName}</h2>
                </div>
              </div>
              <div
                onClick={() => {
                  if (!expandedYearModal?.visible) {
                    setChartModalVisible(false);
                  }
                }}
                className="cursor-pointer hover:bg-gray-100 p-2 rounded absolute top-4 right-6 z-10"
              >
                <Lucide icon="X" className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <div className="w-full px-6 py-2">
              {analyticsCategories.length > 0 ? (
                <>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 mb-12">
                    {analyticsCategories.map((category: any) => {
                      const years = Object.keys(category.rawData || {}).sort();
                      const yearDataList = years
                        .map((y: string) => ({ year: y, data: getYearData(category, y) }))
                        .filter((item: any) => item.data);

                      if (yearDataList.length === 0) return null;

                      const maxValue = Math.max(...yearDataList.map((item: any) => item.data?.value || 0));
                      const actionLabel = yearDataList.find((item: any) => item.data?.actionLabel)?.data?.actionLabel;

                      return (
                        <div key={category.name} className="flex flex-col bg-white rounded-lg border border-slate-200 p-4 min-w-0">
                          <div className="text-center mb-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">{category.name}</h3>
                            <div className="w-12 h-1 mx-auto rounded-full" style={{ backgroundColor: category.fill }}></div>
                          </div>

                          <div className="relative h-64 bg-slate-50 rounded-lg p-6 mb-6">
                            {/* <div className="absolute inset-x-6 inset-y-6 grid grid-cols-2 gap-8">
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className="col-span-2 border-t border-slate-200 opacity-50" style={{ marginTop: `${i * 25}%` }}></div>
                              ))}
                            </div> */}

                            <div className="relative h-full flex items-end justify-center gap-12">
                              {yearDataList.map((item: any, idx: number) => {
                                const isNoProposal = item.data?.value === 0 || item.data?.value === 0.0;
                                return (
                                  <div key={item.year} className="flex flex-col items-center">
                                    <span className="text-sm font-medium text-slate-700 mb-4 pt-4">
                                      {isNoProposal ? "No proposal" : (item.data ? item.data.percentage : '--')}
                                    </span>
                                    {!isNoProposal && (
                                      <div
                                        className="transition-all duration-700 ease-out"
                                        style={{
                                          backgroundColor: category.fill,
                                          width: '48px',
                                          height: animateChart && item.data ? `${Math.max((item.data.value / (maxValue || 1)) * 160, 30)}px` : '4px'
                                        }}
                                      ></div>
                                    )}
                                    <span className="text-xs font-medium text-slate-600 mt-3 bg-white px-3 py-1 rounded-full border">{item.year}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-auto">
                            {/* <div className="text-center mb-2">
                              <span className="text-sm font-medium text-slate-700">{actionLabel} {category.name}</span>
                            </div>
                            <div className="flex gap-2">
                              {yearDataList.map((item: any, idx: number) => (
                                <div key={item.year} className="flex-1 border border-slate-200 rounded-lg overflow-hidden relative">
                                  <div className="bg-primary text-white p-2 text-center text-sm font-medium relative">
                                    {item.year}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedYearModal({
                                          visible: true,
                                          year: item.year,
                                          categoryName: category.name,
                                          investors: item.data?.investors || [],
                                          actionLabel: actionLabel || 'Investors',
                                          percentage: item.data?.percentage || '--'
                                        });
                                      }}
                                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
                                      title="Expand view"
                                    >
                                      <Lucide icon="Maximize2" className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className={idx === 0 ? "bg-primary/10 p-3 h-[180px] overflow-y-auto" : "bg-slate-50 p-3 h-[180px] overflow-y-auto"}>
                                    {item.data?.investors?.length > 0 ? (
                                      <div className="space-y-1">
                                        {item.data.investors.map((investor: string, i: number) => (
                                          <div key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-4">
                                            <span className="mt-[6px] h-1 w-1 rounded-full bg-slate-400 shrink-0" />
                                            <span>{investor}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="h-full flex items-center justify-center">
                                        <span className="text-xs text-slate-500">--</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div> */}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">No analytics data available for {selectedYear}</p>
                </div>
              )}
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>

      {/* Expanded Year Modal */}
      <Dialog
        open={expandedYearModal?.visible || false}
        onClose={() => { }}
        staticBackdrop
      >
        <Dialog.Panel className="!max-w-[500px] !w-[500px]">
          <Dialog.Title>
            <div className="flex items-center justify-between w-full">
              <div>
                <h2 className="text-lg font-semibold">{expandedYearModal?.categoryName} - {expandedYearModal?.year}</h2>
                <p className="text-sm text-slate-600 mt-1">{expandedYearModal?.actionLabel}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedYearModal(null);
                }}
                className="cursor-pointer hover:bg-gray-100 p-2 rounded ml-auto"
              >
                <Lucide icon="X" className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <div className="bg-slate-50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
              {expandedYearModal?.investors && expandedYearModal.investors.length > 0 ? (
                <div className="space-y-2">
                  {expandedYearModal.investors.map((investor: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-slate-700 p-2 bg-white rounded border border-slate-200">
                      <span className="mt-[6px] h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="font-medium">{investor}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center">
                  <span className="text-slate-500">No investors data available</span>
                </div>
              )}
            </div>
            <div className="mt-4 text-center text-sm text-slate-500">
              Total: {expandedYearModal?.investors?.length || 0} investors
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

export default index;
