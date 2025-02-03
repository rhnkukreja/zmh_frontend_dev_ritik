import Lucide from "../Base/Lucide";
import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import flagIcon from "../../assets/images/zmh-images/flag-icon.png";
import FormSelect from "../Base/Form/FormSelect";
import Tippy from "../Base/Tippy";
import { createDynamicURL, downloadCSV } from "@/utils/helper";
import { useEffect } from "react";
import summary from "@/assets/json/brhc10049413_8k.json";
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

const index = () => {
  const { companyGlobalSearchTicker, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const location = useLocation();
  const locationPathName = location?.pathname;
  const dispatch: AppDispatch = useAppDispatch();
  const { agmSummaryDetails, loading, dashboardDataList, tempSearch } =
    useAppSelector((state) => state.dashboard);
  const [searchParams] = useSearchParams();
  const companyDetails = agmSummaryDetails?.company
    ? agmSummaryDetails?.company[0]
    : "";
  const companyName = Object.keys(companyDetails)[0];
  const meetingDetails = companyDetails[companyName];
  const meetingDate = meetingDetails?.split(" - ").pop();
  const navigate = useNavigate();

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

    downloadCSV(csvContent, `Agm-Summary-${companyGlobalSearchName}`);
  };

  const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;
  const searchTicker = searchParams.get("ticker");

  useEffect(() => {
    if (companyGlobalSearchTicker && dashboardDataList?.length === 0) {
      dispatch(
        fetchAGMSummaryDashboard(
          createDynamicURL(
            `${baseURL}/voting_report_8k/?ticker=${companyGlobalSearchTicker}`
          )
        )
      );
      dispatch(setTempSearch(companyGlobalSearchTicker));
    } else if (companyGlobalSearchTicker !== tempSearch) {
      dispatch(
        fetchAGMSummaryDashboard(
          createDynamicURL(
            `${baseURL}/voting_report_8k/?ticker=${companyGlobalSearchTicker}`
          )
        )
      );
      dispatch(setTempSearch(companyGlobalSearchTicker));
    }
  }, [companyGlobalSearchTicker, searchTicker]);

  const handleViewMore = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // event.preventDefault();
    //     navigate(`vds-details/?ticker=${companyGlobalSearchTicker.split("-")[0]}`, {
    //       state: {
    //         globeSearch: companyGlobalSearchTicker,
    //       },
    // })
    window.open(
      `vds-details/?ticker=${companyGlobalSearchTicker.split("-")[0]}`,
      "_blank"
    );
  };

  const handleViewNPX = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // event.preventDefault();
    //     navigate(`npx-details/?ticker=${companyGlobalSearchTicker.split("-")[0]}`, {
    //       state: {
    //         globeSearch: companyGlobalSearchTicker,
    //       },
    // })
    window.open(
      `npx-details/?ticker=${companyGlobalSearchTicker.split("-")[0]}`,
      "_blank"
    );
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
                      Previous AGM Summary {agmSummaryDetails?.Year}
                    </h1>
                    <p className=" italic"> Meeting Date: {meetingDate}</p>
                  </span>

                  {dashboardDataList?.length >  0 && agmSummaryDetails?.Year !== "2023" && (
                    <button
                      onClick={(event: any) => handleViewMore(event)}
                      className="p-2 cursor-pointer bg-white rounded-md xs:w-[240px] 
                                    md:w-auto flex items-center justify-center border-red-800 border-2
                                     font-semibold text-red-800 border-solid hover:bg-red-800 hover:border-white hover:text-white"
                    >
                      View More
                    </button>
                  )}
                  {dashboardDataList?.length > 0 &&
                    <button
                      onClick={(event: any) => handleViewNPX(event)}
                      className="p-2 cursor-pointer bg-white rounded-md xs:w-[240px] 
                                   md:w-auto flex items-center justify-center border-red-800 border-2
                                    font-semibold text-red-800 border-solid hover:bg-red-800 hover:border-white hover:text-white"
                    >
                      View N-PX
                    </button>
                  }
                </div>
                <div className="flex justify-between items-center gap-4 xs:mt-4 md:mt-0">
                  <div className="flex justify-between items-center gap-2">
                    <h4 className="font-semibold cursor-pointer" onClick={() => {
                      window.scrollBy({
                        top: 350,
                        behavior: "smooth",
                      });
                    }}>
                      Quorum: {agmSummaryDetails?.Quorum}
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
                    <Tippy content="Expand" options={{ theme: "light" }}>
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

              <div className="mt-5">
                <TableWrapper isLoading={loading}>
                  <div
                    className={clsx([
                      locationPathName === "/" &&
                        " max-h-[400px] overflow-y-scroll",
                    ])}
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
                                    "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[130px] text-right",
                                    headerIndex === 0 && "text-left w-[200px]",
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
                                          "cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-right",
                                          headerIndex === 0 && "text-left ",
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


                <footer className="!pt-3 flex items-start flex-col">
                  <span className="!pt-3 flex items-center box p-2">
                    <sup
                      className="bold-sup cursor-pointer ml-1"
                      style={{ fontSize: "0.8em" }}
                    >
                      
                    </sup>
                    <p id="footnote " className="">
                       [(For + Against + Withhold)/Shares Outstanding]
                      </p>
                  </span>
                </footer>

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
                                  "cell_3 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[140px] text-right",
                                  headerIndex === 0 && "text-left w-[220px]",
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
                                          "cell_3 py-2 border-dashed dark:bg-darkmode-600 text-right",
                                          headerIndex === 0 && "text-left",
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

      {!agmSummaryDetails?.Year && !loading && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <h1 className="font-semibold">
            {" "}
            Previous AGM Summary Records Not Found..
          </h1>
        </div>
      )}
    </>
  );
};

export default index;
