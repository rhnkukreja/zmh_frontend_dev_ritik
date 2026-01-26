import { PercentOwnershipData } from "@/types/companyReport";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

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

const Top20InvestorsSection = ({ data }: Top20InvestorsSectionProps) => {
  const dataArray = Array.isArray(data) ? data : [];
  const top20 = dataArray.slice(0, 20);

  if (top20.length === 0) {
    return (
      <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Top 20 Investors – Total % ownership
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

  return (
    <section className="mb-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Top 20 Investors – Total % ownership
      </h2>

      <div className="flex gap-8">
        {/* Left: Ownership Table */}
        <div className="flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2 px-2 font-medium text-gray-700 w-12">No.</th>
                <th className="text-left py-2 px-2 font-medium text-gray-700">Shareholder</th>
                <th className="text-left py-2 px-2 font-medium text-gray-700 w-32">Ownership<sup>1</sup></th>
              </tr>
            </thead>
            <tbody>
              {top20.map((item, index) => {
                const ownership = parseFloat(item.percent_ownership?.replace('%', '') || '0');
                const barWidth = (ownership / maxOwnership) * 100;
                
                return (
                  <tr key={item.filer_id || index} className="border-b border-gray-100">
                    <td className="py-1.5 px-2 text-gray-500 text-xs">{index + 1}</td>
                    <td className="py-1.5 px-2 text-xs">
                      <span className="text-gray-800">
                        {item.institution_name}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-200 rounded-sm h-2.5 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-sm"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-gray-700 text-[10px] w-10">
                          {ownership.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right: Proxy Advisor Influence Analysis Pie Chart */}
        <div className="w-80">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Proxy Advisor Influence Analysis
            </h3>
            <p className="text-xs text-gray-500 mb-3">(top 20 investors)</p>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percentage }) => `${percentage}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] || PIE_COLORS['Other']} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value} investors`, name]}
                    contentStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: PIE_COLORS[entry.name as keyof typeof PIE_COLORS] || PIE_COLORS['Other'] }}
                  />
                  <span className="text-gray-600">{entry.name}</span>
                  <span className="text-gray-400">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Top20InvestorsSection;
