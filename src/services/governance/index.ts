import { axiosInstance } from "../index";
import { CorporateGovernanceData } from "@/types/governance";

class GovernanceService {
  public async getCorporateGovernance(companyId: number): Promise<CorporateGovernanceData> {
    try {
      const response = await axiosInstance.get(
        `/api/get_company_corporate_governance/?company_id=${companyId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching governance data:", error);
      throw error;
    }
  }
}

export const governanceService = new GovernanceService();
