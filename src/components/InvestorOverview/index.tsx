import React, { useState, useEffect } from 'react';
import { institutionStatsService } from '@/services/institutionStats';
import LoadingIcon from '@/components/Base/LoadingIcon';
import TomSelect from '@/components/Base/TomSelect';
import { BarChart3, FileText, PieChart, Calendar, Building2 } from 'lucide-react';

interface InvestorOption {
  id: number;
  institution: string;
}

interface BucketData {
  total_votes: number;
  companies: number;
  explicit_rationales: number;
  coverage_percentage: number;
  votes_without_rationale: number;
  high_level_summary: string;
  top_stated_reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  vote_type_breakdown: Array<{
    vote_type: string;
    count: number;
    percentage: number;
  }>;
  top_companies: Array<{
    company_name: string;
    vote_count: number;
  }>;
  monthly_distribution: Array<{
    month: string;
    vote_count: number;
  }>;
}

interface StatsData {
  institution_id: number;
  institution_name: string;
  year: number;
  data_coverage: string;
  total_votes: number;
  buckets: {
    election_of_directors: BucketData;
    executive_compensation: BucketData;
    shareholder_proposals: BucketData;
  };
}

type BucketKey = 'election_of_directors' | 'executive_compensation' | 'shareholder_proposals';

const InvestorOverview: React.FC = () => {
  const [investors, setInvestors] = useState<InvestorOption[]>([]);
  const [selectedInvestor, setSelectedInvestor] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedBucket, setSelectedBucket] = useState<BucketKey>('election_of_directors');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load investor dropdown on mount
  useEffect(() => {
    const loadInvestors = async () => {
      try {
        const data = await institutionStatsService.getInvestorDropdown();
        setInvestors(data);
        if (data.length > 0) {
          setSelectedInvestor(data[0].id);
        }
      } catch (err) {
        setError('Failed to load investors');
        console.error('Error loading investors:', err);
      }
    };
    loadInvestors();
  }, []);

  // Load stats when investor or year changes
  useEffect(() => {
    if (!selectedInvestor) return;

    const loadStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await institutionStatsService.getInstitutionStats(selectedInvestor, selectedYear);
        setStats(data);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load statistics');
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [selectedInvestor, selectedYear]);

  const bucketData = stats?.buckets[selectedBucket];

  const getBucketLabel = (key: BucketKey): string => {
    switch (key) {
      case 'election_of_directors':
        return 'Election of Directors';
      case 'executive_compensation':
        return 'Executive Compensation (Say on Pay)';
      case 'shareholder_proposals':
        return 'Shareholder Proposals';
    }
  };

  const formatMonth = (monthStr: string): string => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatCoverage = (coverage: string): string => {
    if (coverage === 'Q1') {
      return 'Q1 Coverage';
    }
    const quarterNum = parseInt(coverage.replace('Q', ''));
    return `Q1-Q${quarterNum} Coverage`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="px-5 pt-5">
        {/* Filters Section */}
        <div className="bg-white rounded-lg p-4 mb-5 border border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[15px] font-medium text-slate-700">
                  Investor
                </label>
                {stats?.data_coverage && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    {formatCoverage(stats.data_coverage)}
                  </span>
                )}
              </div>
              <TomSelect
                value={selectedInvestor?.toString() || ''}
                onChange={(e) => setSelectedInvestor(Number(e.target.value))}
                options={{
                  placeholder: 'Select an investor',
                }}
                className="w-full text-[15px]"
              >
                {investors.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.institution}
                  </option>
                ))}
              </TomSelect>
            </div>

            <div className="w-full sm:w-56">
              <label className="block text-[15px] font-medium text-slate-700 mb-2">
                Year
              </label>
              <TomSelect
                value={selectedYear.toString()}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                options={{
                  placeholder: 'Select a year',
                }}
                className="w-full text-[15px]"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </TomSelect>
            </div>
          </div>
        </div>

        {/* Sub-Tabs for Buckets */}
        {stats && !loading && (
          <div className="mb-5 border-b border-slate-200">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedBucket('election_of_directors')}
                className={`px-6 py-3 text-[15px] font-semibold transition-all duration-200 border-b-2 ${
                  selectedBucket === 'election_of_directors'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                Election of Directors
              </button>
              <button
                onClick={() => setSelectedBucket('executive_compensation')}
                className={`px-6 py-3 text-[15px] font-semibold transition-all duration-200 border-b-2 ${
                  selectedBucket === 'executive_compensation'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                Executive Compensation
              </button>
              <button
                onClick={() => setSelectedBucket('shareholder_proposals')}
                className={`px-6 py-3 text-[15px] font-semibold transition-all duration-200 border-b-2 ${
                  selectedBucket === 'shareholder_proposals'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                Shareholder Proposals
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center bg-white p-10 mt-3.5 border rounded-md">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
      )}

      {/* Stats Display */}
      {bucketData && !loading && (
        <div className="px-5 pb-5">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border border-blue-200">
              <h3 className="text-[15px] font-medium text-blue-700 mb-2">Total Votes</h3>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {bucketData.total_votes.toLocaleString()}
              </div>
              <p className="text-[15px] text-blue-700">
                Against/Withhold votes in this category
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg border border-green-200">
              <h3 className="text-[15px] font-medium text-green-700 mb-2">Companies</h3>
              <div className="text-3xl font-bold text-green-900 mb-1">
                {bucketData.companies.toLocaleString()}
              </div>
              <p className="text-[15px] text-green-700">
                Unique companies affected
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg border border-purple-200">
              <h3 className="text-[15px] font-medium text-purple-700 mb-2">Rationales</h3>
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {bucketData.explicit_rationales.toLocaleString()}
              </div>
              <p className="text-[15px] text-purple-700">
                Votes with specific stated rationale ({bucketData.coverage_percentage}% coverage)
              </p>
            </div>
          </div>

          {/* High-level Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">High-level summary</h3>
            </div>
            <p className="text-[15px] text-slate-700 leading-relaxed">
              {bucketData.high_level_summary}
            </p>
          </div>

          {/* Top Stated Reasons */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Top stated reasons</h3>
            </div>
            <div className="space-y-3">
              {bucketData.top_stated_reasons.map((reason, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[15px] font-medium text-slate-700">
                      {reason.reason}
                    </span>
                    <span className="text-[15px] font-semibold text-slate-900">
                      {reason.count} · {reason.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-primary/80 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${reason.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vote Type Breakdown */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
                <PieChart className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Vote type breakdown</h3>
            </div>
            <div className="space-y-3">
              {bucketData.vote_type_breakdown.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[15px] font-medium text-slate-700">
                      {item.vote_type}
                    </span>
                    <span className="text-[15px] font-semibold text-slate-900">
                      {item.count} · {item.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Companies - Hidden for now */}
          {/* <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Top companies by vote count</h3>
            </div>
            <div className="space-y-2">
              {bucketData.top_companies.map((company, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[15px] font-medium text-slate-700">
                    {idx + 1}. {company.company_name}
                  </span>
                  <span className="text-[15px] font-semibold text-slate-900">
                    {company.vote_count} votes
                  </span>
                </div>
              ))}
            </div>
          </div> */}

          {/* Monthly Distribution */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Monthly distribution</h3>
            </div>
            <div className="space-y-3">
              {bucketData.monthly_distribution.map((month, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[15px] font-medium text-slate-700">
                      {formatMonth(month.month)}
                    </span>
                    <span className="text-[15px] font-semibold text-slate-900">
                      {month.vote_count} votes
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-teal-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${Math.min(100, (month.vote_count / Math.max(...bucketData.monthly_distribution.map(m => m.vote_count))) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorOverview;
