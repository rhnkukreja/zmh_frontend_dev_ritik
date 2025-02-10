import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import {
  convertToTitleCase,
  createDynamicURL,
  downloadCSV,
} from "@/utils/helper";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  clearVotingRationale,
  fetchVdsProxyAllInvestor,
  fetchVdsProxyDashboard,
  getProxyVotingRationale,
  resetVotingRationalePage,
  setTabs,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import LoadingIcon from "../../components/Base/LoadingIcon";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft } from "lucide-react";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";

import { Tooltip } from "react-tooltip";
import { Tab } from "@/components/Base/Headless";

import { dashboardService } from "@/services/dashboard";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import { setIsCompanySelected } from "@/stores/authenticationSlice";
import VotingRationale from "./VotingRationale";

const VdsProxyVotingTable = () => {
  const navigate = useNavigate();
  const dispatch: AppDispatch = useAppDispatch();
  const {
    vdsProxyDetails,
    vdsProxyLoading,
    vdsProxyAllInvestorDetails,
    vdsProxyAllInvestorLoading,
    votingRationlePage,
    tab,
  } = useAppSelector((state) => state.dashboard);
  const [searchParams] = useSearchParams();

  const {
    companyGlobalSearchName,
    companyGlobalSearchTicker,
    isCompanySelected,
  } = useAppSelector((state: RootState) => state.authentiction);

  const searchTicker = searchParams.get("ticker");
  const [filter, setFilter] = useState<any>([]);

  const { handleSubmit, control, reset } = useForm<any>({
    defaultValues: {
      institution: [],
    },
  });

  useEffect(() => {
    if (tab === "Top-20" && isCompanySelected) {
      dispatch(
        fetchVdsProxyDashboard(
          createDynamicURL(
            `${baseURL}/vds_proxy_voting/?ticker=${companyGlobalSearchTicker}`
          )
        )
      );
    }

    if (companyGlobalSearchTicker && vdsProxyDetails?.length === 0) {
      dispatch(
        fetchVdsProxyDashboard(
          createDynamicURL(
            `${baseURL}/vds_proxy_voting/?ticker=${companyGlobalSearchTicker}`
          )
        )
      );
    } else {
      dispatch(
        fetchVdsProxyDashboard(
          createDynamicURL(
            `${baseURL}/vds_proxy_voting/?ticker=${companyGlobalSearchTicker}`
          )
        )
      );
    }
  }, [companyGlobalSearchTicker, searchTicker, tab]);

  useEffect(() => {
    if (tab === "All-Investor" && isCompanySelected) {
      if (filter?.length > 0) {
        dispatch(
          fetchVdsProxyAllInvestor(
            createDynamicURL(`${baseURL}/vds_proxy_voting/`, {
              ticker: companyGlobalSearchTicker,
              institution_name: filter,
            })
          )
        );
      } else {
        dispatch(
          fetchVdsProxyAllInvestor(
            createDynamicURL(`${baseURL}/vds_proxy_voting/`)
          )
        );
      }
      dispatch(setIsCompanySelected(false));
    } else if (filter?.length > 0) {
      dispatch(
        fetchVdsProxyAllInvestor(
          createDynamicURL(`${baseURL}/vds_proxy_voting/`, {
            ticker: companyGlobalSearchTicker,
            institution_name: filter,
          })
        )
      );
    } else {
      dispatch(
        fetchVdsProxyAllInvestor(
          createDynamicURL(`${baseURL}/vds_proxy_voting/`)
        )
      );
    }
  }, [filter, tab, companyGlobalSearchTicker]);

  useEffect(() => {
    if (tab === "All-Investor") {
      if (filter?.length > 0) {
        dispatch(
          getProxyVotingRationale(
            createDynamicURL(
              `/vds_proxy_voting_rationale/`,
              {
                ticker: companyGlobalSearchTicker,
                institution_name: filter,
              },
              undefined,
              votingRationlePage
            )
          )
        );
      } else {
        dispatch(
          getProxyVotingRationale(
            createDynamicURL(
              `/vds_proxy_voting_rationale/`,
              {},
              undefined,
              votingRationlePage
            )
          )
        );
      }
    }
  }, [filter, tab, companyGlobalSearchTicker, votingRationlePage]);

  const isObject = (item: any) => {
    if (typeof item === "object") {
      return true;
    } else {
      false;
    }
  };

  const convertDivTableToCSV = (tabName: string) => {
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

        const tooltip = cell.querySelector("[data-tooltip-html]");
        const tooltipText = tooltip?.getAttribute("data-tooltip-html")?.trim();

        if (tooltipText) {
          cellText += ` (voting rationale: ${tooltipText})`;
        }

        if (cellText) {
          cellText = `"${cellText.replace(/"/g, '""')}"`;
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

        const tooltip = cell.querySelector("[data-tooltip-html]");
        const tooltipText = tooltip?.getAttribute("data-tooltip-html")?.trim();

        if (tooltipText) {
          cellText += ` (voting rationale: ${tooltipText})`;
        }

        if (cellText) {
          cellText = `"${cellText.replace(/"/g, '""')}"`;
        }

        rowData.push(cellText);
      });

      csvContent += rowData.join(",") + "\n";
    });

    downloadCSV(csvContent, `${tabName}-${companyGlobalSearchName}`);
  };

  const getSplitContents = (items: any) => {
    const resultString = Object.entries(items)
      .map(([key, value]) => `${convertToTitleCase(key)}: ${value}`)
      .join(", ");
    return resultString;
  };

  const [apiDropdownOptions, setApiDropdownOptions] = useState<any>([]);

  const getAllInstitutionDropdown = async () => {
    try {
      const res = await dashboardService.getInstitution({
        company_name: [companyGlobalSearchName],
      });
      if (res.result?.institution) {
        setApiDropdownOptions(res.result?.institution);
      }
    } catch (error) {
      return error;
    } finally {
      // setGetDropdownLoader(false);
    }
  };

  useEffect(() => {
    getAllInstitutionDropdown();
  }, [companyGlobalSearchTicker]);

  const onSubmit = async (investorProfileFilter: any) => {
    if (investorProfileFilter?.institution) {
      setFilter(investorProfileFilter?.institution);
    }
  };

  const onFilterClear = () => {
    setFilter([]);
    dispatch(resetVotingRationalePage());
    dispatch(clearVotingRationale());
    reset();
  };

  const getSelectedTabIndex = () => {
    const tabIndex = tab === "Top-20" ? 0 : tab === "All-Investor" ? 1 : -1;
    return tabIndex;
  };

  const onTabChange = () => {
    dispatch(resetVotingRationalePage());
    dispatch(clearVotingRationale());
  };
  return (
    <>
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

      <div className="p-5 mt-1 box">
        <div className="w-full">
          <>
            <Tab.Group selectedIndex={getSelectedTabIndex()}>
              <Tab.List variant="link-tabs">
                <Tab>
                  <Tab.Button
                    className="w-full py-2"
                    as="button"
                    onClick={() => {
                      dispatch(setTabs("Top-20"));
                      onTabChange();
                    }}
                  >
                    <div className="flex items-center justify-center ">
                      Top 20
                    </div>
                  </Tab.Button>
                </Tab>

                <Tab>
                  <Tab.Button
                    className="w-full py-2"
                    as="button"
                    onClick={() => {
                      dispatch(setTabs("All-Investor"));
                      onTabChange();
                    }}
                  >
                    <div className="flex items-center justify-center ">
                      All Investors
                    </div>
                  </Tab.Button>
                </Tab>
              </Tab.List>

              <Tab.Panels className="mt-5">
                <Tab.Panel className="leading-relaxed">
                  <div className="flex justify-between  mt-1">
                    <h1 className="text-lg font-bold">Proxy Voting</h1>
                    {tab === "Top-20" &&
                      vdsProxyDetails?.vds_report_headers?.length > 0 && (
                        <div className="flex justify-end items-center gap-4 mb-5 xs:mt-4 md:mt-0">
                          <h1 className="text-md font-bold">
                            Aggregate Ownership:{" "}
                            {vdsProxyDetails?.total_percent_ownership}
                          </h1>
                          <Tippy
                            content="Download Excel"
                            options={{ theme: "light" }}
                          >
                            <div
                              className="box p-[5px] cursor-pointer"
                              onClick={() =>
                                convertDivTableToCSV("Top-20-Proxy-voting")
                              }
                            >
                              <img alt="download-icon" src={downloadIcon} />
                            </div>
                          </Tippy>
                        </div>
                      )}
                  </div>

                  <TableWrapper>
                    <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                      <Table className="table_2 w-full">
                        <Table.Thead className="sticky top-50 z-10">
                          <Table.Tr className="row_2">
                            {vdsProxyDetails?.vds_report_headers?.length > 0 &&
                              vdsProxyDetails?.vds_report_headers?.map(
                                (vdsHeader: any, headerIndex: number) => (
                                  <Table.Td
                                    key={headerIndex}
                                    className={clsx([
                                      "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]  text-left",
                                      "sticky top-0",
                                      headerIndex === 0 &&
                                        "sticky left-0 bg-header z-[5000] ",
                                      headerIndex === 1 &&
                                        "sticky left-[50px] min-w-[200px] max-w-[250px] bg-header z-[5000] ",
                                      headerIndex !== 0 &&
                                        headerIndex !== 1 &&
                                        "min-w-[150px] max-w-[170px] ",
                                    ])}
                                  >
                                    {vdsHeader?.header}
                                  </Table.Td>
                                )
                              )}
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {vdsProxyDetails?.vds_report?.length > 0 &&
                            vdsProxyDetails?.vds_report?.map(
                              (vdsProxy: any, vdsProxyIndex: number) => (
                                <Table.Tr
                                  key={vdsProxyIndex}
                                  className="row_2 [&_td]:last:border-b-0"
                                >
                                  {vdsProxyDetails?.vds_report_headers?.length >
                                    0 &&
                                    vdsProxyDetails?.vds_report_headers?.map(
                                      (vdsHeader: any, headerIndex: number) => (
                                        <Table.Td
                                          key={headerIndex}
                                          className={clsx([
                                            "cell_2 py-2 border-dashed dark:bg-darkmode-600text-left",
                                            headerIndex === 0 &&
                                              "sticky left-0 bg-white z-[9]", // Fix first column
                                            headerIndex === 1 &&
                                              "sticky left-[50px] min-w-[200px] max-w-[250px]  bg-white z-[9]", // Fix second column
                                            headerIndex !== 0 &&
                                              headerIndex !== 1 &&
                                              "min-w-[150px] max-w-[170px] ",
                                          ])}
                                        >
                                          {isObject(
                                            vdsProxy[vdsHeader?.field]
                                          ) &&
                                          vdsProxy[vdsHeader?.field]?.notes !==
                                            null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  vdsHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    vdsHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                  "text-red-700 font-semibold ",
                                                "flex items-center ",
                                              ])}
                                            >
                                              {vdsProxy[vdsHeader?.field]
                                                ?.vote === "Split Vote" ? (
                                                <Tippy
                                                  content={
                                                    isObject(
                                                      vdsProxy[vdsHeader?.field]
                                                    ) &&
                                                    getSplitContents(
                                                      vdsProxy[vdsHeader?.field]
                                                        ?.split_vote_counts
                                                    )
                                                  }
                                                  options={{ theme: "light" }}
                                                >
                                                  {
                                                    vdsProxy[vdsHeader?.field]
                                                      ?.vote
                                                  }
                                                </Tippy>
                                              ) : (
                                                <span className="for ">
                                                  {
                                                    vdsProxy[vdsHeader?.field]
                                                      ?.vote
                                                  }
                                                </span>
                                              )}

                                              {/* <Tippy content={<span dangerouslySetInnerHTML={{ __html: getContent(vdsProxy[vdsHeader?.field]?.notes) ?? '' }}/>}> */}
                                              <div
                                                data-tooltip-id="my-tooltip-data-html"
                                                data-tooltip-html={
                                                  vdsProxy[vdsHeader?.field]
                                                    ?.notes
                                                }
                                              >
                                                <Lucide
                                                  icon="Info"
                                                  className=" w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                />
                                                {/* <span className="tooltiptext shadow-md" >
                                                  </span> */}
                                                {/* </Tippy> */}
                                              </div>
                                            </h1>
                                          ) : isObject(
                                              vdsProxy[vdsHeader?.field]
                                            ) &&
                                            vdsProxy[vdsHeader?.field]
                                              ?.notes === null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  vdsHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    vdsHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                  "text-red-700 font-semibold ",
                                              ])}
                                            >
                                              {vdsProxy[vdsHeader?.field]
                                                ?.vote !== "Split Vote"
                                                ? vdsProxy[vdsHeader?.field]
                                                    ?.vote
                                                : ""}
                                            </h1>
                                          ) : (
                                            <h1 className="check ">
                                              {vdsProxy[vdsHeader?.field]}
                                            </h1>
                                          )}

                                          {isObject(
                                            vdsProxy[vdsHeader?.field]
                                          ) &&
                                            vdsProxy[vdsHeader?.field]
                                              ?.notes === null &&
                                            vdsProxy[vdsHeader?.field]?.vote ===
                                              "Split Vote" && (
                                              <Tippy
                                                content={
                                                  isObject(
                                                    vdsProxy[vdsHeader?.field]
                                                  ) &&
                                                  getSplitContents(
                                                    vdsProxy[vdsHeader?.field]
                                                      ?.split_vote_counts
                                                  )
                                                }
                                                options={{ theme: "light" }}
                                              >
                                                {
                                                  vdsProxy[vdsHeader?.field]
                                                    ?.vote
                                                }
                                              </Tippy>
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

                    {!vdsProxyDetails && vdsProxyLoading && (
                      <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                        <LoadingIcon
                          color="#800000"
                          icon="three-dots"
                          className="w-16 h-16"
                        />
                      </div>
                    )}

                    {vdsProxyDetails?.vds_report?.length === 0 &&
                      !vdsProxyLoading && (
                        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                          <h1 className="font-semibold">
                            Top 20 Proxy Records Not Found..
                          </h1>
                        </div>
                      )}
                  </TableWrapper>

                  {/* <VotingRationale /> */}
                </Tab.Panel>
              </Tab.Panels>

              <Tab.Panels className="mt-5">
                <Tab.Panel className="leading-relaxed">
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex items-end gap-4">
                      <div className=" w-4/12">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          Select Institution*
                        </div>
                        <Controller
                          name="institution"
                          control={control}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Institution",
                              }}
                              className="w-full"
                              multiple
                            >
                              <>
                                {apiDropdownOptions.length > 0 &&
                                  apiDropdownOptions?.map(
                                    (institution: string) => {
                                      return (
                                        <option value={institution}>
                                          {institution}
                                        </option>
                                      );
                                    }
                                  )}
                              </>
                            </TomSelect>
                          )}
                        />
                      </div>
                      <div className="flex items-center mt-7">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            onFilterClear();
                          }}
                          className="w-32 ml-auto"
                        >
                          Clear
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          className="w-32 ml-2"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </form>
                  <div className="flex justify-between mb-4 mt-1">
                    <h1 className="text-lg font-bold mt-4">Proxy Voting</h1>
                    {vdsProxyAllInvestorDetails?.vds_report?.length > 0 && (
                      <div className="flex justify-end items-center gap-4 xs:mt-4 md:mt-0">
                        <Tippy
                          content="Download Excel"
                          options={{ theme: "light" }}
                        >
                          <div
                            className="box p-[5px] cursor-pointer"
                            onClick={() => convertDivTableToCSV("All Investor")}
                          >
                            <img alt="download-icon" src={downloadIcon} />
                          </div>
                        </Tippy>
                      </div>
                    )}
                  </div>

                  <TableWrapper
                    isLoading={vdsProxyAllInvestorLoading && filter?.length > 0}
                  >
                    <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                      <Table className="table_3 w-full">
                        <Table.Thead className="sticky top-50 z-10">
                          <Table.Tr className="row_3">
                            {vdsProxyAllInvestorDetails?.vds_report_headers
                              ?.length > 0 &&
                              vdsProxyAllInvestorDetails?.vds_report_headers?.map(
                                (vdsHeader: any, headerIndex: number) => (
                                  <Table.Td
                                    key={headerIndex}
                                    className={clsx([
                                      "cell_3 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]  text-left",
                                      "sticky top-0", // Ensure the header remains sticky at the top
                                      headerIndex === 0 &&
                                        "sticky left-0 bg-header z-[5000] ", // Fix first column
                                      headerIndex === 1 &&
                                        "sticky left-[50px] min-w-[200px] max-w-[250px] bg-header z-[5000] ", // Fix second column (adjust 'left' value according to width)
                                      headerIndex !== 0 &&
                                        headerIndex !== 1 &&
                                        "min-w-[150px] max-w-[170px] ",
                                    ])}
                                  >
                                    {vdsHeader?.header}
                                  </Table.Td>
                                )
                              )}
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {vdsProxyAllInvestorDetails?.vds_report?.length > 0 &&
                            vdsProxyAllInvestorDetails?.vds_report?.map(
                              (vdsProxy: any, vdsProxyIndex: number) => (
                                <Table.Tr
                                  key={vdsProxyIndex}
                                  className="row_3 [&_td]:last:border-b-0"
                                >
                                  {vdsProxyAllInvestorDetails
                                    ?.vds_report_headers?.length > 0 &&
                                    vdsProxyAllInvestorDetails?.vds_report_headers?.map(
                                      (vdsHeader: any, headerIndex: number) => (
                                        <Table.Td
                                          key={headerIndex}
                                          className={clsx([
                                            "cell_3 py-2 border-dashed dark:bg-darkmode-600text-left",
                                            headerIndex === 0 &&
                                              "sticky left-0 bg-white z-[9]", // Fix first column
                                            headerIndex === 1 &&
                                              "sticky left-[50px] min-w-[200px] max-w-[250px]  bg-white z-[9]", // Fix second column
                                            headerIndex !== 0 &&
                                              headerIndex !== 1 &&
                                              "min-w-[150px] max-w-[170px] ",
                                          ])}
                                        >
                                          {isObject(
                                            vdsProxy[vdsHeader?.field]
                                          ) &&
                                          vdsProxy[vdsHeader?.field]?.notes !==
                                            null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  vdsHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    vdsHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                  "text-red-700 font-semibold",
                                                "flex items-center",
                                              ])}
                                            >
                                              {vdsProxy[vdsHeader?.field]
                                                ?.vote === "Split Vote" ? (
                                                <Tippy
                                                  content={
                                                    isObject(
                                                      vdsProxy[vdsHeader?.field]
                                                    ) &&
                                                    getSplitContents(
                                                      vdsProxy[vdsHeader?.field]
                                                        ?.split_vote_counts
                                                    )
                                                  }
                                                  options={{ theme: "light" }}
                                                >
                                                  {
                                                    vdsProxy[vdsHeader?.field]
                                                      ?.vote
                                                  }
                                                </Tippy>
                                              ) : (
                                                <span className="for">
                                                  {
                                                    vdsProxy[vdsHeader?.field]
                                                      ?.vote
                                                  }
                                                </span>
                                              )}

                                              {/* <Tippy content={<span dangerouslySetInnerHTML={{ __html: getContent(vdsProxy[vdsHeader?.field]?.notes) ?? '' }}/>}> */}
                                              <div
                                                data-tooltip-id="my-tooltip-data-html"
                                                data-tooltip-html={
                                                  vdsProxy[vdsHeader?.field]
                                                    ?.notes
                                                }
                                              >
                                                <Lucide
                                                  icon="Info"
                                                  className=" w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                />
                                                {/* <span className="tooltiptext shadow-md" >
                                                  </span> */}
                                                {/* </Tippy> */}
                                              </div>
                                            </h1>
                                          ) : isObject(
                                              vdsProxy[vdsHeader?.field]
                                            ) &&
                                            vdsProxy[vdsHeader?.field]
                                              ?.notes === null ? (
                                            <h1
                                              className={clsx([
                                                (vdsProxy[
                                                  vdsHeader?.field
                                                ]?.vote?.includes("Against") ||
                                                  vdsProxy[
                                                    vdsHeader?.field
                                                  ]?.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                  "text-red-700 font-semibold",
                                              ])}
                                            >
                                              {vdsProxy[vdsHeader?.field]
                                                ?.vote !== "Split Vote"
                                                ? vdsProxy[vdsHeader?.field]
                                                    ?.vote
                                                : ""}
                                            </h1>
                                          ) : (
                                            <h1 className="check">
                                              {vdsProxy[vdsHeader?.field]}
                                            </h1>
                                          )}

                                          {isObject(
                                            vdsProxy[vdsHeader?.field]
                                          ) &&
                                            vdsProxy[vdsHeader?.field]
                                              ?.notes === null &&
                                            vdsProxy[vdsHeader?.field]?.vote ===
                                              "Split Vote" && (
                                              <Tippy
                                                content={
                                                  isObject(
                                                    vdsProxy[vdsHeader?.field]
                                                  ) &&
                                                  getSplitContents(
                                                    vdsProxy[vdsHeader?.field]
                                                      ?.split_vote_counts
                                                  )
                                                }
                                                options={{ theme: "light" }}
                                              >
                                                {
                                                  vdsProxy[vdsHeader?.field]
                                                    ?.vote
                                                }
                                              </Tippy>
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
                  {vdsProxyAllInvestorDetails?.vds_report?.length === 0 &&
                    filter?.length === 0 && (
                      <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                        <h1 className="font-semibold"></h1>
                      </div>
                    )}

                  {vdsProxyAllInvestorDetails?.vds_report?.length === 0 &&
                    filter?.length > 0 && (
                      <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                        <h1 className="font-semibold">
                          {" "}
                          All Proxy Records Not Found..
                        </h1>
                      </div>
                    )}

                  {/* <VotingRationale filter={filter} /> */}
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </>
        </div>
      </div>

      <Tooltip
        id="my-tooltip-data-html"
        style={{
          zIndex: 10,
          backgroundColor: "white",
          color: "#000000",
          width: 700,
          boxShadow: "2px 4px 6px rgba(0, 0, 0, 0.2)",
        }}
      />
    </>
  );
};

export default VdsProxyVotingTable;
