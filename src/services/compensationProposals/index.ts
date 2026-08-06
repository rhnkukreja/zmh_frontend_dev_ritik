import { createDynamicURL } from "@/utils/helper";
import { axiosInstance } from "../index";

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
    const response = await axiosInstance.get(
      createDynamicURL("/api/compensation-proposals/stats/", filters)
    );
    return response.data;
  }
}

export const compensationProposalsService = new CompensationProposalsService();
