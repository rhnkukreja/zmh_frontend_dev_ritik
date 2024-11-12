import { FlterDropdown, TypesPeerAnalysis } from "@/types/peerAnalysis";
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

  public async getPeerAnalysisDropdownValues(): Promise<{
    result: FlterDropdown;
  }> {
    const response = await axiosInstance.get(
      `/get_peer_analysis_dropdown_values/`
    );
    const result = response.data;
    return {
      result: result,
    };
  }
}

export const peerAnalysisService = new PeerAnalysisService();
