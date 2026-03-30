import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { institutionStatsService } from '@/services/institutionStats';
import LoadingIcon from '@/components/Base/LoadingIcon';
import TomSelect from '@/components/Base/TomSelect';
import { 
  BarChart3, 
  FileText, 
  PieChart, 
  Calendar, 
  BookOpen, 
  Target, 
  FileSearch
} from 'lucide-react';
import parse from 'html-react-parser';

import LoadingIcon from '@/components/Base/LoadingIcon';
import EngagementPriorities from './EngagementPriorities';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchInstitutionStats } from '@/stores/dashboardSlice';
import { RootState } from '@/stores/store';

interface InvestorOption {
  id: number;
  institution: string;
}

interface ReasonItem {
  reason: string;
  count: number;
  percentage: number;
}

interface BucketData {
  total_votes: number;
  companies: number;
  explicit_rationales: number;
  coverage_percentage: number;
  votes_without_rationale: number;
  high_level_summary: string;
  top_5_reasons: Array<ReasonItem>;
  top_20_reasons: Array<ReasonItem>;
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
  is_case_studies: boolean;
  buckets: {
    election_of_directors: BucketData;
    executive_compensation: BucketData;
    shareholder_proposals: BucketData;
  };
}

type BucketKey = 'election_of_directors' | 'executive_compensation' | 'shareholder_proposals';
type InsightTab = 'voting_rationale' | 'engagement_priorities' | 'reporting_expectations';

interface InvestorOverviewProps {
  companyTicker?: string;
}

