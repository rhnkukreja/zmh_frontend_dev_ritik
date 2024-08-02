import { axiosInstance } from "../index";
import { Institutions } from "@/types/institutions";

class InstitutionService {
  public async getInstitutions(url: string): Promise<{
    count: number;
    results: Institutions[];
  }> {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }

  
  
}

export const institutionService = new InstitutionService();
