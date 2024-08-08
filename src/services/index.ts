import { baseURL } from "@/constant";
import axios, {
  AxiosError,
  AxiosInstance as AxiosInstanceType,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "react-toastify";

const multipartFormDataUrls = [
  "/investor_profile/",
  "/proxy_voting_guidelines/",
  "/institute/",
];

function APIErrors(message: string) {
  toast.error(message);
}
class AxiosServiceConfig {
  private static instance: AxiosInstanceType;

  public static getInstance(): AxiosInstanceType {
    if (!AxiosServiceConfig.instance) {
      AxiosServiceConfig.instance = axios.create({
        baseURL: baseURL,
        // timeout: 10000,
      });

      AxiosServiceConfig.instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
          const token = localStorage.getItem("token");
          if (token) {
            config.headers["Authorization"] = `JWT ${token}`;
          }

          const isMultipartFormData = multipartFormDataUrls.some((urlPattern) =>
            config?.url?.includes(urlPattern)
          );

          if (
            (isMultipartFormData && config.method === "post") ||
            config.method === "put"
          ) {
            config.headers["Content-Type"] = `multipart/form-data`;
          } else {
            config.headers["Content-Type"] = `application/json`;
          }

          return config;
        },
        (error: AxiosError) => {
          return Promise.reject(error);
        }
      );

      AxiosServiceConfig.instance.interceptors.response.use(
        (response: AxiosResponse) => {
          return response;
        },
        (error: AxiosError) => {
          let errorMessage = "";

          if (error.response) {
            const { data } = error.response as any;
            if (typeof data === "string") {
              errorMessage = data;
            } else if (Array.isArray(data.message)) {
              errorMessage = data.message.join(", ");
            } else if (typeof data === "object") {
              errorMessage = "";
              for (const key in data) {
                if (Array.isArray(data[key])) {
                  errorMessage += `${data[key].join(", ")} `;
                } else if (typeof data[key] === "string") {
                  errorMessage += `${data[key]} `;
                }
              }
              errorMessage = errorMessage.trim() || "An unknown error occurred";
            } else {
              errorMessage = "An unknown error occurred";
            }
          } else if (error.request) {
            errorMessage = "No response received from server";
          } else {
            errorMessage = error.message;
          }

          APIErrors(errorMessage);
          return Promise.reject(new Error(errorMessage));
        }
      );
    }

    return AxiosServiceConfig.instance;
  }
}

export const axiosInstance = AxiosServiceConfig.getInstance();
