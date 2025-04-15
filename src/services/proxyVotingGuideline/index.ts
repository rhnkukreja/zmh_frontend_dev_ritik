import { createDynamicURL } from "@/utils/helper";
import { axiosInstance } from "../index";
import { ProxyVotingGuideline, ProxyVotingSummaryType } from "@/types/proxyVotingGuideline";

class ProxyVotingGuidelineService {
  public async getProxyVotingGuideline(url: string): Promise<{
    count: number;
    results: ProxyVotingGuideline[];
  }> {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }

  public async getProxyVotingSummary(url: string): Promise<{
    count: number;
    results: ProxyVotingSummaryType[];
  }> {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }

  public async getProxyVotingSummaryDropdownValues(paramFilter?: any): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(
      createDynamicURL(`/get_proxy_voting_guidelines_pdf_summary_dropdown_values/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getSummaryDaata(paramFilter?: any, name?: string): Promise<{ blob: Blob; filename: string }> {
    const response = await axiosInstance.get(createDynamicURL(`/download_data/`, paramFilter),{responseType: 'blob'});
    // let name = filename; // Default filename
    
  
    return { blob: response.data, filename: name ?? 'file' };
  }

  public async createProxyVotingGuideline(
    data: Partial<ProxyVotingGuideline>
  ): Promise<{
    result: ProxyVotingGuideline;
  }> {
    const response = await axiosInstance.post(
      "/proxy_voting_guidelines/",
      data
    );

    return {
      result: response.data,
    };
  }

  public async uploadSummaryFile(
    data: Partial<ProxyVotingGuideline>
  ): Promise<{
    result: ProxyVotingGuideline;
  }> {
    const response = await axiosInstance.post(
      "/proxy_voting_guidelines_pdf_summary_data_upload/",
      data
    );

    return {
      result: response.data,
    };
  }

  public async updateProxyVotingGuideline(
    id: number,
    data: Partial<ProxyVotingGuideline>
  ): Promise<{ result: ProxyVotingGuideline }> {
    const response = await axiosInstance.put(
      `/proxy_voting_guidelines/${id}/`,
      data
    );
    return {
      result: response.data,
    };
  }
}

export const proxyVotingGuidelineService = new ProxyVotingGuidelineService();
