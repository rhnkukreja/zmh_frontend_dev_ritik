import { ChartsData, VotedAgainstRationale } from "@/types/companyReport";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";

interface InvestorsVotingAgainstSectionProps {
  data: ChartsData;
  votedAgainstRationale?: VotedAgainstRationale[];
}

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
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="text-left py-4 px-4 font-semibold text-gray-600 w-[200px]">Investor</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-600 w-[200px]">Proposal</th>
            <th className="text-center py-4 px-4 font-semibold text-gray-600 w-[100px]">Vote</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-600">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {rationaleData.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4 text-blue-600 font-semibold">{item.investor}</td>
              <td className="py-4 px-4 text-gray-700">{item.proposal}</td>
              <td className="py-4 px-4 text-center">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.vote?.toLowerCase() === 'against' 
                    ? 'bg-red-100 text-red-700' 
                    : item.vote?.toLowerCase() === 'for'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {item.vote}
                </span>
              </td>
              <td className="py-4 px-4 text-gray-600">{item.rationale}</td>
            </tr>
          ))}
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

// Trend Chart Component
const TrendChart = ({ title, data }: { title: string; data: any }) => {
  const chartData = extractYearData(data);
  
  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">{title}</h4>
        <div className="h-48 flex items-center justify-center bg-gray-50 rounded">
          <span className="text-sm text-gray-400">No data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">{title}</h4>
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
              fill="#800000" 
              name="% Support" 
              radius={[4, 4, 0, 0]}
              maxBarSize={70}
            >
              <LabelList 
                dataKey="total_percent" 
                position="top" 
                formatter={(value: number) => `${value.toFixed(0)}%`}
                style={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const InvestorsVotingAgainstSection = ({ data, votedAgainstRationale }: InvestorsVotingAgainstSectionProps) => {
  const safeRationaleData = Array.isArray(votedAgainstRationale) ? votedAgainstRationale : [];
  
  // Check if we have any meaningful data
  const hasVotingData = data && (
    data.election_of_directors || 
    data.say_on_pay || 
    data.shareholder_proposals || 
    data.ratification_of_auditor
  );

  return (
    <>
      {/* Section for Voting Rationale Table */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 mb-6">
          Voting Rationale
        </h2>
        <VotingRationaleTable rationaleData={safeRationaleData} />
      </section>

      {/* Separate Section for Trend Charts */}
      {hasVotingData && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 mb-6">
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
    </>
  );
};

export default InvestorsVotingAgainstSection;
