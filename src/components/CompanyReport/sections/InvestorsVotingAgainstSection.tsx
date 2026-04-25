import { ChartsData, VotedAgainstRationale } from "@/types/companyReport";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";

interface InvestorsVotingAgainstSectionProps {
  data: ChartsData;
  votedAgainstRationale?: VotedAgainstRationale[];
  showOnlyTrend?: boolean;
  showOnlyVotingRationale?: boolean;
}

const parseSplitVoteCounts = (value: unknown): { for?: number; against?: number } | null => {
  if (!value) return null;
  if (typeof value === "object") return value as { for?: number; against?: number };

  if (typeof value === "string") {
    // API sometimes returns Python-dict-like strings, e.g. "{'for': 3}".
    // Convert to valid JSON in a conservative way and parse.
    try {
      const normalized = value
        .trim()
        .replace(/'/g, '"')
        .replace(/\bNone\b/g, "null")
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false");
      const parsed = JSON.parse(normalized);
      if (parsed && typeof parsed === "object") {
        return parsed as { for?: number; against?: number };
      }
    } catch {
      return null;
    }
  }

  return null;
};

// Table for Voting Rationale
const VotingRationaleTable = ({ 
  rationaleData 
}: { 
  rationaleData: VotedAgainstRationale[] 
}) => {
  if (!rationaleData || rationaleData.length === 0) {
    return (
      <div className="mb-4">
        <p className="text-sm text-gray-500 text-center py-4">No investors voted against directors or Say on Pay</p>
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="text-left py-4 px-4 font-semibold text-gray-600 text-xs w-[200px]">Investor</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-600 text-xs w-[200px]">Proposal</th>
            <th className="text-center py-4 px-4 font-semibold text-gray-600 text-xs w-[100px]">Vote</th>
            <th className="text-center py-4 px-4 font-semibold text-gray-600 text-xs w-[165px]"># of Funds</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-600 text-xs">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {rationaleData.map((item, idx) => {
            const investorName = item.institution__institution || item.investor || '';
            const rationale = item.notes || item.rationale || '';
            const vote = item.vote || '';
            const isAgainstOrWithhold = vote?.toLowerCase() === 'against' || vote?.toLowerCase() === 'withhold';

            const voteCounts = parseSplitVoteCounts(item.split_vote_counts);
            const forCount = voteCounts?.for;
            const againstCount = voteCounts?.against;
            
            return (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4 text-gray-700 font-semibold">{investorName}</td>
                <td className="py-4 px-4 text-gray-700">{item.proposal || ''}</td>
                <td className={`py-4 px-4 text-center ${isAgainstOrWithhold ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>
                  {vote}
                </td>
                <td className="py-4 px-4 text-center text-gray-700">
                  {voteCounts ? (
                    <div className="inline-grid grid-cols-[auto_1fr] gap-x-2 gap-y-0 leading-tight text-xs text-gray-600 min-w-[80px]">
                      <span className="font-semibold text-gray-800 text-left">For:</span>
                      <span className="tabular-nums text-right text-gray-700">{forCount ?? 0}</span>
                      <span className="font-semibold text-gray-800 text-left">Against:</span>
                      <span className="tabular-nums text-right text-gray-700">{againstCount ?? 0}</span>
                    </div>
                  ) : (
                    ""
                  )}
                </td>
                <td className="py-4 px-4 text-gray-700">{rationale}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Extract data from year-keyed object
const extractYearData = (data: any): { year: string; total_percent: number; volume: number }[] => {
  if (!data || typeof data !== 'object') return [];
  
  const result: { year: string; total_percent: number; volume: number }[] = [];
  
  // Check if data is keyed by years (e.g., "2024", "2025")
  Object.entries(data).forEach(([key, value]: [string, any]) => {
    if (/^\d{4}$/.test(key) && value) {
      result.push({
        year: key,
        total_percent: parseFloat(value.total_percent || '0'),
        volume: parseInt(value.volume || '0', 10)
      });
    }
  });

  return result.sort((a, b) => parseInt(a.year) - parseInt(b.year));
};

// Category-specific colors matching AGMSummaryCard analytics
const ANALYTICS_COLORS: Record<string, string> = {
  "Election of Directors": "#991b1b",      // Maroon (bg-primary/red-800)
  "Say on Pay": "#ea580c",                 // Orange
  "Other Proposals": "#2563eb",            // Blue
  "Ratification of Auditor": "#16a34a"     // Green
};

// Trend Chart Component
const TrendChart = ({ title, data }: { title: string; data: any }) => {
  const chartData = extractYearData(data);
  
  // Get category-specific color, fallback to default maroon
  const barColor = ANALYTICS_COLORS[title] || "#800000";
  
  // Check if data is empty or all values are 0
  const hasNoData = chartData.length === 0;
  const allZeros = chartData.length > 0 && chartData.every(item => item.total_percent === 0);
  
  if (hasNoData || allZeros) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">{title}</h4>
        <div className="h-48 flex items-center justify-center bg-gray-50 rounded">
          <span className="text-sm text-gray-500 font-medium">No proposal</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
      data-pdf-chart
      data-title={title}
    >
      <div className="text-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
        <div className="w-12 h-1 mx-auto rounded-full" style={{ backgroundColor: barColor }}></div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 25, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 12, fill: '#374151' }} 
              axisLine={{ stroke: '#e5e5e5' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }} 
              domain={[0, 100]} 
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Bar 
              dataKey="total_percent" 
              fill={barColor}
              name="% Support" 
              radius={[4, 4, 0, 0]}
              maxBarSize={70}
            >
              <LabelList 
                dataKey="total_percent" 
                position="top" 
                formatter={(value: number) => value === 0 ? 'No proposal' : `${value.toFixed(0)}%`}
                style={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const InvestorsVotingAgainstSection = ({ data, votedAgainstRationale, showOnlyTrend, showOnlyVotingRationale }: InvestorsVotingAgainstSectionProps) => {
  const safeRationaleData = Array.isArray(votedAgainstRationale) ? votedAgainstRationale : [];
  
  // Check if we have any meaningful data
  const hasVotingData = data && (
    data.election_of_directors || 
    data.say_on_pay || 
    data.shareholder_proposals || 
    data.ratification_of_auditor
  );

  // If showOnlyTrend is true, only render Trend section
  if (showOnlyTrend) {
    return (
      <>
        {hasVotingData && (
          <section id="trend-investor-support" className="mb-10">
            <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
              Trend in Investor Support
            </h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <TrendChart title="Election of Directors" data={data.election_of_directors} />
              <TrendChart title="Say on Pay" data={data.say_on_pay} />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <TrendChart title="Other Proposals" data={data.shareholder_proposals} />
              <TrendChart title="Ratification of Auditor" data={data.ratification_of_auditor} />
            </div>
          </section>
        )}
      </>
    );
  }

  // If showOnlyVotingRationale is true, only render Voting Rationale section
  if (showOnlyVotingRationale) {
    return (
      <>
        {safeRationaleData.length > 0 && (
          <section id="voting-rationale" className="mb-10">
            <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
              Voting Rationale
            </h2>
            <VotingRationaleTable rationaleData={safeRationaleData} />
          </section>
        )}
      </>
    );
  }

  // Default: render both sections (for backward compatibility)
  return (
    <>
      {/* Section 2: Trend in Investor Support (charts first) */}
      {hasVotingData && (
        <section id="trend-investor-support" className="mb-10">
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
            Trend in Investor Support
          </h2>
          
          {/* First Row - 2 charts */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <TrendChart title="Election of Directors" data={data.election_of_directors} />
            <TrendChart title="Say on Pay" data={data.say_on_pay} />
          </div>
          
          {/* Second Row - 2 charts */}
          <div className="grid grid-cols-2 gap-6">
            <TrendChart title="Other Proposals" data={data.shareholder_proposals} />
            <TrendChart title="Ratification of Auditor" data={data.ratification_of_auditor} />
          </div>
        </section>
      )}

      {/* Section 5: Voting Rationale Table (after other sections) */}
      {safeRationaleData.length > 0 && (
        <section id="voting-rationale" className="mb-10">
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
            Voting Rationale
          </h2>
          <VotingRationaleTable rationaleData={safeRationaleData} />
        </section>
      )}
    </>
  );
};

export default InvestorsVotingAgainstSection;
