import { axiosInstance } from "..";

export const institutionStatsService = {
  getInvestorDropdown: async () => {
    const response = await axiosInstance.get('/api/institution-stats/investor-dropdown/');
    return response.data;
  },

  getYearsForInstitution: async (institutionId: number) => {
    const response = await axiosInstance.get('/api/institution-stats/investor-dropdown/', {
      params: { institution_id: institutionId },
    });
    return response.data as { institution_id: number; years: number[] };
  },

  getInstitutionStats: async (institutionId: number, year?: number) => {
    const params: any = { institution_id: institutionId };
    if (year) {
      params.year = year;
    }
    const response = await axiosInstance.get('/api/institution-stats/', { params });
    return response.data;
  },

  getInstitutionCoverageList: async () => {
    const response = await axiosInstance.get('/api/institution-stats/coverage-list/');
    return response.data;
  }
};
