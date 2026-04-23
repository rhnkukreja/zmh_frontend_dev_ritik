export type GovernanceRow = {
  Category: string;
  "Yes/No": string | boolean;
  "Key Provisions": string;
};

export type CorporateGovernanceData = {
  company: string;
  ticker: string;
  coi_link?: string;
  coi_filing_date?: string;
  bylaws_link?: string;
  bylaws_filing_date?: string;
  profile: Record<string, GovernanceRow[]>;
};
