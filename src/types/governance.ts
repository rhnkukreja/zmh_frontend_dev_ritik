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

export type DocumentItem = {
  name: string;
  date?: string;
  link?: string;
};

export type GovernanceDocument = {
  proxy_link?: string;
  filing_date?: string;
};

export type CorporateGovernanceDataWithDocs = CorporateGovernanceData & {
  certificate_of_incorporation?: GovernanceDocument[];
  bylaws?: GovernanceDocument[];
};