// services/UserService.ts
import { Login, Register } from "@/types/users";
import { axiosInstance } from "../index";
import { LoginRequestDTO, SignUpRequestDTO } from "./auth.type";

class UserService {
  public async signUp(user: SignUpRequestDTO): Promise<any> {
    try {
      const response = await axiosInstance.post("/user/register/", user);
      return response.data;
    } catch (error) {
      return error;
    }
  }

  public async login(user: LoginRequestDTO): Promise<any> {
    try {
      const response = await axiosInstance.post("/user/login/", user);
      return response.data;
    } catch (error) {
      return error;
    }
  }
}

export const userService = new UserService();
