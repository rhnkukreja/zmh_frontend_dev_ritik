import { AddShareholderType, ShareHolderData, ShareHolderDropdown } from "@/types/shareHolder";
import { axiosInstance } from "../index";

class ShareHolderProposalService {
  public async getShareHolderProposal(url: string): Promise<{
    count: number;
    results: any[];
    proposalCount: number;
    withdrawnCount: number;
    noActionCount: number;
  }> {
    const response = await axiosInstance.get(url);
    const { count, results, proposalCount, withdrawnCount, noActionCount } =
      response.data;
    return {
      count,
      results,
      proposalCount,
      withdrawnCount,
      noActionCount,
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

  public async getSingleShareHolder(
    url: string,
    id: number
  ): Promise<{
    results: ShareHolderData;
  }> {
    const response = await axiosInstance.get(`/${url}/${id}`);
    const results = response.data;
    return {
      results,
    };
  }

  public async AddNewShareHolder(data: Partial<AddShareholderType>): Promise<{
    results: AddShareholderType;
  }> {
    const response = await axiosInstance.post(`/investor_profile/`, data);
    const results = response.data;
    return {
      results,
    };
  }
}

export const shareHolderProposalService = new ShareHolderProposalService();
