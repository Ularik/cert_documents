import type { DepartmentLiteType } from "./departments";
import type { UserType } from "./user";

export interface ManagementType {
  id: number;
  title: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  head: UserType | null;
  departments: DepartmentLiteType[];
}

export interface ManagementFormType {
  title: string;
  description: string;
  head_id: number | null;
}

export interface ManagementUpdateType extends ManagementFormType {
  id: number;
}
