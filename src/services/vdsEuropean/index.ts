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
    // For search, use get_vds_european_dropdown_values with institution and search term
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
    // For default load, use company endpoint with company_name=a&index=["100"]
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
    // For selection, use get_vds_european_dropdown_values with selected values
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

  public async getVDSEuropeanFile(url: string): Promise<{
    result: Blob;
  }> {
    const response = await axiosInstance.get(url, {
      responseType: "blob",
    });
    const result = response.data;
    return {
      result: result,
    };
  }

}

export const vdsEuropeanService = new VDSEuropeanService();
