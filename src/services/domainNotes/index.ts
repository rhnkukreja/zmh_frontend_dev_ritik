import { DomainNote } from "@/types/domainNotes";
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
}

export const domainNotesService = new DomainNotesService();
