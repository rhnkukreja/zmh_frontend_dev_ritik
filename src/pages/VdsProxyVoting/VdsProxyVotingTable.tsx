import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import {
  convertToTitleCase,
  createDynamicURL,
  downloadCSV,
} from "@/utils/helper";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  clearVotingRationale,
  fetchVdsProxyAllInvestor,
  fetchVdsProxyDashboard,
  getProxyVotingRationale,
  getProxyVotingRationaleTop20,
  getProxyVotingRationaleAllInvestors,
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
import { FaCheckCircle } from "react-icons/fa";

import { dashboardService } from "@/services/dashboard";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import { setIsCompanySelected } from "@/stores/authenticationSlice";
import VotingRationale from "./VotingRationale";

// Cache utility types and constants
interface CacheData {
  data: any;
  timestamp: number;
  expiryMinutes: number;
}

interface CacheKey {
  type: 'top20' | 'allInvestors';
  company: string;
  year: string;
  filters?: string;
}

// Cache utility functions
const generateCacheKey = (keyObj: CacheKey): string => {
  const { type, company, year, filters } = keyObj;
  return `vds_proxy_${type}_${company}_${year}${filters ? `_${filters}` : ''}`;
};

const getCachedData = (cacheKey: string, expiryMinutes: number = 30): any | null => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const cacheData: CacheData = JSON.parse(cached);
    const now = Date.now();
    const expiryTime = cacheData.timestamp + (cacheData.expiryMinutes * 60 * 1000);

    if (now > expiryTime) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.warn('Failed to read cache:', error);
    return null;
  }
};

const setCachedData = (cacheKey: string, data: any, expiryMinutes: number = 30): void => {
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
      expiryMinutes
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to set cache:', error);
  }
};

const clearCacheForCompany = (company: string): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`vds_proxy_`) && key.includes(`_${company}_`)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear company cache:', error);
  }
};

