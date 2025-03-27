import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

interface ShareHolderProposalAnalyticsComponentProps {
    proposalCounts: { [key: string]: number };
    topSubcategories: { [key: string]: any[] };
    topCategories: any[];
    yearlySummary: any[];
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
}) => {

    console.log(proposalCounts,
        topSubcategories,
        topCategories,
        yearlySummary,)
    if (
        !isDataAvailable(proposalCounts) &&
        !isDataAvailable(topSubcategories) &&
        !isDataAvailable(topCategories) &&
        !isDataAvailable(yearlySummary)
    ) {
        return <h2 className="text-xl font-semibold mb-4 text-gray-600">No Analytics Available</h2>;
    }


    return (
        <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl min-h-[120vh] flex flex-col mb-20">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Analytics (Beta)</h2>

            {/* Row: Pie Chart & Bar Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {/* Yearly Proposal Trends - Bar Chart */}
                <div className="bg-gray-100 p-4 rounded-lg shadow-md flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4">Yearly Proposal Trends</h3>
                    {isDataAvailable(yearlySummary) ? (
                        yearlySummary.length === 1 ? (
                            <p className="text-lg font-semibold text-gray-700">
                                {formatNumberWithCommas(yearlySummary[0].count)} Proposals
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={yearlySummary}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis />
                                    <Bar dataKey="count" fill="#FF6F00" />
                                </BarChart>
                            </ResponsiveContainer>
                        )
                    ) : (
                        <p className="text-gray-500">No data available</p>
                    )}
                </div>


                {/* Proposal Distribution - Pie Chart */}
                <div className="bg-gray-100 p-4 rounded-lg shadow-md flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4">Proposal Distribution by Category</h3>
                    {isDataAvailable(topCategories) ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={topCategories}
                                    dataKey="count"
                                    nameKey="category"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={({ name, value }) => `${name === "Corporate Governance" ? "Governance" : name}: ${value}`}
                                >
                                    {topCategories.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-gray-500">No data available</p>
                    )}
                </div>
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
        </div>
    );
};

export default ShareHolderProposalAnalyticsComponent;
