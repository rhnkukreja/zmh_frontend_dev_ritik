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

  public async createInstitution(
    data: Partial<Institutions>
  ): Promise<{ results: Institutions }> {
    const response = await axiosInstance.post("/institute/", data);
    const results = response.data;
    return {
      results,
    };
  }

  public async updateInstitution(
    id: number,
    data: Partial<Institutions>
  ): Promise<{
    results: Institutions;
  }> {
    const response = await axiosInstance.put(`/institute/${id}/`, data);
    const results = response.data;
    return {
      results,
    };
  }

  public async getSingleInstitution(id: number): Promise<{
    results: Institutions;
  }> {
    const response = await axiosInstance.get(`/institute/${id}/`);
    const results = response.data;
    return {
      results,
    };
  }
}

export const institutionService = new InstitutionService();
