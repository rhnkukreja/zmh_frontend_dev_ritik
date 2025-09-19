import { axiosInstance } from "../index";

export interface OwnershipData {
  filer_id: number;
  institution_name: string;
  percent_ownership: string;
  status: boolean;
}

export interface CompanyOwnership {
  company_name: string;
  ticker: string;
  ownership_data: OwnershipData[];
}

class ReportsService {
  public async getMultipleTickersOwnership(tickers: string[]): Promise<CompanyOwnership[]> {
    try {
      // Format tickers array as expected by the API
      const tickersParam = JSON.stringify(tickers);
      const response = await axiosInstance.get(
        `/report/get_multiple_tickers_ownership/?tickers=${encodeURIComponent(tickersParam)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching ownership data:", error);
      throw error;
    }
  }
}

export const reportsService = new ReportsService();