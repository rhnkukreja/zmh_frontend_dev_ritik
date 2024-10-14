type BasePayload<TModule extends string, TInstitution extends string[]> = {
  module: TModule;
  institution?: TInstitution;
};

type EngagementQuestionsPayload = BasePayload<
  "Engagement Questions",
  string[]
> & {
  institution: string[];
  category: string[];
  year: string[];
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
  global_search: string[];
};

export type ShareholderProposalPayload = {
  module: "Shareholder Proposal";
  global_search?: string[];
  proponent: string[];
  category: string[];
  sub_category: string[];
  year: string[];
  status: string[];
  keyword: string;
};

type CaseStudiesPayload = {
  module: "Case Studies";
  global_search: string[];
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
  global_search: string[];
  institution: string[];
};
type GlobalSearchPayload = {
  module: "Global Search";
  id: number;
  company: string;
};

export type PayloadModule =
  | GlobalSearchPayload
  | EngagementQuestionsPayload
  | InvestorProfilePayload
  | VotingGuidelinesPayload
  | InstitutionPayload
  | CompanyPayload
  | ShareholderProposalPayload
  | CaseStudiesPayload
  | PeerAnalysisPayload;

export interface FilterObject {
  [key: string]: string | string[] | undefined;
}
