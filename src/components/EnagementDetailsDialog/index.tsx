import { TopEngagementTopics } from "@/types/peerAnalysis";
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface ChartComponentProps {
    investorData: {
        institution__institution: string;
        unique_companies: number;
        environmental: number;
        social: number;
        governance: number;
    }[];
    pieChartDataPeerAnalysis: {
        name: string;
        total: number;
    }[];
    handleSearch: (searchTerms: string[]) => void;
    topEngagementTopics: TopEngagementTopics;
}

const COLORS = ["#00C49F", "#FF6F00", "#0088FE"];

const formatNumberWithCommas = (num: number): string => {
    return num.toLocaleString();
};


const ChartComponent: React.FC<ChartComponentProps> = ({ investorData, pieChartDataPeerAnalysis, handleSearch, topEngagementTopics }) => {
    const isInvestorDataAvailable = investorData && investorData.length > 0;

    if (!investorData) {
        <h2 className="text-xl font-semibold mb-4">No Analytics available</h2>
        return
    }

    const filteredPieChartData = pieChartDataPeerAnalysis.filter(entry => entry.total > 0);


    return (
        <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl min-h-[120vh] flex flex-col mb-20">
            <h2 className="text-xl font-semibold mb-4">Analytics</h2>
            {!isInvestorDataAvailable ? (
                <p className="text-center text-gray-500 text-lg">No Analytics available</p>
            ) : (
                <>
                    <div className="flex gap-6 rounded-lg">
                        <div className="w-3/5 overflow-auto max-h-80 rounded-lg">
                            <table className="w-full rounded-lg shadow-md">
                                <thead>
                                    <tr className="bg-primary text-white text-sm">
                                        <th className="px-4 py-2 text-left font-medium">Institution</th>
                                        <th className="px-4 py-2 text-left font-medium">Unique Companies</th>
                                        <th className="px-4 py-2 text-left font-medium">Environmental</th>
                                        <th className="px-4 py-2 text-left font-medium">Social</th>
                                        <th className="px-4 py-2 text-left font-medium">Governance</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                                    {investorData.map((investor, index) => (
                                        <tr key={index} className="text-center">
                                            <td
                                                className="p-2 text-left text-blue-600 cursor-pointer hover:underline"
                                                onClick={() => handleSearch([investor.institution__institution])}
                                            >
                                                {investor.institution__institution}
                                            </td>
                                            <td className="px-4 py-2">{formatNumberWithCommas(investor.unique_companies)}</td>
                                            <td className="px-4 py-2">{formatNumberWithCommas(investor.environmental)}</td>
                                            <td className="px-4 py-2">{formatNumberWithCommas(investor.social)}</td>
                                            <td className="px-4 py-2">{formatNumberWithCommas(investor.governance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="w-6/12 rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            {filteredPieChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}  >
                                    <PieChart >
                                        <Pie
                                            data={filteredPieChartData}
                                            dataKey="total"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius="80%"
                                            label={({ name, total }) => `${name}: ${formatNumberWithCommas(total)}`}
                                        >
                                            {filteredPieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip wrapperStyle={{ marginTop: 2 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-500">No chart data available</p>
                            )}
                        </div>

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            <h3 className="text-md font-semibold mb-2">Governance</h3>
                            <table className="w-full border-collapse border border-gray-300 rounded-lg">
                                <thead>
                                    <tr className="bg-primary text-white text-sm">
                                        <th className="px-4 py-2 text-left font-medium">Topic</th>
                                        <th className="px-4 py-2 text-left font-medium">Count</th>
                                        <th className="px-4 py-2 text-left font-medium">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEngagementTopics.gov.slice(0, 5).map((topic, index) => (
                                        <tr key={index} className="text-center">
                                            <td className="border p-2 text-left">{topic.topic}</td>
                                            <td className="border p-2">{formatNumberWithCommas(topic.count)}</td>
                                            <td className="border p-2">{(topic.percentage_gov_engagements * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            <h3 className="text-md font-semibold mb-2">Environmental</h3>
                            <table className="w-full border-collapse border border-gray-300 rounded-lg">
                                <thead>
                                    <tr className="bg-primary text-white text-sm">
                                        <th className="px-4 py-2 text-left font-medium">Topic</th>
                                        <th className="px-4 py-2 text-left font-medium">Count</th>
                                        <th className="px-4 py-2 text-left font-medium">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEngagementTopics.env.slice(0, 5).map((topic, index) => (
                                        <tr key={index} className="text-center">
                                            <td className="border p-2 text-left">{topic.topic}</td>
                                            <td className="border p-2">{formatNumberWithCommas(topic.count)}</td>
                                            <td className="border p-2">{(topic.percentage_env_engagements * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            <h3 className="text-md font-semibold mb-2">Social</h3>
                            <table className="w-full border-collapse border border-gray-300 rounded-lg">
                                <thead>
                                    <tr className="bg-primary text-white text-sm">
                                        <th className="px-4 py-2 text-left font-medium">Topic</th>
                                        <th className="px-4 py-2 text-left font-medium">Count</th>
                                        <th className="px-4 py-2 text-left font-medium">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEngagementTopics.soc.slice(0, 5).map((topic, index) => (
                                        <tr key={index} className="text-center">
                                            <td className="border p-2 text-left">{topic.topic}</td>
                                            <td className="border p-2">{formatNumberWithCommas(topic.count)}</td>
                                            <td className="border p-2">{(topic.percentage_soc_engagements * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChartComponent;
