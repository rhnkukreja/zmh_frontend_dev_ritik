import { CompanyData } from "@/types/company";
import { axiosInstance } from "../index";
import { CompanyDashboard } from "@/stores/dashboardSlice";
import { createDynamicURL } from "@/utils/helper";
import { BoardDirectorMembers, ProxyVotingRationale } from "@/types/dashboard";
import { baseURL } from "@/constant";

class DashboardService {
  public async fetchCompanyByName(companyName?: string, exactUrl?: string, arrayKeyName?: string, currentFilters?: any): Promise<{
    results: CompanyData[];
  }> {
    let results = [];
    let url = "";

    const appendCurrentFilters = (params: URLSearchParams, filters?: any) => {
      if (!filters) return;

      const appendArray = (key: string, value: any) => {
        if (Array.isArray(value) && value.length > 0) {
          params.append(key, JSON.stringify(value));
        }
      };

      appendArray('year', filters?.year);
      appendArray('sector', filters?.sector);
      appendArray('themes', filters?.themes);
      appendArray('proposal_type', filters?.proposal_type);
      appendArray('vote', filters?.vote);
      appendArray('index', filters?.index);
      appendArray('institution_name', filters?.institution_name);

      if (Array.isArray(filters?.market) && filters.market.length > 0) {
        params.append('country', JSON.stringify(filters.market));
      }

      if (filters?.approval_status) {
        params.append('approval_status', filters.approval_status);
      }

      if (filters?.caspio_company_name) {
        params.append('caspio_company_name', filters.caspio_company_name);
      }
    };

    if (companyName !== "") {
      if (exactUrl) {
        // Handle VDS European dropdown case
        if (exactUrl === "get_vds_european_dropdown_values/" || exactUrl === "get_vds_european_dropdown_values_with_filters/") {
          if (companyName === "a") {
            // Default load: use company endpoint with company_name=a&index=["100"]
            const params = new URLSearchParams();
            params.append('company_name', 'a');
            params.append('index', JSON.stringify(["100"]));
            url = `/company/?${params.toString()}`;
          } else {
            // Search: use get_vds_european_dropdown_values with institution and search term
            const params = new URLSearchParams();
            params.append('company_name', companyName);

            // Add institution_name from currentFilters
            if (currentFilters?.institution_name) {
              params.append('institution_name', JSON.stringify(currentFilters.institution_name));
            } else {
              params.append('institution_name', JSON.stringify(["BlackRock, Inc."]));
            }

            url = `/get_vds_european_dropdown_values/?${params.toString()}`;
          }
        } else {
          url = `/${exactUrl}${companyName}`;
        }
      } else {
        // Refactored: Use proper URL construction with URLSearchParams for consistency
        const params = new URLSearchParams();
        if (companyName) {
          params.append('company_name', companyName);
        }

        // For default load (when companyName is "a"), add fallback index parameter if no index filter is selected
        if (companyName === "a" && !(Array.isArray(currentFilters?.index) && currentFilters.index.length > 0)) {
          params.append('index', JSON.stringify(["100"]));
        }

        params.append('all', 'true');

        // Add selected filter context so company suggestions are relevant to current filter panel state
        appendCurrentFilters(params, currentFilters);

        // Fallback country for initial broad load only
        if (!(Array.isArray(currentFilters?.market) && currentFilters.market.length > 0)) {
          params.append('country', JSON.stringify(['USA', 'Canada']));
        }

        url = `/company/?${params.toString()}`;
      }
      const response = await axiosInstance.get(url);
      if (exactUrl) {
        if (exactUrl === "get_vds_european_dropdown_values/" || exactUrl === "get_vds_european_dropdown_values_with_filters/") {
          if (companyName === "a") {
            // For default load using company endpoint, data comes as results array
            results = response.data?.results || [];
            // Convert company objects to the expected format
            if (Array.isArray(results)) {
              results = results.map(company => ({
                name: company.name || company.company_v1 || company,
                id: company.id || company.name || company
              }));
            }
          } else {
            // For search using get_vds_european_dropdown_values, data comes as company_name array
            results = response.data?.company_name || response.data?.company || [];
            // Convert array of strings to objects with name property for consistency
            if (Array.isArray(results)) {
              results = results.map(company => ({
                name: company,
                id: company // Use name as ID for consistency
              }));
            }
          }
        } else {
          results = arrayKeyName ? response.data[arrayKeyName] : response.data?.company;
        }
      } else {
        results = response.data?.results || response.data;
      }
    }

    return {
      results: results,
    };
  }

