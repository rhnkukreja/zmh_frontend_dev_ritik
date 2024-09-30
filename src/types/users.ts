export type Login = {
  token: string;
  user_id: number;
  user_type: string;
  user_name: string;
  saved_search?: any;
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
};
