// services/UserService.ts
import { Login, Register } from "@/types/users";
import { axiosInstance } from "../index";
import { LoginRequestDTO, SendOtpDTO, SignUpRequestDTO, VerifyOtpDTO ,VerifySignUpOtpDTO} from "./auth.type";

class UserService {
  public async signUp(user: SignUpRequestDTO): Promise<any> {
    try {
      const response = await axiosInstance.post("/signup/request-otp/", user);
      return response.data;
    } catch (error) {
      return error;
    }
  }
 public async verifySignUpOtp(data: VerifySignUpOtpDTO): Promise<any> {

    try {
      const response = await axiosInstance.post("/signup/verify-otp/", data);
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
  public async sendOtp(data: SendOtpDTO): Promise<any> {

    try {
      const response = await axiosInstance.post("/api/auth/forgot-password/", data);
      return response.data;
    } catch (error) {
      return error;
    }
  }
  
 public async verifyOtp(data: VerifyOtpDTO): Promise<any> {

    try {
      const response = await axiosInstance.post("/api/auth/verify-password-reset/", data);
      return response.data;
    } catch (error) {
      return error;
    }
  }
}

export const userService = new UserService();
