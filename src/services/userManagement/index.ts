import { axiosInstance } from "../index";
import { CreateUserDTO, UserManagement, UserManagementFilters, UserManagementResponse, UpdateUserDTO } from "@/types/userManagement";

class UserManagementService {
  /**
   * Fetch all users with optional filters
   */
  public async getUsers(filters?: UserManagementFilters): Promise<UserManagementResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) {
        params.append("search", filters.search);
      }
      
      if (filters?.is_active !== undefined) {
        // Try 'active' parameter name as backend might expect this
        params.append("active", filters.is_active.toString());
      }
      
      if (filters?.user_type) {
        params.append("user_type", filters.user_type);
      }
      
      if (filters?.subscription) {
        params.append("subscription", filters.subscription);
      }
      
      if (filters?.page) {
        params.append("page", filters.page.toString());
      }
      
      if (filters?.page_size) {
        params.append("page_size", filters.page_size.toString());
      }
      
      const queryString = params.toString();
      const url = `/user/register/${queryString ? `?${queryString}` : ''}`;
      
      const response = await axiosInstance.get<UserManagementResponse>(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new user
   */
  public async createUser(userData: CreateUserDTO): Promise<UserManagement> {
    try {
      const response = await axiosInstance.post<UserManagement>("/user/register/", userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user
   */
  public async updateUser(userId: number, userData: UpdateUserDTO): Promise<UserManagement> {
    try {
      const response = await axiosInstance.patch<UserManagement>(
        `/user/register/${userId}/`,
        userData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a user
   */
  public async deleteUser(userId: number): Promise<void> {
    try {
      await axiosInstance.delete(`/user/register/${userId}/`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single user by ID
   */
  public async getUserById(userId: number): Promise<UserManagement> {
    try {
      const response = await axiosInstance.get<UserManagement>(`/user/register/${userId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();
