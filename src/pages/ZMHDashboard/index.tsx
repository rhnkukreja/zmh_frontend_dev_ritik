import Lucide from "@/components/Base/Lucide";
import { Menu } from "@/components/Base/Headless";
import ReportBarChart6 from "@/components/ReportBarChart6";
import ReportRadarChart from "@/components/ReportRadarChart";
import { FormSelect } from "@/components/Base/Form";
import Tippy from "@/components/Base/Tippy";
import Button from "@/components/Base/Button";
import Litepicker from "@/components/Base/Litepicker";
import { useEffect } from "react";
import clsx from "clsx";
import _ from "lodash";
import { useLocation } from "react-router-dom";
import { CompanyDashboard, fetchCompanyDashboard } from "@/stores/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import TableWrapper from "@/components/TableWrapper";
import Table from "@/components/Base/Table";
import dayjs from "dayjs";
import CPagination from "@/components/Pagination";
import LoadingIcon from "../../components/Base/LoadingIcon";


function Main() {

  const location = useLocation();
  const dispatch: AppDispatch = useAppDispatch();

  const queryParams = new URLSearchParams(location.search);
  const ticker = queryParams.get('ticker')!;
  const { dashboardDataList, loading } = useAppSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(
      fetchCompanyDashboard(ticker)
    );
  }, [ticker]);
  
  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12 xl:col-span-8">
        <div>
          <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
            <div className="text-base font-medium group-[.mode--light]:text-white">
              General Report
            </div>
          </div>
          <div className="p-5 mt-3.5 box ">
            <div className="w-full">
              <div className="">
                {
                  (dashboardDataList?.length === 0) && loading && (
                    <div className="flex flex-col items-center justify-center pt-20 pb-28">
                      <LoadingIcon color="red" icon="puff" className="w-20 h-20 text-theme-1/20 fill-theme-1/5 stroke-[0.5]" />
                      <div className="mt-5 text-xl font-medium">
                        Loading...
                      </div>
                    </div>
                  )
                }
                {
                 (dashboardDataList?.length === 0) && !loading && (
                    <div className="flex flex-col items-center justify-center pt-20 pb-28">
                      <Lucide
                        icon="SearchX"
                        className="w-20 h-20 text-theme-1/20 fill-theme-1/5 stroke-[0.5]"
                      />
                      <div className="mt-5 text-xl font-medium">
                        No result found
                      </div>
                    </div>
                  )
                }
                {
                  dashboardDataList.length > 0 && !loading && (
                    <div>
                      <div className="">
                        <TableWrapper isLoading={loading}>
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Td className="py-2 font-medium bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Filer Name
                                </Table.Td>

                                <Table.Td className="py-2 font-medium  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                 Source Date
                                </Table.Td>
                                <Table.Td className="py-2 font-medium  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                  Percent Ownership
                                </Table.Td>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {dashboardDataList?.length > 0 &&
                                dashboardDataList.map((dashboard: CompanyDashboard) => (
                                  <Table.Tr
                                    key={dashboard.filer_id}
                                    className="[&_td]:last:border-b-0"
                                  >
                                    <Table.Td className=" py-2 border-dashed dark:bg-darkmode-600">
                                      <div className="whitespace-nowrap capitalize">
                                        {dashboard?.filer_name}
                                      </div>
                                    </Table.Td>

                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                      <div className="whitespace-nowrap ">
                                        {dayjs(dashboard?.source_date).format(
                                          "MMMM,YYYY"
                                        )}
                                      </div>
                                    </Table.Td>
                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                      <div className="whitespace-nowrap ">
                                        {(dashboard?.percent_ownership)}
                                      </div>
                                    </Table.Td>

                                    <Table.Td className="w-20 relative py-2 box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                      <div className="flex gap-3 justify-center">
                                        <Tippy
                                          content="View"
                                          options={{
                                            theme: "dark",
                                          }}
                                        >
                                        </Tippy>
                                      </div>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                            </Table.Tbody>
                          </Table>
                        </TableWrapper>
                      </div>
                      {/* <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                        {dashboardDataList?.length > 0 && (
                          <CPagination
                            page={page}
                            totalPages={totalPages}
                            handleNextPage={handleNextPage}
                            handlePageChange={handlePageChange}
                            handlePreviousPage={handlePreviousPage}
                          />
                        )}
                      </div> */}
                    </div>
                      )
                }
               
              </div>
            </div>
          </div>
        </div>
      </div>




      <div className="col-span-12 md:col-span-6 xl:col-span-4">
        <div>
          <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
            <div className="text-base font-medium xl:group-[.mode--light]:text-white">
              Patient Overview
            </div>
          </div>
          <div className="p-5 mt-3.5 box box--stacked">
            <div className="flex flex-col gap-3 sm:items-center sm:flex-row">
              <div>
                <div className="text-xl font-medium">24,782</div>
                <div className="mt-1 text-base text-slate-500">
                  Total Patients
                </div>
              </div>
              <div className="relative sm:ml-auto">
                <Lucide
                  icon="CalendarCheck2"
                  className="absolute inset-y-0 left-0 z-10 w-4 h-4 my-auto ml-3 stroke-[1.3]"
                />
                <FormSelect className="sm:w-32 pl-9">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </FormSelect>
              </div>
            </div>
            <div className="mt-6 mb-9">
              <div className="pt-6 border-t border-dashed border-slate-300/70">
                <div className="text-slate-500">
                  Medical condition distribution
                </div>
                <div className="flex h-2.5 mt-3">
                  <Tippy
                    as="div"
                    content="Heart Disease"
                    className="h-full first:rounded-l last:rounded-r border border-primary/50 bg-primary/50 w-[35%]"
                  ></Tippy>
                  <Tippy
                    as="div"
                    content="Diabetes"
                    className="h-full first:rounded-l last:rounded-r border border-info/50 bg-info/50 w-[20%]"
                  ></Tippy>
                  <Tippy
                    as="div"
                    content="Respiratory Issues"
                    className="h-full first:rounded-l last:rounded-r border border-pending/50 bg-pending/50 w-[5%]"
                  ></Tippy>
                  <Tippy
                    as="div"
                    content="Other"
                    className="h-full first:rounded-l last:rounded-r border border-success/50 bg-success/50 w-[40%]"
                  ></Tippy>
                </div>
              </div>
              <div className="flex justify-center mt-8">
                <div>
                  <div className="flex flex-col items-end">
                    <div className="text-right truncate w-28 text-slate-500">
                      Heart Disease
                    </div>
                    <div className="flex items-center mt-1.5">
                      <div className="text-base font-medium">2,974</div>
                      <div className="flex items-center ml-2 -mr-1 text-xs text-success">
                        11%
                        <Lucide icon="ChevronUp" className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end mt-6">
                    <div className="text-right truncate w-28 text-slate-500">
                      Diabetes
                    </div>
                    <div className="flex items-center mt-1.5">
                      <div className="text-base font-medium">1,696</div>
                      <div className="flex items-center ml-2 -mr-1 text-xs text-success">
                        2%
                        <Lucide icon="ChevronUp" className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-px mx-12 border-r border-dashed"></div>
                <div>
                  <div className="flex flex-col">
                    <div className="truncate w-28 text-slate-500">
                      Respiratory Issues
                    </div>
                    <div className="flex items-center mt-1.5">
                      <div className="text-base font-medium">2,556</div>
                      <div className="flex items-center ml-2 -mr-1 text-xs text-success">
                        11%
                        <Lucide icon="ChevronUp" className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col mt-6">
                    <div className="truncate w-28 text-slate-500">Other</div>
                    <div className="flex items-center mt-1.5">
                      <div className="text-base font-medium">1,278</div>
                      <div className="flex items-center ml-2 -mr-1 text-xs text-success">
                        2%
                        <Lucide icon="ChevronUp" className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button className="w-full border-dashed border-slate-300 hover:bg-slate-50">
              <Lucide
                icon="ExternalLink"
                className="stroke-[1.3] w-4 h-4 mr-2"
              />{" "}
              See Full Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
