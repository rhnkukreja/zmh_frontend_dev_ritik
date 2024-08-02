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
}

export const proxyVotingGuidelineService = new ProxyVotingGuidelineService();
