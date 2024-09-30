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
  voting_guidelines_pdf: string | null;
  voting_guidelines_pdf_url: string | null;
  active: boolean;
  date_created: string;
  date_updated: string;
  institution_logo_url: string;
};