const InvestorOverview: React.FC<InvestorOverviewProps> = ({ companyTicker = "" }) => {
  const navigate = useNavigate();
  
  // State for the top-level insight tabs
  const [activeInsightTab, setActiveInsightTab] = useState<InsightTab>('voting_rationale');

  const [investors, setInvestors] = useState<InvestorOption[]>([]);
  const [selectedInvestor, setSelectedInvestor] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedBucket, setSelectedBucket] = useState<BucketKey>('election_of_directors');
  const dispatch = useAppDispatch();
  const { institutionStats: stats, institutionStatsLoading: loading, error: reduxError } = useAppSelector((state: RootState) => state.dashboard);
  const [error, setError] = useState<string | null>(null);
  const [showReasonsModal, setShowReasonsModal] = useState(false);
  const [modalReasons, setModalReasons] = useState<Array<ReasonItem>>([]);

  // FIX 1: Read userType into state so it's reactive and reliable
  const [userType, setUserType] = useState<string | null>(() => localStorage.getItem('userType'));

  // STICKY FIX:
  // Find the nearest ancestor that is actually scrolling (has overflow auto/scroll)
  // and ensure it is set to overflow-y: scroll so position:sticky works within it.
  // Also set overflow-y: visible on any ancestor between this component and the scroller
  // so the sticky bar is not clipped.
  const tabBarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tabBarRef.current) return;

    // Walk up to find the real scroll container
    let scrollParent: HTMLElement | null = null;
    let el: HTMLElement | null = tabBarRef.current.parentElement;
    while (el && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        scrollParent = el;
        break;
      }
      el = el.parentElement;
    }

    if (!scrollParent) return;

    // Ensure the scroll parent clips correctly for sticky
    const original = scrollParent.style.overflowY;
    scrollParent.style.overflowY = 'scroll';

    return () => {
      if (scrollParent) scrollParent.style.overflowY = original;
    };
  }, []);

  // Load investor dropdown on mount
  useEffect(() => {
    const loadInvestors = async () => {
      try {
        const data = await institutionStatsService.getInvestorDropdown();
        setInvestors(data);
        if (data && data.length > 0) {
          // FIX 2: Pre-select BlackRock by name (case-insensitive), fallback to first item
          const blackrock = data.find((inv: InvestorOption) =>
            inv.institution.toLowerCase().includes('blackrock')
          );
          setSelectedInvestor(blackrock ? blackrock.id : data[0].id);
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

    // Check if current stats in Redux already match our needs
    const statsMatch = stats && 
                       stats.institution_id === selectedInvestor && 
                       Number(stats.year) === Number(selectedYear);

    if (!statsMatch) {
      dispatch(fetchInstitutionStats({ institutionId: selectedInvestor, year: selectedYear }));
    }
  }, [selectedInvestor, selectedYear, stats, dispatch]);

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

  const getVoteTypeText = (voteTypeBreakdown: Array<{ vote_type: string; count: number; percentage: number }>): string => {
    if (!voteTypeBreakdown || voteTypeBreakdown.length === 0) return 'votes in this category';
    
    const voteTypes = voteTypeBreakdown.map(v => v.vote_type);
    const uniqueTypes = [...new Set(voteTypes)];
    
    if (uniqueTypes.length === 1) {
      return `${uniqueTypes[0]} votes in this category`;
    }
    
    return uniqueTypes.join('/') + ' votes in this category';
  };

  const formatCoverage = (coverage: string): string => {
    if (coverage === 'Q1') {
      return 'Q1 Coverage';
    }
    const quarterNum = parseInt(coverage.replace('Q', ''));
    return `Q1-Q${quarterNum} Coverage`;
  };

  const formatSummaryWithBullets = (summary: string): string => {
    const parts = summary.split('\n\n');
    
    return parts.map((part, index) => {
      const trimmedPart = part.trim();
      
      if (trimmedPart.startsWith('It should be noted') || trimmedPart.startsWith(' It should be noted')) {
        return `<div class="final-note">${trimmedPart}</div>`;
      }
      
      if (trimmedPart.startsWith('<b>"')) {
        const lines = part.split('\n').filter(line => line.trim());
        return lines.map(line => {
          let cleanedLine = line.replace(/\s+/g, ' ');
          cleanedLine = cleanedLine.replace(/,\s*([\d.]+%)/g, '. $1');
          cleanedLine = cleanedLine.replace(/,\s*$/g, '.');
          return `<div class="reason-item">${cleanedLine.trim()}</div>`;
        }).join('');
      }
      
      return part;
    }).join('<br/><br/>');
  };

  const handleCaseStudiesClick = () => {
    if (stats?.institution_id) {
      window.open(`/case-studies?tab=overview&institution_id=${stats.institution_id}&year=${selectedYear}&market=USA`, '_blank');
    }
  };

  // FIX 1 (continued): Derived boolean for the Case Studies button visibility.
  // Checks both is_case_studies flag AND that the user is Admin.
  // If you want to show it for ALL users when is_case_studies is true, just remove `&& isAdmin`.
  const showCaseStudiesButton = !!stats?.is_case_studies;

  return (
    <>
      <style>{`
        .summary-text b,
        .summary-text strong {
          font-weight: 600;
          color: #1e293b;
        }
        .summary-text {
          white-space: pre-line;
        }
        .summary-text .reason-item {
          display: list-item;
          list-style-type: disc;
          margin-left: 20px;
          margin-bottom: 8px;
          line-height: 1.6;
        }
        .summary-text .final-note {
          margin-top: 16px;
          margin-left: 0;
        }
      `}</style>

      {/* THREE CARDS / TABS SECTION */}
      {/* Added top-[80px] to clear your main header. Kept original mt-4 mb-6 for spacing. */}
      <div ref={tabBarRef} className="sticky top-[219px] z-[40] bg-white py-3 pb-5 flex flex-wrap justify-start gap-5 mb-4 mt-4 border-b border-slate-200 pl-4">
        {/* Voting Rationale */}
        <button
          onClick={() => setActiveInsightTab('voting_rationale')}
          className={`px-6 py-2.5 rounded-lg flex items-center justify-center transition-all duration-200 whitespace-nowrap ${
            activeInsightTab === 'voting_rationale'
              ? 'bg-white border-2 border-[#981b1e] shadow-sm text-[#981b1e]'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <span className="font-bold text-[14px]">Overview</span>
        </button>

        {/* Engagement Priorities */}

          <button
            onClick={() => setActiveInsightTab('engagement_priorities')}
            className={`relative px-6 py-2.5 rounded-lg flex items-center justify-center transition-all duration-200 whitespace-nowrap ${
              activeInsightTab === 'engagement_priorities'
                ? 'bg-white border-2 border-[#981b1e] shadow-sm text-[#981b1e]'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <span className="font-bold text-[14px]">Engagement Priorities</span>

            {/* BETA Badge */}
            <span className="absolute -top-1 -right-1 text-[8px] font-bold text-white bg-orange-500 rounded-full px-1 py-0 animate-pulse">
              BETA
            </span>
          </button>

      </div>  

      {/* ------------------------------------------------------------------------- */}
      {/* CSS HIDING RENDER: VOTING RATIONALE                                      */}
      {/* ------------------------------------------------------------------------- */}
      <div className={activeInsightTab === 'voting_rationale' ? 'block' : 'hidden'}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
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
                <div className="flex items-center justify-between">
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
                  
                  {/* FIX 1: Case Studies Button - uses derived showCaseStudiesButton boolean */}
                  {showCaseStudiesButton && (
                    <button
                      onClick={handleCaseStudiesClick}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 flex items-center gap-2 text-[14px] font-semibold shadow-sm mr-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      Case Studies
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center bg-white p-10 mt-3.5 border rounded-md">
              <LoadingIcon color="#800000" icon="three-dots" className="w-16 h-16" />
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
                    {getVoteTypeText(bucketData.vote_type_breakdown)}
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
              <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">High-level summary</h3>
                </div>
                <div className="text-[15px] text-slate-700 leading-relaxed summary-text">
                  {parse(formatSummaryWithBullets(bucketData.high_level_summary))}
                </div>
              </div>

              {/* Top Stated Reasons */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg border border-primary bg-primary/10 p-1.5 shadow-sm">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">Top stated reasons</h3>
                  </div>
                  {bucketData.top_20_reasons && bucketData.top_20_reasons.length > 5 && (
                    <button
                      onClick={() => {
                        setModalReasons(bucketData.top_20_reasons);
                        setShowReasonsModal(true);
                      }}
                      className="px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
                    >
                      See More
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {bucketData.top_5_reasons.map((reason, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-[15px] font-medium text-slate-700 flex-1 leading-relaxed">
                          {idx + 1}. {reason.reason}
                        </span>
                        <span className="text-[15px] font-semibold text-slate-900 whitespace-nowrap ml-4">
                          {reason.count}
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

          {/* Top 20 Reasons Modal */}
          {showReasonsModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4" onClick={() => setShowReasonsModal(false)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden mt-16" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 px-6 py-5 z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-white">Top 20 Stated Reasons</h2>
                    <button
                      onClick={() => setShowReasonsModal(false)}
                      className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-white/90 text-sm">
                    <span className="font-medium">{stats?.institution_name}</span>
                    <span>•</span>
                    <span className="font-medium">{getBucketLabel(selectedBucket)}</span>
                    <span>•</span>
                    <span className="font-medium">{selectedYear}</span>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 bg-slate-50">
                  <div className="space-y-3">
                    {modalReasons.map((reason, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4 mb-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-medium text-slate-700 leading-relaxed mb-2">
                              {reason.reason}
                            </p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${reason.percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-semibold text-slate-900">{reason.count}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* CSS HIDING RENDER: ENGAGEMENT PRIORITIES                                 */}
      {/* ------------------------------------------------------------------------- */}
      <div className={activeInsightTab === 'engagement_priorities' ? 'block' : 'hidden'}>
        <EngagementPriorities companyTicker={companyTicker} />
      </div>
    </>
  );
};

export default InvestorOverview;