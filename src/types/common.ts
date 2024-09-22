type BasePayload<TModule extends string, TInstitution extends string[]> = {
  module: TModule;
  institution?: TInstitution;
};

type EngagementQuestionsPayload = BasePayload<
  "Engagement Questions",
  string[]
> & {
  category: string[];
};

type InvestorProfilePayload = BasePayload<"Investor Profile", string[]> & {
  region: string[];
};

type VotingGuidelinesPayload = BasePayload<"Voting Guidelines", string[]> & {
  year: string[];
};

type InstitutionPayload = BasePayload<"Institution", string[]> & {
  region: string[];
};

type CompanyPayload = {
  module: "Company";
  company: string[];
};

type ShareholderProposalPayload = {
  module: "Shareholder Proposal";
  company: string[];
  proponent: string[];
  category: string[];
  sub_category: string[];
  year: string[];
  status: string[];
  keyword: string;
};

type CaseStudiesPayload = {
  module: "Case Studies";
  company: string[];
  institution: string[];
  market: string[];
  sector: string[];
  themes: string[];
  proposal_type: string[];
  vote: string[];
  year: string[];
  keyword: string;
};

type PeerAnalysisPayload = {
  module: "Peer Analysis";
  company: string[];
  institution: string[];
  country: string[];
  sector: string[];
  category: string[];
  year: string[];
};

export type PayloadModule =
  | EngagementQuestionsPayload
  | InvestorProfilePayload
  | VotingGuidelinesPayload
  | InstitutionPayload
  | CompanyPayload
  | ShareholderProposalPayload
  | CaseStudiesPayload
  | PeerAnalysisPayload;
