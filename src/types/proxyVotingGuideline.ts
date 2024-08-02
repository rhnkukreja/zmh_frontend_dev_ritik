export type ProxyVotingGuideline = {
  id: number;
  proxy_voting_guidelines_id: string;
  institution: number;
  year: string;
  category: string;
  sub_category: string;
  section: string;
  policy_guidelines: string;
  voting_guidelines_pdf: string | null;
  voting_guidelines_pdf_url: string;
  active: boolean;
  date_created: string;
  date_updated: string;
};
