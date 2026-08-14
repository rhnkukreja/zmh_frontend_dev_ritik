import { FilterDropdown } from "@/types/casestudy";
import { axiosInstance } from "../index";
import { createQueryParams } from "@/utils/helper";
import { dashboardCacheManager } from "@/utils/cacheManager";

class CaseStudiesService {
  public async getCaseStudies(url: string): Promise<{
    count: number;
    results: any[];
  }> {
    const cacheKey = dashboardCacheManager.generateKey(url);

    const cached = dashboardCacheManager.get(cacheKey);
    if (cached) {
      return cached as { count: number; results: any[] };
    }

    const inFlight = dashboardCacheManager.getInFlightPromise(cacheKey);
    if (inFlight) {
      return inFlight as Promise<{ count: number; results: any[] }>;
    }

    const requestPromise = axiosInstance.get(url).then((response) => {
      const { count, results } = response.data;
      const payload = {
        count,
        results,
      };
      dashboardCacheManager.set(cacheKey, payload);
      return payload;
    });

    dashboardCacheManager.trackRequest(cacheKey, requestPromise);
    return requestPromise;
  }

  public async getCaseStudiesFile(url: string): Promise<{
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

  public async getSingleSingleCaseStudy(id: number): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(`/case_studies/${id}/`);
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getCaseStudiesDropdownValues(
    queryParams?: Record<string, any>
  ): Promise<any> {
    const url = queryParams
      ? `/get_case_studies_dropdown_values/?${createQueryParams(queryParams)}`
      : `/get_case_studies_dropdown_values/`;

    const response = await axiosInstance.get(url);
    console.log("Response from getCaseStudiesDropdownValues:", response.data);
    return {
      result: response.data,
    };
  }

  public async addNewCaseStudies(data: Partial<any>): Promise<{
    results: any;
  }> {
    const response = await axiosInstance.post(`/case_studies/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async updateCaseStudies(
    id: string,
    data: Partial<any>
  ): Promise<{
    results: any;
  }> {
    const response = await axiosInstance.put(`/case_studies/${id}/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async getCaseStudiesAIFilters(params?: {
    company_ids?: string;
    years?: string;
    institution_ids?: string;
    themes?: string;
    markets?: string;
    selection_order?: string;
  }): Promise<any> {
    const response = await axiosInstance.get(`/api/case-studies-ai/filters/`, { params });
    return response.data;
  }

  public async generateCaseStudiesAITopics(data: { institution_ids?: number[], themes?: string[], years?: number[], company_ids?: number[], markets?: string[] }): Promise<any> {
    const response = await axiosInstance.post(`/api/case-studies-ai/generate-topics/`, data);
    return response.data;
  }

  public async getCaseStudiesAISummary(data: { query?: string, institution_ids?: number[], themes?: string[], years?: number[], company_ids?: number[], markets?: string[] }): Promise<any> {
    const response = await axiosInstance.post(`/api/case-studies-ai/summary/`, data);
    return response.data;
  }

  public async getRelatedCaseStudiesAI(params: { query?: string, institution_ids?: string, themes?: string, years?: string, company_ids?: string, markets?: string, page?: number, page_size?: number }): Promise<any> {
    const response = await axiosInstance.get(`/api/case-studies-ai/related/`, { params });
    return response.data;
  }

  public async deleteCaseStudy(id: number): Promise<any> {
    const response = await axiosInstance.delete(`/case_studies/${id}/`);
    return response.data;
  }
}

export const caseStudiesService = new CaseStudiesService();
