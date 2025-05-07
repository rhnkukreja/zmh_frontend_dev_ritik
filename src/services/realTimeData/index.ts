import { createDynamicURL } from "@/utils/helper";
import { axiosInstance } from "../index";

class RealTimeService {
  public async getrealTime(url: string): Promise<{
    count: number;
    results: any[];
  }> {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }

  public async getDynamicrealTimeDropdownValues(paramFilter?: any): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(
      createDynamicURL(`/get_vds_dropdown_values/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }
}

export const realTimeService = new RealTimeService();
