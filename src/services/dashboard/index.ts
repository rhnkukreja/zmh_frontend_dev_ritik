import { CompanyData } from "@/types/company";
import { axiosInstance } from "../index";
import { CompanyDashboard } from "@/stores/dashboardSlice";

class DashboardService {
  public async fetchCompanyByName(companyName: string): Promise<{
    count: number;
    results: CompanyData[];
  }> {
    const response = await axiosInstance.get(
      `/company/?company_name=${companyName}`
    );
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }

  public async fetchCompanyDashboard(ticker: string): Promise<{
    count: number;
    all_holders_data: CompanyDashboard[];
  }>  {
    const response = await axiosInstance.get(
      `/company-dashboard/?ticker=${ticker}`
    );
    const { count, all_holders_data } = response.data;
    return {
      count,
      all_holders_data,
    };
  }
}

export const dashboardService = new DashboardService();
