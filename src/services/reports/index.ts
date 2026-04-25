import { axiosInstance } from "../index";
import { CompanyReportData } from "@/types/companyReport";

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
      // Normalize tickers to uppercase for consistent comparison
      const normalizedTickers = tickers.map(t => t.toUpperCase());
      
      // Format tickers array as expected by the API
      const tickersParam = JSON.stringify(normalizedTickers);
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      console.log("API Request with tickers:", normalizedTickers);
      
      const response = await axiosInstance.get(
        `/report/get_multiple_tickers_ownership/?tickers=${encodeURIComponent(tickersParam)}&_t=${timestamp}`
      );
      
      // Return only data for the requested tickers, with strict matching
      let filteredData = [];
      if (Array.isArray(response.data)) {
        console.log("API returned tickers:", response.data.map((c: CompanyOwnership) => c.ticker));
        filteredData = response.data.filter((company: CompanyOwnership) => 
          normalizedTickers.includes(company.ticker.toUpperCase())
        );
        console.log("Filtered to tickers:", filteredData.map((c: CompanyOwnership) => c.ticker));
      }
        
      return filteredData;
    } catch (error) {
      console.error("Error fetching ownership data:", error);
      throw error;
    }
  }

  /**
   * Generate a comprehensive company report
   * @param ticker - Company ticker symbol
   * @returns Company report data
   */
  public async generateCompanyReport(ticker: string): Promise<CompanyReportData> {
    try {
      const normalizedTicker = ticker.toUpperCase();
      const timestamp = new Date().getTime();
      
      const response = await axiosInstance.get(
        `/company_report/?ticker=${encodeURIComponent(normalizedTicker)}`
      );
      
      return response.data;
    } catch (error) {
      console.error("Error generating company report:", error);
      throw error;
    }
  }
}

export const reportsService = new ReportsService();