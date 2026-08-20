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
  region: string[];
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
  proponent_name: string[];
  category: string[];
  sub_category: string[];
  sector: string[];
  year: string[];
  status: string[];
  keyword: string;
  no_shareholder_proposal: boolean;
  approved: boolean;
  is_correct: boolean;
  company_status: boolean;
  head_support: boolean;
  nl_exist: boolean;
  index: string;
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
  approval_status: string;
  caspio_company_name: [];
  index: string;
};

type PeerAnalysisPayload = {
  module: "Peer Analysis";
  global_search: string[];
  institution: string[];
  year: string[];
  category: string[];
  country: string[];
  sector: string[];
  index: string;
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

export type InformationType =
  | "Investor Profile"
  | "Proxy Voting Guidelines"
  | "Voting Data";

export interface RequestAdditionalDataForm {
  name: string;
  type_of_information: InformationType[];
  comments: string;
}

export interface ContactUsForm {
  issue: string;
}

export type HelpFormData = RequestAdditionalDataForm | ContactUsForm;

export interface RequestAdditionalData extends RequestAdditionalDataForm {
  created_by: string | null;
}

export interface ContactUsAdditionalData extends ContactUsForm {
  created_by: string | null;
}
