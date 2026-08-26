import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import flagIcon from "../../assets/images/zmh-images/flag-icon.png";
import caseStudiesIcon from "../../assets/images/zmh-images/case_studies.svg";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";



import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { useAppDispatch, useAppSelector } from "@/stores/hooks";

import {
  CompanyDashboard,
  fetchCompanyDashboard,
  setInstitution,
  setPage,
  setTempSearch,
} from "@/stores/dashboardSlice";

import { AppDispatch, RootState } from "@/stores/store";

import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { Fragment, useEffect, useMemo, useReducer, useState } from "react";

import { createDynamicURL, downloadCSV } from "@/utils/helper";

import Tippy from "../Base/Tippy";
import clsx from "clsx";
import LoadingIcon from "../Base/LoadingIcon";
import Button from "../Base/Button";

import Lucide from "../Base/Lucide";
import { Dialog, Tab } from "../Base/Headless";

import TradingViewWidget from "../TradingViewWidget";
import EngagementQuestionsDialog from "../EngagementQuestionsDialog";

import AddNoteModal from "@/pages/Notes/AddNotesModal";
import AddDomainNoteModal from "../DomainNotes/AddDomainNotesModal";

import {
  searchWhaleWisdom,
  scrapeSelectedWhaleWisdom,
  generateWhaleWisdomId
} from "@/pages/AIChatbot/api";

import FormCheck from "@/components/Base/Form/FormCheck";

import { toast } from "react-toastify";
import { scrapeQuickWhaleWisdom } from "@/pages/AIChatbot/api";
import { MegaphoneOff, ChevronLeft, ChevronDown } from "lucide-react";


// ✅ INTERFACE UPDATED TO ACCEPT LIFTED STATE
interface InvestorCardProps {
  onLoaded?: () => void;
  autoScrapedData?: Record<string, any>;
  pendingInvestors?: Set<string>;
}

type OwnershipYearData = {
  year?: number;
  say_on_pay_column_check?: boolean;
  holdings_data?: CompanyDashboard[];
  total_percent_ownership?: string;
  data_as_of?: string;
  analytics?: Record<string, string>;
};

type OwnershipView = "all" | "separate";

