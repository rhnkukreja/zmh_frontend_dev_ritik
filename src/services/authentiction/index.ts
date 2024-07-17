// services/UserService.ts
import { axiosInstance } from "../index";
import {LoginRequestDTO ,  SignUpRequestDTO } from "./auth.type";
import { UserResponseDTO } from "./auth.type";

class UserService {
  public async signUp(user: SignUpRequestDTO): Promise<UserResponseDTO> {
    const response = await axiosInstance.post("/user/register", user);
    return new UserResponseDTO(
      response.data.id,
      response.data.name,
      response.data.email
    );
  }

  public async login(user: LoginRequestDTO): Promise<UserResponseDTO> {
    const response = await axiosInstance.post("/user/login/", user);
    return new UserResponseDTO(
      response.data.id,
      response.data.name,
      response.data.email
    );
  }
}

export const userService = new UserService();
