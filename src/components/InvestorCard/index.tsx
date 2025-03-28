import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import flagIcon from "../../assets/images/zmh-images/flag-icon.png";
import caseStudiesIcon from "../../assets/images/zmh-images/case_studies.svg";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import { MegaphoneOff } from 'lucide-react';
import { CircleSlash2 } from 'lucide-react';

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
import LoadingIcon from "../Base/LoadingIcon";
import Button from "../Base/Button";
import { ChevronLeft } from "lucide-react";

import Lucide from "../Base/Lucide";
import { Dialog, Tab } from "../Base/Headless";
import TradingViewWidget from "../TradingViewWidget";
import EngagementQuestionsDialog from "../EngagementQuestionsDialog";

const index = () => {
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



  useEffect(() => {
    if (companyGlobalSearchTicker && dashboardDataList?.length === 0) {
      dispatch(
        fetchCompanyDashboard(
          createDynamicURL(
            `${baseURL}/company-dashboard/?ticker=${companyGlobalSearchTicker}`
          )
        )
      );
      dispatch(setTempSearch(companyGlobalSearchTicker));
    } else if (companyGlobalSearchTicker !== tempSearch) {
      setSelectedYear("");
      dispatch(
        fetchCompanyDashboard(
          createDynamicURL(
            `${baseURL}/company-dashboard/?ticker=${companyGlobalSearchTicker}`
          )
        )
      );
      dispatch(setTempSearch(companyGlobalSearchTicker));
    }
  }, [companyGlobalSearchTicker, searchTicker]);

  const checkImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString("en-US", { month: "long" });
    const year = today.getFullYear();
    const formattedDate = `${day} ${month}, ${year}`;
    setTodayDate(formattedDate);
  }, []);

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

    downloadCSV(csvContent, `Investor-${companyGlobalSearchName}`);
  };

  const redirectCaseStudy = (institution_name: string) => {
    // window.open(`/case-studies`, "_blank");
    navigate(`/case-studies?institution_name=${encodeURIComponent(institution_name)}`);
  };

  const openEngagementQuestionsDialog = (institution_name: string) => {
    setInstitutionName(institution_name);
    setIsDialogOpen(true);
  };

  const [selectedYear, setSelectedYear] = useState<string>("");

  const handleAGMYearTab = (tab: string, index: number) => {
    setSelectedIndex(index);
    setSelectedYear(tab);
  }

  const getSelectedTabIndex = () => {
    const tabIndex = dashboardDataList?.total_year?.findIndex((year: any) => year?.toString() === (selectedYear?.toString() !== "" ?
      selectedYear?.toString() : dashboardDataList?.all_year_data[0]?.year?.toString()));
    // setSelectedIndex(tabIndex);
    return tabIndex || 0;
  };

  useEffect(() => {
    const index = getSelectedTabIndex();
    setSelectedIndex(index);
  }, [selectedYear])

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
                <h1 className="text-lg font-bold">
                  Top {dashboardDataList?.length || 20} Investor{" "}
                  <span className="text-base font-bold">
                    ({dashboardDataList?.total_percent_ownership} of shares outstanding)
                  </span>
                </h1>
                <div className="flex justify-between items-center gap-4 sm:flex-row">
                  <div className="flex justify-between items-center gap-2">
                    <img alt="flag-icon" src={flagIcon} />
                    <h4 className="font-semibold">
                      History of Schedule 13D Filing
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

              {
                dashboardDataList?.total_year?.length > 1 &&
                <div >
                  <Tab.Group selectedIndex={getSelectedTabIndex()} defaultIndex={0}>
                    <Tab.List
                      variant="boxed-tabs"
                      className="w-[100px] border-none bg-transparent"
                    >
                      {
                        dashboardDataList?.total_year?.length > 1 &&
                        dashboardDataList?.total_year?.map((tab: any, index: number) => (
                          <Tab key={index} className="active px-1 border-primary/10 first:rounded-l-[0.6rem] cursor-pointer
                                   last:rounded-r-[0.6rem] [&[aria-selected='true']_button]:text-white [&[aria-selected='true']_button]:bg-red-800">
                            <Tab.Button
                              className="w-24 whitespace-nowrap rounded-[0.6rem] font-medium text-primary bg-primary/10 border border-primary/10 cursor-pointer"
                              as="button"
                              onClick={() => handleAGMYearTab(tab, getSelectedTabIndex())}>
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
                <div>
                  <TableWrapper isLoading={investorCardLoading}>
                    <div
                      className={clsx([
                        locationPathName === "/" &&
                        "overflow-auto max-h-[600px]",
                      ])}
                    >
                      <Table className="table">
                        <Table.Thead>
                          <Table.Tr className="row">
                            <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              No.
                            </Table.Td>
                            <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Shareholder
                            </Table.Td>
                            <Table.Td className="cell text-[13px] py-2 font-semibold w-[150px] h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
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
                            <Table.Td className="cell text-[13px] py-2 font-semibold  h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Proxy Advisory Influence
                            </Table.Td>
                            <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              UN PRI Signatory
                            </Table.Td>
                            <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] min-w-[150px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
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
                            <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Engagement Topic
                            </Table.Td>
                            <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Voted Against Directors
                            </Table.Td>
                            <Table.Td className="cell text-[13px] py-2 font-semibold h-[50px] min-w-[120px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Voted Against Say on Pay
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
                                          {!dashboard.investor_profile_id && (
                                          
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
                                              onClick={() =>
                                                dashboard?.investor_profile_id &&
                                                window.open(
                                                  `/investor-company-details/${dashboard?.investor_profile_id}`,
                                                  "_blank"
                                                )
                                              }
                                              className={clsx([
                                                "cell whitespace-nowrap capitalize text-wrap font-semibold",
                                                dashboard?.investor_profile_id &&
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
                                                className="w-5 h-5"
                                                onClick={() =>
                                                  navigate(
                                                    `/investor-profile/investor/${dashboard?.investor_profile_id}?from=dashboard`
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
                                            {["The Vanguard Group", "BlackRock, Inc.", "Fidelity Investments", "Charles Schwab Asset Management"].includes(dashboard?.institution_name) ? (
                                              <Tippy
                                                content="Notes"
                                                options={{ theme: "light" }}
                                                className="w-6 h-6 mt-1"
                                                onClick={() => openEngagementQuestionsDialog(dashboard?.institution_name)}
                                              >
                                                <div className="flex items-center justify-center w-6 h-6 text-primary">
                                                  <Lucide icon="NotebookPen" className="w-4 h-4 stroke-[1.5]" />
                                                </div>
                                              </Tippy>
                                            ) : (
                                              <div className="flex items-center justify-center w-6 h-6 text-gray-400 cursor-not-allowed">
                                                <Lucide icon="Plus" className="w-4 h-4 stroke-[1.5]" />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </Table.Td>
                                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap flex items-center justify-center">
                                          {dashboard?.percent_ownership}%
                                        </div>
                                      </Table.Td>
                                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                          {dashboard.proxy_advisor_influence ||
                                            "-"}
                                        </div>
                                      </Table.Td>
                                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
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

                                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        {dashboard?.company_engaged ===
                                          true && (
                                            <div className="whitespace-nowrap flex items-center justify-center">
                                              <div className="bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                &#10004;
                                              </div>
                                            </div>
                                          )}
                                      </Table.Td>
                                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600 ">
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
                                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
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
                                              <div className="flex items-center justify-center w-full h-full text-primary mr-2">
                                                <Tippy content="Not Disclose" options={{ theme: "light" }}>
                                                  <MegaphoneOff size={18} strokeWidth={1.2} absoluteStrokeWidth />
                                                </Tippy>
                                              </div>
                                            </div>
                                          )}

                                      </Table.Td>
                                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
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
                                              <div className="flex items-center justify-center w-full h-full text-primary mr-2">
                                                <Tippy content="Not Disclose" options={{ theme: "light" }}>
                                                  <MegaphoneOff size={18} strokeWidth={1.2} absoluteStrokeWidth />
                                                </Tippy>
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
                      Source: Whalewisdom. Data as of {todayDate}
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

      <Dialog size="2xl" open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
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
              <EngagementQuestionsDialog institution_name={institutionName} />
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>
    </>
  );
};

export default index;