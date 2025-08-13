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
    // Always use /get_vds_european_dropdown_values/ endpoint for this method
    const response = await axiosInstance.get(
      createDynamicURL(`/get_vds_european_dropdown_values/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getCompanySearchDropdownValues(paramFilter?: any): Promise<{
    result: any;
  }> {
    // Fix: Use the correct endpoint for company search
    // This will call: https://api.zmhadvisors.com/get_vds_european_dropdown_values/?institution_name=["BlackRock, Inc."]&company_name=app
    const response = await axiosInstance.get(
      createDynamicURL(`/get_vds_european_dropdown_values/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getDefaultCompanyDropdownValues(paramFilter?: any): Promise<{
    result: any;
  }> {
    // Fix: Use the correct endpoint for default company filter
    // This will call: https://api.zmhadvisors.com/company/?company_name=a&index=["100"]
    const response = await axiosInstance.get(
      createDynamicURL(`/company/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getCompanySelectionDropdownValues(paramFilter?: any): Promise<{
    result: any;
  }> {
    // Fix: Use the correct endpoint for company selection with all filters
    // This will call: https://api.zmhadvisors.com/get_vds_european_dropdown_values/ with all current filters
    const response = await axiosInstance.get(
      createDynamicURL(`/get_vds_european_dropdown_values/`, paramFilter)
    );
    const result = response.data;
    return {
      result: result,
    };
  }

  public async getVDSEuropeanAnalytics(url: string,body:object): Promise<{
    response: any[];
  }> {
    const response = await axiosInstance.post(url,body);
    return {
      response: response.data,
    };
  }

}

export const vdsEuropeanService = new VDSEuropeanService();
