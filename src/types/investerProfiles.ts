export interface KeyContact {
  name: string;
  image: string;
  linkedin: string;
  designation: string;
}

export interface VotingGuidelineDoc {
  year: string;
  link: string;
  policy_type: string | null;
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
  institution: string | null;
  institution_id: string | null;
  institution_name?: string | null;
  active: boolean;
  engagement_priorities: string | null;
  voting_guidelines_summary: string | null;
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
  logo_url?: string;
  investor_profile_id?: number | null;
  proxy_voting_key_changes?: string | null;
  proxy_voting_guidelines_link?: string | null;
  is_document?: boolean;
  voting_guideline_docs?: VotingGuidelineDoc[];
  whale_wisdom_filer_id?: number;
  uploaded_time_caspio?: string;
  logo_file?: string | null;
  region?: string;
  unpri_signatory?: boolean;
  proxy_advisor_influence?: string;
  investor_type?: string;
  contact?: string | null;
  email?: string | null;
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
  summary?: string;
};
