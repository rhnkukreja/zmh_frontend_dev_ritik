import { AddNoActionType, AddShareholderType, AddWithdrawnType, ShareHolderData, ShareHolderDropdown } from "@/types/shareHolder";
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

  public async addNewShareHolder(data: Partial<AddShareholderType>): Promise<{
    results: AddShareholderType;
  }> {
    const response = await axiosInstance.post(`/shareholder_proposal/def14a/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async updateNewShareHolder(id: string, data: Partial<AddShareholderType>): Promise<{
    results: AddShareholderType;
  }> {
    const response = await axiosInstance.put(`/shareholder_proposal/def14a/${id}/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async AddNewWithdrawn(data: Partial<AddWithdrawnType>): Promise<{
    results: AddWithdrawnType;
  }> {
    const response = await axiosInstance.post(`/shareholder_proposal/withdrawn/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async updateNewWithdrawn(id: string, data: Partial<AddWithdrawnType>): Promise<{
    results: AddWithdrawnType;
  }> {
    const response = await axiosInstance.put(`/shareholder_proposal/withdrawn/${id}/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async AddNewNoAction(data: Partial<AddNoActionType>): Promise<{
    results: AddNoActionType;
  }> {
    const response = await axiosInstance.post(`/shareholder_proposal/no_action/`, data);
    const results = response.data;
    return {
      results,
    };
  }


  public async updateNoAction(id: string, data: Partial<AddNoActionType>): Promise<{
    results: AddNoActionType;
  }> {
    const response = await axiosInstance.put(`/shareholder_proposal/no_action/${id}/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async getAllShareholderAPI(url: string): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(url);
    const result = response.data;
    return {
      result: result,
    };
  }
}

export const shareHolderProposalService = new ShareHolderProposalService();
