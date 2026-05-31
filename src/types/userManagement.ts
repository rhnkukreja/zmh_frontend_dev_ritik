export interface UserManagement {
  id: number;
  username: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  last_login: string | null;
  account_creation: string;
  account_age_days?: number;
  user_type?: string;
  subscription?: string;
  duration_days?: number;
  user_company?: string;
}

export type UserType = 'admin' | 'client' | 'zmh_employee';

export type SubscriptionType = 'Trial' | 'Trial Ended' | 'Paying';

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  user_type: UserType;
  subscription: SubscriptionType;
  duration_days: number;
  user_company?: string;
  user_actual_company?: number | null;
  user_role?: string;
}

export interface UpdateUserDTO {
  username?: string;
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  user_type?: UserType;
  subscription?: SubscriptionType;
  duration_days?: number;
  user_company?: string;
  user_actual_company?: number | null;
  user_role?: string;
}

export interface UserManagementResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserManagement[];
}

export interface UserManagementFilters {
  search?: string;
  is_active?: boolean;
  user_type?: string;
  subscription?: string;
  page?: number;
  page_size?: number;
}

export interface UserCountResponse {
  count: number;
}
