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

// ── In-memory cache for GovernanceProfileService (clears on page refresh) ────
const _gpCache = new Map<string, { data: any; ts: number }>();
const GP_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const gpCacheGet = (key: string): any => {
  const entry = _gpCache.get(key);
  if (entry && Date.now() - entry.ts < GP_CACHE_TTL) return entry.data;
  return null;
};
const gpCacheSet = (key: string, data: any) => _gpCache.set(key, { data, ts: Date.now() });

class GovernanceProfileService {
  public async getDropdowns(): Promise<{ categories: string[]; yesNo: string[] }> {
    const cached = gpCacheGet('dropdowns');
    if (cached) return cached;
    try {
      const response = await axiosInstance.get('/api/get_governance_profile_companies_dropdown_values/');
      const result = {
        categories: response.data?.Categories || [],
        yesNo: response.data?.Yes_No || [],
      };
      gpCacheSet('dropdowns', result);
      return result;
    } catch {
      return { categories: [], yesNo: [] };
    }
  }

  public async getCompanies(params: {
    category?: string[];
    yes_no?: string[];
    index?: string[];
    page?: number;
  }): Promise<any> {
    const parts: string[] = [];
    if ((params.category || []).length > 0)
      parts.push(`category=${encodeURIComponent(JSON.stringify(params.category))}`);
    if ((params.yes_no || []).length > 0)
      parts.push(`yes_no=${encodeURIComponent(JSON.stringify(params.yes_no))}`);
    if ((params.index || []).length > 0)
      parts.push(`index=${encodeURIComponent(JSON.stringify(params.index))}`);
    if (params.page && params.page > 1) parts.push(`page=${params.page}`);
    const cacheKey = `companies_${parts.join('&')}`;
    const cached = gpCacheGet(cacheKey);
    if (cached) return cached;
    try {
      const response = await axiosInstance.get(`/api/get_governance_profile_companies/?${parts.join('&')}`);
      gpCacheSet(cacheKey, response.data);
      return response.data;
    } catch {
      return { count: 0, results: [] };
    }
  }
}

export const reportsService = new ReportsService();
export const governanceProfileService = new GovernanceProfileService();