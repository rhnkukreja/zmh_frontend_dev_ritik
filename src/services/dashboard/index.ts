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
    results: CompanyDashboard[];
  }>  {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return {
      results,
    };
  }

  public async fetchAGMSummaryDashboard(url: string): Promise<{results:any;
  }>  {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return {results};
  }

  public async fetchCaseStudyDashboard(url: string): Promise<{results:any;
  }>  {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return {results};
  }

  public async fetchVdsProxyDashboard(url: string): Promise<{results:any;
  }>  {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return {results};
  }

  public async fetchInvestorProfileDetails(url: string): Promise<{results:any;
  }>  {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return {results};
  }
}

export const dashboardService = new DashboardService();
