import { axiosInstance } from "../index";

class DashboardService {
  public async fetchCompanyByName(companyName: string): Promise<{
    results: any;
  }> {
    const response = await axiosInstance.get(
      `/company/?company_name=${companyName}`
    );
    return {
      results: response.data,
    };
  }

  public async fetchCompanyDashboard(ticker: string): Promise<{
    results: any;
  }> {
    const response = await axiosInstance.get(
      `/company-dashboard/?ticker=${ticker}`
    );
    return {
      results: response.data,
    };
  }
}

export const dashboardService = new DashboardService();
