import { CompanyData } from "@/types/company";
import { axiosInstance } from "../index";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { AGMSummary } from "@/types/AGMSummary";

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

  public async fetchCompanyDashboard(url: string): Promise<{
    count: number;
    results: CompanyDashboard[];
  }>  {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }

  public async fetchAGMSummaryDashboard(url: string): Promise<{
    count: number;
    results: AGMSummary;
  }>  {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }
}

export const dashboardService = new DashboardService();
