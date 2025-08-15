import { ChevronLeft, ChevronRight, PieChart } from "lucide-react";
import React, { Dispatch, SetStateAction, useState } from "react";
import LoadingIcon from "../Base/LoadingIcon";
import Lucide from "../Base/Lucide";
import StandardizedTable from "../StandardizedTable";

import { Pie, ResponsiveContainer } from "recharts";
import OutcomePieChart from "../OutcomePieChart";
import Pill from "../Pill";

interface ProponentsAnalyticsComponentProps {
  topProponents: any[];
  handleSearch: (searchTerms: string[]) => void;
  setSearchTerms: Dispatch<SetStateAction<string[]>>;
  tab: any;
  loading: boolean;

  pieChartOutcome: any;
  filters: { proponent_name: string[] };
}

const ProponentsAnalyticsComponent: React.FC<
  ProponentsAnalyticsComponentProps
> = ({
  topProponents,
  handleSearch,
  setSearchTerms,
  tab,
  loading,
  pieChartOutcome,
  filters,
}) => {
    const isDataAvailable = (data: any) => Array.isArray(data) && data.length > 0;

    if (!isDataAvailable(topProponents)) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Lucide
            icon="BarChart3"
            className="w-12 h-12 text-gray-300 mb-2"
          />
          <div className="text-lg font-medium">No Analytics found</div>
        </div>
      );
    }
    const handleInstitutionClick = (institution_name: string) => {
      setSearchTerms([institution_name]);
      handleSearch([institution_name]);
    };

    const handleInstitutionClickAll = () => {
      setSearchTerms([]);
      handleSearch([]);
    };
    const handleInstitutionClickAllProponents = () => {
      setSearchTerms([]);
      handleSearch([]);
    };
    const format = (value: number) => {
      if (value === 0 && !value) return;
      return '';
    };

    const renderSummaryTable = () => (
      <div className="w-full mt-2">
        <h3 className="text-lg font-semibold mb-2">Top Proponents</h3>
        <h4 className="text-base mb-4">Includes proposals filed on behalf of other proponents</h4>
        {loading ? (
          <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            {" "}
            <LoadingIcon
              color="#800000"
              icon="three-dots"
              className="w-16 h-16"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-6 mt-2">
              <div
                className={`${tab == "no-action" && filters?.proponent_name?.length == 0
                  ? "col-span-8"
                  : "col-span-12"
                  }`}
              >
                <StandardizedTable maxHeight="500px">
                  <StandardizedTable.Header>
                    <StandardizedTable.Cell isHeader width="8%">#</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="27%">Proponents</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="15%" className="text-center"># of Proposals</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="12.5%" className="text-center">Environmental</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="12.5%" className="text-center">Social</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="12.5%" className="text-center">Governance</StandardizedTable.Cell>
                    <StandardizedTable.Cell isHeader width="12.5%" className="text-center">
                      Exec. Comp
                    </StandardizedTable.Cell>
                  </StandardizedTable.Header>
                  <tbody className="text-gray-700 divide-y divide-gray-100">
                    {topProponents.map((proponent, idx) => {
                      const envCount =
                        proponent.category?.find(
                          (c: any) => c.category === "Environmental"
                        )?.count || 0;
                      const socCount =
                        proponent.category?.find(
                          (c: any) => c.category === "Social"
                        )?.count || 0;
                      const govCount =
                        proponent.category?.find(
                          (c: any) => c.category === "Corporate Governance"
                        )?.count || 0;
                      const execComp =
                        proponent.category?.find(
                          (c: any) => c.category === "Executive Compensation"
                        )?.count || 0;

                      const envAvgSupport =
                        proponent.category?.find(
                          (c: any) => c.category === "Environmental"
                        )?.avg_support || 0;
                      const socAvgSupport =
                        proponent.category?.find(
                          (c: any) => c.category === "Social"
                        )?.avg_support || 0;
                      const govAvgSupport =
                        proponent.category?.find(
                          (c: any) => c.category === "Corporate Governance"
                        )?.avg_support || 0;
                      const execAvgSupport =
                        proponent.category?.find(
                          (c: any) => c.category === "Executive Compensation"
                        )?.avg_support || 0;

                      return (
                        <StandardizedTable.Row key={idx} index={idx}>
                          <StandardizedTable.Cell>
                            <span className="inline-block px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                              {idx + 1}
                            </span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell>
                            {filters?.proponent_name?.length > 0 ? (
                              <span className="font-medium text-primary/80">{proponent.institution__name}</span>
                            ) : (
                              <button
                                onClick={() =>
                                  handleInstitutionClick(
                                    proponent.institution__name
                                  )
                                }
                                className="text-blue-600 hover:underline focus:outline-none text-left font-medium hover:text-blue-800 transition-colors"
                              >
                                {proponent.institution__name}
                              </button>
                            )}
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell className="text-center">
                            <span className="inline-block px-3 py-1 font-medium">
                              {proponent.total_count}
                            </span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell className="text-center">
                            <span className="inline-block px-3 py-1 font-medium">
                              {envCount}
                            </span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell className="text-center">
                            <span className="inline-block px-3 py-1 font-medium">
                              {socCount}
                            </span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell className="text-center">
                            <span className="inline-block px-3 py-1 font-medium">
                              {govCount}
                            </span>
                          </StandardizedTable.Cell>
                          <StandardizedTable.Cell className="text-center">
                            <span className="inline-block px-3 py-1 font-medium">
                              {execComp}
                            </span>
                          </StandardizedTable.Cell>
                        </StandardizedTable.Row>
                      );
                    })}
                  </tbody>
                </StandardizedTable>
              </div>
              {tab == "no-action" && filters?.proponent_name?.length == 0 && (
                <div className="col-span-4 bg-gray-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-center">
                    By Outcome
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <OutcomePieChart pieChartOutcome={pieChartOutcome} />
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
        {loading ? (
          <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            {" "}
            <LoadingIcon
              color="#800000"
              icon="three-dots"
              className="w-16 h-16"
            />
          </div>
        ) : (
          <>
            {tab == "no-action" && filters?.proponent_name?.length > 0 && (
              <>
                <h3 className="text-lg font-semibold pt-10 pb-4">
                  All Outcome Distribution
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-10 gap-6 mb-12">
                  <div className="col-span-7 rounded-lg w-full">
                    <StandardizedTable maxHeight="400px">
                      <StandardizedTable.Header>
                        <StandardizedTable.Cell isHeader width="25%" className="text-center">Category</StandardizedTable.Cell>
                        <StandardizedTable.Cell isHeader width="18.75%" className="text-center">Total</StandardizedTable.Cell>
                        <StandardizedTable.Cell isHeader width="18.75%" className="text-center">Excluded</StandardizedTable.Cell>
                        <StandardizedTable.Cell isHeader width="18.75%" className="text-center">Included</StandardizedTable.Cell>
                        <StandardizedTable.Cell isHeader width="18.75%" className="text-center">Withdrawn</StandardizedTable.Cell>
                      </StandardizedTable.Header>
                      <tbody>
                        {topProponents[0]?.category.map((cat, idx) => {
                          if (cat.category !== null) {
                            return (
                              <StandardizedTable.Row key={idx} index={idx}>
                                <StandardizedTable.Cell>
                                  <span className="font-medium text-primary/80">{cat.category}</span>
                                </StandardizedTable.Cell>
                                <StandardizedTable.Cell className="text-center">
                                  <span className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    {cat.count}
                                  </span>
                                </StandardizedTable.Cell>
                                <StandardizedTable.Cell className="text-center">
                                  <span className="inline-block px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                    {cat.exclude_count}
                                  </span>
                                </StandardizedTable.Cell>
                                <StandardizedTable.Cell className="text-center">
                                  <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                    {cat.include_count}
                                  </span>
                                </StandardizedTable.Cell>
                                <StandardizedTable.Cell className="text-center">
                                  <span className="inline-block px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                                    {cat.withdraw_count}
                                  </span>
                                </StandardizedTable.Cell>
                              </StandardizedTable.Row>
                            );
                          }
                        })}
                      </tbody>
                    </StandardizedTable>
                  </div>
                  <div
                    className="col-span-3 bg-gray-100 p-4 rounded-lg flex flex-col items-center w-full  "
                    style={{ height: "fit-content" }}
                  >
                    <h3 className="text-lg font-semibold mb-4">
                      Outcome Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <OutcomePieChart pieChartOutcome={pieChartOutcome} />
                    </ResponsiveContainer>
                  </div>
                </div>{" "}
              </>
            )}
          </>
        )}
      </div>
    );

    // Moved to inline implementation

    return (
      <div
        className={`relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl flex flex-col mb-20 ${topProponents.length === 1 &&
          topProponents[0]?.subcategory_detail &&
          Object.keys(topProponents[0].subcategory_detail).length > 0
          ? "min-h-[100vh]"
          : "min-h-[65vh]"
          }`}
      >
        {renderSummaryTable()}

        {/* Show additional sub-category tables only when topProponents has 1 item */}
        {topProponents.length === 1 &&
          topProponents[0]?.subcategory_detail &&
          Object.keys(topProponents[0].subcategory_detail).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topProponents[0].subcategory_detail.Environment && (
                <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                  <h4 className="text-md font-semibold mb-3 px-4 pt-4 md:px-0 md:pt-0" style={{fontSize: '14px'}}>Environmental</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-primary text-white">
                          <th className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>Subcategory</th>
                          <th className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProponents[0].subcategory_detail.Environment.slice(0, 5).map((sub: any, index: number) => (
                          <tr key={index} className="border-b border-slate-200">
                            <td className="py-2 px-3 font-medium" style={{fontSize: '14px'}}>{sub.sub_category}</td>
                            <td className="py-2 px-3 text-center font-medium" style={{fontSize: '14px'}}>{sub.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {topProponents[0].subcategory_detail.Social && (
                <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                  <h4 className="text-md font-semibold mb-3 px-4 pt-4 md:px-0 md:pt-0" style={{fontSize: '14px'}}>Social</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-primary text-white">
                          <th className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>Subcategory</th>
                          <th className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProponents[0].subcategory_detail.Social.slice(0, 5).map((sub: any, index: number) => (
                          <tr key={index} className="border-b border-slate-200">
                            <td className="py-2 px-3 font-medium" style={{fontSize: '14px'}}>{sub.sub_category}</td>
                            <td className="py-2 px-3 text-center font-medium" style={{fontSize: '14px'}}>{sub.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {topProponents[0].subcategory_detail.Governance && (
                <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                  <h4 className="text-md font-semibold mb-3 px-4 pt-4 md:px-0 md:pt-0" style={{fontSize: '14px'}}>Governance</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-primary text-white">
                          <th className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>Subcategory</th>
                          <th className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProponents[0].subcategory_detail.Governance.slice(0, 5).map((sub: any, index: number) => (
                          <tr key={index} className="border-b border-slate-200">
                            <td className="py-2 px-3 font-medium" style={{fontSize: '14px'}}>{sub.sub_category}</td>
                            <td className="py-2 px-3 text-center font-medium" style={{fontSize: '14px'}}>{sub.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {topProponents[0].subcategory_detail["Executive Compensation"] && (
                <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                  <h4 className="text-md font-semibold mb-3 px-4 pt-4 md:px-0 md:pt-0" style={{fontSize: '14px'}}>Executive Compensation</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-primary text-white">
                          <th className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>Subcategory</th>
                          <th className="py-2 px-3 text-left font-medium" style={{fontSize: '14px'}}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProponents[0].subcategory_detail["Executive Compensation"].slice(0, 5).map((sub: any, index: number) => (
                          <tr key={index} className="border-b border-slate-200">
                            <td className="py-2 px-3 font-medium" style={{fontSize: '14px'}}>{sub.sub_category}</td>
                            <td className="py-2 px-3 text-center font-medium" style={{fontSize: '14px'}}>{sub.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        <footer className="!pt-10">
          <div className="flex items-start justify-between">
            <span className="!pt-3 flex items-center relative">
              <sup className="cursor-pointer ml-1" style={{ fontSize: "0.8em" }}>
                *
              </sup>
              <p id="footnote">2022 and 2023 data is for S&P500 companies only</p>
            </span>
          </div>
        </footer>
      </div>
    );
  };

export default ProponentsAnalyticsComponent;