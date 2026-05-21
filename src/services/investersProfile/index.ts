import { AddNewInvesterType, InvestersProfile } from "@/types/investerProfiles";
import { axiosInstance } from "../index";
import { dashboardCacheManager } from "@/utils/cacheManager";

class InvestersProfileService {
  public async getInvestersProfile(url: string): Promise<{
    count: number;
    results: InvestersProfile[];
  }> {
    const cacheKey = dashboardCacheManager.generateKey(url);

    const cached = dashboardCacheManager.get(cacheKey);
    if (cached) {
      // API responses in other services are raw data; ensure shape matches
      return cached as { count: number; results: InvestersProfile[] };
    }

    const inFlight = dashboardCacheManager.getInFlightPromise(cacheKey);
    if (inFlight) return inFlight as Promise<{ count: number; results: InvestersProfile[] }>;

    const requestPromise = axiosInstance.get(url).then((response) => {
      const { count, results } = response.data;
      const payload = { count, results };
      dashboardCacheManager.set(cacheKey, payload);
      return payload;
    });

    dashboardCacheManager.trackRequest(cacheKey, requestPromise);
    return requestPromise;
  }
  public async getSingleInvester(
    id: number,
    type: string
  ): Promise<{
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
    type: string,
    data: Partial<InvestersProfile>
  ): Promise<{
    results: InvestersProfile;
  }> {
    const response = await axiosInstance.put(
      `/investor_profile/${id}/?type=${type}`,
      data
    );
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

  public async getInstitutionByName(
    type: string,
    institution: string
  ): Promise<{
    results: InvestersProfile[];
  }> {
    const response = await axiosInstance.get(
      `/investor_profile/?type=${type}&institution_name=${institution}`
    );
    const results = response.data.results;
    return {
      results,
    };
  }

  public async deleteInvestersProfile(id: number): Promise<any> {
    const response = await axiosInstance.delete(`/investor_profile/${id}/`);
    return response.data;
  }
}

export const investersProfileService = new InvestersProfileService();
