import { axiosInstance } from "../index";
import { ProxyVotingGuideline } from "@/types/proxyVotingGuideline";

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

  public async updateProxyVotingGuideline(
    id: number,
    data: Partial<ProxyVotingGuideline>
  ): Promise<{ result: ProxyVotingGuideline }> {
    const response = await axiosInstance.put(
      `/proxy_voting_guidelines/${id}`,
      data
    );
    return {
      result: response.data,
    };
  }
}

export const proxyVotingGuidelineService = new ProxyVotingGuidelineService();
