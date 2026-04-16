import { axiosInstance } from "../index";

class NewsletterService {
    
    public async getCategories(): Promise<any[]> {
        const response = await axiosInstance.get("/api/newsletter/categories/");
        return Array.isArray(response.data?.data) ? response.data.data : [];
    }

    
    public async getMonths(): Promise<any[]> {
        const response = await axiosInstance.get("/api/newsletter/months/");
        return Array.isArray(response.data?.data) ? response.data.data : [];
    }

    
    public async getNewsletterList(params: { category?: string; year?: string | number; month?: string } = {}): Promise<any[]> {
        const response = await axiosInstance.get("/api/newsletter/", { params });
        // Handle wrapped results or direct array
        return response.data?.data || response.data?.results || (Array.isArray(response.data) ? response.data : []);
    }

    
    public async addNewsletter(data: FormData | any): Promise<any> {
        const response = await axiosInstance.post("/api/newsletter/", data);
        return response.data;
    }

    
    public async getNewsletterById(id: number | string): Promise<any> {
        const response = await axiosInstance.get(`/api/newsletter/${id}/`);
        return response.data;
    }

    
    public async updateNewsletter(id: number | string, data: FormData | any): Promise<any> {
        const response = await axiosInstance.patch(`/api/newsletter/${id}/`, data);
        return response.data;
    }

    
    public async deleteNewsletter(id: number | string): Promise<any> {
        const response = await axiosInstance.delete(`/api/newsletter/${id}/`);
        return response.data;
    }
}

export const newsletterService = new NewsletterService();
