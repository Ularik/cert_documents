

export type UserRole =
  | "ADMIN"
  | "DIVISION_HEAD"
  | "MANAGEMENT_HEAD"
  | "HEAD"
  | "DEPUTY"
  | "USER";


export interface UserType {
  id: string;
  username: string;
  last_name: string;
  /** Роль для прав доступа (у пользователей из ADMIN_USERS — ADMIN) */
  status: UserRole;
  /** Собственная роль пользователя в БД (только у /users/me) */
  own_status?: UserRole;
  department_id: string | null;
  management_id?: string | null;
}

export interface UserTasksStats {
  id: number;
  username: string;
  last_name: string | null;
  status: UserRole;
  department_id: number | null;
  department_title: string | null;
  total: number;
  new: number;
  progress: number;
  done: number;
  expired: number;
  /** Время первого входа за сегодня (ISO) или null, если сегодня не входил */
  first_login_at: string | null;
}

export interface UserUpdateType {
  username: string | null;
  last_name: string | null;
  status: UserRole | null;
  department_id: string | null;
  management_id?: number | null;
}

export interface UserRegisterType {
  username: string;
  last_name: string;
  status: UserRole | null;
  department_id: string | null;
  management_id?: number | null;
  password: string;
}

export interface UserRegisterCheckType {
  username: string;
  last_name: string;
  status: UserRole | null;
  department_id: string | null;
  password: string;
  confirmPassword: string;
}

export interface UserResponse {
  id: number;
  username: string;
  last_name: string;
  status: UserRole;
  department_id: string | null;
}

export interface UserWithDepartment {
  id: string;
  username: string;
  last_name: string | null;
  status: UserRole;
  department_id: string | null;  
  department_title: string | null;
  management_id?: string | null;
}

export interface LoginFormData {
  username: string;
  last_name: string;
  password: string;
}