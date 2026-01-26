export type ProxyVotingGuideline = {
  id: number;
  proxy_voting_guidelines_id: string;
  institution: number;
  institution_name: string;
  year: string;
  category?: string;
  sub_category?: string | null;
  section?: string | null;
  policy_guidelines?: string | null;
  policy_type?: string | null;
  voting_guidelines_pdf: string | null;
  voting_guidelines_pdf_url: string | null;
  active: boolean;
  date_created: string;
  date_updated: string;
  institution_logo_url: string;
  voting_guidelines_pdf_name: string;
  is_search?: boolean;
};

export type ProxyVotingSummaryType = {
  category: string;
  created_by?: Date | null;
  date_created?: Date | null;
  date_updated?: Date | null;
  id: number;
  institution_name: string;
  paragraph: string;
  mitigating_factors: string;
  proxy_voting_guidelines: number;
  sub_category: string;
  updated_by?: Date | null;
  year?: string;
};
