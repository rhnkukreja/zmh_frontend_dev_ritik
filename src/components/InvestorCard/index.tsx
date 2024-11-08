import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import flagIcon from "../../assets/images/zmh-images/flag-icon.png";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  CompanyDashboard,
  fetchCompanyDashboard,
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
import { useEffect, useState } from "react";
import { createDynamicURL, downloadCSV } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "../Base/Tippy";
import clsx from "clsx";
import LoadingIcon from "../Base/LoadingIcon";
import Button from "../Base/Button";
import { ChevronLeft, FileText } from "lucide-react";

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


  useEffect(() => {


    if (companyGlobalSearchTicker && dashboardDataList?.length === 0) {
      dispatch(
        fetchCompanyDashboard(
          createDynamicURL(
            `${baseURL}/company-dashboard/?ticker=${companyGlobalSearchTicker}`
          )
        )

      );
      dispatch(
        setTempSearch(companyGlobalSearchTicker))
    }

    else if (companyGlobalSearchTicker !== tempSearch) {
      dispatch(
        fetchCompanyDashboard(
          createDynamicURL(
            `${baseURL}/company-dashboard/?ticker=${companyGlobalSearchTicker}`
          )
        )
      );
      dispatch(
        setTempSearch(companyGlobalSearchTicker))
    }
  }, [companyGlobalSearchTicker, searchTicker])


  const checkImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const validateImages = async () => {
      const tempValidImages: { [key: string]: string } = {};
      for (const dashbboard of dashboardDataList || []) {
        const isValid = await checkImageUrl(dashbboard?.institution_logo_url);
        tempValidImages[dashbboard?.institution_name] = isValid
          ? dashbboard?.institution_logo_url
          : userLinkedinImage;
      }

      setValidImages(tempValidImages);
    };

    validateImages();
  }, [dashboardDataList]);

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
        console.log(cellText);
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
                  <span className="text-base font-bold">({percent} of shares outstanding)</span>
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
                    <Tippy content="Expand" options={{ theme: "light" }}>
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
              {/* } */}

              <div className="mt-5">
                <div>
                  <TableWrapper isLoading={investorCardLoading}>
                    <div
                      className={clsx([
                        locationPathName === "/" &&
                        "overflow-auto max-h-[400px]",
                      ])}
                    >
                      <Table className="table">
                        <Table.Thead>
                          <Table.Tr className="row">
                            <Table.Td className="cell py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              No.
                            </Table.Td>
                            <Table.Td className="cell py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Shareholder
                            </Table.Td>
                            <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              % Ownership
                            </Table.Td>
                            <Table.Td className="cell py-2 font-semibold  h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Proxy Advisory Influence
                            </Table.Td>
                            <Table.Td className="cell py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              ESG Integration
                            </Table.Td>
                            <Table.Td className="cell py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Engaged with Company *
                            </Table.Td>
                            <Table.Td className="cell py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Engagement Topic
                            </Table.Td>
                            <Table.Td className="cell py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                              Voted Against Directors
                            </Table.Td>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {dashboardDataList?.length > 0 &&
                            dashboardDataList.map(
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
                                      <Table.Td className="flex items-center">
                                        <div className="w-9 h-9 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                          <img
                                            alt="ZMH Analytics"
                                            src={
                                              validImages[
                                              dashboard.institution_name
                                              ] || userLinkedinImage
                                            }

                                          // {dashboard?.institution_logo_url ?? userLinkedinImage}
                                          />
                                        </div>

                                        <div className="flex justify-between items-center w-[220px]">
                                          <div className="flex items-center font-semibold ">
                                            <h1
                                              onClick={() =>
                                                dashboard?.investor_profile_id &&
                                                window.open(
                                                  `/investor-company-details/${dashboard?.investor_profile_id}`,
                                                  "_blank"
                                                )
                                              }
                                              className={clsx([
                                                "cell whitespace-nowrap capitalize max-w-[150px] text-wrap",
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

                                          {dashboard?.investor_profile_id && (
                                            <Tippy content="Investor Profile" options={{ theme: "light" }}>
                                              <div
                                                onClick={() =>
                                                  window.open(
                                                    `/investor-profile/investor/${dashboard?.investor_profile_id}`,
                                                    "_blank"
                                                  )
                                                }
                                                // bg-red-900 hover:bg-red-700 font-semibold
                                                className="
                                               flex items-center cursor-pointer justify-center rounded-full w-5 h-5 text-[10px] "
                                              >
                                                <FileText />
                                                {/* P */}
                                              </div>
                                            </Tippy>
                                          )}
                                        </div>
                                      </Table.Td>
                                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                        <div className="whitespace-nowrap ">
                                          {dashboard?.percent_ownership}
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
                                          {dashboard?.esg_integration ===
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
                                      <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
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
            <h1 className="text-red-700 font-bold mt-4">* As disclosed by the investor</h1>

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
    </>
  );
};

export default index;
