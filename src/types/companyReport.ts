// Company Report Types
// API response structure for company report generation

export interface FinnhubData {
  company_name: string;
  ticker: string;
  exchange: string;
  industry: string;
  market_cap?: string;
  country?: string;
  ipo_date?: string;
  logo_url?: string;
  website?: string;
}

export interface PriceReturnData {
  start_date: string;
  end_date: string;
  start_price: number;
  end_price: number;
  pct_return: number;
}

export interface SharePricePerformanceData {
  [key: string]: {
    "1yr"?: PriceReturnData;
    "3yr"?: PriceReturnData;
    "5yr"?: PriceReturnData;
    "10yr"?: PriceReturnData;
  } | string | undefined;
  data_as_of?: string;
}

export interface PercentOwnershipData {
  filer_id?: number;
  institution_name?: string;
  institution__institution?: string;
  institution_logo_url?: string;
  percent_ownership?: string;
  esg_integration?: boolean;
  unpri_signatory?: boolean;
  proxy_advisor_influence?: string;
  voted_against_directors?: any[];
  voted_against_say_on_pay?: boolean | any[];
}

export interface VotingItem {
  institution_name: string;
  vote: 'For' | 'Against' | 'Abstain' | 'Withheld' | null;
  percentage?: string;
}

export interface YearlyVotingData {
  total_percent?: string;
  volume?: string;
  voted_against_sop_investors?: any[];
  voted_for_sp_investors?: any[];
  [key: string]: any;
}

export interface ChartDataItem {
  year: string;
  category: string;
  total_for_percentage: string;
  total_against_percentage: string;
  voted_for: VotingItem[];
  voted_against: VotingItem[];
}

export interface ChartsData {
  election_of_directors?: Record<string, YearlyVotingData> | ChartDataItem[];
  say_on_pay?: Record<string, YearlyVotingData> | ChartDataItem[];
  shareholder_proposals?: Record<string, YearlyVotingData> | ChartDataItem[];
  ratification_of_auditor?: Record<string, YearlyVotingData> | ChartDataItem[];
}

export interface EngagementStatsData {
  year?: string | number;
  institution_name?: string;
  institution__institution?: string;
  company__name?: string;
  engagement_topics?: string[];
  engagement_type?: string;
  env_list?: string;
  soc_list?: string;
  gov_list?: string;
}

export interface EngagementStatsExGlobalData {
  year: string;
  institution_name: string;
  engagement_topics: string[];
  engagement_type?: string;
  company_name?: string;
}

export interface SPData {
  proxy_season: string;
  proponent: string;
  proposal_title: string;
  outcome_percentage: string;
  major_institutions_vote: {
    institution_name: string;
    vote: 'For' | 'Against' | null;
  }[];
}

export interface CompanyReportData {
  finnhub_data: FinnhubData;
  share_price_performance_data: SharePricePerformanceData;
  percent_ownership_data: PercentOwnershipData[];
  charts_data: ChartsData;
  engagement_stats_data: EngagementStatsData[];
  engagement_stats_ex_global_data: EngagementStatsExGlobalData[];
  sp_data: SPData[];
  data_as_of: string;
}
