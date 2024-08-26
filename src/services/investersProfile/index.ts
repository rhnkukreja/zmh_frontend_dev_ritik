import { AddNewInvesterType, InvestersProfile } from "@/types/investerProfiles";
import { axiosInstance } from "../index";

class InvestersProfileService {
  public async getInvestersProfile(url: string): Promise<{
    count: number;
    results: InvestersProfile[];
  }> {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }
  public async getSingleInvester(id: number): Promise<{
    results: InvestersProfile;
  }> {
    const response = await axiosInstance.get(`/investor_profile/${id}/`);
    const results = response.data;
    return {
      results,
    };
  }
  public async updateInvestersProfile(
    id: number,
    data: Partial<InvestersProfile>
  ): Promise<{
    results: InvestersProfile;
  }> {
    const response = await axiosInstance.put(`/investor_profile/${id}/`, data);
    const results = response.data;
    return {
      results,
    };
  }
  public async AddNewInvestersProfile(
    data: Partial<AddNewInvesterType>
  ): Promise<{
    results: InvestersProfile;
  }> {
    const response = await axiosInstance.post(`/investor_profile/`, data);
    const results = response.data;
    return {
      results,
    };
  }
}

export const investersProfileService = new InvestersProfileService();
