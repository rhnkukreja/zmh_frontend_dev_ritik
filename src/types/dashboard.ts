export type Filer = {
  filer_id: number;
  filer_name: string;
  current_shares: number;
  source_date: string;
  source: string;
  percent_ownership: number;
};

export type CompanyData = {
  id: number;
  company_id: number | null;
  symbol: string | null;
  name: string | null;
  company_v1: string | null;
  stock_exchange: string | null;
  rbics_economy: string | null;
  closing_price: number | null;
  market_value: number | null;
  sales: number | null;
  exchng_ticker: string | null;
  factset_ind: string | null;
  gics_sector_name: string | null;
  sector_name: string | null;
  cusip: string | null;
  date_created: string;
  date_updated: string;
};
