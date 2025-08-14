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
        <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl flex flex-col mb-10">
            <h2 className="text-xl font-semibold mb-4">Analytics</h2>
            {!isInvestorDataAvailable ? (
                <p className="text-center text-gray-500 text-lg">No Analytics available</p>
            ) : (
                <>
                    <div className="flex gap-6 rounded-lg">
                        <div className="w-3/5 overflow-auto max-h-80 rounded-lg">
                            <table className="w-full rounded-lg shadow-md">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="px-4 py-2 text-left font-medium" style={{fontSize: '14px'}}>Institution</th>
                                        <th className="px-4 py-2 text-center font-medium" style={{fontSize: '14px'}}>Unique Companies</th>
                                        <th className="px-4 py-2 text-center font-medium" style={{fontSize: '14px'}}>Environmental</th>
                                        <th className="px-4 py-2 text-center font-medium" style={{fontSize: '14px'}}>Social</th>
                                        <th className="px-4 py-2 text-center font-medium" style={{fontSize: '14px'}}>Governance</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700 divide-y divide-gray-100">
                                    {investorData.map((investor, index) => (
                                        <tr key={index} className="text-center">
                                            <td
                                                className="p-2 text-left text-blue-600 cursor-pointer hover:underline"
                                                style={{fontSize: '14px'}}
                                                onClick={() => handleSearch([investor.institution__institution])}
                                            >
                                                {investor.institution__institution}
                                            </td>
                                            <td className="px-4 py-2" style={{fontSize: '14px'}}>{formatNumberWithCommas(investor.unique_companies)}</td>
                                            <td className="px-4 py-2" style={{fontSize: '14px'}}>{formatNumberWithCommas(investor.environmental)}</td>
                                            <td className="px-4 py-2" style={{fontSize: '14px'}}>{formatNumberWithCommas(investor.social)}</td>
                                            <td className="px-4 py-2" style={{fontSize: '14px'}}>{formatNumberWithCommas(investor.governance)}</td>
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
                            labelStyle={{ fontSize: '12px' }}
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
                            <h3 className="text-md font-semibold mb-2" style={{fontSize: '14px'}}>Governance</h3>
                            <table className="w-full border-collapse border border-gray-300 rounded-lg">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="px-2 py-2 text-left font-medium" style={{fontSize: '14px'}}>Topic</th>
                                        <th className="px-4 py-2 text-left font-medium" style={{fontSize: '14px'}}>Count</th>
                                        <th className="px-4 py-2 text-left font-medium" style={{fontSize: '14px'}}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEngagementTopics.gov.slice(0, 5).map((topic, index) => (
                                        <tr key={index} className="text-center">
                                            <td className="border p-2 text-left" style={{fontSize: '14px'}}>{topic.topic}</td>
                                            <td className="border p-2" style={{fontSize: '14px'}}>{formatNumberWithCommas(topic.count)}</td>
                                            <td className="border p-2" style={{fontSize: '14px'}}>{(topic.percentage_gov_engagements * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            <h3 className="text-md font-semibold mb-2" style={{fontSize: '14px'}}>Environmental</h3>
                            <table className="w-full border-collapse border border-gray-300 rounded-lg">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="px-2 py-2 text-left font-medium" style={{fontSize: '14px'}}>Topic</th>
                                        <th className="px-4 py-2 text-left font-medium" style={{fontSize: '14px'}}>Count</th>
                                        <th className="px-4 py-2 text-left font-medium" style={{fontSize: '14px'}}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEngagementTopics.env.slice(0, 5).map((topic, index) => (
                                        <tr key={index} className="text-center">
                                            <td className="border p-2 text-left" style={{fontSize: '14px'}}>{topic.topic}</td>
                                            <td className="border p-2" style={{fontSize: '14px'}}>{formatNumberWithCommas(topic.count)}</td>
                                            <td className="border p-2" style={{fontSize: '14px'}}>{(topic.percentage_env_engagements * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
                            <h3 className="text-md font-semibold mb-2" style={{fontSize: '14px'}}>Social</h3>
                            <table className="w-full border-collapse border border-gray-300 rounded-lg">
                                <thead>
                                    <tr className="bg-primary text-white">
                                        <th className="px-2 py-2 text-left font-medium" style={{fontSize: '14px'}}>Topic</th>
                                        <th className="px-4 py-2 text-left font-medium" style={{fontSize: '14px'}}>Count</th>
                                        <th className="px-4 py-2 text-left font-medium" style={{fontSize: '14px'}}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEngagementTopics.soc.slice(0, 5).map((topic, index) => (
                                        <tr key={index} className="text-center">
                                            <td className="border p-2 text-left" style={{fontSize: '14px'}}>{topic.topic}</td>
                                            <td className="border p-2" style={{fontSize: '14px'}}>{formatNumberWithCommas(topic.count)}</td>
                                            <td className="border p-2" style={{fontSize: '14px'}}>{(topic.percentage_soc_engagements * 100).toFixed(1)}%</td>
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
