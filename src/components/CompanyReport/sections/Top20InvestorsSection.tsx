import { useState } from "react";
import { PercentOwnershipData } from "@/types/companyReport";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";

interface Top20InvestorsSectionProps {
  data: PercentOwnershipData[];
}

// Colors for the pie chart segments
const PIE_COLORS = {
  'Internal': '#1e3a5f',
  'Internal, ISS': '#8b5cf6', 
  'Internal, ISS, GL': '#ec4899',
  'ISS': '#06b6d4',
  'ISS, GL': '#22c55e',
  'GL': '#f59e0b',
  'Not in ZMH coverage': '#94a3b8',
  'Other': '#64748b'
};

// Engagement Topic Colors
const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  'E': { bg: '#16a34a', text: 'white' },
  'S': { bg: '#f59e0b', text: 'white' },
  'G': { bg: '#0ea5e9', text: 'white' },
};

const Top20InvestorsSection = ({ data }: Top20InvestorsSectionProps) => {
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const dataArray = Array.isArray(data) ? data : [];
  const top20 = dataArray.slice(0, 20);

  if (top20.length === 0) {
    return (
      <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Total % ownership
        </h2>
        <div className="bg-gray-50 rounded p-6 text-center">
          <p className="text-gray-500 text-sm">No ownership data available</p>
        </div>
      </section>
    );
  }

  // Calculate proxy advisor influence distribution
  const proxyInfluenceCount: Record<string, number> = {};
  top20.forEach(item => {
    const influence = item.proxy_advisor_influence || 'Not in ZMH coverage';
    proxyInfluenceCount[influence] = (proxyInfluenceCount[influence] || 0) + 1;
  });

  const pieData = Object.entries(proxyInfluenceCount).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / top20.length) * 100).toFixed(1)
  }));

  // Find max ownership for bar scaling
  const maxOwnership = Math.max(...top20.map(item => 
    parseFloat(item.percent_ownership?.replace('%', '') || '0')
  ));

  // Render engagement topic badges
  const renderEngagementTopics = (topic: string | undefined) => {
    if (!topic) return null;
    
    const topics = topic.split(',').map(t => t.trim()).filter(Boolean);
    if (topics.length === 0) return null;

    return (
      <div className="flex gap-1.5 flex-wrap justify-center">
        {topics.map((t, idx) => {
          const color = TOPIC_COLORS[t] || { bg: '#6b7280', text: 'white' };
          return (
            <span
              key={idx}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
              style={{ backgroundColor: color.bg, color: color.text }}
            >
              {t}
            </span>
          );
        })}
      </div>
    );
  };

  // Render voting status - maroon crossed icon style
  const renderVotingStatus = (votedAgainst: string | boolean | undefined) => {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mx-auto">
        <path d="M18 6L6 18M6 6l12 12" stroke="#800000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  };

  // Render checkmark for boolean fields
  const renderCheckmark = (value: boolean | string | undefined) => {
    if (value === true || value === 'true' || value === 'Yes') {
      return (
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mx-auto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Total % ownership
      </h2>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-4 px-4 font-semibold text-gray-600 w-12">No.</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-600 min-w-[200px]">Shareholder</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 w-[120px]">Ownership<sup>1</sup></th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 w-[150px]">
                Proxy Advisory Influence
                <Lucide 
                  icon="BarChart3"
                  className="w-[18px] h-[18px] text-primary cursor-pointer hover:text-primary/70 no-print inline-block align-middle ml-0.5"
                  onClick={() => setChartModalVisible(true)}
                />
              </th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 w-[100px]">UN PRI Signatory</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 w-[100px]">Engaged with Company<sup>2</sup></th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 w-[130px]">Engagement Topic</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 w-[100px]">Voted Against Directors</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 w-[100px]">Voted Against Say on Pay</th>
            </tr>
          </thead>
          <tbody>
            {top20.map((item, index) => {
              const ownership = parseFloat(item.percent_ownership?.replace('%', '') || '0');
              
              return (
                <tr key={item.filer_id || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-gray-600 font-medium">{index + 1}</td>
                  <td className="py-4 px-4 text-blue-600 font-semibold underline cursor-pointer hover:text-blue-800">
                    {item.institution_name || item.filer_name}
                  </td>
                  <td className="py-4 px-4 text-center text-gray-700 font-medium">
                    {ownership.toFixed(2)}%
                  </td>
                  <td className="py-4 px-4 text-center text-gray-600">
                    {item.proxy_advisor_influence || '-'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {renderCheckmark(item.unpri_signatory)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {renderCheckmark(item.company_engaged)}
                  </td>
                  <td className="py-4 px-4">
                    {renderEngagementTopics(item.engagement_topic)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {renderVotingStatus(item.voted_against_directors)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {renderVotingStatus(item.voted_against_say_on_pay)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex justify-between mt-3 text-xs text-gray-500">
          <span><sup>1</sup>Source: Whalewisdom. Data as of January 27, 2026.</span>
          <span>*Not in ZMH coverage universe</span>
        </div>
      </div>

      {/* Chart Modal */}
      <Dialog size="lg" open={chartModalVisible} onClose={() => setChartModalVisible(false)}>
        <Dialog.Panel>
          <Dialog.Title>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Proxy Advisor Influence Analysis</h2>
              </div>
              <div
                onClick={() => setChartModalVisible(false)}
                className="cursor-pointer hover:bg-gray-100 p-2 rounded absolute top-4 right-6 z-10"
              >
                <Lucide icon="X" className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <div className="w-full">
              <div className="bg-white rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="w-[500px] h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={45}
                          startAngle={90}
                          endAngle={-270}
                          fill="#8884d8"
                          dataKey="value"
                          strokeWidth={2}
                          stroke="#ffffff"
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                            const lineRadius = outerRadius + 15;
                            const lineX = cx + lineRadius * Math.cos(-midAngle * RADIAN);
                            const lineY = cy + lineRadius * Math.sin(-midAngle * RADIAN);

                            const extendedX = lineX + (lineX > cx ? 25 : -25);

                            return (
                              <g>
                                <polyline
                                  points={`${cx + outerRadius * Math.cos(-midAngle * RADIAN)},${cy + outerRadius * Math.sin(-midAngle * RADIAN)} ${lineX},${lineY} ${extendedX},${lineY}`}
                                  fill="none"
                                  stroke="#333"
                                  strokeWidth={1.5}
                                />
                                <text
                                  x={extendedX}
                                  y={lineY - 8}
                                  fill="#333"
                                  textAnchor={extendedX > cx ? "start" : "end"}
                                  dominantBaseline="central"
                                  fontSize={12}
                                  fontWeight="500"
                                >
                                  {name}
                                </text>
                                <text
                                  x={extendedX}
                                  y={lineY + 8}
                                  fill="#666"
                                  textAnchor={extendedX > cx ? "start" : "end"}
                                  dominantBaseline="central"
                                  fontSize={11}
                                  fontWeight="600"
                                >
                                  {pieData.find(d => d.name === name)?.percentage}%
                                </text>
                              </g>
                            );
                          }}
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] || PIE_COLORS['Other']} 
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>
    </section>
  );
};

export default Top20InvestorsSection;
