import { FlterDropdown } from "@/types/casestudy";
import { axiosInstance } from "../index";

class CaseStudiesService {
  public async getCaseStudies(url: string): Promise<{
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
  public async getSingleSingleCaseStudy(id: number): Promise<{
    result: any;
  }> {
    const response = await axiosInstance.get(`/case_studies/${id}/`);
    const result = response.data;
    return {
      result: result,
    };
  }
  public async getCaseStudiesDropdownValues(): Promise<{
    result: FlterDropdown;
  }> {
    const response = await axiosInstance.get(
      `/get_case_studies_dropdown_values/`
    );
    const result = response.data;
    return {
      result: result,
    };
  }
}

export const caseStudiesService = new CaseStudiesService();
