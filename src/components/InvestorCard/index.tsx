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

import { useEffect, useReducer, useState , useRef} from "react";

import { createDynamicURL, downloadCSV } from "@/utils/helper";

import { baseURL } from "@/constant";

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

const index = ({ onLoaded, autoScrapedData = {}, pendingInvestors = new Set() }: InvestorCardProps) => {

  const [isScrapingPdf, setIsScrapingPdf] = useState(false);

  const [scrapedPdfUrl, setScrapedPdfUrl] = useState<string | null>(null);

  const [scrapeMessage, setScrapeMessage] = useState<string>("");

  const location = useLocation();

  const locationPathName = location?.pathname;

  const dispatch: AppDispatch = useAppDispatch();

  const [searchParams] = useSearchParams();

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
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hasLoadingStarted, setHasLoadingStarted] = useState<boolean>(false);
  const [hasNotifiedLoaded, setHasNotifiedLoaded] = useState<boolean>(false);

  const showSayOnPayColumn =
    dashboardDataList?.all_year_data?.[selectedIndex || 0]
      ?.say_on_pay_column_check === true;

  const isColumnGrayedOut = !showSayOnPayColumn;

  const [summaryModalVisible, setSummaryModalVisible] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [showFilerModal, setShowFilerModal] = useState<boolean>(false);
  const [showAdvBrochure, setShowAdvBrochure] = useState<boolean>(false);
  const [filerOptions, setFilerOptions] = useState<any[]>([]);
  const [selectedFilerLink, setSelectedFilerLink] = useState<string>("");
  const [activeInstitutionName, setActiveInstitutionName] = useState<string>("");

  const handleViewSummary = async (institutionName: string | undefined) => {
    if (!institutionName) return;
    
    setActiveInstitutionName(institutionName);
    
    // Check if the background queue already fetched this!
    if (autoScrapedData[institutionName] && autoScrapedData[institutionName].investment_strategy) {
      setSummaryData(autoScrapedData[institutionName]);
      setSummaryModalVisible(true);
      return; 
    }

    setSummaryLoading(true);

    try {
      const result = await searchWhaleWisdom(institutionName);
      
      if (result) {
        // Fallback: If the background job didn't parse the strategy, don't crash!
        if (!result.investment_strategy) {
           result.investment_strategy = "Overview not publicly listed on this profile.";
        }
        setSummaryData(result);
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
            } 
            // Show popup if multiple options
            else if (genResult.filers.length > 1) {
              setFilerOptions(genResult.filers);
              setSelectedFilerLink("");
              setShowFilerModal(true);
            } 
            else {
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

  const [selectedYear, setSelectedYear] = useState<string>("");

  const activeYear =
    selectedYear?.toString() !== ""
      ? selectedYear?.toString()
      : dashboardDataList?.all_year_data?.[selectedIndex || 0]?.year?.toString();

  const handleAGMYearTab = (tab: string, index: number) => {
    setSelectedIndex(index);
    setSelectedYear(tab);
  }

  const getAvailableYears = () => {
    if (!dashboardDataList?.total_year?.length) return [];
    return dashboardDataList.total_year.map((year: any) => year.toString());
  };

  const getSelectedTabIndex = () => {
    const availableYears = getAvailableYears();
    const tabIndex = availableYears.findIndex((year: string) => year === (selectedYear?.toString() !== "" ?
      selectedYear?.toString() : dashboardDataList?.all_year_data[0]?.year?.toString()));
    return tabIndex >= 0 ? tabIndex : 0;
  };

  useEffect(() => {
    const index = getSelectedTabIndex();
    setSelectedIndex(index);
  }, [selectedYear])

  const getAnalyticsData = () => {
    const analyticsData = dashboardDataList?.all_year_data?.[selectedIndex || 0]?.analytics;
    if (!analyticsData) return [];

    return Object.entries(analyticsData).map(([key, value]) => ({
      name: key,
      value: parseFloat(String(value).replace('%', '')),
      displayValue: String(value)
    }));
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
      {dashboardDataList?.length !== 0 && (
        <>
          <div className="p-5 mt-3.5 box">
            <div className="w-full">
              <div className="flex justify-between items-center xs:flex-col sm:flex-row py-3">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold">
                    Top {dashboardDataList?.length || 20} Investors{" "}
                    <span className="text-lg font-bold">
                      ({dashboardDataList?.all_year_data?.[selectedIndex || 0]?.total_percent_ownership} of shares outstanding)
                    </span>
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
                        onClick={() =>
                          navigate(`/investor-details?ticker=${ticker}`)
                        }
                      >
                        <img alt="tab-icon" src={tabIcon} />
                      </div>
                    </Tippy>
                  )}
                </div>
              </div>

              <div className="mt-5">
                {getAvailableYears().length > 0 && (
                  <div className="mb-4">
                    <Tab.Group selectedIndex={getSelectedTabIndex()} defaultIndex={0}>
                      <Tab.List
                        variant="boxed-tabs"
                        className="w-fit border-none bg-transparent"
                      >
                        {getAvailableYears().map((tab: string, index: number) => (
                          <Tab key={index} className="active px-1 border-primary/10 first:rounded-l-[0.6rem] cursor-pointer
                                   last:rounded-r-[0.6rem] [&[aria-selected='true']_button]:text-white [&[aria-selected='true']_button]:bg-red-800">
                            <Tab.Button
                              className="w-24 whitespace-nowrap rounded-[0.6rem] font-medium text-primary bg-primary/10 border border-primary/10 cursor-pointer"
                              as="button"
                              onClick={() => handleAGMYearTab(tab, index)}>
                              {tab}
                            </Tab.Button>
                          </Tab>
                        ))}
                      </Tab.List>
                    </Tab.Group>
                  </div>
                )}

                <div className="grid gap-6 grid-cols-1">
                  <div className="col-span-1">
                    <TableWrapper isLoading={investorCardLoading}>
                      <div
                        className={clsx([
                          locationPathName === "/" &&
                          "max-h-[600px]",
                          "max-h-[60vh] overflow-y-scroll"
                        ])}
                      >
                        <Table className="table w-full">
                          <Table.Thead>
                            <Table.Tr className="row">
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                No.
                              </Table.Td>
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
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
                              <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                <span>Proxy Advisory Influence {dashboardDataList?.all_year_data?.[selectedIndex || 0]?.analytics && (
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
                                  {!getAvailableYears().includes('2025') && (
                                    <Tippy content="2025 meeting not held yet. Data based on 2024 voting details" options={{ theme: "light" }}>
                                      <Lucide icon="Info" className="w-4 h-4 text-gray-600 cursor-pointer" />
                                    </Tippy>
                                  )}
                                </div>
                              </Table.Td>
                              <Table.Td className={`cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] ${isColumnGrayedOut ? 'text-gray-400' : 'text-[#000000B2]'}`}>
                                <div className="flex items-center justify-center gap-1">
                                  Voted Against Say on Pay
                                  {(isColumnGrayedOut || !getAvailableYears().includes('2025')) && (
                                    <Tippy content={isColumnGrayedOut ? "Say on Pay not on ballot at 2025 shareholder meeting" : "2025 meeting not held yet. Data based 2024 voting details"} options={{ theme: "light" }}>
                                      <Lucide icon="Info" className="w-4 h-4 text-gray-600 cursor-pointer" />
                                    </Tippy>
                                  )}
                                </div>
                              </Table.Td>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>

                            {dashboardDataList?.all_year_data[selectedIndex || 0]?.holdings_data?.length > 0 &&
                              dashboardDataList?.all_year_data[selectedIndex || 0]?.holdings_data?.map(
                                (dashboard: CompanyDashboard, index: number) => (
                                  <Table.Tr
                                    key={dashboard.filer_id}
                                    className="row [&_td]:last:border-b-0"
                                  >
                                    {dashboard?.institution_name && (
                                      <>
                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                          <div className="flex items-center font-semibold ">
                                            {index + 1}
                                          </div>
                                        </Table.Td>
      
      <Table.Td className="relative w-full px-4 py-2">
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center whitespace-nowrap">
        
        {/* 🌟 1. Grab the ID from either the DB OR the background scraped data */}
        {(() => {
          const dynInstId = dashboard?.institution_id || autoScrapedData[dashboard?.institution_name]?.institution_id;
          
          return (
            <>
              {/* 🌟 2. Hide the Asterisk if the Dynamic ID exists! */}
              {!dynInstId && (
                <sup
                  className="cursor-pointer text-lg absolute left-2 top-1 text-red-500"
                  onClick={() => {
                    window.scrollBy({ top: 350, behavior: "smooth" });
                  }}
                >
                  *
                </sup>
              )}
            
            {/* 🌟 3. Make the name clickable using the Dynamic ID! */}
            <h1
              onClick={() =>
                dynInstId && window.open(`/investor-company-details/${dynInstId}`, "_blank")
              }
              className={clsx([
                "cell whitespace-nowrap capitalize text-wrap font-semibold",
                dynInstId && "cursor-pointer underline",
              ])}
            >
              {dashboard?.institution_name}
            </h1>
          </>
        );
      })()}

      {dashboard?.flag_13d === true && (
        <img className="w-3 ml-2" alt="flag-icon" src={flagIcon} />
      )}
    </div>
   {/* ========================================== */}
    {/* 2. ACTION BUTTONS (EYE ICON LOGIC)         */}
    {/* ========================================== */}
    {/* ========================================== */}
    {/* 2. SILENT ACTION TRAYS (CLEAN RENDER VIEW) */}
    {/* ========================================== */}
    <div className="flex items-center gap-x-2">
      {dashboard?.investor_profile_id ? (
        /* Show Investor Profile if it exists */
        <Tippy
          content="Investor Profile"
          options={{ theme: "light" }}
          className="w-5 h-5"
          onClick={() =>
            navigate(`/investor-profile/investor/${dashboard?.investor_profile_id}?from=dashboard`)
          }
        >
          <div className="flex items-center justify-center w-6 h-6 text-primary">
            <Lucide icon="FileText" className="w-4 h-4 stroke-[1.3]" />
          </div>
        </Tippy>
      ) : (
        (() => {
          const name = dashboard?.institution_name;
          const scrapedInfo = autoScrapedData[name] || {};
          const dynInstId = dashboard?.institution_id || scrapedInfo?.institution_id;
          const isInS3 = scrapedInfo.status !== "scraping" && Object.keys(scrapedInfo).length > 0;
          const hasBrochure = !!(scrapedInfo.brochure_url || scrapedInfo.adv_pdf_s3_url);
          const isScraping = pendingInvestors.has(name);

          // Backend is still scraping this investor in the background — show spinner.
          if (isScraping) {
            return (
              <Tippy content="Fetching SEC details..." options={{ theme: "light" }}>
                <div className="flex items-center justify-center w-6 h-6 text-primary">
                  <Lucide icon="Loader2" className="w-4 h-4 stroke-[1.5] animate-spin" />
                </div>
              </Tippy>
            );
          }

          if (dynInstId && isInS3 && hasBrochure) {
            return (
              <Tippy content="View SEC Details" options={{ theme: "light" }}>
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
              </Tippy>
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
                                       <Table.Td className="cell py-2 border-dashed dark:bg-darkmode-600 text-left">
                                                    <div className="whitespace-nowrap">
                                                      {(() => {
                                                        // 1. Grab the proxy data from either S3 or DB
                                                        const rawProxy = autoScrapedData[dashboard?.institution_name]?.proxy_influence 
                                                                      || dashboard?.proxy_advisor_influence;

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

                                          <>
                                            {dashboard?.voted_against_directors ===
                                              true && (
                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                  <div className="bg-[#FF2A2A] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                    &#10004;
                                                  </div>
                                                </div>
                                              )}
                                            {dashboard?.voted_against_directors ===
                                              'ND' && (
                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                  <div className="flex items-center w-full h-full text-primary justify-center">
                                                    <Tippy content={dashboard?.voted_against_directors_message || "No Data"} options={{ theme: "light" }}>
                                                      <MegaphoneOff size={18} strokeWidth={1.2} absoluteStrokeWidth />
                                                    </Tippy>
                                                  </div>
                                                </div>
                                              )}
                                            {dashboard?.voted_against_directors ===
                                              'NSE' && (
                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                  <div className="flex items-center w-full h-full text-primary justify-center">
                                                    <Tippy content={dashboard?.voted_against_directors_message || "Not disclosed in NPX"} options={{ theme: "light" }}>
                                                      <MegaphoneOff size={18} strokeWidth={1.2} absoluteStrokeWidth />
                                                    </Tippy>
                                                  </div>
                                                </div>
                                              )}
                                          </>
                                        </Table.Td>
                                        <Table.Td className={`cell py-2 border-dashed dark:bg-darkmode-600 text-left ${isColumnGrayedOut ? 'bg-gray-50' : ''}`}>
                                          {showSayOnPayColumn ? (
                                            <>
                                              {dashboard?.voted_against_say_on_pay ===
                                                true && (
                                                  <div className="whitespace-nowrap flex items-center justify-center">
                                                    <div className="bg-[#FF2A2A] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                      &#10004;
                                                    </div>
                                                  </div>
                                                )}

                                              {dashboard?.voted_against_say_on_pay ===
                                                'ND' && (
                                                  <div className="whitespace-nowrap flex items-center justify-center">
                                                    <div className="flex items-center w-full h-full text-primary justify-center">
                                                      <Tippy content={dashboard?.voted_against_say_on_pay_message || "No Data"} options={{ theme: "light" }}>
                                                        <MegaphoneOff size={18} strokeWidth={1.2} absoluteStrokeWidth />
                                                      </Tippy>
                                                    </div>
                                                  </div>
                                                )}

                                              {dashboard?.voted_against_say_on_pay ===
                                                'NSE' && (
                                                  <div className="whitespace-nowrap flex items-center justify-center">
                                                    <div className="flex items-center w-full h-full text-primary justify-center">
                                                      <Tippy content={dashboard?.voted_against_say_on_pay_message || "Say on Pay not on ballot at 2025 shareholder meeting"} options={{ theme: "light" }}>
                                                        <MegaphoneOff size={18} strokeWidth={1.2} absoluteStrokeWidth />
                                                      </Tippy>
                                                    </div>
                                                  </div>
                                                )}
                                            </>
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
                      {dashboardDataList?.all_year_data?.[selectedIndex || 0]?.data_as_of || todayDate}
                    </p>
                  </span>
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

      {dashboardDataList?.length === 0 && investorCardLoading && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
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
                    <Lucide icon="Briefcase" className="w-5 h-5 text-red-800" />
                    <h3 className="text-lg font-bold text-slate-800">Investment Strategy</h3>
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
                  <p className="text-slate-600 text-base leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-md border border-slate-100">
                    {summaryData.investment_strategy}
                  </p>
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
                  <div className="w-[500px] h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getAnalyticsData()}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={45}
                          startAngle={90}
                          endAngle={-270}
                          fill="#8884d8"
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#ffffff"
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                            const lineRadius = outerRadius + 15;
                            const lineX = cx + lineRadius * Math.cos(-midAngle * RADIAN);
                            const lineY = cy + lineRadius * Math.sin(-midAngle * RADIAN);

                            const extendedX = lineX + (lineX > cx ? 25 : -25);

                            return (
                              <g>
                                <polyline
                                  points={`${cx + outerRadius * Math.cos(-midAngle * RADIAN)},${cy + outerRadius * Math.sin(-midAngle * RADIAN)} ${lineX},${lineY} ${extendedX},${lineY}`}
                                  fill="none"
                                  stroke="#333"
                                  strokeWidth={1.5}
                                />
                                <text
                                  x={extendedX}
                                  y={lineY - 8}
                                  fill="#333"
                                  textAnchor={extendedX > cx ? "start" : "end"}
                                  dominantBaseline="central"
                                  fontSize={12}
                                  fontWeight="500"
                                >
                                  {name}
                                </text>
                                <text
                                  x={extendedX}
                                  y={lineY + 8}
                                  fill="#666"
                                  textAnchor={extendedX > cx ? "start" : "end"}
                                  dominantBaseline="central"
                                  fontSize={11}
                                  fontWeight="600"
                                >
                                  {value}%
                                </text>
                              </g>
                            );
                          }}
                          labelLine={false}
                        >
                          {getAnalyticsData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>

{/* 🌟 NEW FILER SELECTION MODAL */}
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