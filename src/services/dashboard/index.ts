import { CompanyData } from "@/types/company";
import { axiosInstance } from "../index";
import { CompanyDashboard } from "@/stores/dashboardSlice";

class DashboardService {
  public async fetchCompanyByName(companyName?: string): Promise<{
    results: CompanyData[];
  }> {
    const url = `/company/?${
      companyName ? `company_name=${companyName}&` : ""
    }all=true`;
    const response = await axiosInstance.get(url);
    console.log({ response });
    const results = response.data;

    return {
      results: results,
    };
  }

  public async fetchCompanyDashboard(url: string): Promise<{
    results: CompanyDashboard[], percent: string
  }> {
    const response = await axiosInstance.get(url);
    const {holdings_data, total_percent_ownership} = response.data;
    return {
      results: holdings_data,
      percent: total_percent_ownership
    };
  }

  public async fetchAGMSummaryDashboard(
    url: string
  ): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchCaseStudyDashboard(url: string): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchVdsProxyDashboard(url: string): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchInvestorProfileDetails(
    url: string
  ): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchWhatNewNotification(url: string): Promise<{ results: any, count: number }> {
    const response = await axiosInstance.get(url);
    const {results, count} = response.data;
    return { results, count };
  }
}

export const dashboardService = new DashboardService();
