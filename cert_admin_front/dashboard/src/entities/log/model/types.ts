import type { UserRole } from "@/entities/user/@x/log";

export interface LogUserType {
  id: number;
  username: string;
  last_name: string | null;
  status: UserRole;
}

export interface LogType {
  id: number;
  created_at: string;
  level: string;
  /** Тип лога = имя логгера на бэкенде, например app.auth, app.tasks */
  logger: string;
  message: string;
  user_id: number | null;
  user: LogUserType | null;
  ip_address: string | null;
  user_agent: string | null;
  data: Record<string, unknown> | null;
}

export interface LogsApiResponseType {
  total: number;
  items: LogType[];
}

export interface LogsParams {
  limit: number;
  offset: number;
  logger?: string;
  level?: string;
  user_id?: number;
  search?: string;
  from_date?: string;
  to_date?: string;
}
