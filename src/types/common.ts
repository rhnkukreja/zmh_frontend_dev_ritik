type BasePayload<TModule extends string, TInstitution extends string[]> = {
  module: TModule;
  institution?: TInstitution;
};

type EngagementQuestionsPayload = BasePayload<
  "Engagement Questions",
  string[]
> & {
  category: string;
};

type InvestorProfilePayload = BasePayload<"Investor Profile", string[]> & {
  region: string;
};

type VotingGuidelinesPayload = BasePayload<"Voting Guidelines", string[]> & {
  year: number;
};

type InstitutionPayload = BasePayload<"Institution", string[]> & {
  region: string;
};

type CompanyPayload = {
  module: "Company";
  company: string[];
};

export type PayloadModule =
  | EngagementQuestionsPayload
  | InvestorProfilePayload
  | VotingGuidelinesPayload
  | InstitutionPayload
  | CompanyPayload;
