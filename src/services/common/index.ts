// services/CommonService.ts

import {
  ContactUsAdditionalData,
  PayloadModule,
  RequestAdditionalData,
} from "@/types/common";
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
  public async requstAdditionalDataList(
    payload: RequestAdditionalData
  ): Promise<any> {
    try {
      const response = await axiosInstance.post(
        "/user/request_additional_data/",
        payload
      );
      return response.data;
    } catch (error) {
      return error;
    }
  }

  public async requestWhatsNew(
    payload: any
  ): Promise<any> {
    try {
      const response = await axiosInstance.post(
        "/notifications/email_alert/",
        payload
      );
      return response.data;
    } catch (error) {
      return error;
    }
  }

  public async contactUs(payload: ContactUsAdditionalData): Promise<any> {
    try {
      const response = await axiosInstance.post("/user/contact_us/", payload);
      return response.data;
    } catch (error) {
      return error;
    }
  }

  public async lastQuickSearches(): Promise<any> {
    try {
      const response = await axiosInstance.get("/user/get_last_searches");
      return response.data;
    } catch (error) {
      return error;
    }
  }
}

export const commonService = new CommonService();
