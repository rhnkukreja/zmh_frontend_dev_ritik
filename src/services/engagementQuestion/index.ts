import { axiosInstance } from "../index";
import {
  EngagementFormData,
  EngagementQuestions,
} from "@/types/engagementQuestions";

class EngagementQuestionService {
  public async getEngagementQuestions(url: string): Promise<{
    count: number;
    results: EngagementQuestions[];
  }> {
    const response = await axiosInstance.get(url);
    const { count, results } = response.data;
    return {
      count,
      results,
    };
  }

  public async getSingleEngagementQuestions(id: number): Promise<{
    results: EngagementQuestions;
  }> {
    const response = await axiosInstance.get(`/engagement_questions/${id}`);
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
      `/engagement_questions/${id}`,
      data
    );
    const results = response.data;
    return {
      results,
    };
  }
}

export const engagementQuestionService = new EngagementQuestionService();
