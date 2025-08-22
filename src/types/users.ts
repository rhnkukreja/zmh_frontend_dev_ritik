import { Finhub } from "@/stores/authenticationSlice";

export type Login = {
  token: string;
  user_id: number;
  user_type: string;
  user_name: string;
  saved_search?: any;
  company_id?: number;
  company_name?: string;
  company_ticker?: string;
  finnhub?: Finhub;
};

export type Register = {
  token: string;
  user_id: number;
  username: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type: string;
  date_created: string;
  date_updated: string;
  confirm_password?: string;
  message?: string;
  
};
export type  OTP = {
  email: string;
  message: string;
 
};
export type  verifiedOTP = {
  email: string;
  message: string;
 
};
export type  verifiedSignUpOTP = {
  email: string;
  message: string;
 
};