export interface TypesPeerAnalysis {
  id: number;
  company_name: string;
  company_ticker: string;
  company_sector: string;
  caspio_company_name: string;
  caspio_company_sector: string;
  caspio_company_country: string;
  institution_name: string;
  institution_logo_url: string;
  caspio_institution_name: string;
  year: number;
  gov_list: string | null;
  env_list: string | null;
  soc_list: string | null;
  company: number;
  institution: number;
}

export type FlterDropdown = {
  category: string[];
  country: string[];
  sector: string[];
  year: string[];
};
