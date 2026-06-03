export interface TypesPeerAnalysis {
  id: number;
  company_name: string;
  company_ticker: string;
  company_sector: string;
  caspio_company_name: string;
  caspio_company_sector: string;
  caspio_company_country: string;
  company_country: string;
  institution_name: string;
  institution_logo_url: string;
  caspio_institution_name: string;
  year: number;
  gov_list: string | null;
  env_list: string | null;
  soc_list: string | null;
  company: number;
  institution: number;
}

export type FlterDropdown = {
  category: string[];
  country: string[];
  sector: string[];
  year: string[];
};


export interface InvestorData {
  institution__institution: string;
  unique_companies: number;
  environmental: number;
  social: number;
  governance: number;
  recent_engagement_doc: string | null;
}

export interface PieChartDataPeerAnalysis {
  name: string;
  value: number;
}


interface EngagementTopic {
  topic: string;
  count: number;
  percentage_gov_engagements?: number;
  percentage_env_engagements?: number;
  percentage_soc_engagements?: number;
  Share_of_all_unique_companies_engaged: number;
}

export interface TopEngagementTopics {
  gov: EngagementTopic[];
  env: EngagementTopic[];
  soc: EngagementTopic[];
}


