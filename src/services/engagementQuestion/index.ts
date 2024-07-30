import { axiosInstance } from "../index";
import { EngagementQuestions } from "@/types/engagementQuestions";

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
    console.log('response: ', response);
    const results = response.data;
    return {
      results,
    };
  }
}

export const engagementQuestionService = new EngagementQuestionService();
