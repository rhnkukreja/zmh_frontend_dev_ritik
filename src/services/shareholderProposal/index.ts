import { axiosInstance } from "../index";

class ShareHolderProposalService {
  public async getShareHolderProposal(url: string): Promise<{
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

}

export const shareHolderProposalService = new ShareHolderProposalService();
