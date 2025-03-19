import { CompanyData } from "@/types/company";
import { axiosInstance } from "../index";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { createDynamicURL } from "@/utils/helper";
import { BoardDirectorMembers, ProxyVotingRationale } from "@/types/dashboard";

class DashboardService {
  public async fetchCompanyByName(companyName?: string): Promise<{
    results: CompanyData[];
  }> {
    let results = [];
    if (companyName !== "") {
      const url = `/company/?${
        companyName ? `company_name=${companyName}&` : ""
      }all=true`;
      const response = await axiosInstance.get(url);
      results = response.data;
    }

    return {
      results: results,
    };
  }

  public async fetchInstitutionByName(
    institutionValue?: string,
    companyGlobalSearchName?: string
  ): Promise<{
    results: CompanyData[];
  }> {
    let results = {institution: []};
    if (institutionValue !== "") {
      const url = `/get_npx_dropdown_values/?global_search=${companyGlobalSearchName}&institution_name=${institutionValue}`;
      const response = await axiosInstance.get(url);
      results = response.data;
    }

    return {
      results: results?.institution,
    };
  }

  public async fetchCompanyDashboard(url: string): Promise<{
    results: any;
  }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchAGMSummaryDashboard(
    url: string
  ): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchCaseStudiesTopProxyContext(url: string): Promise<{
    count: number;
    results: any[];
  }> {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
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

  public async fetchProxyContestReleaseDashboard(
    url: string
  ): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchProxyTopFiveContestDashboard(
    url: string
  ): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchVdsProxyAllInvestor(
    url: string
  ): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchNpxProxyDashboard(
    url: string
  ): Promise<{ results: any; count: number }> {
    const response = await axiosInstance.get(url);
    const { results, count } = response.data;
    return { results, count };
  }

  public async fetchInvestorProfileDetails(
    url: string
  ): Promise<{ results: any }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    return { results };
  }

  public async fetchWhatNewNotification(
    url: string
  ): Promise<{ results: any; count: number }> {
    const response = await axiosInstance.get(url);
    const { results, count } = response.data;
    return { results, count };
  }

  public async getNPXDropdownValues(): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(`/get_npx_dropdown_values/`);
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getInstitution(paramFilter?: any): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(
      createDynamicURL(`/get_vds_dropdown_values/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getModulesCount(paramFilter?: any): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(
      createDynamicURL(`/get_modules_count/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getDynamicNPXDropdownValues(paramFilter?: any): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(
      createDynamicURL(`/get_npx_dropdown_values/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getBoardDirectorMembers(ticker: string): Promise<{
    result: BoardDirectorMembers[];
  }> {
    const response = await axiosInstance.get(
      `/board_members/?ticker=${ticker}`
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getProxyVotingRationale(url: string): Promise<{
    result: ProxyVotingRationale[];
  }> {
    const response = await axiosInstance.get(url);

    return {
      result: response.data,
    };
  }

  public async getCompanyName(companyName?: any): Promise<{
    result: any;
  }> {
    const url = `/company/?${companyName ? `company_name=${companyName}&` : ""}all=true`
    const response = await axiosInstance.get(
      createDynamicURL(url)
    );
    const result = response.data;
    return {
      result: result,
    };
  }
}

export const dashboardService = new DashboardService();
