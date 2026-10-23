import { UserType } from "./user";

export interface DepartmentCreateType {
  title: string;
  description: string;
  management_id: number | null;
  head_id: number | null;
  deputy_head_id: number | null;
}

export interface DepartmentType {
  id: string;
  title: string;
  description: string;
  management_id: number;
  head: UserType | null;
  deputy_head: UserType | null;
  created_at: Date;
  updated_at: Date;
}


export interface DepartmentLiteType {
  id: string;
  title: string;
}

export interface DepartmentUpdateType {
  id: string;
  title: string;
  description: string;
  management_id: number;
  head_id: number | null;
  deputy_head_id: number | null;
}