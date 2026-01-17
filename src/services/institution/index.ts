import { axiosInstance } from "../index";
import { Institutions, InstitutionDocument } from "@/types/institutions";

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

  public async getInstitutionDocuments(institutionId: number): Promise<{
    count: number;
    results: InstitutionDocument[];
  }> {
    const response = await axiosInstance.get(
      `/institute_documents/?institution_id=${institutionId}`
    );
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }

  public async linkDocumentToProfile(
    documentId: number,
    institutionId: number,
    section: string,
    action: "link" | "unlink"
  ): Promise<{ message: string; data: InstitutionDocument }> {
    const response = await axiosInstance.post(
      `/institute_documents/${documentId}/link_to_profile/`,
      {
        institution_id: institutionId,
        section,
        action,
      }
    );
    return response.data;
  }
}

export const institutionService = new InstitutionService();
