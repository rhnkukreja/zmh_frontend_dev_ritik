export type CompanyData = {
  id: number;
  company_id: string;
  symbol: string;
  name: string;
  company_v1: string;
  stock_exchange: string;
  rbics_economy: string;
  closing_price: string;
  market_value: string;
  sales: string;
  exchng_ticker: string;
  factset_ind: string;
  gics_sector_name: string;
  sector_name: string;
  cusip: string;
  date_created: string;
  date_updated: string;
  bulk_upload_file?: any;
  created_by_email: string;
};

export type CompanyFormData = {
  file: File | null;
};
