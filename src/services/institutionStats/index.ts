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
  },

  uploadKeyContacts: async (institutionId: number, file: File) => {
    const formData = new FormData();
    formData.append('institution_id', String(institutionId));
    formData.append('file', file);
    const response = await axiosInstance.post(
      '/api/institution-stats/upload-key-contacts/',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data as {
      message: string;
      institution_id: number;
      total_contacts: number;
      images_existing: number;
      images_added: number;
      images_deleted: number;
      images_private: number;
    };
  },
};
