import { axiosInstance } from "../index";
import { CompanyData } from "@/types/company";

class CompanyService {
  public async getCompanies(url: string): Promise<{
    count: number;
    results: CompanyData[];
  }> {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }

  public async createCompany(data: Partial<CompanyData>): Promise<{
    result: CompanyData;
  }> {
    const response = await axiosInstance.post("/company/", data);
    return {
      result: response.data,
    };
  }

  public async updateCompany(
    id: number,
    data: Partial<CompanyData>
  ): Promise<{ result: CompanyData }> {
    const response = await axiosInstance.put(`/company/${id}`, data);
    return {
      result: response.data,
    };
  }
}

export const companyService = new CompanyService();
