import { createDynamicURL } from "@/utils/helper";
import { axiosInstance } from "../index";
import { dashboardCacheManager } from "@/utils/cacheManager";
import { getDashboardCacheStrategyForUrl } from "@/utils/dashboardCacheStrategy";

export interface CompensationStatsFilters {
  year?: string | string[] | number | number[];
  index?: string | string[];
  vote?: string | string[];
  investor_company?: string | string[];
  page?: number;
  page_size?: number;
}

class CompensationProposalsService {
  public async getCompensationStats(filters?: CompensationStatsFilters): Promise<any> {
    const url = createDynamicURL("/api/compensation-proposals/stats/", filters);
    const cacheKey = dashboardCacheManager.generateKey(url);
    const strategy = getDashboardCacheStrategyForUrl(url);

    const cached = dashboardCacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlightPromise = dashboardCacheManager.getInFlightPromise(cacheKey);
    if (inFlightPromise) {
      return inFlightPromise;
    }

    const requestPromise = axiosInstance.get(url).then((response) => {
      const data = response.data;
      dashboardCacheManager.set(cacheKey, data, {
        ttl: strategy.ttl,
        tags: strategy.tags,
      });
      return data;
    });

    dashboardCacheManager.trackRequest(cacheKey, requestPromise);
    return requestPromise;
  }
}

export const compensationProposalsService = new CompensationProposalsService();
