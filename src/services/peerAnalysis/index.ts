import { FlterDropdown, InvestorData, PieChartDataPeerAnalysis, TopEngagementTopics, TypesPeerAnalysis } from "@/types/peerAnalysis";
import { axiosInstance } from "../index";

class PeerAnalysisService {
  public async getPeerAnalysis(url: string): Promise<{
    count: number;
    results: TypesPeerAnalysis[];
    investorData: InvestorData[];
    pieChartDataPeerAnalysis: PieChartDataPeerAnalysis[],
    topEngagementTopics: TopEngagementTopics[]
  }> {
    const response = await axiosInstance.get(url);
    const { count, results, investor_data, pie_chart_data, top_engagement_topics } = response.data;
    return {
      count,
      results,
      investorData: investor_data,
      pieChartDataPeerAnalysis: pie_chart_data,
      topEngagementTopics: top_engagement_topics
    };
  }

  public async getPeerAnalysisDropdownValues(
    queryParams?: Record<string, any>
  ): Promise<{
    result: FlterDropdown;
  }> {
    const url = queryParams
      ? `/get_peer_analysis_dropdown_values/?${new URLSearchParams(queryParams).toString()}`
      : `/get_peer_analysis_dropdown_values/`;
    
    const response = await axiosInstance.get(url);
    const result = response.data;
    return {
      result: result,
    };
  }
}

export const peerAnalysisService = new PeerAnalysisService();
