import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Line, ComposedChart, LabelList } from "recharts";

interface ShareHolderProposalAnalyticsComponentProps {
    proposalCounts: { [key: string]: number };
    topSubcategories: { [key: string]: any[] };
    topCategories: any[];
    yearlySummary: any[];
    tab: any;
    pieChartOutcome?: any;
    isAllCompanySelected: any
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A569BD"];

const formatNumberWithCommas = (num: number): string => num.toLocaleString();

const isDataAvailable = (data: any) => {
    if (!data) return false; // Null or undefined
    if (Array.isArray(data)) return data.length > 0; // Check for empty arrays
    if (typeof data === "object") return Object.keys(data).length > 0; // Check for empty objects
    return true; // Otherwise, assume valid data
};

const ShareHolderProposalAnalyticsComponent: React.FC<ShareHolderProposalAnalyticsComponentProps> = ({
    proposalCounts,
    topSubcategories,
    topCategories,
    yearlySummary,
    tab,
    pieChartOutcome,
    isAllCompanySelected

}) => {
    if (
        !isDataAvailable(proposalCounts) &&
        !isDataAvailable(topSubcategories) &&
        !isDataAvailable(topCategories) &&
        !isDataAvailable(yearlySummary)
    ) {
        return (
            <div className="flex items-center justify-center h-full mb-10">
                <h2 className="text-xl font-semibold text-gray-600">No Analytics Available</h2>
            </div>
        );
    }

    return (
        <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl min-h-[120vh] flex flex-col mb-20">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">{tab == "proposal" ? "Shareholder Proposal Analytics (Beta)" : "No Action Letter Analytics (Beta) "}</h2>

            {/* Row: Pie Chart & Bar Chart */}
            <div className={`grid grid-cols-1 ${tab !== "proposal" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6 mb-12`}>
                {/* 1. Yearly Proposal Trends - Bar Chart */}
                <div className="bg-gray-100 p-4 rounded-lg shadow-md flex flex-col items-center w-full">
                    <h3 className="text-lg font-semibold mb-4">
                        {tab == "proposal" ? "Yearly Proposal Trend" : "No Action Letter Trend"}
                    </h3>
                    {isDataAvailable(yearlySummary) ? (
                        yearlySummary.length === 1 ? (
                            <p className="text-lg font-semibold text-gray-700">
                                {formatNumberWithCommas(yearlySummary[0].count)} Proposals
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <ComposedChart
                                    data={[...yearlySummary.filter((item) => item.year >= 2022)].reverse()}
                                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                                >
                                    <XAxis dataKey="year" />
                                    <YAxis
                                        yAxisId="left"
                                        label={{ value: tab == "proposal" ? "Proposals" : "Count", angle: -90, position: "insideLeft" }}
                                        domain={[0, (dataMax) => isAllCompanySelected ? dataMax + 200 : dataMax + 20]}
                                    />
                                    {tab == "proposal" &&
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            label={{ angle: 90, position: "insideRight" }}
                                            domain={[0, 60]}
                                            tickFormatter={(value) => `${value.toFixed(1)}%`}
                                        />
                                    }
                                    <Bar yAxisId="left" dataKey="count" fill="#FF6F00" name="Proposals">
                                        <LabelList dataKey="count" position="top" fill="black" fontSize={12} />
                                    </Bar>
                                    {tab == "proposal" &&
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="avg_support"
                                            stroke="#007bff"
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                            name="Avg. Support (%)"
                                        >
                                            <LabelList
                                                dataKey="avg_support"
                                                position="bottom"
                                                fill="#007bff"
                                                fontSize={12}
                                                formatter={(value) => `${value.toFixed(1)}%`}
                                            />
                                        </Line>
                                    }

                                    {tab == "proposal" && <Legend />}
                                </ComposedChart>
                            </ResponsiveContainer>
                        )
                    ) : (
                        <p className="text-gray-500">No data available</p>
                    )}
                </div>

                {/* 2. Proposal Distribution Pie Chart */}
                <div className="bg-gray-100 p-4 rounded-lg shadow-md flex flex-col items-center w-full">
                    <h3 className="text-lg font-semibold mb-4">
                        {tab == "proposal"
                            ? "Proposal Distribution by Category"
                            : "Distribution by Category"}
                    </h3>
                    {isDataAvailable(topCategories) ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={[...topCategories].sort((a, b) =>
                                        a.category === "Executive Compensation"
                                            ? -1
                                            : b.category === "Executive Compensation"
                                                ? 1
                                                : 0
                                    )}
                                    dataKey="count"
                                    nameKey="category"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    startAngle={90}
                                    endAngle={-270}
                                    label={({ name, value }) => {
                                        const displayName =
                                            name === "Corporate Governance"
                                                ? "Gov"
                                                : name === "Executive Compensation"
                                                    ? "Exec. Comp"
                                                    : name === "Environmental" ? "Env" : name === "Governance" ? "Gov." : name == "Social" ? "Soc" : name;
                                        return `${displayName}: ${value}`;
                                    }}
                                >
                                    {topCategories.map((entry, index) => {
                                        let color = COLORS[index % COLORS.length];
                                        if (entry.category === "Environmental") color = "#28a745";
                                        if (entry.category === "Social") color = "#D39E00";
                                        if (entry.category === "Corporate Governance") color = "#0088FE";
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                    })}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-gray-500">No data available</p>
                    )}
                </div>

                {/* 3. Outcome Distribution Pie Chart */}
                {tab !== "proposal" && (
                    <div className="bg-gray-100 p-4 rounded-lg shadow-md flex flex-col items-center w-full">
                        <h3 className="text-lg font-semibold mb-4">Outcome Distribution</h3>
                        {isDataAvailable(pieChartOutcome) ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: "Incl.", value: pieChartOutcome.include },
                                            { name: "Excl.", value: pieChartOutcome.exclude },
                                            { name: "Withd.", value: pieChartOutcome.withdraw },
                                            { name: "Incom.", value: pieChartOutcome.Incoming },
                                        ]}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={75}
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        <Cell fill="#4caf50" /> {/* Included */}
                                        <Cell fill="#f44336" /> {/* Excluded */}
                                        <Cell fill="#ff9800" /> {/* Withdrawn */}
                                        <Cell fill="#03a9f4" /> {/* Incoming */}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-500">No data available</p>
                        )}
                    </div>
                )}


            </div>


            {/* Row: Tables for Top Subcategories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isDataAvailable(Object.entries(topSubcategories)) ? (
                    Object.entries(topSubcategories).map(([category, subcategories]) => (
                        <div key={category} className="bg-gray-100 p-4 rounded-lg shadow-md">
                            <h4 className="text-md font-semibold mb-2">{category === "Environment" ? "Environmental" : category}</h4>
                            {isDataAvailable(subcategories) ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-gray-300">
                                        <thead className="bg-gray-200">
                                            <tr>
                                                <th className="border p-2 text-left">Subcategory</th>
                                                <th className="border p-2">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subcategories.map((sub, index) => (
                                                <tr key={index} className="border">
                                                    <td className="border p-2">{sub.sub_category}</td>
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
                    ))
                ) : (
                    <p className="text-gray-500">No subcategory data available</p>
                )}
            </div>
            <footer className="!pt-10">
                <div className="flex items-start justify-between">
                    <span className="!pt-3 flex items-center relative">
                        <sup
                            className="cursor-pointer ml-1"
                            style={{ fontSize: "0.8em" }}
                        >
                            *
                        </sup>
                        <p id="footnote" className="">
                            2022 and 2023 data is for S&P500 companies only
                        </p>
                    </span>
                </div>
            </footer>
        </div >
    );
};

export default ShareHolderProposalAnalyticsComponent;
