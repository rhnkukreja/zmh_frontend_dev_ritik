import { baseURL } from "@/constant";
import { persistor } from "@/stores/store";
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
  "/company/",
  "/institute_documents/",
  "proxy_voting_guidelines_pdf_summary_data_upload",
  "/peer_analysis_excel_upload/"
];

const isNotMultipartFormDataUrls = [
  "/institute_documents/",
];

const logout = () => {
  localStorage.clear();
  persistor.purge();
  window.location.replace("/");
};

function APIErrors(message: string) {
  if (
    message &&
    message
      ?.toLowerCase()
      .includes(
        "Signature has expired".toLowerCase() ||
          "signature has expired.".toLowerCase() ||
          "Authentication credentials were not provided".toLowerCase()
      )
  ) {
    return logout();
  } else {
    toast.error(message);
  }
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

          const isNotMultiPartFormData = multipartFormDataUrls.some((urlPattern) =>
            config?.url?.includes(urlPattern)
          );

          if (
            (isMultipartFormData && (config.method === "post" || config.method === "put")) || (config.method === "put" && !isNotMultipartFormDataUrls)
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
            // Don't show toast for 404 errors - they're normal when no data exists
            if (error.response.status === 404) {
              console.log("404 error - no data found, this is normal");
              return Promise.reject(error);
            }

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

          if(error?.status === 401){
            logout();
          }
          
          return Promise.reject(new Error(errorMessage));
          
        }
      );
    }

    return AxiosServiceConfig.instance;
  }
}

export const axiosInstance = AxiosServiceConfig.getInstance();
