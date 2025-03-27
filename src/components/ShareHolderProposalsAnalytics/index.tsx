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

const ShareHolderProposalAnalyticsComponent: React.FC<ShareHolderProposalAnalyticsComponentProps> = ({
    proposalCounts,
    topSubcategories,
    topCategories,
    yearlySummary,
}) => {
    if (!proposalCounts || !topSubcategories || !topCategories || !yearlySummary) {
        return <h2 className="text-xl font-semibold mb-4">No Analytics available</h2>;
    }

    return (
        <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl min-h-[120vh] flex flex-col mb-20">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Analytics</h2>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-gray-100 p-4 rounded-lg shadow-md flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4">Yearly Proposal Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={yearlySummary}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatNumberWithCommas(Number(value))} />
                            <Legend />
                            <Bar dataKey="count" fill="#FF6F00" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg shadow-md flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-4">Proposal Distribution by Category</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={topCategories}
                                dataKey="count"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ name, value }) => `${name}: ${value}`} // Custom label
                            >
                                {topCategories.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(topSubcategories).map(([category, subcategories]) => (
                    <div key={category} className="bg-gray-100 p-4 rounded-lg shadow-md">
                        <h4 className="text-md font-semibold mb-2">{category}</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="border p-2">Subcategory</th>
                                        <th className="border p-2">Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subcategories.map((sub, index) => (
                                        <tr key={index} className="border">
                                            <td className="border p-2">{sub.sub_category}</td>
                                            <td className="border p-2 text-center">{formatNumberWithCommas(sub.count)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShareHolderProposalAnalyticsComponent;
