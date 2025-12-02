import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import Tippy from "../Base/Tippy";
import { createDynamicURL, downloadCSV } from "@/utils/helper";
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchAGMSummaryDashboard,
  setTempSearch,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import { AppDispatch } from "@/stores/store";
import LoadingIcon from "../Base/LoadingIcon";
import { dashboardService } from "@/services/dashboard";
import { Tab } from "@/components/Base/Headless";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";

const index = ({ companyGlobalSearchTicker, companyGlobalSearchName, isMeetingModal, proxyContest = false, proxyContest2024 = false, proxyContest2025 = false }) => {

  const location = useLocation();
  const locationPathName = location?.pathname;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch: AppDispatch = useAppDispatch();
  const { agmSummaryDetails, loading, dashboardDataList, tempSearch } =
    useAppSelector((state) => state.dashboard);

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

  // Ensure selectedYear is set to a valid year on first load, but only after agmSummaryDetails loads
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
    if (companyGlobalSearchTicker && dashboardDataList?.length === 0) {
      // Use year from query params or default behavior
      const yearParam = yearFromQuery || (isMeetingModal ? "2025" : "");
      const url = createDynamicURL(
        `${baseURL}/voting_report_8k/`, 
        { ticker: companyGlobalSearchTicker, ...(yearParam && { year: yearParam }) }
      );
      dispatch(fetchAGMSummaryDashboard(url));
      // dispatch(setTempSearch(companyGlobalSearchTicker));
    }
    else if (companyGlobalSearchTicker !== tempSearch) {
      // Use year from query params or reset to empty
      const yearParam = yearFromQuery || "";
      setSelectedYear(yearParam);
      const url = createDynamicURL(
        `${baseURL}/voting_report_8k/`, 
        { ticker: companyGlobalSearchTicker, ...(yearParam && { year: yearParam }) }
      );
      dispatch(fetchAGMSummaryDashboard(url));
      // dispatch(setTempSearch(companyGlobalSearchTicker));
    }
  }, [companyGlobalSearchTicker, yearFromQuery]);

  // Handle year query parameter changes
  useEffect(() => {
    if (yearFromQuery && yearFromQuery !== selectedYear) {
      setSelectedYear(yearFromQuery);
    }
  }, [yearFromQuery]);

  useEffect(() => {
    if (selectedYear) {
      dispatch(
        fetchAGMSummaryDashboard(
          createDynamicURL(
            `${baseURL}/voting_report_8k/`, { ticker: companyGlobalSearchTicker, year: selectedYear }
          )
        )
      );
    }
  }, [selectedYear])


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

  const [isInstitutionList, setIsInstitutionList] = useState<boolean>(false);
  const [chartModalVisible, setChartModalVisible] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

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
    "Election Of Directors": "#dc2626", // Red-600 to match theme
    "Say On Pay": "#b91c1c", // Red-700 
    "Shareholder Proposals": "#f87171" // Red-400 for lighter variant
  };

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
  }

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

  return (
    <>
      {agmSummaryDetails?.Year && (
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
                    {dashboardDataList?.total_year?.length > 0 && agmSummaryDetails?.npx_check && (
                      <button
                        onClick={(event: any) => handleViewNPX(event)}
                        className="p-2 cursor-pointer bg-white rounded-md xs:w-[240px] 
                                   md:w-auto flex items-center justify-center border-red-800 border-2
                                    font-semibold text-red-800 border-solid hover:bg-red-800 hover:border-white hover:text-white"
                      >
                        View N-PX
                      </button>
                    )}
                    {analyticsData && (
                      <button
                        onClick={() => setChartModalVisible(true)}
                        className="p-2 cursor-pointer bg-white rounded-md xs:w-[240px] 
                                   md:w-auto flex items-center justify-center border-red-800 border-2
                                    font-semibold text-red-800 border-solid hover:bg-red-800 hover:border-white hover:text-white"
                      >
                        View Analytics
                      </button>
                    )}</>}
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
                <TableWrapper isLoading={loading}>
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
                <TableWrapper isLoading={loading}>
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
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
      )}

      {!agmSummaryDetails?.Year && !loading &&
        <>
          {
            isMeetingModal ?
              <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                <h1 className="font-semibold">
                  {" "}
                  AGM Summary Has Not Been Released
                </h1>
              </div>
              :
              (
                <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                  <h1 className="font-semibold">
                    {" "}
                    Previous AGM Summary Records Not Found..
                  </h1>
                </div>
              )

          }
        </>}

      {
      /* Analytics Chart Modal */}
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
                  <div className="flex gap-2 mb-12">
                    {/* Election of Directors Panel */}
                    <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-200 p-6 mx-3">
                      {(() => {
                        const electionData = getAnalyticsChartData().find(item => item.name === 'Election Of Directors');
                        const data2024 = electionData ? getYearData(electionData, '2024') : null;
                        const data2025 = electionData ? getYearData(electionData, '2025') : null;
                        const maxValue = Math.max(data2024?.value || 0, data2025?.value || 0);
                        
                        return (
                          <>
                            <div className="text-center mb-6">
                              <h3 className="text-lg font-semibold text-slate-800 mb-2">Election of Directors</h3>
                              <div className="w-12 h-1 bg-primary mx-auto rounded-full"></div>
                            </div>
                            
                            <div className="relative h-64 bg-slate-50 rounded-lg p-6 mb-6">
                              {/* Grid lines */}
                              <div className="absolute inset-x-6 inset-y-6 grid grid-cols-2 gap-8">
                                {[...Array(5)].map((_, i) => (
                                  <div key={i} className="col-span-2 border-t border-slate-200 opacity-50" style={{marginTop: `${i * 25}%`}}></div>
                                ))}
                              </div>
                              
                              {/* Chart bars */}
                              <div className="relative h-full flex items-end justify-center gap-12">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-medium text-slate-700 mb-4 pt-4">
                                    {data2024 ? data2024.percentage : '--'}
                                  </span>
                                  <div 
                                    className="bg-primary transition-all duration-700 ease-out"
                                    style={{ 
                                      width: '48px',
                                      height: data2024 ? `${Math.max((data2024.value / (maxValue || 1)) * 160, 30)}px` : '30px'
                                    }}
                                  ></div>
                                  <span className="text-xs font-medium text-slate-600 mt-3 bg-white px-3 py-1 rounded-full border">2024</span>
                                </div>
                                
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-medium text-slate-700 mb-4 pt-4">
                                    {data2025 ? data2025.percentage : '--'}
                                  </span>
                                  <div 
                                    className="bg-slate-400 transition-all duration-700 ease-out"
                                    style={{ 
                                      width: '48px',
                                      height: data2025 ? `${Math.max((data2025.value / (maxValue || 1)) * 160, 30)}px` : '30px'
                                    }}
                                  ></div>
                                  <span className="text-xs font-medium text-slate-600 mt-3 bg-white px-3 py-1 rounded-full border">2025</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-auto">
                              <table className="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden">
                                <thead>
                                  <tr>
                                    <th className="bg-primary text-white p-3 text-center text-sm font-medium" colSpan={2}>
                                      Voted Against Election of Directors
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="bg-primary/10 text-primary p-3 text-sm font-medium w-16 border-r border-slate-200">2024</td>
                                    <td className="bg-primary/10 text-slate-700 p-3 text-sm">
                                      {data2024 ? 'Morgan Stanley, Norges Bank' : '--'}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="bg-slate-50 text-slate-600 p-3 text-sm font-medium border-r border-slate-200">2025</td>
                                    <td className="bg-slate-50 text-slate-700 p-3 text-sm">
                                      {data2025 ? 'Norges Bank, Northern Trust' : '--'}
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
                    <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-200 p-6 mx-3">
                      {(() => {
                        const sayOnPayData = getAnalyticsChartData().find(item => item.name === 'Say On Pay');
                        const data2024 = sayOnPayData ? getYearData(sayOnPayData, '2024') : null;
                        const data2025 = sayOnPayData ? getYearData(sayOnPayData, '2025') : null;
                        const maxValue = Math.max(data2024?.value || 0, data2025?.value || 0);
                        
                        return (
                          <>
                            <div className="text-center mb-6">
                              <h3 className="text-lg font-semibold text-slate-800 mb-2">Say On Pay</h3>
                              <div className="w-12 h-1 bg-primary mx-auto rounded-full"></div>
                            </div>
                            
                            <div className="relative h-64 bg-slate-50 rounded-lg p-6 mb-6">
                              {/* Grid lines */}
                              <div className="absolute inset-x-6 inset-y-6 grid grid-cols-2 gap-8">
                                {[...Array(5)].map((_, i) => (
                                  <div key={i} className="col-span-2 border-t border-slate-200 opacity-50" style={{marginTop: `${i * 25}%`}}></div>
                                ))}
                              </div>
                              
                              {/* Chart bars */}
                              <div className="relative h-full flex items-end justify-center gap-12">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-medium text-slate-700 mb-4 pt-4">
                                    {data2024 ? data2024.percentage : '--'}
                                  </span>
                                  <div 
                                    className="bg-primary transition-all duration-700 ease-out"
                                    style={{ 
                                      width: '48px',
                                      height: data2024 ? `${Math.max((data2024.value / (maxValue || 1)) * 160, 30)}px` : '30px'
                                    }}
                                  ></div>
                                  <span className="text-xs font-medium text-slate-600 mt-3 bg-white px-3 py-1 rounded-full border">2024</span>
                                </div>
                                
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-medium text-slate-700 mb-4 pt-4">
                                    {data2025 ? data2025.percentage : '--'}
                                  </span>
                                  <div 
                                    className="bg-slate-400 transition-all duration-700 ease-out"
                                    style={{ 
                                      width: '48px',
                                      height: data2025 ? `${Math.max((data2025.value / (maxValue || 1)) * 160, 30)}px` : '30px'
                                    }}
                                  ></div>
                                  <span className="text-xs font-medium text-slate-600 mt-3 bg-white px-3 py-1 rounded-full border">2025</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-auto">
                              <table className="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden">
                                <thead>
                                  <tr>
                                    <th className="bg-primary text-white p-3 text-center text-sm font-medium" colSpan={2}>
                                      Voted Against Say on Pay
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="bg-primary/10 text-primary p-3 text-sm font-medium w-16 border-r border-slate-200">2024</td>
                                    <td className="bg-primary/10 text-slate-700 p-3 text-sm">--</td>
                                  </tr>
                                  <tr>
                                    <td className="bg-slate-50 text-slate-600 p-3 text-sm font-medium border-r border-slate-200">2025</td>
                                    <td className="bg-slate-50 text-slate-700 p-3 text-sm">
                                      J.P. Morgan, Morgan Stanley
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
                    <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-200 p-6 mx-3">
                      {(() => {
                        const shareholderData = getAnalyticsChartData().find(item => item.name === 'Shareholder Proposals');
                        const data2024 = shareholderData ? getYearData(shareholderData, '2024') : null;
                        const data2025 = shareholderData ? getYearData(shareholderData, '2025') : null;
                        const maxValue = Math.max(data2024?.value || 0, data2025?.value || 0);
                        
                        return (
                          <>
                            <div className="text-center mb-6">
                              <h3 className="text-lg font-semibold text-slate-800 mb-2">Shareholder Proposals</h3>
                              <div className="w-12 h-1 bg-primary mx-auto rounded-full"></div>
                            </div>
                            
                            <div className="relative h-64 bg-slate-50 rounded-lg p-6 mb-6">
                              {/* Grid lines */}
                              <div className="absolute inset-x-6 inset-y-6 grid grid-cols-2 gap-8">
                                {[...Array(5)].map((_, i) => (
                                  <div key={i} className="col-span-2 border-t border-slate-200 opacity-50" style={{marginTop: `${i * 25}%`}}></div>
                                ))}
                              </div>
                              
                              {/* Chart bars */}
                              <div className="relative h-full flex items-end justify-center gap-12">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-medium text-slate-700 mb-4 pt-4">
                                    {data2024 ? data2024.percentage : '--'}
                                  </span>
                                  <div 
                                    className="bg-primary transition-all duration-700 ease-out"
                                    style={{ 
                                      width: '48px',
                                      height: data2024 ? `${Math.max((data2024.value / (maxValue || 1)) * 160, 30)}px` : '30px'
                                    }}
                                  ></div>
                                  <span className="text-xs font-medium text-slate-600 mt-3 bg-white px-3 py-1 rounded-full border">2024</span>
                                </div>
                                
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-medium text-slate-700 mb-4 pt-4">
                                    {data2025 ? data2025.percentage : '--'}
                                  </span>
                                  <div 
                                    className="bg-slate-400 transition-all duration-700 ease-out"
                                    style={{ 
                                      width: '48px',
                                      height: data2025 ? `${Math.max((data2025.value / (maxValue || 1)) * 160, 30)}px` : '30px'
                                    }}
                                  ></div>
                                  <span className="text-xs font-medium text-slate-600 mt-3 bg-white px-3 py-1 rounded-full border">2025</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-auto">
                              <table className="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden">
                                <thead>
                                  <tr>
                                    <th className="bg-primary text-white p-3 text-center text-sm font-medium" colSpan={2}>
                                      Voted For Shareholder Proposals
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="bg-primary/10 text-primary p-3 text-sm font-medium w-16 border-r border-slate-200">2024</td>
                                    <td className="bg-primary/10 text-slate-700 p-3 text-sm">
                                      Morgan Stanley, Northern Trust
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="bg-slate-50 text-slate-600 p-3 text-sm font-medium border-r border-slate-200">2025</td>
                                    <td className="bg-slate-50 text-slate-700 p-3 text-sm">--</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}
                    </div>
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
    </>
  );
};

export default index;
