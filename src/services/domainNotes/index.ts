import { DomainNote, DomainNoteComment } from "@/types/domainNotes";
import { axiosInstance } from "../index";
import {
  EngagementFormData,
  EngagementQuestions,
} from "@/types/engagementQuestions";
import { decryptNotesDeep, encryptNotesField } from "@/utils/notesCrypto";

class DomainNotesService {
  public async getDomainNotes(url: string): Promise<{
    results: any[];
  }> {
    const response = await axiosInstance.get(url);
    const results = decryptNotesDeep(response.data);
    console.log("response.data", results)
    return {
      results,
    };
  }

  public async addNewNote(data: Partial<DomainNote>): Promise<{
    results: DomainNote;
  }> {
    const encryptedPayload = encryptNotesField(data);
    const response = await axiosInstance.post(`/user/domain_notes/`, encryptedPayload);
    const results = decryptNotesDeep(response.data);
    return {
      results,
    };
  }

  public async deleteNote(id: number,): Promise<{
  }> {
    const response = await axiosInstance.delete(`/user/domain_notes/${id}/`);
    const results = response.data;
    return {
      results,
    };
  }

  public async shareNote(
    id: number,
  ): Promise<{
  }> {
    const response = await axiosInstance.get(`/user/share_note/?notes_id=${id}`);
    const results = response.data;
    return {
      results,
    };
  }

  public async domainNoteDropDownValuesByInstitution(
    institutionName: string,
  ): Promise<{
    results: any[];
  }> {
    const response = await axiosInstance.get(`/user/get_domain_notes_dropdown_values/?institution_name=${institutionName}`);
    const results = response.data;
    return {
      results,
    };
  }

  public async getInstitutionHierarchyNotes(): Promise<{
    results: any[];
  }> {
    const response = await axiosInstance.get(`/user/get_domain_notes/?filter=institution`);
    const results = decryptNotesDeep(response.data);
    return {
      results,
    };
  }

  public async getInstitutionNotesByName(
    institutionName: string,
  ): Promise<{
    results: any[];
  }> {
    const encodedInstitutionName = encodeURIComponent(JSON.stringify([institutionName]));
    const response = await axiosInstance.get(
      `/user/get_domain_notes/?filter=institution&institution_name=${encodedInstitutionName}`
    );
    const results = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.results)
        ? response.data.results
        : [];

    return {
      results,
    };
  }

  public async getInstitutionNotesById(
    institutionId: number,
  ): Promise<{
    results: any[];
  }> {
    const response = await axiosInstance.get(
      `/user/get_domain_notes/?filter=institution&institution_id=${institutionId}`
    );
    const results = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.results)
        ? response.data.results
        : [];

    return {
      results,
    };
  }

  public async getCompanyHierarchyNotes(
    companyName?: string,
  ): Promise<{
    results: any[];
  }> {
    const encodedCompanyName = companyName
      ? `&company_name=${encodeURIComponent(JSON.stringify([companyName]))}`
      : "";
    const response = await axiosInstance.get(
      `/user/get_domain_notes/?filter=company${encodedCompanyName}`
    );
    const results = decryptNotesDeep(response.data);
    return {
      results,
    };
  }

  public async getCompanyInstitutionNotes(
    companyId: number,
    institutionId: number,
  ): Promise<{
    results: DomainNote[];
  }> {
    const params = new URLSearchParams();
    params.append("company_id", String(companyId));
    params.append("institution_id", String(institutionId));

    const response = await axiosInstance.get(
      `/user/get_domain_notes/?${params.toString()}`
    );
    const rawResults = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.results)
        ? response.data.results
        : [];

    const flattenedResults = rawResults.flatMap((item: any) => {
      if (item && typeof item === "object" && item.sub_heading && typeof item.sub_heading === "object") {
        return Object.values(item.sub_heading).flatMap((notes) =>
          Array.isArray(notes) ? notes : []
        );
      }

      return item ? [item] : [];
    });

    return {
      results: decryptNotesDeep(flattenedResults),
    };
  }

  public async domainNoteDropDownValuesByCompany(
    companyName: string,
  ): Promise<{
    results: any[];
  }> {
    const response = await axiosInstance.get(`/user/get_domain_notes_dropdown_values/?company_name=${companyName}`);
    const results = response.data;
    return {
      results,
    };
  }




  public async updateNote(
    id: number,
    data: Partial<DomainNote>
  ): Promise<{
    results: DomainNote;
  }> {
    const encryptedPayload = encryptNotesField(data);
    const response = await axiosInstance.put(`/user/domain_notes/${id}/`, encryptedPayload);
    const results = decryptNotesDeep(response.data);
    return {
      results,
    };
  }

  public async addNoteComment(
    id: number,
    data: Partial<DomainNoteComment>
  ): Promise<{
    results: DomainNote;
  }> {
    const payload = {
      ...data,
      domain_notes: id,
    };

    const response = await axiosInstance.post(`/user/notes_comments/`, payload);
    return {
      results: response.data,
    };
  }

  public async updateNoteComment(
    id: number,
    data: Partial<DomainNoteComment>
  ): Promise<{
    results: DomainNoteComment;
  }> {
    const response = await axiosInstance.put(`/user/notes_comments/${id}/`, data);
    return {
      results: response.data,
    };
  }

  public async deleteNoteComment(id: number): Promise<{
    results: unknown;
  }> {
    const response = await axiosInstance.delete(`/user/notes_comments/${id}/`);
    return {
      results: response.data,
    };
  }

}

export const domainNotesService = new DomainNotesService();
