import { DomainNote, DomainNoteComment } from "@/types/domainNotes";
import { axiosInstance } from "../index";
import {
  EngagementFormData,
  EngagementQuestions,
} from "@/types/engagementQuestions";

class DomainNotesService {
  public async getDomainNotes(url: string): Promise<{
    results: any[];
  }> {
    const response = await axiosInstance.get(url);
    const results = response.data;
    console.log("response.data", results)
    return {
      results,
    };
  }

  public async addNewNote(data: Partial<DomainNote>): Promise<{
    results: DomainNote;
  }> {
    const response = await axiosInstance.post(`/user/domain_notes/`, data);
    const results = response.data;
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
    const results = response.data;
    return {
      results,
    };
  }

  public async getCompanyHierarchyNotes(): Promise<{
    results: any[];
  }> {
    const response = await axiosInstance.get(`/user/get_domain_notes/?filter=company`);
    const results = response.data;
    return {
      results,
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
    const response = await axiosInstance.put(`/user/domain_notes/${id}/`, data);
    const results = response.data;
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

}

export const domainNotesService = new DomainNotesService();
