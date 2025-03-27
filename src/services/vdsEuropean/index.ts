import { createDynamicURL } from "@/utils/helper";
import { axiosInstance } from "../index";

class VDSEuropeanService {
  public async getVDSEuropean(url: string): Promise<{
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

  public async getDynamicVDSEuropeanDropdownValues(paramFilter?: any): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(
      createDynamicURL(`/get_vds_european_dropdown_values/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }
}

export const vdsEuropeanService = new VDSEuropeanService();
