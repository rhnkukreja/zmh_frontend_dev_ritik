export interface KeyContact {
  name: string;
  image: string;
  linkedin: string;
  designation: string;
}

export interface EngagementPriorities {
  climateChange: string;
  corporateGovernance: string;
  transparencyAndDisclosure: string;
  socialIssues: string;
}

export interface VotingGuidelines {
  independenceOfBoard: string;
  independenceOfChair: string;
  executiveChair: string;
  boardSize: string;
  overboarding: string;
}

export interface ReportingExpectations {
  climateRelatedReporting: string;
  generalESGDisclosures: string;
  specificRegionalAndRegulatoryReporting: string;
}

export interface ESGIntegrationProcess {
  internalESGIntegrationProcesses: string;
  externalESGResearchAndDataProviders: string;
  proprietaryESGMetricsAndEvaluationFrameworks: string;
}

export interface InvestersProfile {
  id: number;
  institution: number | null;
  institution_name: string | null;
  active: boolean;
  engagement_priorities: string | null;
  voting_guidelines_summary: string | null;
  // voting_guidelines_link: string | null;
  voting_guidelines: string | null;
  reporting_expectations: string | null;
  esg_integration_process: string | null;
  references: string | null;
  key_contacts?: KeyContact[] | null;
  date_created: string;
  date_updated: string;
  file?: any | null;
  checklist?: string | null;
  other?: string | null;
  created_by?: number;
  created_by_email?: string;
  updated_by?: string | null;
  equity_firm_name?: string | null;
  specific_expectations?: string | null;
  institution_logo_url?: string;
}

export type AddNewInvesterType = {
  engagement_priorities: string;
  voting_guidelines: string;
  reporting_expectations: string;
  esg_integration_process: string;
  references: string;
  active: string;
  key_contacts?: any;
  institution?: string;
};
