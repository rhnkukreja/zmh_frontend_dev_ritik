import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import { createDynamicURL, downloadCSV } from "@/utils/helper";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchAGMSummaryDashboard,
  fetchNpxProxyDashboard,
  fetchVdsProxyDashboard,
  setTempSearch,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import LoadingIcon from "../../components/Base/LoadingIcon";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft, FilterX } from "lucide-react";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import MultiSearchBar from "@/components/MultiSearch";

const index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationPathName = location?.pathname;
  const dispatch: AppDispatch = useAppDispatch();
  const { npxProxyDetails, npxProxyLoading, tempSearch } = useAppSelector(
    (state) => state.dashboard
  );
  const [searchParams] = useSearchParams();

  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;
  const searchTicker = searchParams.get("ticker");

  // const { globeSearch } = location.state || {};
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [filter, setFilter] = useState('');


  useEffect(() => {
    if (companyGlobalSearchTicker && npxProxyDetails?.length === 0) {
      dispatch(
        fetchNpxProxyDashboard(
          createDynamicURL(
            `${baseURL}/npx_proxy_voting/`, {'ticker': companyGlobalSearchTicker, 'fund_name': [filter]}
          )
        )
      );
      dispatch(setTempSearch(companyGlobalSearchTicker));
    } else /* if (globeSearch !== tempSearch) */ {
      dispatch(
        fetchNpxProxyDashboard(
          createDynamicURL(
            `${baseURL}/npx_proxy_voting/`, {'ticker': companyGlobalSearchTicker, 'fund_name': [filter]})
        )
      );
      dispatch(setTempSearch(companyGlobalSearchTicker));
    }
  }, [companyGlobalSearchTicker, searchTicker, filter]);

  const isObject = (item: any) => {
    if (typeof item === "object") {
      return true;
    } else {
      false;
    }
  };

  const convertDivTableToCSV = () => {
    const table = document.querySelector(".table_2");
    const rows = table?.querySelectorAll(".row_2");
    const tableProposal = document.querySelector(".table_3");
    const rowsProposal = tableProposal?.querySelectorAll(".row_3");
    let csvContent = "\uFEFF";
    rows?.forEach((row) => {
      const cells = row.querySelectorAll(".cell_2");
      let rowData: any = [];
      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim();
        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }
        rowData.push(cellText);
      });

      csvContent += rowData.join(",") + "\n";
    });

    rowsProposal?.forEach((row) => {
      const cells = row.querySelectorAll(".cell_3");
      let rowData: any = [];
      cells.forEach((cell) => {
        let cellText = cell.textContent?.trim();
        if (cellText?.includes(",")) {
          cellText = `"${cellText}"`;
        }

        rowData.push(cellText);
      });

      csvContent += rowData.join(",") + "\n";
    });

    downloadCSV(csvContent, `NPX-${companyGlobalSearchName}`);
  };

  function getContent(text: string): string {
    const textContent = text?.split('<br>').map((line) => line.trim()).join('\n\n\n');
    return textContent;
  }

  const getSplitContents = (items: any) => {
    const resultString = Object.entries(items)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    return resultString;
  };

  const handleSearch = (searchTerms: string[]) => {
    setFilter(searchTerms[0]);
  };


  const handleClearAllFilter = () => {
    setFilter('');
    setSearchTerms([]);
  };

  

  return (
    <>
      {npxProxyDetails?.npx_report?.length === 0 &&
        !npxProxyLoading &&
        location.pathname !== "/" && (
          <Button
            onClick={() => {
              navigate("/");
            }}
            variant="primary"
            className="bg-theme-2 border-bg-theme-2 mb-1"
          >
            <ChevronLeft
              className="group-[.mode--light]:text-white text-white"
              size={18}
              strokeWidth={1.5}
            />
            Back
          </Button>
        )}

      
      <div className="p-5 mt-1 box">
        <div className="flex">
          <MultiSearchBar
            onSearch={handleSearch}
            searchTerms={searchTerms}
            setSearchTerms={setSearchTerms}
            url={`/npx/fund_name/?all=true`}
            getOptionKey="fund_name"
            placeHolder="Search Fund Name"
            isSingle={true}
            isAll={true}
          // onSearchChange={resetPage}
          />
          <div className="hover:bg-slate-50">
            <Button onClick={handleClearAllFilter}>
              <Tippy
                content="Clear Filters"
                options={{ theme: "light" }}
              >
                <FilterX
                  size={17}
                  strokeWidth={1}
                  className="text-slate-500 cursor-pointer"
                />
              </Tippy>
              {/* <span className="text-slate-500">Clear Filters</span> */}
            </Button>
          </div>
        </div>

        {npxProxyDetails?.npx_report?.length > 0 && (
          <div className="w-full">
            <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
              <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                <span>
                  <h1 className="text-lg font-bold">N-PX Voting (Beta)</h1>
                </span>
              </div>
              <div className="flex justify-between items-center gap-4 xs:mt-4 md:mt-0">
                {/* <h1 className="text-md font-bold">
                  Aggregate Ownership:
                  {npxProxyDetails?.total_percent_ownership}
                </h1> */}
                <Tippy content="Download Excel" options={{ theme: "light" }}>
                  <div
                    className="box p-[5px] cursor-pointer"
                    onClick={convertDivTableToCSV}
                  >
                    <img alt="download-icon" src={downloadIcon} />
                  </div>
                </Tippy>
                {/* {locationPathName === "/vds-details/" && (
                  <Tippy content="Expand" options={{ theme: "light" }}>
                    <div
                      className="box p-2 cursor-pointer"
                      onClick={() => window.open("/vds-proxy-details", "_blank")}
                    >
                      <img alt="tab-icon" src={tabIcon} />
                    </div>
                  </Tippy>
                 )} */}
              </div>
            </div>
            <>
              <div className="">
                <div>
                  <TableWrapper>
                    <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                      <Table className="table_2 w-full">
                        <Table.Thead className="sticky top-50 z-10">
                          {" "}
                          {/* Make entire header sticky */}
                          <Table.Tr className="row_2">
                            {npxProxyDetails?.npx_report_headers?.length > 0 &&
                              npxProxyDetails?.npx_report_headers?.map(
                                (npxHeader: any, headerIndex: number) => (
                                  <Table.Td
                                    key={headerIndex}
                                    className={clsx([
                                      "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] max-w-[150px] min-w-[150px] text-left",
                                      "sticky top-0", // Ensure the header remains sticky at the top
                                      headerIndex === 0 &&
                                      "sticky left-0 bg-header z-50 ", // Fix first column
                                      headerIndex === 1 &&
                                      "sticky left-[50px] bg-header z-50 ", // Fix second column (adjust 'left' value according to width)
                                    ])}
                                  >
                                    {npxHeader?.header}
                                  </Table.Td>
                                )
                              )}
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {npxProxyDetails?.npx_report?.length > 0 &&
                            npxProxyDetails?.npx_report?.map(
                              (vdsProxy: any, vdsProxyIndex: number) => (
                                <Table.Tr
                                  key={vdsProxyIndex}
                                  className="row_2 [&_td]:last:border-b-0"
                                >
                                  {npxProxyDetails?.npx_report_headers?.length >
                                    0 &&
                                    npxProxyDetails?.npx_report_headers?.map(
                                      (npxHeader: any, headerIndex: number) => (
                                        <Table.Td
                                          key={headerIndex}
                                          className={clsx([
                                            "cell_2 py-2 border-dashed dark:bg-darkmode-600 max-w-[150px] min-w-[150px] text-left",
                                            headerIndex === 0 &&
                                            "sticky left-0 bg-white  z-5", // Fix first column
                                            headerIndex === 1 &&
                                            "sticky left-[50px] bg-white z-5", // Fix second column
                                          ])}
                                        >
                                          {isObject(
                                            vdsProxy[npxHeader?.field]
                                          ) &&
                                            vdsProxy[npxHeader?.field]?.notes !==
                                            null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  npxHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    npxHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                "text-red-700 font-semibold",
                                                "flex items-center",
                                              ])}
                                            >
                                              {vdsProxy[npxHeader?.field]
                                                ?.vote === "Split Vote" ? (
                                                <Tippy
                                                  content={
                                                    isObject(
                                                      vdsProxy[npxHeader?.field]
                                                    ) &&
                                                    getSplitContents(
                                                      vdsProxy[npxHeader?.field]
                                                        ?.split_vote_counts
                                                    )
                                                  }
                                                  options={{ theme: "light" }}
                                                >
                                                  {
                                                    vdsProxy[npxHeader?.field]
                                                      ?.vote
                                                  }
                                                </Tippy>
                                              ) : (
                                                vdsProxy[npxHeader?.field]?.vote
                                              )}

                                              <Tippy
                                                content={
                                                  isObject(
                                                    vdsProxy[npxHeader?.field]
                                                  ) &&
                                                  getContent(vdsProxy[npxHeader?.field]?.notes)
                                                }
                                                options={{ theme: "light", trigger: "click" }}
                                              >
                                                {/* <span>
                                                  <Lucide
                                                    icon="Info"
                                                    className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                  />
                                                </span> */}
                                              </Tippy>
                                            </h1>
                                          ) : isObject(
                                            vdsProxy[npxHeader?.field]
                                          ) &&
                                            vdsProxy[npxHeader?.field]
                                              ?.notes === null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  npxHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    npxHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                "text-red-700 font-semibold",
                                              ])}
                                            >
                                              {vdsProxy[npxHeader?.field]?.vote}
                                            </h1>
                                          ) : (
                                            <h1>
                                              {vdsProxy[npxHeader?.field]}
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
                </div>
              </div>
            </>
          </div>

        )}

        {!npxProxyDetails && npxProxyLoading && (
          <div className="h-52 p-5 mt-3.5 flex items-center justify-center">
            <LoadingIcon
              color="#800000"
              icon="three-dots"
              className="w-16 h-16"
            />
          </div>
        )}

        {npxProxyDetails?.npx_report?.length === 0 && !npxProxyLoading && (
          <div className="h-52 p-5 mt-3.5 flex items-center justify-center">
            <h1 className="font-semibold"> Proxy Records Not Found..</h1>
          </div>
        )}
      </div>

      

      
    </>
  );
};

export default index;
