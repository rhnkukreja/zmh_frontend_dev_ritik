import {
  AddNoActionType,
  AddShareholderType,
  AddWithdrawnType,
  ShareHolderData,
  ShareHolderDropdown,
} from "@/types/shareHolder";
import { axiosInstance } from "../index";
import { createDynamicURL } from "@/utils/helper";
import { TopSubcategories } from "@/stores/shareholderProposalSlice";

class ShareHolderProposalService {
  public async getShareHolderProposal(url: string): Promise<{
    count: number;
    results: any[];
    proposalCount: number;
    withdrawnCount: number;
    noActionCount: number;
    proposalCounts: {
      [key: string]: number;
    };
    topSubcategories: {
      [key: string]: any[];
    };
    topCategories: any[];
    yearlySummary: any[];
    topProponents: any[];
    pieChartOutcome: any;
    total_proposals: number;
  }> {
    const response = await axiosInstance.get(url);
    const { count, results, proposalCount, withdrawnCount, noActionCount, proposal_counts, top_subcategories, yearly_summary, top_categories, top_10_proponent, pie_chart_outcome ,total_proposals} =
      response.data;
    return {
      count,
      results,
      proposalCount,
      withdrawnCount,
      noActionCount,
      proposalCounts: proposal_counts,
      topSubcategories: top_subcategories,
      yearlySummary: yearly_summary,
      topCategories: top_categories,
      topProponents: top_10_proponent,
      pieChartOutcome: pie_chart_outcome,
      total_proposals,
    };
  }

  // public async getShareHolderDropdownValues(): Promise<{
  //   result: ShareHolderDropdown;
  // }> {
  //   const response = await axiosInstance.get(`/get_shareholder_dropdown_values/`);
  //   const result = response.data;
  //   return {
  //     result: result,
  //   };
  // }

  public async getShareHolderDropdownValues(paramFilter?: any): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(
      createDynamicURL(`/get_shareholder_dropdown_values/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getNoActionrDropdownValues(paramFilter?: any): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(
      createDynamicURL(`/get_shareholder_noaction_proposal/`, paramFilter)
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
    const response = await axiosInstance.post(
      `/shareholder_proposal/def14a/`,
      data
    );
    const results = response.data;
    return {
      results,
    };
  }

  public async updateNewShareHolder(
    id: string,
    data: Partial<AddShareholderType>
  ): Promise<{
    results: AddShareholderType;
  }> {
    const response = await axiosInstance.put(
      `/shareholder_proposal/def14a/${id}/`,
      data
    );
    const results = response.data;
    return {
      results,
    };
  }

  public async AddNewWithdrawn(data: Partial<AddWithdrawnType>): Promise<{
    results: AddWithdrawnType;
  }> {
    const response = await axiosInstance.post(
      `/shareholder_proposal/withdrawn/`,
      data
    );
    const results = response.data;
    return {
      results,
    };
  }

  public async updateNewWithdrawn(
    id: string,
    data: Partial<AddWithdrawnType>
  ): Promise<{
    results: AddWithdrawnType;
  }> {
    const response = await axiosInstance.put(
      `/shareholder_proposal/withdrawn/${id}/`,
      data
    );
    const results = response.data;
    return {
      results,
    };
  }

  public async AddNewNoAction(data: Partial<AddNoActionType>): Promise<{
    results: AddNoActionType;
  }> {
    const response = await axiosInstance.post(
      `/shareholder_proposal/no_action/`,
      data
    );
    const results = response.data;
    return {
      results,
    };
  }

  public async updateNoAction(
    id: string,
    data: Partial<AddNoActionType>
  ): Promise<{
    results: AddNoActionType;
  }> {
    const response = await axiosInstance.put(
      `/shareholder_proposal/no_action/${id}/`,
      data
    );
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

  public async getAllShareholderAPIFile(url: string): Promise<{
    result: Blob;
  }> {
    const response = await axiosInstance.get(url, {
      responseType: "blob",
    });
    const result = response.data;
    return {
      result: result,
    };
  }

  public async deleteShareHolderProposal(id: string): Promise<any> {
    const response = await axiosInstance.delete(`/shareholder_proposal/def14a/${id}/`);
    return response.data;
  }

  public async predictCategory(proposalText: string): Promise<{
    category: string;
    sub_category: string;
  }> {
    const response = await axiosInstance.post(`/shareholder_proposal/predict-category/`, {
      proposal_text: proposalText,
    });
    return response.data;
  }
}

export const shareHolderProposalService = new ShareHolderProposalService();
