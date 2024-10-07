import { CompanyData } from "@/types/company";
import { axiosInstance } from "../index";
import { CompanyDashboard } from "@/stores/dashboardSlice";

class DashboardService {
  public async fetchCompanyByName(companyName: string): Promise<{
    results: CompanyData[];
  }> {
    const response = await axiosInstance.get(
      `/company/?company_name=${companyName}&all=true`
    );
    console.log({ response });
    const results = response.data;

    return {
      results: results,
    };
  }

  public async fetchCompanyDashboard(url: string): Promise<{
    results: CompanyDashboard[];
  }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return {
      results,
    };
  }

  public async fetchAGMSummaryDashboard(
    url: string
  ): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }
}

export const dashboardService = new DashboardService();
