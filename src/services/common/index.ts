// services/CommonService.ts

import { PayloadModule } from "@/types/common";
import { axiosInstance } from "../index";

class CommonService {
  public async saveSearches(payload: PayloadModule): Promise<any> {
    try {
      const response = await axiosInstance.post("save_search/", payload);
      return response.data;
    } catch (error) {
      return error;
    }
  }
}

export const commonService = new CommonService();