  public async fetchInstitutionByName(
    institutionValue?: string,
    companyGlobalSearchName?: string,
    year?: string
  ): Promise<{
    results: CompanyData[];
  }> {
    let results: any = { all_institution: [] };
    if (institutionValue !== "") {
      // Use URLSearchParams to build the URL properly
      const params = new URLSearchParams();

      // Add global_search parameter
      if (companyGlobalSearchName) {
        params.append('global_search', companyGlobalSearchName);
      }

      // Always add year parameter for NPX-related requests
      // Get year from parameter or URL or default to 2024
      const yearParam = year ||
        (window.location.search.includes('year=') ?
          new URLSearchParams(window.location.search).get('year') : '2024');

      // Always add year parameter
      params.append('year', yearParam);

      // Add the selected institution to get relevant data for other fields
      // Only add institution_name parameter if this is a search with actual input
      if (institutionValue && institutionValue !== "a" && institutionValue.trim() !== "") {
        // For search queries, pass the search term as institution_name
        params.append('institution_name', institutionValue);
      }

      const url = `/get_npx_dropdown_values/?${params.toString()}`;
      console.log("fetchInstitutionByName URL:", url);
      const response = await axiosInstance.get(url);
      results = response.data;
    }

    return {
      // When user is actively searching (institutionValue has content), use 'institution' key for search results
      // When loading all institutions (no search term or placeholder "a"), use 'all_institution' key
      results: (institutionValue && institutionValue !== "a" && institutionValue.trim() !== "")
        ? (results?.institution || [])
        : (results?.all_institution || []),
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

  public async getCompanyOverview(url: string): Promise<any> {
    const response = await axiosInstance.get(url);
    return response.data;
  }

  public async getCompanyOverviewYears(companyId: number | string): Promise<number[]> {
    const response = await axiosInstance.get(
      `${baseURL}/company_report/key_findings/years/?company_id=${companyId}`
    );

    const rawYears = Array.isArray(response.data)
      ? response.data
      : response.data?.years ?? response.data?.result ?? [];

    if (!Array.isArray(rawYears)) {
      return [];
    }

    const years = rawYears
      .map((year: unknown) => Number(year))
      .filter((year: number) => Number.isFinite(year));

    return Array.from(new Set(years)).sort((a, b) => b - a);
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
    // Ensure year parameter is included
    let finalUrl = url;
    if (!url.includes('year=')) {
      // Get year from URL or use default
      const urlParams = new URLSearchParams(window.location.search);
      const yearParam = urlParams.get('year') || '2024';

      // Add year parameter to the URL
      finalUrl = url.includes('?') ? `${url}&year=${yearParam}` : `${url}?year=${yearParam}`;
    }

    console.log("NPX Dashboard API call:", finalUrl);
    const response = await axiosInstance.get(finalUrl);
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
    // Make sure we have the year parameter
    const enhancedFilter = { ...paramFilter };

    if (!enhancedFilter.year) {
      // Get year from URL or use default
      const urlParams = new URLSearchParams(window.location.search);
      const yearParam = urlParams.get('year') || '2024';
      enhancedFilter.year = yearParam;
    }

    const url = createDynamicURL(`/get_npx_dropdown_values/`, enhancedFilter);
    console.log("getDynamicNPXDropdownValues URL:", url);

    const response = await axiosInstance.get(url);
    const result = response.data;

    console.log("getDynamicNPXDropdownValues response:", result);
    return {
      result: result,
    };
  }

  public async getNPXPivotTableDropdown(params: {
    company_id: string | number;
    year: string | number;
    institution_name?: string[];
  }): Promise<{ result: any }> {
    const queryParams: Record<string, any> = {
      company_id: String(params.company_id),
      year: String(params.year),
    };

    if (params.institution_name) {
      queryParams.institution_name = params.institution_name;
    }

    const response = await axiosInstance.get(
      createDynamicURL(`/api/npx_pivot_table_dropdown/`, queryParams)
    );

    return {
      result: response.data,
    };
  }

  public async getNPXPivotTable(params: {
    company_id: string | number;
    year: string | number;
    institution_name?: string[];
    fund_name?: string[];
    proposal_text?: string[];
  }): Promise<{ result: any }> {
    const queryParams: Record<string, any> = {
      company_id: String(params.company_id),
      year: String(params.year),
    };

    if (params.institution_name) {
      queryParams.institution_name = params.institution_name;
    }
    if (params.fund_name) {
      queryParams.fund_name = params.fund_name;
    }
    if (params.proposal_text) {
      queryParams.proposal_text = params.proposal_text;
    }

    const response = await axiosInstance.get(
      createDynamicURL(`/api/npx_pivot_table/`, queryParams)
    );

    return {
      result: response.data,
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

  public async putDocumentStarred(id: number, data: any): Promise<{
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
    const url = "/notifications/" + param
    const response = await axiosInstance.get(
      createDynamicURL(url)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  // public async getGraphQLData(searchKeyword: string): Promise<{
  //   result: any;
  // }> {
  //   const requestBody = {
  //     query: `query MyQuery { organizationKeywordSearch(filter: {searchKeyword: "${searchKeyword}"}) { ... on OrganizationPagedResult { __typename items { organizationName organizationType website latestDailyMarketCapital latestAnnualMarketRevenue headOfficeAddress { address city country } rolesBoard { items { person { name age } startDate { displayDate } endDate { displayDate } type title } } rolesEmployment { items { person { name age } type title } } } } ... on GenericError { __typename errorCode errorMessage } ... on ValidationError { __typename errorCode errorMessage } } }`,
  //     variables: {}
  //   };

  //   const response = await axiosInstance.post(
  //     `${baseURL}/api/get_graphql_data/`,
  //     requestBody
  //   );

  //   return {
  //     result: response.data,
  //   };
  // }

  public async getVotingAnalytics(ticker: string): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(
      `${baseURL}/voting_report_8k/?ticker=${ticker}`
    );
    return {
      result: response.data,
    };
  }

  public async getNPXPivotTableFile(url: string): Promise<{
    result: Blob;
  }> {
    const response = await axiosInstance.get(url, {
      responseType: "blob",
    });
    const result = response.data;
    return {
      result: result,
    };
  }
}





export const dashboardService = new DashboardService();
