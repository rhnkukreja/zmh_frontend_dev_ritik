import { CompanyData } from "@/types/company";
import { axiosInstance } from "../index";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { createDynamicURL } from "@/utils/helper";
import { BoardDirectorMembers, ProxyVotingRationale } from "@/types/dashboard";

class DashboardService {
  public async fetchCompanyByName(companyName?: string, exactUrl?: string, arrayKeyName?:string, currentFilters?: any): Promise<{
    results: CompanyData[];
  }> {
    let results = [];
    let url = "";
    if (companyName !== "") {
      if (exactUrl) {
        // Fix: Handle VDS European dropdown case with institution parameter and current filters
        if (exactUrl === "get_vds_european_dropdown_values/" || exactUrl === "get_vds_european_dropdown_values_with_filters/") {
          const params = new URLSearchParams();
          
          // Add institution_name
          const institutionName = currentFilters?.institution_name || ["BlackRock, Inc."];
          params.append('institution_name', JSON.stringify(institutionName));
          
          // Add company_name for search
          params.append('company_name', companyName);
          
          // Add all current filters if they have values
          if (currentFilters) {
            Object.entries(currentFilters).forEach(([key, value]) => {
              if (key !== 'institution_name' && key !== 'company_name') {
                if (Array.isArray(value) && value.length > 0) {
                  params.append(key, JSON.stringify(value));
                } else if (value && typeof value === 'string' && value.trim() !== '') {
                  params.append(key, value);
                }
              }
            });
          }
          
          url = `/get_vds_european_dropdown_values/?${params.toString()}`;
        } else {
          url = `/${exactUrl}${companyName}`;
        }
      } else {
        url = `/company/?${
          companyName ? `company_name=${companyName}&` : ""
        }index=${encodeURIComponent('["100"]')}&all=true`;
      }
      const response = await axiosInstance.get(url);
      if(exactUrl){
        if (exactUrl === "get_vds_european_dropdown_values/" || exactUrl === "get_vds_european_dropdown_values_with_filters/") {
          // Fix: For VDS European, the data comes in a different format
          results = arrayKeyName ? response.data[arrayKeyName] : response.data?.company;
          // Convert array of strings to objects with name property for consistency
          if (Array.isArray(results)) {
            results = results.map(company => ({
              name: company,
              id: company // Use name as ID for consistency
            }));
          }
        } else {
          results = arrayKeyName ? response.data[arrayKeyName] : response.data?.company;
        }
      }else {
        results = response.data;
      }
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

  public async putDocumentStarred(id: number, data:any): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.put(`institute_documents/${id}/`, data);

    return {
      result: response.data,
    };
  }

  public async getCompanyName(companyName?: any): Promise<{
    result: any;
  }> {
    const url = `/company/?${companyName ? `company_name=${companyName}&` : ""}index=${encodeURIComponent('["100"]')}&all=true`
    const response = await axiosInstance.get(
      createDynamicURL(url)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getNotifications(param): Promise<{
    result: any;
  }> {
    const url = "/notifications/"+param
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