const VdsProxyVotingTable = () => {
  const navigate = useNavigate();
  const dispatch: AppDispatch = useAppDispatch();
  const {
    vdsProxyDetails,
    vdsProxyLoading,
    vdsProxyAllInvestorDetails,
    vdsProxyAllInvestorLoading,

    tab,
  } = useAppSelector((state) => state.dashboard);
  const [searchParams] = useSearchParams();

  const {
    companyGlobalSearchName,
    companyGlobalSearchTicker,
    isCompanySelected,
  } = useAppSelector((state: RootState) => state.authentiction);

  const searchTicker = searchParams.get("ticker");
  const yearTicker = searchParams.get("year")!;

  const [filter, setFilter] = useState<any>([]);

  const { handleSubmit, control, reset } = useForm<any>({
    defaultValues: {
      institution: [],
    },
  });

  // Clean data loading function for Top-20 tab
  const loadTop20Data = useCallback(() => {
    if (!companyGlobalSearchTicker || !yearTicker) return;

    const cacheKey = generateCacheKey({
      type: 'top20',
      company: companyGlobalSearchTicker,
      year: yearTicker
    });

    // Check if we have valid cached data
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log('✅ Using cached Top-20 data for:', companyGlobalSearchTicker, yearTicker);
      return; // Data already loaded from cache
    }

    console.log('🚀 Loading fresh Top-20 data for:', companyGlobalSearchTicker, yearTicker);
    
    // Load data from API
    const fetchPromise = dispatch(
      fetchVdsProxyDashboard(
        createDynamicURL(
          `${baseURL}/vds_proxy_voting/?ticker=${companyGlobalSearchTicker}&year=${yearTicker}`
        )
      )
    );

    const rationalePromise = dispatch(
      getProxyVotingRationaleTop20(
        createDynamicURL(`/vds_proxy_voting_rationale/`, {
          ticker: companyGlobalSearchTicker,
          year: yearTicker,
        })
      )
    );

    // Cache the results when both API calls complete
    Promise.all([fetchPromise, rationalePromise]).then(([fetchResult, rationaleResult]) => {
      if (fetchResult.payload || rationaleResult.payload) {
        setCachedData(cacheKey, {
          vdsData: fetchResult.payload,
          rationaleData: rationaleResult.payload
        });
      }
    }).catch(error => {
      console.warn('Failed to cache Top-20 data:', error);
    });
  }, [companyGlobalSearchTicker, yearTicker, dispatch]);

  // Clean data loading function for All-Investor tab
  const loadAllInvestorData = useCallback(() => {
    if (!companyGlobalSearchTicker || !yearTicker) return;

    const filterString = filter?.length > 0 ? JSON.stringify(filter.sort()) : '';
    const institutionName = filter?.length > 0 ? filter : "Top 10";
    
    const cacheKey = generateCacheKey({
      type: 'allInvestors',
      company: companyGlobalSearchTicker,
      year: yearTicker,
      filters: filterString
    });

    // Check if we have valid cached data
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log('✅ Using cached All-Investor data for:', companyGlobalSearchTicker, yearTicker, 'with filters:', filter);
      return; // Data already loaded from cache
    }

    console.log('🚀 Loading fresh All-Investor data for:', companyGlobalSearchTicker, yearTicker, 'with filters:', filter);

    // Load data from API
    const fetchPromise = dispatch(
      fetchVdsProxyAllInvestor(
        createDynamicURL(`${baseURL}/vds_proxy_voting/`, {
          ticker: companyGlobalSearchTicker,
          year: yearTicker,
          institution_name: institutionName,
        })
      )
    );

    const rationalePromise = dispatch(
      getProxyVotingRationaleAllInvestors(
        createDynamicURL(`/vds_proxy_voting_rationale/`, {
          ticker: companyGlobalSearchTicker,
          year: yearTicker,
          institution_name: institutionName,
        })
      )
    );

    // Cache the results when both API calls complete
    Promise.all([fetchPromise, rationalePromise]).then(([fetchResult, rationaleResult]) => {
      if (fetchResult.payload || rationaleResult.payload) {
        setCachedData(cacheKey, {
          vdsData: fetchResult.payload,
          rationaleData: rationaleResult.payload
        });
      }
    }).catch(error => {
      console.warn('Failed to cache All-Investor data:', error);
    });
  }, [companyGlobalSearchTicker, yearTicker, filter, dispatch]);

  // Effect for tab switching - triggers data loading based on current tab
  useEffect(() => {
    if (tab === "Top-20") {
      loadTop20Data();
    } else if (tab === "All-Investor") {
      loadAllInvestorData();
    }
  }, [tab, loadTop20Data, loadAllInvestorData]);

  // Effect to clear cache when company changes
  useEffect(() => {
    if (companyGlobalSearchTicker) {
      console.log('🧹 Company changed, clearing cache for:', companyGlobalSearchTicker);
      clearCacheForCompany(companyGlobalSearchTicker);
    }
  }, [companyGlobalSearchTicker]);

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

    downloadCSV(csvContent, `${tabName}-${companyGlobalSearchTicker}`);
  };

  const getSplitContents = (items: any) => {
    const resultString = Object.entries(items)
      .map(([key, value]) => `${convertToTitleCase(key)}: ${value}`)
      .join(", ");
    return resultString;
  };
  const [meetingDate, setMeetingDate] = useState('');


  const [apiDropdownOptions, setApiDropdownOptions] = useState<any>([]);

  const getAllInstitutionDropdown = async () => {
    try {
      const res = await dashboardService.getInstitution({
        company_name: [companyGlobalSearchName],
        year: yearTicker!,
      });
      if (res.result?.institutes) {
        setApiDropdownOptions(res.result?.institutes);
      }
      setMeetingDate(res.result?.meeting_date);
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
    // Clear cache for All-Investor data to force reload with empty filter
    if (companyGlobalSearchTicker && yearTicker) {
      const allInvestorCacheKey = generateCacheKey({
        type: 'allInvestors',
        company: companyGlobalSearchTicker,
        year: yearTicker,
        filters: JSON.stringify(filter.sort())
      });
      localStorage.removeItem(allInvestorCacheKey);
    }
    dispatch(clearVotingRationale());
    reset();
  };

  const getSelectedTabIndex = () => {
    const tabIndex = tab === "Top-20" ? 0 : tab === "All-Investor" ? 1 : -1;
    return tabIndex;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <Button
          onClick={() => {
            navigate("/");
          }}
          variant="primary"
          className="bg-theme-2 border-bg-theme-2"
        >
          <ChevronLeft
            className="group-[.mode--light]:text-white text-white"
            size={18}
            strokeWidth={1.5}
          />
          Back
        </Button>
        
        <Button
          onClick={() => {
            const votingRationaleSection = document.querySelector('[data-voting-rationale]');
            if (votingRationaleSection) {
              votingRationaleSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
              });
            }
          }}
          variant="primary"
          className="bg-theme-2 border-bg-theme-2 flex items-center gap-2"
        >
          <span>Voting Rationale</span>
          <Lucide 
            icon="ChevronDown" 
            className="w-4 h-4" 
          />
        </Button>
      </div>

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
                  <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row mb-3">
                   <span>
                   <h1 className="text-lg font-bold">Proxy Voting</h1>
                   {
                         meetingDate &&
                        <p className=" italic"> Meeting Date: {meetingDate} </p>
                      }
                   </span>
                    {tab === "Top-20" &&
                      vdsProxyDetails?.vds_report_headers?.length > 0 && (
                        <div className="flex justify-end items-center gap-4 mb-5 xs:mt-4 md:mt-0">
                          {
                            yearTicker !== "2025" &&
                          <h1 className="text-md font-bold">
                            Aggregate Ownership:{" "}
                            {vdsProxyDetails?.total_percent_ownership}
                          </h1>
                          }
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

                  <TableWrapper
                    isLoading={vdsProxyLoading}
                  >
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
                                      "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] text-left",
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

                    {/* Handle both cases: empty array or undefined/null vdsProxyDetails */}
                    {((vdsProxyDetails?.vds_report?.length === 0) || 
                      (!vdsProxyDetails && !vdsProxyLoading)) && (
                        <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
                          <div className="text-center text-slate-500 dark:text-slate-400">
                            <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
                            <h3 className="text-lg font-medium mb-2">Top 20 Proxy Records Not Found</h3>
                            <p className="text-sm">Proxy voting data may not be available for this company or time period.</p>
                          </div>
                        </div>
                      )}
                  </TableWrapper>

                  <div data-voting-rationale>
                    <VotingRationale 
                      meetingDate={meetingDate} 
                      tabType="top20"
                      parentLoading={vdsProxyLoading} // Pass parent loading state
                    />
                  </div>
                </Tab.Panel>
                
                <Tab.Panel className="leading-relaxed">
                  <div className="bg-slate-50 dark:bg-darkmode-700 p-4 rounded-lg mb-6">
                    <form onSubmit={handleSubmit(onSubmit)}>
                      <div className="flex items-end gap-4">
                        <div className="w-4/12">
                          <div className="text-left text-slate-600 dark:text-slate-400 flex justify-between mb-2">
                            <span className="font-medium text-sm">Use the dropdown below to view more Institutions.</span>
                          </div>
                        

                        <Controller
                          name="institution"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect

                              value={field.value || []}
                              onChange={(event) => {
                                field.onChange(event);
                              }}
                              options={{ placeholder: "Institution" }}
                              className="w-full"
                              multiple
                            >
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
                  </div>
                  <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row mb-4">
                    <div>
                      <h1 className="text-lg font-bold">
                        Proxy Voting
                      </h1>
                      {
                         meetingDate &&
                        <p className="text-sm italic text-slate-600 dark:text-slate-400 mt-1"> Meeting Date: {meetingDate} </p>
                      }
                    </div>

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
                    isLoading={vdsProxyAllInvestorLoading}
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
                                      "cell_3 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] text-left",
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
                  {/* Handle both cases: empty array or undefined/null vdsProxyAllInvestorDetails */}
                  {((vdsProxyAllInvestorDetails?.vds_report?.length === 0) ||
                    (!vdsProxyAllInvestorDetails && !vdsProxyAllInvestorLoading)) &&
                    filter?.length === 0 && (
                      <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
                        <div className="text-center text-slate-500 dark:text-slate-400">
                          <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
                          <h3 className="text-lg font-medium mb-2">No Top 10 Proxy Records Available</h3>
                          <p className="text-sm">Data may not be available for this company or time period.</p>
                        </div>
                      </div>
                    )}

                  {/* Handle both cases: empty array or undefined/null vdsProxyAllInvestorDetails */}
                  {((vdsProxyAllInvestorDetails?.vds_report?.length === 0) ||
                    (!vdsProxyAllInvestorDetails && !vdsProxyAllInvestorLoading)) &&
                    filter?.length > 0 && (
                      <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
                        <div className="text-center text-slate-500 dark:text-slate-400">
                          <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
                          <h3 className="text-lg font-medium mb-2">No Proxy Records Available</h3>
                          <p className="text-sm">Try adjusting your filters or selecting different institutions.</p>
                        </div>
                      </div>
                    )}

                  <div data-voting-rationale>
                    <VotingRationale 
                      meetingDate={meetingDate} 
                      filter={filter} 
                      tabType="allInvestors"
                      parentLoading={vdsProxyAllInvestorLoading} // Pass parent loading state
                    />
                  </div>
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
          width: "maxContent",
          maxWidth: 700,
          boxShadow: "2px 4px 6px rgba(0, 0, 0, 0.2)",
          cursor: "pointer"
        }}
      />
    </>
  );
};

export default VdsProxyVotingTable;