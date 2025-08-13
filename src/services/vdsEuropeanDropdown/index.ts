import { axiosInstance } from "../index";
 
export const getVdsEuropeanDropdownValues = async () => {
  const response = await axiosInstance.get("/get_vds_european_dropdown_values/");
  return response.data;
}; 