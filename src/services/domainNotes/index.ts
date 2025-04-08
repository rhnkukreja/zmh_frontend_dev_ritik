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

  public async getSingleEngagementQuestions(id: number): Promise<{
    results: EngagementQuestions;
  }> {
    const response = await axiosInstance.get(`/engagement_questions/${id}/`);
    const results = response.data;
    return {
      results,
    };
  }

  public async createEngagementQuestion(
    data: EngagementFormData
  ): Promise<{ results: EngagementQuestions }> {
    const response = await axiosInstance.post("/engagement_questions/", data);
    const results = response.data;
    return {
      results,
    };
  }

  public async updateEngagementQuestion(
    id: number,
    data: EngagementFormData
  ): Promise<{
    results: EngagementQuestions;
  }> {
    const response = await axiosInstance.put(
      `/engagement_questions/${id}/`,
      data
    );
    const results = response.data;
    return {
      results,
    };
  }
}

export const domainNotesService = new DomainNotesService();
