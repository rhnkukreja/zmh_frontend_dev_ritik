import { ChartsData, PercentOwnershipData } from "@/types/companyReport";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";

interface InvestorsVotingAgainstSectionProps {
  data: ChartsData;
  percentOwnershipData?: PercentOwnershipData[];
}

// Table for Investors that voted Against Directors or SOP
const VotingAgainstTable = ({ 
  percentOwnershipData 
}: { 
  percentOwnershipData: PercentOwnershipData[] 
}) => {
  // Collect all investors who voted against directors or SOP
  const investorVotes: Record<string, {
    votedAgainstDirectors: string[];
    votedAgainstSOP: boolean;
  }> = {};

  percentOwnershipData.forEach(investor => {
    const investorName = investor.institution_name || investor.institution__institution || '';
    if (!investorName) return;

    if (!investorVotes[investorName]) {
      investorVotes[investorName] = { votedAgainstDirectors: [], votedAgainstSOP: false };
    }

    // Check voted against directors
    if (Array.isArray(investor.voted_against_directors) && investor.voted_against_directors.length > 0) {
      investor.voted_against_directors.forEach((director: any) => {
        const directorName = typeof director === 'string' ? director : director?.director_name || director?.name || '';
        if (directorName && !investorVotes[investorName].votedAgainstDirectors.includes(directorName)) {
          investorVotes[investorName].votedAgainstDirectors.push(directorName);
        }
      });
    }

    // Check voted against SOP
    if (investor.voted_against_say_on_pay === true || 
        (Array.isArray(investor.voted_against_say_on_pay) && investor.voted_against_say_on_pay.length > 0)) {
      investorVotes[investorName].votedAgainstSOP = true;
    }
  });

  // Filter to only investors who voted against something
  const relevantInvestors = Object.entries(investorVotes)
    .filter(([, votes]) => votes.votedAgainstDirectors.length > 0 || votes.votedAgainstSOP)
    .slice(0, 15);

  // Collect all unique director names
  const allDirectors = [...new Set(
    relevantInvestors.flatMap(([, votes]) => votes.votedAgainstDirectors)
  )].slice(0, 10);

  if (relevantInvestors.length === 0) {
    return (
      <div className="mb-4">
        <p className="text-xs text-gray-500 text-center py-4">No investors from the top 20 list voted against directors or Say on Pay</p>
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-visible">
      <table className="w-full text-xs border-collapse table-auto">
        <thead>
          <tr className="bg-primary text-white">
            <th className="text-left py-2 px-2 font-medium border border-gray-300" rowSpan={2} style={{ width: '150px' }}>Investor</th>
            <th className="text-center py-2 px-2 font-medium border border-gray-300" colSpan={allDirectors.length > 0 ? allDirectors.length : 1}>
              Voted Against Directors
            </th>
            <th className="text-center py-2 px-2 font-medium border border-gray-300" rowSpan={2} style={{ width: '80px' }}>Voted Against SOP</th>
          </tr>
          {allDirectors.length > 0 && (
            <tr className="bg-gray-100">
              {allDirectors.map((director, idx) => (
                <th key={idx} className="text-center py-1 px-1 font-medium border border-gray-300 text-[9px]" style={{ minWidth: '70px' }}>
                  {director}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {relevantInvestors.map(([investor, votes], idx) => (
            <tr key={investor} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="py-2 px-2 border border-gray-200 font-medium break-words align-top">{investor}</td>
              {allDirectors.length > 0 ? (
                allDirectors.map((director, didx) => (
                  <td key={didx} className="text-center py-1.5 px-1 border border-gray-200">
                    {votes.votedAgainstDirectors.includes(director) ? (
                      <span className="text-red-600 font-bold">✗</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                ))
              ) : (
                <td className="text-center py-1.5 px-1 border border-gray-200">
                  {votes.votedAgainstDirectors.length > 0 ? (
                    <span className="text-red-600 font-bold">✗</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
              )}
              <td className="text-center py-1.5 px-2 border border-gray-200">
                {votes.votedAgainstSOP ? (
                  <span className="text-red-600 font-bold">✗</span>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
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
        <h4 className="text-xs font-semibold text-gray-700 mb-3 text-center">{title}</h4>
        <div className="h-40 flex items-center justify-center bg-gray-50 rounded">
          <span className="text-xs text-gray-400">No data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-xs font-semibold text-gray-700 mb-3 text-center">{title}</h4>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 11, fill: '#374151' }} 
              axisLine={{ stroke: '#e5e5e5' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#6b7280' }} 
              domain={[0, 100]} 
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Bar 
              dataKey="total_percent" 
              fill="#800000" 
              name="% Support" 
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            >
              <LabelList 
                dataKey="total_percent" 
                position="top" 
                formatter={(value: number) => `${value.toFixed(0)}%`}
                style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const InvestorsVotingAgainstSection = ({ data, percentOwnershipData }: InvestorsVotingAgainstSectionProps) => {
  const safePercentOwnership = Array.isArray(percentOwnershipData) ? percentOwnershipData : [];
  
  // Check if we have any meaningful data
  const hasVotingData = data && (
    data.election_of_directors || 
    data.say_on_pay || 
    data.shareholder_proposals || 
    data.ratification_of_auditor
  );

  const hasInvestorVotingData = safePercentOwnership.some(inv => 
    (Array.isArray(inv.voted_against_directors) && inv.voted_against_directors.length > 0) ||
    inv.voted_against_say_on_pay === true ||
    (Array.isArray(inv.voted_against_say_on_pay) && inv.voted_against_say_on_pay.length > 0)
  );

  if (!hasVotingData && !hasInvestorVotingData) {
    return null;
  }

  return (
    <>
      {/* Section for Voting Table */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 border-b-2 border-primary pb-2 mb-4">
          Investors that voted Against Election of Director or Say on Pay (from top 20 list)
        </h2>
        <VotingAgainstTable percentOwnershipData={safePercentOwnership} />
      </section>

      {/* Separate Section for Trend Charts */}
      {hasVotingData && (
        <section className="mb-10 bg-gray-50 rounded-xl p-6">
          <h3 className="text-base font-bold text-gray-800 mb-6">Trend in Investor support</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <TrendChart title="Election of Directors" data={data.election_of_directors} />
            <TrendChart title="Say on Pay" data={data.say_on_pay} />
            <TrendChart title="Other Proposals" data={data.shareholder_proposals} />
            <TrendChart title="Ratification of Auditor" data={data.ratification_of_auditor} />
          </div>
        </section>
      )}
    </>
  );
};

export default InvestorsVotingAgainstSection;