const index = ({ onLoaded, autoScrapedData = {}, pendingInvestors = new Set() }: InvestorCardProps) => {

  const [isScrapingPdf, setIsScrapingPdf] = useState(false);

  const [scrapedPdfUrl, setScrapedPdfUrl] = useState<string | null>(null);

  const [scrapeMessage, setScrapeMessage] = useState<string>("");

  const location = useLocation();

  const locationPathName = location?.pathname;

  const dispatch: AppDispatch = useAppDispatch();

  const [searchParams, setSearchParams] = useSearchParams();
  const yearFromQuery = searchParams.get("year") || "";
  const ownershipView: OwnershipView =
    searchParams.get("ownership_view") === "all" ? "all" : "separate";

  const {
    dashboardDataList,
    investorCardLoading,
    page,
    tempSearch,
    percent,
  } = useAppSelector((state) => state.dashboard);

  const {
    companyGlobalSearchName,
    companyGlobalSearchTicker,
  } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const navigate = useNavigate();

  const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;
  const searchTicker = searchParams.get("ticker");
  const [todayDate, setTodayDate] = useState("");
  const [institutionName, setInstitutionName] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [data, setData] = useState<CompanyDashboard>();
  const [addNoteModalVisible, setAddNoteModalVisible] = useState<boolean>(false);
  const [chartModalVisible, setChartModalVisible] = useState<boolean>(false);
  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});
  const [hasLoadingStarted, setHasLoadingStarted] = useState<boolean>(false);
  const [hasNotifiedLoaded, setHasNotifiedLoaded] = useState<boolean>(false);

  const allYearData: OwnershipYearData[] = useMemo(() => {
    const data = Array.isArray((dashboardDataList as any)?.all_year_data)
      ? [...(dashboardDataList as any).all_year_data]
      : [];

    return data.sort((a, b) => Number(b?.year || 0) - Number(a?.year || 0));
  }, [dashboardDataList]);

  const latestYearData = allYearData[0];

  const [summaryModalVisible, setSummaryModalVisible] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [showFilerModal, setShowFilerModal] = useState<boolean>(false);
  const [showAdvBrochure, setShowAdvBrochure] = useState<boolean>(false);
  const [filerOptions, setFilerOptions] = useState<any[]>([]);
  const [selectedFilerLink, setSelectedFilerLink] = useState<string>("");
  const [activeInstitutionName, setActiveInstitutionName] = useState<string>("");

  // Helper to normalize names
  const normalizeInstitutionName = (name: string) => {
  return (name || "")
    .toLowerCase()
    // Strips out legal entities AND generic financial words so "Boothbay Fund Management" matches "Boothbay"
    .replace(
      /\b(lp|l\.p\.|llc|l\.l\.c\.|llp|l\.l\.p\.|inc|inc\.|corp|corp\.|corporation|co|co\.|company|ltd|ltd\.|management|mgt|capital|cap|partners|fund|funds|group|asset|assets|investment|investments|holdings)\b/g,
      ""
    )
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

const getNormalizedScrapedInfo = (name: string) => {
  if (!name) return {};

  const target = normalizeInstitutionName(name);

  const autoKey = Object.keys(autoScrapedData).find(
    (k) => normalizeInstitutionName(k) === target
  );

  return autoKey ? autoScrapedData[autoKey] : {};
};

  const handleViewSummary = async (institutionName: string | undefined) => {
    if (!institutionName) return;
    
    setActiveInstitutionName(institutionName);
    const backgroundCachedData = getNormalizedScrapedInfo(institutionName);

    // 🌟 THE FIX: Directly trust the bulk Redux payload!
    // No more enforcing `.status === "success"`, as Redux drops that flag on page refresh.
    const hasSummaryText = backgroundCachedData && (backgroundCachedData.investment_strategy || backgroundCachedData.whale_wisdom_summary);
    const isScraping = backgroundCachedData?.status === "scraping" || pendingInvestors.has(institutionName);

    if (hasSummaryText && !isScraping && !backgroundCachedData.error) {
      setSummaryData(backgroundCachedData);
      setSummaryModalVisible(true);
      return; 
    }

    setSummaryLoading(true);

    try {
      const result = await searchWhaleWisdom(institutionName);
      
      if (result) {
        let strategy = result.investment_strategy || result.whale_wisdom_summary || result.adv_item4_summary;
        if (!strategy || strategy.length < 10) {
           strategy = "Overview not publicly listed on this profile.";
        }
        setSummaryData({ ...result, investment_strategy: strategy });
        setSummaryModalVisible(true);
      } else {
        toast.error("Invalid data format received from S3.");
      }
   } catch (error: any) {
      if (error.message && error.message.includes("404")) {
        try {
          const genResult = await generateWhaleWisdomId(institutionName);
          if (genResult && genResult.filers) {
            
            // Automatically scrape if exactly 1 match! No popup!
            if (genResult.filers.length === 1) {
              const data = await scrapeQuickWhaleWisdom(institutionName, genResult.filers[0].link);
              setSummaryData(data);
              setSummaryModalVisible(true);
            } else if (genResult.filers.length > 1) {

            // Show popup if multiple options
              setFilerOptions(genResult.filers);
              setSelectedFilerLink("");
              setShowFilerModal(true);
            } else {
              toast.error("No profiles found on WhaleWisdom for this investor.");
            }
          }
       } catch (genError) {
          // 🌟 UPDATED SPECIFIC ERROR MESSAGE HERE
          toast.error(`No such investor found with the name "${institutionName}" on WhaleWisdom.`);
        }
      } else {
        toast.error("An error occurred while fetching the summary.");
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const confirmFilerSelection = async () => {
    if (!selectedFilerLink) {
      toast.error("Please select a profile from the list.");
      return;
    }

    setShowFilerModal(false);
    setSummaryModalVisible(true);
    setSummaryLoading(true);

    try {
      const data = await scrapeQuickWhaleWisdom(activeInstitutionName, selectedFilerLink);
      setSummaryData(data);
    } catch (error) {
      toast.error("Failed to scrape the selected profile.");
    } finally {
      setSummaryLoading(false);
    }
  };

  // Helper to format the scraped strategy text into paragraphs and bullet points
 const renderFormattedStrategy = (text: string) => {
    if (!text || text === "Overview not publicly listed on this profile.") {
      return text;
    }

    // 🌟 FIX: Normalize literal '\n' string characters and carriage returns 
    // so the split actually works on the raw database text.
    const normalizedText = text.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

    return normalizedText.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines to prevent awkward spacing
      if (!trimmedLine) return null; 

      if (trimmedLine.startsWith('-')) {
        return (
          <li key={index} className="ml-4 mb-1 list-disc text-slate-700">
            {trimmedLine.substring(1).trim()}
          </li>
        );
      }
      return (
        <p key={index} className="mb-2 text-slate-700">
          {trimmedLine}
        </p>
      );
    });
  };


  // 🌟 Polling for scrape status now happens in exactly one place: the
  // parent (ZMHDashboard) already polls /poll-status via the AI-chatbot
  // API and passes the results down as `autoScrapedData`/`pendingInvestors`.
  // This component used to run its own second, independent polling loop
  // straight to `baseURL` (the main dashboard API, which has no
  // /poll-status route at all) — every tick 404'd, forever, for every
  // investor still "scraping". Removed rather than re-pointed at the
  // right host, since polling twice for the same thing was never needed.

  useEffect(() => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString("en-US", { month: "long" });
    const year = today.getFullYear();
    const formattedDate = `${month} ${day}, ${year}`;
    setTodayDate(formattedDate);
  }, []);

  useEffect(() => {
    if (companyGlobalSearchTicker !== tempSearch) {
      setSelectedYear("");
    }
    setHasLoadingStarted(false);
    setHasNotifiedLoaded(false);
  }, [companyGlobalSearchTicker, searchTicker, tempSearch]);

  useEffect(() => {
    if (investorCardLoading) {
      setHasLoadingStarted(true);
    }
  }, [investorCardLoading]);

  useEffect(() => {
    if (onLoaded && hasLoadingStarted && !investorCardLoading && !hasNotifiedLoaded) {
      onLoaded();
      setHasNotifiedLoaded(true);
    }
  }, [onLoaded, hasLoadingStarted, investorCardLoading, hasNotifiedLoaded]);

  useEffect(() => {
    const hasData = Boolean(
      dashboardDataList?.all_year_data?.length ||
      dashboardDataList?.total_year?.length ||
      dashboardDataList?.length
    );

    if (onLoaded && !investorCardLoading && !hasNotifiedLoaded && hasData) {
      onLoaded();
      setHasNotifiedLoaded(true);
    }
  }, [onLoaded, investorCardLoading, hasNotifiedLoaded, dashboardDataList]);

  const convertDivTableToCSV = () => {
    const table = document.querySelector(".table");
    const rows = table?.querySelectorAll(".row");
    let csvContent = "";

    rows?.forEach((row) => {
      const cells = row.querySelectorAll(".cell");
      let rowData: any = [];

      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim(); 
        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }

        if (cellText?.includes("✔")) {
          cellText = `"Yes"`;
        }

        rowData.push(cellText);
      });

      csvContent += rowData.join(",") + "\n";
    });

    downloadCSV(csvContent, `Investor-${ticker}`);
  };

  const handleGenerateReport = () => {
    if (ticker) {
      window.open(`/company-report?ticker=${encodeURIComponent(ticker)}`, "_blank");
    }
  };

  const redirectCaseStudy = (institution_name: string) => {
    navigate(`/case-studies?institution_name=${encodeURIComponent(institution_name)}`);
  };

  const openEngagementQuestionsDialog = (dashboard: CompanyDashboard) => {
    setData(dashboard);
    setIsDialogOpen(true);
  };

  const openAddNotesDialog = (dashboard: CompanyDashboard) => {
    setData(dashboard);
    setAddNoteModalVisible(true)
  };

  const [selectedYear, setSelectedYear] = useState<string>(yearFromQuery);

  const getAvailableYears = () => {
    if (allYearData.length > 0) {
      return allYearData
        .map((yearData) => yearData?.year?.toString())
        .filter((year): year is string => Boolean(year));
    }

    if (!dashboardDataList?.total_year?.length) return [];
    return [...dashboardDataList.total_year]
      .map((year: any) => year.toString())
      .sort((a: string, b: string) => Number(b) - Number(a));
  };

  const activeYear =
    selectedYear?.toString() !== ""
      ? selectedYear?.toString()
      : latestYearData?.year?.toString();

  const selectedYearData =
    allYearData.find((yearData) => yearData?.year?.toString() === activeYear) ||
    latestYearData;

  const displayYearData = ownershipView === "all" ? latestYearData : selectedYearData;

  const showSayOnPayColumn = selectedYearData?.say_on_pay_column_check === true;
  const isColumnGrayedOut = !showSayOnPayColumn;

  const currentHoldings: CompanyDashboard[] = useMemo(() => {
    const holdings = selectedYearData?.holdings_data;
    return Array.isArray(holdings) ? holdings : [];
  }, [selectedYearData]);

  const handleOwnershipViewChange = (view: OwnershipView) => {
    setSearchParams((previousParams) => {
      const params = new URLSearchParams(previousParams);
      params.set("ownership_view", view);
      return params;
    });
  };

  const getHoldingLookupKey = (holding?: Partial<CompanyDashboard> | null) => {
    if (!holding) return "";
    if (holding.institution_id) return `institution:${holding.institution_id}`;

    const normalizedName = (holding.institution_name || holding.filer_name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    if (normalizedName) return `name:${normalizedName}`;
    if (holding.filer_id) return `filer:${holding.filer_id}`;
    return "";
  };

  const mergedAllYearRows = useMemo(() => {
    const latestHoldings = Array.isArray(latestYearData?.holdings_data)
      ? latestYearData.holdings_data
      : [];

    if (!latestHoldings.length) {
      return [];
    }

    const holdingsByYear = new Map<string, Map<string, CompanyDashboard>>();

    allYearData.forEach((yearData) => {
      const perYearMap = new Map<string, CompanyDashboard>();
      const holdings = Array.isArray(yearData?.holdings_data) ? yearData.holdings_data : [];

      holdings.forEach((holding) => {
        const key = getHoldingLookupKey(holding);
        if (key && !perYearMap.has(key)) {
          perYearMap.set(key, holding);
        }
      });

      if (yearData?.year) {
        holdingsByYear.set(yearData.year.toString(), perYearMap);
      }
    });

    return latestHoldings.map((holding, index) => {
      const key = getHoldingLookupKey(holding);
      const yearlyVotes = allYearData.reduce<Record<string, CompanyDashboard | undefined>>(
        (accumulator, yearData) => {
          const yearKey = yearData?.year?.toString();
          if (!yearKey) {
            return accumulator;
          }

          accumulator[yearKey] = key ? holdingsByYear.get(yearKey)?.get(key) : undefined;
          return accumulator;
        },
        {}
      );

      return {
        index: index + 1,
        holding,
        yearlyVotes,
      };
    });
  }, [allYearData, latestYearData]);

  // Dynamic year context for column header tooltips (no hardcoded 2024/2025).
  // The latest "expected" meeting year is the current calendar year; if it is
  // not among the available data years, displayed data falls back to the most
  // recent available year.
  const currentExpectedYear = new Date().getFullYear();
  const latestAvailableYear = (() => {
    const years = getAvailableYears()
      .map((y: string) => Number(y))
      .filter((n: number) => !isNaN(n));
    return years.length ? Math.max(...years).toString() : (currentExpectedYear - 1).toString();
  })();
  const isLatestMeetingMissing = !getAvailableYears().includes(currentExpectedYear.toString());

  useEffect(() => {
    if (yearFromQuery && yearFromQuery !== selectedYear) {
      setSelectedYear(yearFromQuery);
      return;
    }

    if (!yearFromQuery && selectedYear !== "") {
      setSelectedYear("");
    }
  }, [yearFromQuery, selectedYear]);

  const getAnalyticsData = () => {
    const analyticsData = displayYearData?.analytics;
    if (!analyticsData) return [];

    return Object.entries(analyticsData).map(([key, value]) => ({
      name: key,
      value: parseFloat(String(value).replace('%', '')),
      displayValue: String(value)
    }));
  };

  const renderVotingStatus = (value: any, message?: string, fallbackMessage?: string) => {
    const truthy = new Set(["true", "yes", "y", "1", "t"]);
    const falsy = new Set(["false", "no", "n", "0", "f"]);
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

    if (
      value === true ||
      truthy.has(normalized) ||
      (Array.isArray(value) && value.length > 0) ||
      (typeof value === "number" && value > 0)
    ) {
      return (
        <div className="flex w-full items-center justify-center">
          <div className="bg-[#FF2A2A] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white">
            &#10004;
          </div>
        </div>
      );
    }

    if (
      value === false ||
      value === null ||
      value === undefined ||
      value === "" ||
      falsy.has(normalized) ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "number" && value === 0)
    ) {
      return null;
    }

    if (typeof value === "string") {
      return (
        <div className="flex w-full items-center justify-center text-primary">
          <Tippy content={message || fallbackMessage || "No Data"} options={{ theme: "light" }}>
            <span className="inline-flex items-center justify-center">
              <MegaphoneOff size={18} strokeWidth={1.2} absoluteStrokeWidth />
            </span>
          </Tippy>
        </div>
      );
    }

    return null;
  };

  const ANALYTICS_COLORS = ["#4F83FF", "#E74C8C", "#9B59B6", "#1ABC9C", "#F39C12"];

  return (
    <>
      {location.pathname !== "/" && (
        <Button
          onClick={() => {
            navigate("/");
          }}
          variant="primary"
          className="bg-theme-2 border-bg-theme-2 mb-4"
        >
          <ChevronLeft
            className="group-[.mode--light]:text-white text-white"
            size={18}
            strokeWidth={1.5}
          />
          Back
        </Button>
      )}
      {(dashboardDataList?.length !== 0 || investorCardLoading) && (
        <>
          <div className="p-5 mt-3.5 box">
            <div className="w-full">
              <div className="flex justify-between items-center xs:flex-col sm:flex-row py-3">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold">
                    Top {dashboardDataList?.length || 20} Investors{" "}
                    {displayYearData?.total_percent_ownership && (
                      <span className="text-lg font-bold">
                        ({displayYearData.total_percent_ownership} of shares outstanding)
                      </span>
                    )}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <img alt="flag-icon" src={flagIcon} />
                  <h4 className="font-semibold mr-4">
                    History of Schedule 13D Filing
                  </h4>
                  <Tippy content="Download Excel" options={{ theme: "light" }}>
                    <div
                      className="box p-[5px] cursor-pointer"
                      onClick={convertDivTableToCSV}
                    >
                      <img alt="download-icon" src={downloadIcon} />
                    </div>
                  </Tippy>
                  {locationPathName === "/" && (
                    <Tippy content="Expand View" options={{ theme: "light" }}>
                      <div
                        className="box p-2 cursor-pointer"
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (ticker) {
                            params.set("ticker", ticker);
                          }
                          if (ownershipView) {
                            params.set("ownership_view", ownershipView);
                          }
                          if (selectedYear) {
                            params.set("year", selectedYear);
                          }
                          navigate(`/investor-details?${params.toString()}`);
                        }}
                      >
                        <img alt="tab-icon" src={tabIcon} />
                      </div>
                    </Tippy>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-4">
                  <Tab.Group selectedIndex={ownershipView === "separate" ? 0 : 1}>
                    <Tab.List
                      variant="boxed-tabs"
                      className="w-fit border-none bg-transparent"
                    >
                      <Tab className="active px-1 border-primary/10 first:rounded-l-[0.6rem] cursor-pointer [&[aria-selected='true']_button]:text-white [&[aria-selected='true']_button]:bg-red-800">
                        <Tab.Button
                          className="w-32 whitespace-nowrap rounded-[0.6rem] font-medium text-primary bg-primary/10 border border-primary/10 cursor-pointer"
                          as="button"
                          onClick={() => handleOwnershipViewChange("separate")}
                        >
                          Latest
                        </Tab.Button>
                      </Tab>
                      <Tab className="active px-1 border-primary/10 last:rounded-r-[0.6rem] cursor-pointer [&[aria-selected='true']_button]:text-white [&[aria-selected='true']_button]:bg-red-800">
                        <Tab.Button
                          className="w-52 whitespace-nowrap rounded-[0.6rem] font-medium text-primary bg-primary/10 border border-primary/10 cursor-pointer"
                          as="button"
                          onClick={() => handleOwnershipViewChange("all")}
                        >
                          Year-on-Year Comparison
                        </Tab.Button>
                      </Tab>
                    </Tab.List>
                  </Tab.Group>
                </div>

                <div className="grid gap-6 grid-cols-1">
                  <div className="col-span-1">
                    {ownershipView === "all" && (
                      <TableWrapper>
                        <div
                          className={clsx([
                            locationPathName === "/" && "max-h-[600px]",
                            "max-h-[60vh] overflow-y-auto overflow-x-hidden"
                          ])}
                        >
                          <Table className="table w-full table-fixed">
                            <Table.Thead className="sticky top-0 z-10 bg-header [&_tr]:bg-header [&_td]:bg-header">
                              <Table.Tr className="row bg-header">
                                <Table.Td rowSpan={2} className="cell w-[36px] px-2 text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2] align-middle text-center">
                                  No.
                                </Table.Td>
                                <Table.Td rowSpan={2} className="cell w-[180px] px-3 text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2] align-middle text-left">
                                  Shareholder
                                </Table.Td>
                                <Table.Td rowSpan={2} className="cell w-[88px] px-2 text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2] align-middle text-center whitespace-normal leading-tight">
                                  <span
                                    id="footnote-1"
                                    className="cursor-pointer"
                                    onClick={() => {
                                      window.scrollBy({
                                        top: 350,
                                        behavior: "smooth",
                                      });
                                    }}
                                  >
                                    Current Ownership
                                    <sup
                                      className="bold-sup cursor-pointer"
                                      style={{ fontSize: "0.8em" }}
                                    >
                                      1
                                    </sup>
                                  </span>
                                </Table.Td>
                                <Table.Td rowSpan={2} className="cell w-[122px] px-2 text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2] whitespace-normal leading-tight align-middle text-left">
                                  <span>Proxy Advisory Influence {displayYearData?.analytics && (
                                    <Tippy content="View Analytics Chart" options={{ theme: "light" }}>
                                      <Lucide
                                        icon="BarChart3"
                                        className="w-4 h-4 ml-1 text-primary cursor-pointer inline hover:text-primary/80"
                                        onClick={() => setChartModalVisible(true)}
                                      />
                                    </Tippy>
                                  )}
                                  </span>
                                </Table.Td>
                                {allYearData.map((yearData) => (
                                  <Table.Td
                                    key={`year-header-${yearData?.year}`}
                                    colSpan={2}
                                    className="cell relative z-10 px-1 text-[13px] py-2 font-semibold h-[40px] bg-header border-[#0000000D] border-b-0 text-[#000000B2] text-center before:absolute before:bottom-[-2px] before:left-0 before:right-0 before:h-[4px] before:bg-[#f1f5f9] before:content-[''] after:absolute after:top-0 after:bottom-0 after:left-0 after:w-px after:bg-slate-300 after:content-['']"
                                  >
                                    {yearData?.year}
                                  </Table.Td>
                                ))}
                              </Table.Tr>
                              <Table.Tr className="row bg-header">
                                {allYearData.map((yearData) => (
                                  <Fragment key={`year-subheader-${yearData?.year}`}>
                                    <Table.Td className="cell relative z-10 w-[72px] px-1 text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2] text-center whitespace-normal leading-tight before:absolute before:left-0 before:right-0 before:top-[-2px] before:h-[4px] before:bg-[#f1f5f9] before:content-[''] after:absolute after:top-0 after:bottom-0 after:left-0 after:w-px after:bg-slate-300 after:content-['']">
                                      Voted Against Directors
                                    </Table.Td>
                                    <Table.Td className="cell relative z-10 w-[72px] px-1 text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2] text-center whitespace-normal leading-tight before:absolute before:left-0 before:right-0 before:top-[-2px] before:h-[4px] before:bg-[#f1f5f9] before:content-['']">
                                      Voted Against Say on Pay
                                    </Table.Td>
                                  </Fragment>
                                ))}
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {investorCardLoading &&
                                Array.from({ length: 10 }).map((_, rowIdx) => (
                                  <Table.Tr key={`all-years-skeleton-${rowIdx}`} className="row [&_td]:last:border-b-0">
                                    {Array.from({ length: 4 + allYearData.length * 2 }).map((_, colIdx) => (
                                      <Table.Td key={colIdx} className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div
                                          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                                          style={{ width: `${[85, 70, 60, 75, 55, 65, 80, 50, 72][(rowIdx + colIdx) % 9]}%` }}
                                        />
                                      </Table.Td>
                                    ))}
                                  </Table.Tr>
                                ))}

                              {!investorCardLoading && mergedAllYearRows.length === 0 && (
                                <Table.Tr className="row">
                                  <Table.Td colSpan={4 + allYearData.length * 2} className="py-10 text-center font-semibold text-slate-500">
                                    No Ownership data found for this company.
                                  </Table.Td>
                                </Table.Tr>
                              )}

                              {!investorCardLoading &&
                                mergedAllYearRows.length > 0 &&
                                mergedAllYearRows.map(({ holding, index, yearlyVotes }) => {
                                  const scrapedInfo = getNormalizedScrapedInfo(holding?.institution_name);
                                  const rawProxy = holding?.proxy_advisor_influence || scrapedInfo?.proxy_influence;
                                  const dynInstId = holding?.institution_id || scrapedInfo?.institution_id || scrapedInfo?.id || holding?.investor_profile_id;
                                  const isInternallyCovered = typeof rawProxy === "string" && rawProxy.toLowerCase().includes("internal");
                                  const isCoveredInDB = Boolean(dynInstId || holding?.is_doc === true || isInternallyCovered);

                                  return (
                                    <Table.Tr
                                      key={`${holding?.filer_id ?? holding?.institution_name ?? "row"}-${index}`}
                                      className="row [&_td]:last:border-b-0"
                                    >
                                      <Table.Td className="cell px-2 py-2 h-[50px] border-dashed dark:bg-darkmode-600 align-middle text-[13px]">
                                        <div className="flex items-center font-semibold justify-center">{index}</div>
                                      </Table.Td>
                                      <Table.Td className="relative w-full px-3 py-2 border-dashed dark:bg-darkmode-600 align-middle">
                                        <div className="flex min-w-0 items-start gap-2">
                                          {!isCoveredInDB && (
                                            <sup
                                              className="cursor-pointer text-base absolute left-0.5 top-1/2 -translate-y-1/2 text-red-500"
                                              onClick={() => {
                                                window.scrollBy({ top: 350, behavior: "smooth" });
                                              }}
                                            >
                                              *
                                            </sup>
                                          )}
                                          <h1
                                            onClick={() => {
                                              if (holding?.is_doc === true && dynInstId) {
                                                window.open(`/investor-company-details/${dynInstId}`, "_blank");
                                              }
                                            }}
                                            className={clsx([
                                              "block min-w-0 max-w-[165px] break-words whitespace-normal capitalize font-semibold leading-tight text-[13px]",
                                              holding?.is_doc === true && dynInstId ? "cursor-pointer underline" : "",
                                            ])}
                                          >
                                            {holding?.institution_name}
                                          </h1>
                                          {holding?.flag_13d === true && (
                                            <img className="ml-1 mt-0.5 w-3 shrink-0" alt="flag-icon" src={flagIcon} />
                                          )}
                                        </div>
                                      </Table.Td>
                                      <Table.Td className="cell px-2 py-2 border-dashed dark:bg-darkmode-600 text-left align-middle text-[13px]">
                                        <div className="whitespace-nowrap flex items-center justify-center">
                                          {holding?.percent_ownership}%
                                        </div>
                                      </Table.Td>
                                      <Table.Td className="cell px-2 py-2 border-dashed dark:bg-darkmode-600 text-left align-middle text-[13px]">
                                        <div className="whitespace-normal break-words leading-tight text-left">
                                          {!rawProxy || rawProxy === "Not Disclosed" || rawProxy.toLowerCase() === "not disclosed" ? (
                                            <span className="text-gray-400">-</span>
                                          ) : (
                                            rawProxy
                                          )}
                                        </div>
                                      </Table.Td>
                                      {allYearData.map((yearData) => {
                                        const yearKey = yearData?.year?.toString() || "";
                                        const yearHolding = yearlyVotes[yearKey];

                                        return (
                                          <Fragment key={`${holding?.filer_id ?? holding?.institution_name ?? "row"}-${yearKey}`}>
                                            <Table.Td className="cell relative px-1 py-2 border-dashed dark:bg-darkmode-600 text-center align-middle after:absolute after:top-0 after:bottom-0 after:left-0 after:w-px after:bg-slate-200 after:content-['']">
                                              {renderVotingStatus(
                                                yearHolding?.voted_against_directors,
                                                yearHolding?.voted_against_directors_message,
                                                "No Data"
                                              )}
                                            </Table.Td>
                                            <Table.Td className="cell px-1 py-2 border-dashed dark:bg-darkmode-600 text-center align-middle">
                                              {renderVotingStatus(
                                                yearHolding?.voted_against_say_on_pay,
                                                yearHolding?.voted_against_say_on_pay_message,
                                                yearKey ? `Say on Pay not on ballot at ${yearKey} shareholder meeting` : "No Data"
                                              )}
                                            </Table.Td>
                                          </Fragment>
                                        );
                                      })}
                                    </Table.Tr>
                                  );
                                })}
                            </Table.Tbody>
                          </Table>
                        </div>
                      </TableWrapper>
                    )}

                    {ownershipView === "separate" && (
                    <TableWrapper>
                      <div
                        className={clsx([
                          locationPathName === "/" &&
                          "max-h-[600px]",
                          "max-h-[60vh] overflow-y-auto overflow-x-auto"
                        ])}
                      >
                        <Table className="table w-full">
                          <Table.Thead>
                            <Table.Tr className="row">
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                No.
                              </Table.Td>
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] min-w-[240px]">
                                Shareholder
                              </Table.Td>
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                <span
                                  id="footnote-1"
                                  className="cursor-pointer"
                                  onClick={() => {
                                    window.scrollBy({
                                      top: 350,
                                      behavior: "smooth",
                                    });
                                  }}
                                >
                                  Ownership
                                  <sup
                                    className="bold-sup cursor-pointer"
                                    style={{ fontSize: "0.8em" }}
                                  >
                                    1
                                  </sup>
                                </span>
                              </Table.Td>
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] min-w-[150px] whitespace-normal leading-tight">
                                <span>Proxy Advisory Influence {displayYearData?.analytics && (
                                  <Tippy content="View Analytics Chart" options={{ theme: "light" }}>
                                    <Lucide
                                      icon="BarChart3"
                                      className="w-4 h-4 ml-1 text-primary cursor-pointer inline hover:text-primary/80"
                                      onClick={() => setChartModalVisible(true)}
                                    />
                                  </Tippy>
                                )}
                                </span>
                              </Table.Td>
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                UN PRI Signatory
                              </Table.Td>
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                <span
                                  id="footnote-1"
                                  className="cursor-pointer"
                                  onClick={() => {
                                    window.scrollBy({
                                      top: 350,
                                      behavior: "smooth",
                                    });
                                  }}
                                >
                                  Engaged with Company
                                  <sup
                                    className="bold-sup cursor-pointer"
                                    style={{ fontSize: "0.8em" }}
                                  >
                                    2
                                  </sup>
                                </span>
                              </Table.Td>
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                Engagement Topic
                              </Table.Td>
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                <div className="flex items-center justify-center gap-1">
                                  Voted Against Directors
                                  {isLatestMeetingMissing && (
                                    <Tippy content={`${currentExpectedYear} meeting not held yet. Data based on ${latestAvailableYear} voting details`} options={{ theme: "light" }}>
                                      <Lucide icon="Info" className="w-4 h-4 text-gray-600 cursor-pointer" />
                                    </Tippy>
                                  )}
                                </div>
                              </Table.Td>
                              <Table.Td className={`cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] ${isColumnGrayedOut ? 'text-gray-400' : 'text-[#000000B2]'}`}>
                                <div className="flex items-center justify-center gap-1">
                                  Voted Against Say on Pay
                                  {(isColumnGrayedOut || isLatestMeetingMissing) && (
                                    <Tippy content={isColumnGrayedOut ? `Say on Pay not on ballot at ${activeYear || currentExpectedYear} shareholder meeting` : `${currentExpectedYear} meeting not held yet. Data based on ${latestAvailableYear} voting details`} options={{ theme: "light" }}>
                                      <Lucide icon="Info" className="w-4 h-4 text-gray-600 cursor-pointer" />
                                    </Tippy>
                                  )}
                                </div>
                              </Table.Td>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {investorCardLoading &&
                              Array.from({ length: 10 }).map((_, rowIdx) => (
                                <Table.Tr key={`skeleton-${rowIdx}`} className="row [&_td]:last:border-b-0">
                                  {Array.from({ length: 9 }).map((_, colIdx) => (
                                    <Table.Td key={colIdx} className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                      <div
                                        className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                                        style={{ width: `${[85, 70, 60, 75, 55, 65, 80, 50, 72][(rowIdx + colIdx) % 9]}%` }}
                                      />
                                    </Table.Td>
                                  ))}
                                </Table.Tr>
                              ))}

                            {!investorCardLoading && currentHoldings.length === 0 && (
                              <Table.Tr className="row">
                                <Table.Td colSpan={9} className="py-10 text-center font-semibold text-slate-500">
                                  No Ownership data found for this company.
                                </Table.Td>
                              </Table.Tr>
                            )}

                            {!investorCardLoading &&
                              currentHoldings.length > 0 &&
                              currentHoldings.map(
                                (dashboard: CompanyDashboard, index: number) => (
                                  <Table.Tr
                                    key={`${dashboard.filer_id ?? dashboard.institution_name ?? "row"}-${index}`}
                                    className="row [&_td]:last:border-b-0"
                                  >
                                    {dashboard?.institution_name && (
                                      <>
                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                          <div className="flex items-center font-semibold ">
                                            {index + 1}
                                          </div>
                                        </Table.Td>
      
      <Table.Td className="relative w-full min-w-[320px] px-4 py-2 pr-28">
    <div className="flex min-w-0 items-start gap-2">
        
        {/* 🌟 1. Grab the ID from either the DB OR the background scraped data */}
        {(() => {
  const name = dashboard?.institution_name;
  const scrapedInfo = getNormalizedScrapedInfo(name);
  
  // 1. Broaden the ID extraction to catch IDs that might be named differently
  const dynInstId = 
    dashboard?.institution_id || 
    scrapedInfo?.institution_id || 
    scrapedInfo?.id || 
    dashboard?.investor_profile_id;
    
  const isActivelyScraping =
    (scrapedInfo.status === "scraping" || scrapedInfo.error === "Not found in S3 cache." || pendingInvestors.has(name)) &&
    scrapedInfo.status !== "success" &&
    scrapedInfo.status !== "failed";

  // 2. NEW: Add a robust fallback check. If it's flagged as "Internal" or has a document, it IS in the DB!
  const rawProxy = scrapedInfo?.proxy_influence || dashboard?.proxy_advisor_influence;
  const isInternallyCovered = typeof rawProxy === 'string' && rawProxy.toLowerCase().includes('internal');
  const isCoveredInDB = Boolean(dynInstId || dashboard?.is_doc === true || isInternallyCovered);

  return (
    <>
      {/* 3. Use isCoveredInDB instead of just dynInstId to hide the asterisk */}
      {!isCoveredInDB && !isActivelyScraping && (
        <sup
          className="cursor-pointer text-lg absolute left-2 top-1 text-red-500"
          onClick={() => {
            window.scrollBy({ top: 350, behavior: "smooth" });
          }}
        >
          *
        </sup>
      )}
    
     <h1
  onClick={() => {
    // Only open the link if documents are available for this investor
    if (dashboard?.is_doc === true && dynInstId) {
      window.open(`/investor-company-details/${dynInstId}`, "_blank");
    }
  }}
  className={clsx([
    "block min-w-0 max-w-[260px] break-words whitespace-normal capitalize font-semibold leading-tight",
    dashboard?.is_doc === true && dynInstId ? "cursor-pointer underline" : "",
  ])}
>
  {dashboard?.institution_name}
</h1>

      {isActivelyScraping && (
         <Lucide icon="Loader2" className="w-4 h-4 ml-2 text-red-700 animate-spin inline-block" />
      )}
    </>
  );
})()}

      {dashboard?.flag_13d === true && (
        <img className="ml-2 w-3 shrink-0" alt="flag-icon" src={flagIcon} />
      )}
   {/* ========================================== */}
    {/* 2. ACTION BUTTONS (EYE ICON LOGIC)         */}
    {/* ========================================== */}
    {/* 2. SILENT ACTION TRAYS (CLEAN RENDER VIEW) */}
    {/* ========================================== */}
    <div className="absolute right-3 top-1/2 flex w-[120px] -translate-y-1/2 items-center justify-end gap-2 pl-2">
      {dashboard?.investor_profile_id || dashboard?.institution_name?.toLowerCase().includes('vanguard') ? (
        /* Show Investor Profile if it exists (or forced for Vanguard) */
        <Tippy
          content="Investor Profile"
          options={{ theme: "light" }}
          className="w-5 h-5"
          onClick={() => {
            const effectiveProfileId = dashboard?.investor_profile_id || 27;
            
            // 🌟 REMOVED '?from=dashboard' FROM THE URL BELOW
            navigate(`/investor-profile/investor/${effectiveProfileId}`);
          }}
        >
          <div className="flex items-center justify-center w-6 h-6 text-primary">
            <Lucide icon="FileText" className="w-4 h-4 stroke-[1.3]" />
          </div>
        </Tippy>
      ) : (
        (() => {
          const name = dashboard?.institution_name;
                                                const scrapedInfo = getNormalizedScrapedInfo(name);
                                                
const isActivelyScraping =
  (scrapedInfo.status === "scraping" || scrapedInfo.error === "Not found in S3 cache." || pendingInvestors.has(name)) &&
  scrapedInfo.status !== "success" &&
  scrapedInfo.status !== "failed";

                                                const isInS3 = scrapedInfo && Object.keys(scrapedInfo).length > 0 && !scrapedInfo.error;
                                                const NOT_LISTED = "Overview not publicly listed on this profile.";
                                                const hasActualStrategy = scrapedInfo?.investment_strategy && scrapedInfo.investment_strategy !== NOT_LISTED;
                                                const hasActualSummary = scrapedInfo?.whale_wisdom_summary && scrapedInfo.whale_wisdom_summary !== NOT_LISTED;
                                                const hasContent = !!(scrapedInfo?.brochure_url || scrapedInfo?.adv_pdf_s3_url || hasActualStrategy || hasActualSummary);

                                                if (isActivelyScraping) {
            return (
              <Tippy content="Searching" options={{ theme: "light" }}>
                <div className="flex items-center justify-center w-6 h-6 text-primary">
                  <Lucide icon="Loader2" className="w-4 h-4 stroke-[1.5] animate-spin" />
                </div>
              </Tippy>
            );
          }

                                                if (isInS3 && hasContent) {
            return (
                                                   <div
  className="w-5 h-5"
  onClick={() => {
    if (!summaryLoading) {
      handleViewSummary(name);
    }
  }}
>
  <div className="flex items-center justify-center w-6 h-6 text-primary cursor-pointer hover:text-primary/80">
    {summaryLoading && activeInstitutionName === name ? (
      <Lucide icon="Loader2" className="w-4 h-4 stroke-[1.5] animate-spin" />
    ) : (
      <Lucide icon="Info" className="w-4 h-4 stroke-[1.5]" />
    )}
  </div>
</div>
            );
          }
          return <div className="w-6 h-6" />;
        })()
      )}

  {dashboard?.case_studies_id ? (
     <Tippy
       content="Case Studies"
                                                  options={{ theme: "light" }}
                                                  className="w-6 h-6 mt-1"
                                                  onClick={() =>
                                                    redirectCaseStudy(
                                                      dashboard?.institution_name
                                                    )
                                                  }
                                                >
                                                  <div className="flex items-center justify-center w-6 h-6 text-primary">
                                                    <Lucide
                                                      icon="FileSearch2"
                                                      className="w-4 h-4 stroke-[1.5]"
                                                    />
                                                  </div>
                                                </Tippy>
                                              ) : (
                                                <div className="w-6 h-6" />
                                              )}
                                              {(dashboard?.notes || dashboard?.engagement_questions) ? (
                                                <Tippy
                                                  content="View Notes"
                                                  options={{ theme: "light" }}
                                                  className="w-6 h-6 mt-1"
                                                  onClick={() => openEngagementQuestionsDialog(dashboard)}
                                                >
                                                  <div className="flex items-center justify-center w-6 h-6 text-primary cursor-pointer">
                                                    <Lucide icon="NotebookPen" className="w-4 h-4 stroke-[1.5]" />
                                                  </div>
                                                </Tippy>
                                              ) : (
                                                <Tippy
                                                  content="Add Notes"
                                                  options={{ theme: "light" }}
                                                  className="w-6 h-6 mt-1"
                                                  onClick={() => openAddNotesDialog(dashboard)}
                                                >
                                                  <div className="flex items-center justify-center w-6 h-6 text-primary ">
                                                    <Lucide icon="Plus" className="w-4 h-4 stroke-[1.5]" />
                                                  </div>
                                                </Tippy>
                                              )}
                                            </div>
                                          </div>
                                        </Table.Td>
                                        <Table.Td className="cell py-2 border-dashed dark:bg-darkmode-600 text-left">
                                          <div className="whitespace-nowrap flex items-center justify-center">
                                            {dashboard?.percent_ownership}%
                                          </div>
                                        </Table.Td>
                                       <Table.Td className="cell py-2 border-dashed dark:bg-darkmode-600 text-left min-w-[150px]">
                                                    <div className="whitespace-normal text-left">
                                                      {(() => {
  const scrapedInfo = getNormalizedScrapedInfo(dashboard?.institution_name);
  
  // 🛠️ FIX: The manual DB edit must take precedence over the scraped info!
  const rawProxy = dashboard?.proxy_advisor_influence || scrapedInfo?.proxy_influence;

  // 2. If it's missing OR says "Not Disclosed", safely render a dash

                                                        // 2. If it's missing OR says "Not Disclosed", safely render a dash
                                                        if (!rawProxy || rawProxy === "Not Disclosed" || rawProxy.toLowerCase() === "not disclosed") {
                                                          return <span className="text-gray-400">-</span>;
                                                        }

                                                        // 3. Otherwise, return the actual ISS / GL / Internal value
                                                        return rawProxy;
                                                      })()}
                                                    </div>
                                                  </Table.Td>
                                        <Table.Td className="cell py-2 border-dashed dark:bg-darkmode-600 text-left">
                                          <div className="whitespace-nowrap ">
                                            {dashboard?.unpri_signatory ===
                                              true && (
                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                  <div className="bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                    &#10004;
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        </Table.Td>

                                        <Table.Td className="cell py-2 border-dashed dark:bg-darkmode-600 text-left">
                                          {dashboard?.company_engaged ===
                                            true && (
                                              <div className="whitespace-nowrap flex items-center justify-center">
                                                <div className="bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                  &#10004;
                                                </div>
                                              </div>
                                            )}
                                        </Table.Td>
                                        <Table.Td className="cell py-2 border-dashed dark:bg-darkmode-600 text-left">
                                          <div className="whitespace-nowrap flex items-center justify-center">
                                            <div className="flex space-x-2">
                                              {dashboard?.engagement_topic
                                                ?.split("")
                                                .map((char, index) => (
                                                  <div
                                                    key={index}
                                                    className={clsx([
                                                      char.toLowerCase() ===
                                                      "s" && "bg-[#F5A623]",
                                                      char.toLowerCase() ===
                                                      "e" && "bg-[#05703E]",
                                                      char.toLowerCase() ===
                                                      "g" && "bg-[#115096]",
                                                      "font-semibold flex items-center justify-center rounded-full w-6 h-6 text-[13px] text-white",
                                                    ])}
                                                  >
                                                    {char}
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        </Table.Td>
                                        <Table.Td className="cell py-2 border-dashed dark:bg-darkmode-600 text-left">
                                          {renderVotingStatus(
                                            dashboard?.voted_against_directors,
                                            dashboard?.voted_against_directors_message,
                                            "Not disclosed in NPX"
                                          )}
                                        </Table.Td>
                                        <Table.Td className={`cell py-2 border-dashed dark:bg-darkmode-600 text-left ${isColumnGrayedOut ? 'bg-gray-50' : ''}`}>
                                          {showSayOnPayColumn ? (
                                            renderVotingStatus(
                                              dashboard?.voted_against_say_on_pay,
                                              dashboard?.voted_against_say_on_pay_message,
                                              `Say on Pay not on ballot at ${activeYear || currentExpectedYear} shareholder meeting`
                                            )
                                          ) : (
                                            <div className="whitespace-nowrap flex items-center justify-center">
                                              <div className="text-gray-400">
                                                —
                                              </div>
                                            </div>
                                          )}
                                        </Table.Td>
                                      </>
                                    )}
                                  </Table.Tr>
                                )
                              )}
                          </Table.Tbody>
                        </Table>
                      </div>
                    </TableWrapper>
                    )}
                  </div>

                </div>

              </div>
            </div>

            <footer className="!pt-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="!pt-3 flex items-center relative">

                    <sup
                      className="cursor-pointer ml-1"
                      style={{ fontSize: "0.8em" }}
                    >
                      1
                    </sup>
                    <p id="footnote" className="">
                      Source: Whalewisdom. Data as of{" "}
                      {displayYearData?.data_as_of || todayDate}
                    </p>
                  </span>
                  {ownershipView === "separate" && (
                    <span className="!pt-3 flex items-center ">
                      <sup
                        className="cursor-pointer ml-1"
                        style={{ fontSize: "0.8em" }}
                      >
                        2
                      </sup>
                      <p id="footnote">
                        As disclosed by the investor in the last three years.
                      </p>
                    </span>
                  )}
                </div>

                <div>
                  <span className="!pt-3 flex items-center relative justify-end">

                    <sup
                      className="cursor-pointer ml-1"
                      style={{ fontSize: "0.8em" }}
                    >
                      *
                    </sup>
                    <p id="footnote" className="">
                      Not in ZMH coverage universe.

                    </p>
                  </span>
                </div>
              </div>
            </footer>
          </div>
        </>
      )}

      {dashboardDataList?.length === 0 && !investorCardLoading && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <h1 className="font-semibold"> Investors Records Not Found..</h1>
        </div>
      )}

      {addNoteModalVisible && (
        <AddDomainNoteModal
          mode="add"
          addNoteModalVisible={addNoteModalVisible}
          setAddNoteModalVisible={setAddNoteModalVisible}
          title="Create New Note"
          data={data}
          fetchData={async () => {}}
          noteModule={false}
        />
      )}

      {/* --- START OF INVESTOR SUMMARY MODAL --- */}
      <Dialog size="xl" open={summaryModalVisible} onClose={() => setSummaryModalVisible(false)}>
        <Dialog.Panel className="p-0 bg-slate-50/50 overflow-hidden">
          
          <Dialog.Title className="p-6 bg-white border-b border-slate-200 relative m-0">
            <div className="pr-10">
              <h2 className="text-2xl font-semibold text-slate-700">{activeInstitutionName}</h2>
              <div className="text-sm text-slate-500 mt-2">
                <span className="font-bold text-slate-600">Last updated:</span> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div onClick={() => setSummaryModalVisible(false)} className="absolute top-6 right-6 cursor-pointer hover:bg-slate-100 p-2 rounded-full transition-colors">
              <Lucide icon="X" className="w-6 h-6 text-slate-400" />
            </div>
          </Dialog.Title>

          <Dialog.Description className="p-6 bg-slate-50 m-0 max-h-[85vh] overflow-y-auto">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <LoadingIcon color="#800000" icon="three-dots" className="w-12 h-12" />
                <p className="text-slate-500 mt-4 animate-pulse">Scraping SEC and WhaleWisdom data...</p>
              </div>
            ) : summaryData ? (
              <div className="bg-white border border-slate-200 rounded-md shadow-sm flex flex-col gap-6">
                
                <div className="p-6 pb-0">
                  <div className="flex items-center gap-2 mb-3">
                    
                    <Lucide 
                      icon={summaryData.summary_source === "whalewisdom" ? "Globe" : "Briefcase"} 
                      className="w-5 h-5 text-red-800" 
                    />
                    
                    <h3 className="text-lg font-bold text-slate-800">
                      {summaryData.summary_source === "whalewisdom" 
                        ? "Investor Overview (WhaleWisdom)" 
                        : "Investment Strategy (SEC Form ADV)"}
                    </h3>
                    
                  </div>

                <div className="flex items-center gap-3 mb-4 flex-wrap">
              
              {/* 🌟 NEW: REGION BADGE */}
              {summaryData.region && (
                <div className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Region
                  </span>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {summaryData.region}
                  </div>
                </div>
              )}


              {/* EXISTING PROXY INFLUENCE BADGE */}
           
              {(summaryData.adv_pdf_s3_url || summaryData.brochure_url) && 
               summaryData.proxy_influence && 
               summaryData.proxy_influence !== "Not Disclosed" && (
                <div className="px-3 py-1 rounded-md bg-slate-100 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Proxy Influence
                  </span>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {summaryData.proxy_influence}
                  </div>
                </div>
              )}

            </div>
                 {/* Replace the old <p> tag with this block */}
<div className="text-slate-600 text-base leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100">
  {renderFormattedStrategy(
    summaryData.investment_strategy && summaryData.investment_strategy !== "Overview not publicly listed on this profile."
      ? summaryData.investment_strategy
      : (summaryData.whale_wisdom_summary || "Overview not publicly listed on this profile.")
  )}
</div>
                </div>

                <div className="border-t border-slate-100 mt-4">



  {(summaryData.brochure_url || summaryData.brochure_page_url) && (
  <div>
    {/* HEADER */}
    <div
      onClick={() => setShowAdvBrochure(!showAdvBrochure)}
      className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-all"
    >
      <div className="flex items-center gap-2">
        <Lucide icon="FileText" className="w-5 h-5 text-red-800" />
        <h3 className="text-lg font-bold text-slate-800">
          SEC Form ADV Part 2 Brochure
        </h3>
      </div>
      <ChevronDown
        className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
          showAdvBrochure ? "rotate-180" : ""
        }`}
      />
    </div>
    {/* COLLAPSIBLE CONTENT */}
    {showAdvBrochure && (
      <div className="px-6 pb-6">
        {summaryData.brochure_url ? (
          <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-100 shadow-inner">
            <iframe
              src={summaryData.brochure_url}
              width="100%"
              height="600px"
              title="SEC Brochure PDF"
              className="w-full"
            />
          </div>
        ) : (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-3">
            <Lucide icon="ExternalLink" className="w-6 h-6 text-blue-700 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-blue-900 mb-1">
                Brochure Page Available
              </h4>
              <p className="text-sm text-blue-800 font-medium mb-2">
                {summaryData.iapd_message ||
                  "Direct PDF preview is unavailable, but the IAPD brochure page is available."}
              </p>
              <a
                href={summaryData.brochure_page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-700 underline"
              >
                Open IAPD brochure page
              </a>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
  )}


              </div>
            </div>
            ) : (
              <p className="text-center text-slate-500 py-10">No summary data available.</p>
            )}
          </Dialog.Description>

        </Dialog.Panel>
      </Dialog>

      {/* Chart Modal */}
      <Dialog size="lg" open={chartModalVisible} onClose={() => setChartModalVisible(false)}>
        <Dialog.Panel>
          <Dialog.Title>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{companyGlobalSearchName}</h2>
                <p className="text-sm text-slate-600 mt-1">Top 20 Investors: Proxy Influence Analysis</p>
              </div>
              <div
                onClick={() => setChartModalVisible(false)}
                className="cursor-pointer hover:bg-gray-100 p-2 rounded absolute top-4 right-6 z-10"
              >
                <Lucide icon="X" className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <div className="w-full">
              <div className="bg-white rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="w-[560px]">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getAnalyticsData()}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={50}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            strokeWidth={2}
                            stroke="#ffffff"
                            labelLine={false}
                          >
                            {getAnalyticsData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any, name: any) => [`${value}%`, name]}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            iconType="circle"
                            iconSize={10}
                            formatter={(value) => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>

      {/* FILER SELECTION MODAL */}
      <Dialog size="xl" open={showFilerModal} onClose={() => setShowFilerModal(false)}>
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="text-lg font-semibold">Select Whale Wisdom Profile for {activeInstitutionName}</h2>
            <div onClick={() => setShowFilerModal(false)} className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer">
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>

          <Dialog.Description className="p-4 max-h-[60vh] overflow-y-auto">
            {filerOptions.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No profiles found on WhaleWisdom.</p>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100 text-slate-800 border-b">
                    <tr>
                      <th className="p-3 font-semibold w-16 text-center">Select</th>
                      <th className="p-3 font-semibold">ID</th>
                      <th className="p-3 font-semibold">Name</th>
                      <th className="p-3 font-semibold">CIK</th>
                      <th className="p-3 font-semibold">WhaleWisdom Page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filerOptions.map((filer) => {
                      const finalUrl = filer.link?.startsWith('http') ? filer.link : `https://whalewisdom.com${filer.link}`;
                      const isSelected = selectedFilerLink === filer.link;

                      return (
                        <tr key={filer.id} className={`border-b transition-all duration-200 cursor-pointer ${isSelected ? "bg-red-50 border-l-4 border-l-red-700" : "hover:bg-slate-50"}`}>
                          <td className="p-3 text-center">
                            <FormCheck.Input
                              type="radio"
                              name="filerSelectionRadio"
                              className="cursor-pointer w-4 h-4"
                              style={{ accentColor: "#9b1b30" }}
                              checked={isSelected}
                              onChange={() => setSelectedFilerLink(filer.link)}
                            />
                          </td>
                          <td className="p-3">{filer.id}</td>
                          <td className="p-3 font-medium">{filer.name}</td>
                          <td className="p-3">{filer.cik || "N/A"}</td>
                          <td className="p-3">
                            {filer.link ? (
                              <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center" onClick={(e) => e.stopPropagation()}>
                                View Page <Lucide icon="ExternalLink" className="w-3 h-3 ml-1" />
                              </a>
                            ) : ("N/A")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Dialog.Description>

          <Dialog.Footer className="flex justify-end gap-2">
            <Button type="button" variant="outline-secondary" onClick={() => setShowFilerModal(false)}>Cancel</Button>
            <Button type="button" variant="primary" onClick={confirmFilerSelection} disabled={!selectedFilerLink}>Scrape Selected Profile</Button>
          </Dialog.Footer>
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

export default index;