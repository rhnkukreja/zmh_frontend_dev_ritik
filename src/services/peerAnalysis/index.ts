import { TypesPeerAnalysis } from "@/types/peerAnalysis";
import { axiosInstance } from "../index";

class PeerAnalysisService {
  public async getPeerAnalysis(url: string): Promise<{
    count: number;
    results: TypesPeerAnalysis[];
  }> {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }
}

export const peerAnalysisService = new PeerAnalysisService();
