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

}

export const caseStudiesService = new CaseStudiesService();
