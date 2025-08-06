import { axiosInstance } from "../index";
 
export const getProxyContestDropdownValues = async () => {
  const response = await axiosInstance.get("/api/proxy-contest-dropdown/");
  return response.data;
}; 