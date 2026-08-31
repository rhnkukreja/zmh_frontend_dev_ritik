import { useState } from "react";
import { PercentOwnershipData } from "@/types/companyReport";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { MegaphoneOff } from "lucide-react";
import Tippy from "@/components/Base/Tippy";

interface Top20InvestorsSectionProps {
  data: PercentOwnershipData[];
  totalPercentOwnership?: string;
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


const Top20InvestorsSection = ({ data, totalPercentOwnership }: Top20InvestorsSectionProps) => {
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const dataArray = Array.isArray(data) ? data : [];
  const top20 = dataArray.slice(0, 20);

  const formatCalloutName = (name: string) => {
    const trimmed = (name || '').trim();
    if (trimmed.length <= 18) return [trimmed];
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return [`${parts[0]},`, parts.slice(1).join(', ')];
      }
    }
    const mid = Math.floor(trimmed.length / 2);
    const splitAt = trimmed.lastIndexOf(' ', mid);
    if (splitAt > 0) return [trimmed.slice(0, splitAt), trimmed.slice(splitAt + 1)];
    return [trimmed];
  };

  if (top20.length === 0) {
    return (
      <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
          Top 20 Ownership {totalPercentOwnership && <span className="text-base font-bold text-gray-500">({totalPercentOwnership.replace('%', '')}% of Shares Outstanding)</span>}
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


  // Render voting status - red tick for True, EyeOff icon for None/null/undefined/ND/NSD, blank for false
  const renderVotingStatus = (
    value: any,
    message?: string
  ) => {
    // Check if value is not disclosed - show EyeOff icon
    const normalizedString = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const notDisclosedValues = new Set(['none', 'nd', 'nse', 'nsd', 'n/d', 'not disclosed', 'not disclosed in npx']);
    if (value === null || value === undefined || value === '' || notDisclosedValues.has(normalizedString)) {
      const tooltipText = message || (normalizedString === 'nse' ? 'Not disclosed in NPX' : 'No Data');
      return (
        <div className="flex items-center justify-center">
          <Tippy content={tooltipText} options={{ theme: "light" }}>
            <span className="inline-flex items-center justify-center">
              <MegaphoneOff className="w-5 h-5 text-rose-700" strokeWidth={1.5} />
            </span>
          </Tippy>
        </div>
      );
    }

    // Normalize booleans coming back as strings/numbers/arrays
    if (Array.isArray(value)) {
      if (value.length > 0) {
        return (
          <div className="mx-auto w-5 h-5 rounded-full bg-rose-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      }
      return null;
    }

    const normalized = String(value).trim().toLowerCase();
    const truthy = new Set(['true', 'yes', 'y', '1', 't']);
    const falsy = new Set(['false', 'no', 'n', '0', 'f']);

    if (value === true || truthy.has(normalized) || (typeof value === 'number' && value > 0)) {
      return (
        <div className="mx-auto w-5 h-5 rounded-full bg-rose-600 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    }

    if (value === false || falsy.has(normalized) || (typeof value === 'number' && value === 0)) return null;

    // Unknown non-empty values -> leave blank
    return null;
  };

  // Render checkmark for boolean fields - green for UNPRI, blank for false
  const renderCheckmark = (value: boolean | string | undefined) => {
    const normalized = value === undefined || value === null ? '' : String(value).trim().toLowerCase();
    const truthy = new Set(['true', 'yes', 'y', '1', 't']);
    const isTruthy = value === true || truthy.has(normalized) || (typeof value === 'number' && value > 0);
    if (isTruthy) {
      return (
        <div className="mx-auto w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
        Top 20 Ownership {totalPercentOwnership && <span className="text-base font-bold text-gray-900">({totalPercentOwnership.replace('%', '')}% of Shares Outstanding)</span>}
      </h2>

      {/* Layout: Table on left, Chart on right */}
      <div className="flex gap-6 items-start">
      {/* Main Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full table-fixed text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-4 px-4 font-semibold text-gray-600 text-xs w-12">No.</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-600 text-xs w-[320px]">Shareholder</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 text-xs w-[120px]">Ownership<sup>1</sup></th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 text-xs w-[150px]">Proxy Advisory Influence</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 text-xs w-[100px]">UN PRI Signatory</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 text-xs w-[100px]">Voted Against Directors</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-600 text-xs w-[100px]">Voted Against Say on Pay</th>
            </tr>
          </thead>
          <tbody>
            {top20.map((item, index) => {
              const ownership = parseFloat(item.percent_ownership?.replace('%', '') || '0');
              
              return (
                <tr key={item.filer_id || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-gray-600 font-medium">{index + 1}</td>
                  <td className="py-4 px-4 text-gray-700 font-semibold align-middle">
                    <div className="flex min-w-0 items-start gap-2">
                      {!item.investor_profile_id && (
                        <sup className="mt-0.5 shrink-0 whitespace-nowrap text-[11px] font-bold leading-none">*</sup>
                      )}
                      <span className="min-w-0 break-words leading-snug">
                        {item.institution_name || item.institution__institution}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-gray-700">
                    {ownership.toFixed(2)}%
                  </td>
                  <td className="py-4 px-4 text-center text-gray-600">
                    {item.proxy_advisor_influence || ''}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {renderCheckmark(item.unpri_signatory)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {renderVotingStatus((item as any).voted_against_directors, (item as any).voted_against_directors_message)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {renderVotingStatus((item as any).voted_against_say_on_pay, (item as any).voted_against_say_on_pay_message)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 pb-2 text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span><sup>1</sup>Source: Whalewisdom. Data as of January 27, 2026.</span>
            <span>*Not in ZMH coverage universe</span>
          </div>
        </div>
      </div>

      {/* Pie Chart on right side */}
      <div className="w-[380px] flex-shrink-0">
        <div
          className="bg-white border border-gray-200 rounded-lg p-3 self-start page-break-inside-avoid overflow-visible"
          data-pdf-chart
          data-title="Proxy Advisor Influence"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Proxy Advisor Influence</h3>
          <div className="h-[260px] overflow-visible">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 60, bottom: 8, left: 40 }}>
                <Pie
                  data={pieData}
                  cx="45%"
                  cy="50%"
                  outerRadius={60}
                  innerRadius={30}
                  startAngle={90}
                  endAngle={-270}
                  fill="#8884d8"
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#ffffff"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, name }) => {
                    const RADIAN = Math.PI / 180;

                    const lineRadius = outerRadius + 10;
                    const lineX = cx + lineRadius * Math.cos(-midAngle * RADIAN);
                    const lineY = cy + lineRadius * Math.sin(-midAngle * RADIAN);

                    const extendedX = lineX + (lineX > cx ? 18 : -18);
                    const pct = pieData.find(d => d.name === name)?.percentage;
                    const lines = formatCalloutName(String(name || ''));
                    return (
                      <g>
                        <polyline
                          points={`${cx + outerRadius * Math.cos(-midAngle * RADIAN)},${cy + outerRadius * Math.sin(-midAngle * RADIAN)} ${lineX},${lineY} ${extendedX},${lineY}`}
                          fill="none"
                          stroke="#374151"
                          strokeWidth={1}
                        />
                        <text
                          x={extendedX}
                          y={lineY - (lines.length > 1 ? 10 : 6)}
                          fill="#111827"
                          textAnchor={extendedX > cx ? "start" : "end"}
                          dominantBaseline="central"
                          fontSize={10}
                          fontWeight="500"
                        >
                          {lines.map((l, i) => (
                            <tspan key={i} x={extendedX} dy={i === 0 ? 0 : 12}>{l}</tspan>
                          ))}
                        </text>
                        <text
                          x={extendedX}
                          y={lineY + (lines.length > 1 ? 14 : 8)}
                          fill="#6b7280"
                          textAnchor={extendedX > cx ? "start" : "end"}
                          dominantBaseline="central"
                          fontSize={10}
                          fontWeight="600"
                        >
                          {pct}%
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
