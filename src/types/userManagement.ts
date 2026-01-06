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
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
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
  page?: number;
  page_size?: number;
}
