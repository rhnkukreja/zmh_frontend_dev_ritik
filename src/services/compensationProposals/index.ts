import { createDynamicURL } from "@/utils/helper";
import { axiosInstance } from "../index";
import { dashboardCacheManager } from "@/utils/cacheManager";
import { getDashboardCacheStrategyForUrl } from "@/utils/dashboardCacheStrategy";

export interface CompensationStatsFilters {
  year?: string | string[] | number | number[];
  index?: string | string[];
  vote?: string | string[];
  investor_company?: string | string[];
  institution_id?: (string | number)[];
  date_range?: string;
  keyword?: string[];
  page?: number;
  page_size?: number;
}

export interface CompensationDropdownFilters {
  institution_id?: string | (string | number)[];
  year?: string | number | (string | number)[];
  index?: string | string[];
  vote?: string | string[];
  date_range?: string;
  keyword?: string;
  company_id?: string | number;
}

class CompensationProposalsService {
  public async getCompensationDropdown(filters?: CompensationDropdownFilters): Promise<any> {
    const params = new URLSearchParams();
    const institutionIds = Array.isArray(filters?.institution_id)
      ? filters?.institution_id
      : filters?.institution_id
        ? [filters.institution_id]
        : [];
    if (institutionIds.length > 0) {
      params.append("institution_id", institutionIds.join(","));
    }
    if (filters?.company_id) params.append("company_id", String(filters.company_id));
    if (filters?.year) {
      const years = Array.isArray(filters.year) ? filters.year : [filters.year];
      if (years.length > 0) params.append("year", years.join(","));
    }
    if (filters?.vote) {
      const votes = Array.isArray(filters.vote) ? filters.vote : [filters.vote];
      if (votes.length > 0) params.append("vote", votes.join(","));
    }
    if (filters?.index) {
      const indexes = Array.isArray(filters.index) ? filters.index : [filters.index];
      if (indexes.length > 0) params.append("index", indexes.join(","));
    }
    if (filters?.date_range) params.append("date_range", filters.date_range);
    if (filters?.keyword) params.append("keyword", filters.keyword);

    const response = await axiosInstance.get(
      `/api/compensation-proposals/dropdown/?${params.toString()}`
    );
    return response.data;
  }

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
