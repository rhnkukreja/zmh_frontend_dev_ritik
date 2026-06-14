import { axiosInstance } from "..";

const ENDPOINT = "/api/key_overboarding_policy_document/";

export interface KeyOverboardingPolicyDocument {
  document_name: string;
  document_url: string;
  s3_key: string;
  last_modified: string;
  size: number;
}

class KeyOverboardingPolicyService {
  public async getLatest(): Promise<KeyOverboardingPolicyDocument | null> {
    try {
      const response = await axiosInstance.get(ENDPOINT);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  public async upload(document: File): Promise<KeyOverboardingPolicyDocument> {
    const formData = new FormData();
    formData.append("document", document);
    const response = await axiosInstance.post(ENDPOINT, formData);
    return response.data;
  }
}

export const keyOverboardingPolicyService = new KeyOverboardingPolicyService();
