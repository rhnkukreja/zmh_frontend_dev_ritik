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
  institution: number;
  institution_name: string;
  active: boolean;
  engagement_priorities: string;
  voting_guidelines_summary: string;
  voting_guidelines_link: string;
  reporting_expectations: string;
  esg_integration_process: string;
  references: string;
  key_contacts: KeyContact[];
  date_created: string;
  date_updated: string;
}

export type AddNewInvesterType = {
  engagement_priorities: string;
  voting_guidelines_summary: string;
  voting_guidelines_link: string;
  reporting_expectations: string;
  esg_integration_process: string;
  references: string;
  active: string;
  key_contacts?: any;
  institution?: number;
};
