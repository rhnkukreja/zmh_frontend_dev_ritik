import { ShareHolderDropdown } from "@/types/shareHolder";
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


  public async getShareHolderDropdownValues(): Promise<{
    result: ShareHolderDropdown;
  }> {
    const response = await axiosInstance.get(
      `/get_shareholder_dropdown_values/`
    );
    const result = response.data;
    return {
      result: result,
    };
  }

}

export const shareHolderProposalService = new ShareHolderProposalService();
