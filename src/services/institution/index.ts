

import { axiosInstance } from "../index";
import { Institutions, InstitutionDocument } from "@/types/institutions";

class InstitutionService {
    public async getTrashedDocuments(institutionId: number): Promise<{ results: InstitutionDocument[] }> {
      const response = await axiosInstance.get(`/institute_documents/trash/?institution_id=${institutionId}`);
      return response.data;
    }
  public async bulkDeleteInstitutionDocuments(document_ids: number[]): Promise<{ message: string }> {
    // Send JSON body, do NOT use FormData
    // Axios automatically sets Content-Type to application/json for plain objects
    console.log("Bulk delete IDs:", document_ids, Array.isArray(document_ids));
    const response = await axiosInstance.post(`/institute_documents/bulk_delete/`, { document_ids });
    return response.data;
  }

  public async deleteInstitutionDocument(documentId: number): Promise<{ message: string; document_id: number }> {
    const response = await axiosInstance.delete(`/institute_documents/${documentId}/`);
    return response.data;
  }

  public async restoreInstitutionDocument(documentId: number): Promise<{ message: string; data: InstitutionDocument }> {
    const response = await axiosInstance.post(`/institute_documents/${documentId}/restore/`);
    return response.data;
  }
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

  public async bulkLinkDocumentsToProfile(
    institutionId: number,
    operations: Array<{ document_id: number; sections: string[]; action: "link" | "unlink" }>
  ): Promise<{ message: string; data: InstitutionDocument[] }> {
    const response = await axiosInstance.post(
      `/institute_documents/bulk_link_to_profile/`,
      {
        institution_id: institutionId,
        operations,
      }
    );
    return response.data;
  }
}

export const institutionService = new InstitutionService();
