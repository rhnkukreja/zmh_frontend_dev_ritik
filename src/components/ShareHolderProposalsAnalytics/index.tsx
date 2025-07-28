import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  LabelList,
} from "recharts";
import LoadingIcon from "../Base/LoadingIcon";

import OutcomePieChart from "../OutcomePieChart";
import Lucide from "../Base/Lucide";
import Pill from "../Pill";

interface ShareHolderProposalAnalyticsComponentProps {
  proposalCounts: { total_proposals: number;[key: string]: any };
  topSubcategories: { [key: string]: any[] };
  topCategories: any[];
  yearlySummary: any[];
  tab: any;
  pieChartOutcome?: any;
  isAllCompanySelected: any;
  loading: boolean;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A569BD"];

const formatNumberWithCommas = (num: number): string => num.toLocaleString();

const isDataAvailable = (data: any) => {
  if (!data) return false; // Null or undefined
  if (Array.isArray(data)) return data.length > 0; // Check for empty arrays
  if (typeof data === "object") return Object.keys(data).length > 0; // Check for empty objects
  return true; // Otherwise, assume valid data
};


type YearlySummaryItem = {
  count: number;
  avg_support: number;
};

type YearlySummaryObject = {
  [year: number]: YearlySummaryItem;
};


const ShareHolderProposalAnalyticsComponent: React.FC<
  ShareHolderProposalAnalyticsComponentProps
> = ({
  proposalCounts,
  topSubcategories,
  topCategories,
  yearlySummary,
  tab,
  pieChartOutcome,
  isAllCompanySelected,
  loading,
}) => {
    const formatWithCommas = (value: number): string => {
      return value.toLocaleString();
    };
    const chartKey = tab === "proposal" ? "proxy_season" : "year"
    if (
      !isDataAvailable(proposalCounts) &&
      !isDataAvailable(topSubcategories) &&
      !isDataAvailable(topCategories) &&
      !isDataAvailable(yearlySummary)
    ) {
      return (
        <div className="flex items-center justify-center h-full mb-10">
          <h2 className="text-xl font-semibold text-gray-600">
            No Analytics Available
          </h2>
        </div>
      );
    }
    const [outcomeData, setOutcomeData] = useState([]);




    useEffect(() => {
      if (pieChartOutcome) {
        const formatted = interleaveOutcome(
          [
            {
              name: "Included",
              value: pieChartOutcome.include,
              color: "#4caf50",
            },
            {
              name: "Excluded",
              value: pieChartOutcome.exclude,
              color: "#f44336",
            },
            {
              name: "Withdrawn",
              value: pieChartOutcome.withdraw,
              color: "#ff9800",
            },
            {
              name: "Incoming",
              value: pieChartOutcome.Incoming,
              color: "#03a9f4",
            },
          ].filter((item) => item.value > 0)
        );
        setOutcomeData(formatted);
      }
    }, [pieChartOutcome]);



    const pieCategoryData = interleaveSlices(
      topCategories.map((item, index) => {
        let color = COLORS[index % COLORS.length];
        if (item.category === "Environmental") color = "#28a745";
        if (item.category === "Social") color = "#D39E00";
        if (item.category === "Corporate Governance") color = "#0088FE";
        return {
          ...item,
          color,
        };
      })
    );



    if (!yearlySummary) {
      console.log("Yearly summary", yearlySummary)
      return
    }



    // Custom label for count and percentage together above the bar
    const CountAndPercentLabel = (props: any) => {
      const { x, width, value, index } = props;
      const chartData = tab == "proposal"
        ? yearlySummary?.filter((item) => item[chartKey] >= 2022)
        : yearlySummary?.filter((item) => item[chartKey] >= 2022).reverse();
      const data = chartData && chartData[index];
      const count = value;
      const percent = data && data.avg_support !== undefined ? data.avg_support : undefined;
      const labelY = 20;
      const lineY = labelY + 6; // 6px below the label
      return (
        <g>
          <text
            x={x + width / 2}
            y={labelY}
            textAnchor="middle"
            fill="black"
            fontSize={11}
            fontWeight={500}
          >
            {count}
            {percent !== undefined ? ` - ${percent.toFixed(1)}%` : ''}
          </text>
          <line
            x1={x + width / 2 - 16}
            x2={x + width / 2 + 16}
            y1={lineY}
            y2={lineY}
            stroke="#888"
            strokeWidth={2}
          />
        </g>
      );
    };

    return (
      <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl min-h-[fit-content] flex flex-col mb-20">
        {tab == "proposal"
          ? <h1 className="text-xl font-semibold flex items-center gap-2 mb-4">
            All Shareholder Proposals
            <Pill text="Beta" />
          </h1>
          : <h1 className="text-xl font-semibold flex items-center gap-2  mb-4">
            All No Action Letters
            <Pill text="Beta" />
          </h1>}
        {proposalCounts.total_proposals === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Lucide
              icon="FileSearch"
              className="w-12 h-12 text-gray-300 mb-2"
            />
            <div className="text-lg font-medium">No data found</div>
            <div className="text-sm text-gray-500 mt-1">
              Try adjusting your filters or search criteria
            </div>
          </div>
        ) : loading ? (
          <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            <LoadingIcon
              color="#800000"
              icon="three-dots"
              className="w-16 h-16"
            />
          </div>
        ) : (
          <React.Fragment>
            {/* Row: Pie Chart & Bar Chart */}
            <div
              className={`grid grid-cols-1 ${tab !== "proposal" ? "md:grid-cols-3" : "md:grid-cols-2"
                } gap-6 mb-12`}
            >
              {/* 1. Yearly Proposal Trends - Bar Chart */}
              <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 flex flex-col items-center w-full">
                <h3 className="text-lg font-semibold mb-4">
                  {tab == "proposal"
                    ? "Yearly Proposal Trend"
                    : "No Action Letter Trend"}
                </h3>
                {isDataAvailable(yearlySummary) ? (
                  yearlySummary.length === 1 ? (
                    <p className="text-lg font-semibold text-gray-700">
                      {formatNumberWithCommas(yearlySummary[0].count)} {yearlySummary[0].count === 1 ? 'Proposal' : 'Proposals'}
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart
                        data={
                          tab == "proposal"
                            ? [...yearlySummary?.filter((item) => item[chartKey] >= 2022)]
                            : [...yearlySummary?.filter((item) => item[chartKey] >= 2022)].reverse()
                        }
                        margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                      >
                        <XAxis dataKey={chartKey} dy={12} height={40} />
                        <YAxis
                          yAxisId="left"
                          label={{
                            value: "Count",
                            angle: -90,
                            position: "insideLeft",
                          }}
                          domain={[
                            0,
                            (dataMax) =>
                              isAllCompanySelected ? dataMax + 150 : dataMax + 5,
                          ]}
                        />
                        {tab == "proposal" && (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            label={{ angle: 90, position: "insideRight" }}
                            domain={[0, 60]}
                            tickFormatter={(value) => `${value.toFixed(1)}%`}
                          />
                        )}
                        <Bar
                          yAxisId="left"
                          dataKey="count"
                          fill="#FF6F00"
                          name="Proposals"
                        >
                          <LabelList
                            dataKey="count"
                            content={CountAndPercentLabel}
                          />
                        </Bar>
                        {tab == "proposal" && (
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="avg_support"
                            stroke="#007bff"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name="Avg. Support (%)"
                          />
                        )}
                        {tab == "proposal" && <Legend />}
                      </ComposedChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <p className="text-gray-500">No data available</p>
                )}
              </div>

              {/* 2. Proposal Distribution Pie Chart */}
              <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 flex flex-col items-center w-full">
                <h3 className="text-lg font-semibold mb-4">
                  {tab == "proposal"
                    ? "Proposal Distribution by Category"
                    : "Distribution by Category"}
                </h3>
                {isDataAvailable(topCategories) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieCategoryData}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        startAngle={90}
                        endAngle={-270}
                        label={({
                          cx,
                          cy,
                          midAngle,
                          innerRadius,
                          outerRadius,
                          name,
                          value,
                          index,
                        }) => {
                          const RADIAN = Math.PI / 180;
                          const radius =
                            innerRadius + (outerRadius - innerRadius) * 1.1;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);

                          const displayName =
                            name === "Corporate Governance"
                              ? "Gov"
                              : name === "Executive Compensation"
                                ? "Exec. Comp"
                                : name === "Environmental"
                                  ? "Env"
                                  : name === "Governance"
                                    ? "Gov."
                                    : name === "Social"
                                      ? "Social"
                                      : name;
                          return (
                            <text
                              x={x}
                              y={y}
                              fill={pieCategoryData[index].color}
                              textAnchor={x > cx ? "start" : "end"}
                              dominantBaseline="central"
                              fontSize={13}
                            >
                              {`${displayName}: ${formatWithCommas(value)}`}
                            </text>
                          );
                        }}
                        labelLine={false}
                      >
                        {pieCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500">No data available</p>
                )}
              </div>

              {/* 3. Outcome Distribution Pie Chart */}
              {tab !== "proposal" && (
                <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 flex flex-col items-center w-full">
                  <h3 className="text-lg font-semibold mb-4">
                    Outcome Distribution
                  </h3>
                  <OutcomePieChart pieChartOutcome={pieChartOutcome} />
                </div>
              )}
            </div>

            {/* Row: Tables for Top Subcategories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {isDataAvailable(Object.entries(topSubcategories)) ? (
                Object.entries(topSubcategories).map(
                  ([category, subcategories]) => (
                    <div
                      key={category}
                      className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100"
                    >
                      <h4 className="text-md font-semibold mb-2">
                        {category === "Environment" ? "Environmental" : category}
                      </h4>
                      {isDataAvailable(subcategories) ? (
                        <div className="overflow-x-auto rounded-lg">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-primary text-white text-base">
                                <th className="border p-2 text-left">
                                  Subcategory
                                </th>
                                <th className="border p-2">Count</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subcategories.map((sub, index) => (
                                <tr key={index} className="border">
                                  <td className="border p-2">
                                    {sub.sub_category}
                                  </td>
                                  <td className="border p-2 text-center">
                                    {formatNumberWithCommas(sub.count)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500">No data available</p>
                      )}
                    </div>
                  )
                )
              ) : (
                <p className="text-gray-500">No subcategory data available</p>
              )}
            </div>
          </React.Fragment>
        )}

        <footer className="!pt-10">
          <div className="flex items-start justify-between">
            <span className="!pt-3 flex items-center relative">
              <sup className="cursor-pointer ml-1" style={{ fontSize: "0.8em" }}>
                *
              </sup>
              <p id="footnote" className="">
                2022 and 2023 data is for S&P500 companies only
              </p>
            </span>
          </div>
        </footer>
      </div>
    );
  };

const interleaveSlices = (data: any[]) => {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const result = [];
  let i = 0,
    j = sorted.length - 1;
  while (i <= j) {
    if (i === j) result.push(sorted[i]);
    else {
      result.push(sorted[i]);
      result.push(sorted[j]);
    }
    i++;
    j--;
  }
  return result;
};

const interleaveOutcome = (data: any[]) => {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const result = [];
  let i = 0,
    j = sorted.length - 1;
  while (i <= j) {
    if (i === j) result.push(sorted[i]);
    else {
      result.push(sorted[i]);
      result.push(sorted[j]);
    }
    i++;
    j--;
  }
  return result;
};

export default ShareHolderProposalAnalyticsComponent;

