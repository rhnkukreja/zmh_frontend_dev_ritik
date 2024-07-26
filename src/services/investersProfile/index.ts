import { InvestersProfile } from "@/types/investerProfiles";
import { axiosInstance } from "../index";

class InvestersProfileService {
  public async getInvestersProfile(page: number): Promise<{
    count: number;
    results: InvestersProfile[];
  }> {
    const response = await axiosInstance.get(`/investor_profile/?page=${page}`);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }
  public async getSingleInvester(id: number): Promise<{
    results: InvestersProfile;
  }> {
    const response = await axiosInstance.get(`/investor_profile/${id}`);
    const  results  = response.data;
    return {
      results,
    };
  }
}

export const investersProfileService = new InvestersProfileService();
