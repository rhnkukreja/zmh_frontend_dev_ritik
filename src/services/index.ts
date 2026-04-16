import { baseURL } from "@/constant";
import { persistor } from "@/stores/store";
import axios, {
  AxiosError,
  AxiosInstance as AxiosInstanceType,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "react-toastify";

const NETWORK_TOAST_ID = "global-network-error";
const NETWORK_TOAST_COOLDOWN_MS = 15000;
let lastNetworkToastAt = 0;

const multipartFormDataUrls = [
  "/investor_profile/",
  "/proxy_voting_guidelines/",
  "/institute/",
  "/company/",
  // "/institute_documents/", // Only add specific upload endpoints here
  "proxy_voting_guidelines_pdf_summary_data_upload",
  "/peer_analysis_excel_upload/",
  "/api/newsletter/"
];

const isNotMultipartFormDataUrls = [
  "/institute_documents/",
];

const logout = () => {
  localStorage.clear();
  persistor.purge();
  window.location.replace("/");
};

function showDedupedToast(message: string) {
  const normalized = (message || "").trim().toLowerCase();
  const isNetworkError =
    normalized.includes("no response received from server") ||
    normalized.includes("network error") ||
    normalized.includes("failed to fetch");

  if (!isNetworkError) {
    toast.error(message);
    return;
  }

  const now = Date.now();
  const inCooldown = now - lastNetworkToastAt < NETWORK_TOAST_COOLDOWN_MS;

  // Show only one global offline/network toast within cooldown window.
  if (toast.isActive(NETWORK_TOAST_ID) || inCooldown) {
    return;
  }

  lastNetworkToastAt = now;
  toast.error("No response received from server", {
    toastId: NETWORK_TOAST_ID,
  });
}

function APIErrors(message: string) {
  const lower = (message || "").toLowerCase();
  const shouldLogout =
    lower.includes("signature has expired") ||
    lower.includes("signature has expired.") ||
    lower.includes("authentication credentials were not provided");

  if (shouldLogout) {
    return logout();
  }

  showDedupedToast(message);
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
          let isNetworkNoResponse = false;

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
            isNetworkNoResponse = true;

          } else {
            errorMessage = error.message;
          }

          APIErrors(errorMessage);

          if (error?.response?.status === 401) {
            logout();
          }
          
          const wrappedError = new Error(errorMessage) as Error & {
            __globalToastHandled?: boolean;
          };

          if (isNetworkNoResponse) {
            wrappedError.__globalToastHandled = true;
          }

          return Promise.reject(wrappedError);
          
        }
      );
    }

    return AxiosServiceConfig.instance;
  }
}

export const axiosInstance = AxiosServiceConfig.getInstance();
