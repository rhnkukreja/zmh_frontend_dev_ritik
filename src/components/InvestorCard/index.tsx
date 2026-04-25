import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import flagIcon from "../../assets/images/zmh-images/flag-icon.png";
import caseStudiesIcon from "../../assets/images/zmh-images/case_studies.svg";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import { MegaphoneOff } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
import { useEffect, useReducer, useState } from "react";
import { createDynamicURL, downloadCSV } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "../Base/Tippy";
import clsx from "clsx";
import Button from "../Base/Button";
import { ChevronLeft } from "lucide-react";

import Lucide from "../Base/Lucide";
import { Dialog, Tab } from "../Base/Headless";
import TradingViewWidget from "../TradingViewWidget";
import EngagementQuestionsDialog from "../EngagementQuestionsDialog";
import AddNoteModal from "@/pages/Notes/AddNotesModal";
import AddDomainNoteModal from "../DomainNotes/AddDomainNotesModal";

interface InvestorCardProps {
  onLoaded?: () => void;
}

const index = ({ onLoaded }: InvestorCardProps) => {
  const location = useLocation();
  const locationPathName = location?.pathname;
  const dispatch: AppDispatch = useAppDispatch();

  const [searchParams] = useSearchParams();
  const { dashboardDataList, investorCardLoading, page, tempSearch, percent } =
    useAppSelector((state) => state.dashboard);

  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  const navigate = useNavigate();

  const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;
  const searchTicker = searchParams.get("ticker");
  const [todayDate, setTodayDate] = useState("");
  const [institutionName, setInstitutionName] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [data, setData] = useState<CompanyDashboard>();
  const [addNoteModalVisible, setAddNoteModalVisible] =
    useState<boolean>(false);
  const [chartModalVisible, setChartModalVisible] = useState<boolean>(false);

  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hasLoadingStarted, setHasLoadingStarted] = useState<boolean>(false);
  const [hasNotifiedLoaded, setHasNotifiedLoaded] = useState<boolean>(false);

  // Check if Say on Pay column should be shown based on selected year
  const showSayOnPayColumn = dashboardDataList?.all_year_data?.[selectedIndex || 0]?.say_on_pay_column_check === true;
  const isColumnGrayedOut = !showSayOnPayColumn;

  useEffect(() => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString("en-US", { month: "long" });
    const year = today.getFullYear();
    const formattedDate = `${month} ${day}, ${year}`;
    setTodayDate(formattedDate);
  }, []);

  useEffect(() => {
    // Reset year when company changes
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

  // useEffect(() => {
  //   const validateImages = async () => {
  //     const tempValidImages: { [key: string]: string } = {};
  //     if(dashboardDataList?.all_year_data?.length > 0) {
  //       for (const dashbboard of dashboardDataList?.all_year_data[selectedIndex || 0]?.holdings_data || []) {
  //         const isValid = await checkImageUrl(dashbboard?.institution_logo_url);
  //         tempValidImages[dashbboard?.institution_name] = isValid
  //           ? dashbboard?.institution_logo_url
  //           : investorIcon;
  //       }
  //       setValidImages(tempValidImages);
  //     }
  //   };

  //   validateImages();
  // }, [dashboardDataList]);

  const convertDivTableToCSV = () => {
    // Get the table element
    const table = document.querySelector(".table");
    const rows = table?.querySelectorAll(".row");
    let csvContent = "";

    // Iterate over each row
    rows?.forEach((row) => {
      const cells = row.querySelectorAll(".cell");
      let rowData: any = [];

      // Iterate over each cell and get the text content
      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim(); // Get text content and trim any extra spaces
        // console.log(cellText);
        // Check if the cell contains a comma, wrap it in double quotes
        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }

        if (cellText?.includes("✔")) {
          cellText = `"Yes"`;
        }

        rowData.push(cellText);
      });

      // Join cells with commas to form a CSV row
      csvContent += rowData.join(",") + "\n";
    });

    downloadCSV(csvContent, `Investor-${companyGlobalSearchTicker}`);
  };

  const handleGenerateReport = () => {
    if (companyGlobalSearchTicker) {
      window.open(`/company-report?ticker=${encodeURIComponent(companyGlobalSearchTicker)}`, "_blank");
    }
  };

  const redirectCaseStudy = (institution_name: string) => {
    // window.open(`/case-studies`, "_blank");
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

  // Generate available year tabs - only show years that actually have data
  const getAvailableYears = () => {
    if (!dashboardDataList?.total_year?.length) return [];

    // Return the actual years that have data
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

  // Analytics data processing
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
              {/* Header row with Top Investors title on left and History of Schedule 13D Filing on right */}
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
                    <Tippy content="Open in New Tab" options={{ theme: "light" }}>
                      <div
                        className="box p-2 cursor-pointer"
                        onClick={() =>
                          window.open("investor-details", "_blank")
                        }
                      >
                        <img alt="tab-icon" src={tabIcon} />
                      </div>
                    </Tippy>
                  )}
                </div>
              </div>

              <div className="mt-5">
                {/* Year selection tabs - show when any year data is available */}
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
                  {/* Investor Table */}
                  <div className="col-span-1">
                    <TableWrapper
                      isLoading={investorCardLoading}
                      rows={6}
                      columns={8}
                    >
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
                                            <div className="flex items-center  whitespace-nowrap">
                                              {!dashboard.institution_id && (

                                                <sup
                                                  className="cursor-pointer text-lg absolute left-2 top-1"
                                                  onClick={() => {
                                                    window.scrollBy({
                                                      top: 350,
                                                      behavior: "smooth",
                                                    });
                                                  }}
                                                >
                                                  *
                                                </sup>
                                              )}
                                              <h1
                                                onClick={() => {
                                                  if (dashboard?.is_doc && dashboard?.institution_id) {
                                                    navigate(`/investor-company-details/${dashboard?.institution_id}`, {
                                                      state: {
                                                        from: location.pathname,
                                                        fromState: location.state
                                                      }
                                                    });
                                                  }
                                                }}
                                                className={clsx([
                                                  "cell whitespace-nowrap capitalize text-wrap font-semibold",
                                                  dashboard?.is_doc &&
                                                  "cursor-pointer underline",
                                                ])}
                                              >
                                                {dashboard?.institution_name}
                                              </h1>
                                              {dashboard?.flag_13d === true && (
                                                <img
                                                  className="w-3 ml-2"
                                                  alt="flag-icon"
                                                  src={flagIcon}
                                                />
                                              )}
                                            </div>
                                            <div className="flex items-center gap-x-2">
                                              {dashboard?.investor_profile_id ? (
                                                <Tippy
                                                  content="Investor Profile"
                                                  options={{ theme: "light" }}
                                                  onClick={() =>
                                                    navigate(
                                                      `/investor-profile/investor/${dashboard?.investor_profile_id}`,
                                                      { 
                                                        state: { 
                                                          from: location.pathname,
                                                          fromState: location.state 
                                                        } 
                                                      }
                                                    )
                                                  }
                                                >
                                                  <div className="flex items-center justify-center w-6 h-6 text-primary">
                                                    <Lucide
                                                      icon="FileText"
                                                      className="w-4 h-4 stroke-[1.3]"
                                                    />
                                                  </div>
                                                </Tippy>
                                              ) : (
                                                <div className="w-6 h-6" />
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
                                        <Table.Td className="cell py-2 border-dashed dark:bg-darkmode-600 text-left min-w-[180px]">
                                          <div className="px-2">
                                            {dashboard.proxy_advisor_influence ||
                                              "-"}
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
                      {activeYear === "2024" ? "December 31, 2024" : todayDate}
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
        <div className="p-5 mt-3.5 box bg-white">
          <div className="w-full">
            <div className="flex justify-between items-center xs:flex-col sm:flex-row py-3 gap-3">
              <div className="flex items-center">
                <h1 className="text-xl font-bold flex items-center gap-2 flex-wrap">
                  Top
                  <span className="inline-block h-6 w-12 rounded bg-slate-200 animate-pulse" />
                  Investors
                  <span className="text-lg font-bold inline-flex items-center gap-2">
                    (
                    <span className="inline-block h-5 w-20 rounded bg-slate-200 animate-pulse" />
                    of shares outstanding)
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <img alt="flag-icon" src={flagIcon} />
                <h4 className="font-semibold mr-4">
                  History of Schedule 13D Filing
                </h4>
                <div className="box p-[5px] opacity-60">
                  <img alt="download-icon" src={downloadIcon} />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-4 flex gap-2">
                <div className="h-8 w-20 rounded-[0.6rem] bg-slate-200 animate-pulse" />
                <div className="h-8 w-20 rounded-[0.6rem] bg-slate-200 animate-pulse" />
              </div>

              <div
                className={clsx([
                  locationPathName === "/" && "max-h-[600px]",
                  "max-h-[60vh] overflow-y-scroll"
                ])}
              >
                <Table className="table w-full">
                  <Table.Thead>
                    <Table.Tr className="row">
                      <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2]">No.</Table.Td>
                      <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2]">Shareholder</Table.Td>
                      <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2]">Ownership</Table.Td>
                      <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2]">Proxy Advisory Influence</Table.Td>
                      <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2]">UN PRI Signatory</Table.Td>
                      <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2]">Engaged with Company</Table.Td>
                      <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2]">Engagement Topic</Table.Td>
                      <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2]">Voted Against Directors</Table.Td>
                      <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header border-[#0000000D] text-[#000000B2]">Voted Against Say on Pay</Table.Td>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {Array.from({ length: 6 }).map((_, rowIdx) => (
                      <Table.Tr key={`investor-loading-row-${rowIdx}`} className="row [&_td]:last:border-b-0">
                        <Table.Td className="cell py-2 h-[50px] border-dashed">
                          <div className="h-4 w-6 rounded bg-slate-200 animate-pulse" />
                        </Table.Td>
                        <Table.Td className="cell py-2 h-[50px] border-dashed">
                          <div className="h-4 w-44 rounded bg-slate-200 animate-pulse" />
                        </Table.Td>
                        <Table.Td className="cell py-2 h-[50px] border-dashed">
                          <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
                        </Table.Td>
                        <Table.Td className="cell py-2 h-[50px] border-dashed">
                          <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                        </Table.Td>
                        <Table.Td className="cell py-2 h-[50px] border-dashed">
                          <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse" />
                        </Table.Td>
                        <Table.Td className="cell py-2 h-[50px] border-dashed">
                          <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse" />
                        </Table.Td>
                        <Table.Td className="cell py-2 h-[50px] border-dashed">
                          <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                        </Table.Td>
                        <Table.Td className="cell py-2 h-[50px] border-dashed">
                          <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse" />
                        </Table.Td>
                        <Table.Td className="cell py-2 h-[50px] border-dashed">
                          <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse" />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>

              <footer className="mt-4 border-t border-dashed border-slate-300 pt-3">
                <div className="text-[13px] text-slate-500 flex flex-wrap justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <span className="!pt-3 flex items-center">
                      <sup className="cursor-pointer" style={{ fontSize: "0.8em" }}>1</sup>
                      <p id="footnote">Source: Whalewisdom. Data as of <span className="inline-block h-4 w-24 rounded bg-slate-200 animate-pulse ml-1" /></p>
                    </span>
                    <span className="!pt-3 flex items-center ">
                      <sup className="cursor-pointer ml-1" style={{ fontSize: "0.8em" }}>2</sup>
                      <p id="footnote">As disclosed by the investor in the last three years.</p>
                    </span>
                  </div>
                  <div>
                    <span className="!pt-3 flex items-center relative justify-end">
                      <sup className="cursor-pointer ml-1" style={{ fontSize: "0.8em" }}>*</sup>
                      <p id="footnote" className="">Not in ZMH coverage universe.</p>
                    </span>
                  </div>
                </div>
              </footer>
            </div>
          </div>
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

      <Dialog size="xl" open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="text-xl font-semibold">Engagement Notes</h2>
            <div
              onClick={() => setIsDialogOpen(false)}
              className="absolute top-0 right-0 mt-3 mr-3 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <div className="w-full minh-[550px]">
              <EngagementQuestionsDialog data={data} />
            </div>
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

                            // Calculate line end points for leader lines
                            const lineRadius = outerRadius + 15;
                            const lineX = cx + lineRadius * Math.cos(-midAngle * RADIAN);
                            const lineY = cy + lineRadius * Math.sin(-midAngle * RADIAN);

                            // Extend line horizontally (shorter extension)
                            const extendedX = lineX + (lineX > cx ? 25 : -25);

                            return (
                              <g>
                                {/* Leader line from pie to label */}
                                <polyline
                                  points={`${cx + outerRadius * Math.cos(-midAngle * RADIAN)},${cy + outerRadius * Math.sin(-midAngle * RADIAN)} ${lineX},${lineY} ${extendedX},${lineY}`}
                                  fill="none"
                                  stroke="#333"
                                  strokeWidth={1.5}
                                />
                                {/* Label text */}
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
                                {/* Percentage text */}
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
    </>
  );
};

export default index;