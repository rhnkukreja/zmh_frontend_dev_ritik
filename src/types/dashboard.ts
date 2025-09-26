export type Filer = {
  filer_id: number;
  filer_name: string;
  current_shares: number;
  source_date: string;
  source: string;
  percent_ownership: number;
};

export type CompanyData = {
  id: number;
  company_id: number | null;
  symbol: string | null;
  name: string | null;
  company_v1: string | null;
  stock_exchange: string | null;
  rbics_economy: string | null;
  closing_price: number | null;
  market_value: number | null;
  sales: number | null;
  exchng_ticker: string | null;
  factset_ind: string | null;
  gics_sector_name: string | null;
  sector_name: string | null;
  cusip: string | null;
  date_created: string;
  date_updated: string;
};

export type BoardDirectorMembers = {
  name: string;
  position: string;
  age: number;
  directorClass: string;
  dateFirstElected: number;
  isIndependent: boolean;
  committeeMemberships: string[];
  qualificationsAndExperience: string[];
  tenure: string;
  is_Color: boolean;
};

export type ProxyVotingRationale = {
  investor_name: string;
  proposal: string;
  voting_rationale: string;
};

export type ModulesCount = {
  case_studies: number;
  engagement_questions: number;
  engagement_details: number;
  shareholder_proposal: number;
  proxy_contest: boolean;
  proxy_contest_2024: boolean;
  proxy_contest_2025: boolean;
};
