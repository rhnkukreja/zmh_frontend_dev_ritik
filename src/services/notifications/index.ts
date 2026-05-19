import { axiosInstance } from "..";


class NotificationsService {
  public async getAll(): Promise<any> {
    const response = await axiosInstance.get(`/notifications/global/`);
    return response.data;
  }

  public async create(data: any): Promise<any> {
    const payload = { ...data };
    // map frontend `active` to backend `is_active` if present
    if (payload.hasOwnProperty("active")) {
      payload.is_active = payload.active;
      delete payload.active;
    }
    const response = await axiosInstance.post(`/notifications/global/`, payload);
    return response.data;
  }

  public async update(id: number, data: any): Promise<any> {
    const payload = { ...data };
    if (payload.hasOwnProperty("active")) {
      payload.is_active = payload.active;
      delete payload.active;
    }
    const response = await axiosInstance.put(`/notifications/global/${id}/`, payload);
    return response.data;
  }

  public async patch(id: number, data: any): Promise<any> {
    const payload = { ...data };
    if (payload.hasOwnProperty("active")) {
      payload.is_active = payload.active;
      delete payload.active;
    }
    const response = await axiosInstance.patch(`/notifications/global/${id}/`, payload);
    return response.data;
  }

  public async delete(id: number): Promise<any> {
    const response = await axiosInstance.delete(`/notifications/global/${id}/`);
    return response.data;
  }
}

export const notificationsService = new NotificationsService();
