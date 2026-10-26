import { DepartmentLiteType } from "@/entities/department/@x/task";
import { DocumentLiteType } from "@/entities/document/@x/task";
import { UserType } from "@/entities/user/@x/task";

export type TasksStatus = "NEW" | "PROGRESS" | "DONE";


export interface TaskStatusUpdateType {
  status: TasksStatus;
}


export type TaskTargetType = "MANAGEMENTS" | "DEPARTMENTS" | "EXECUTORS";

export interface TaskManagementType {
  id: number;
  title: string;
}

export interface TaskCreateType {
  title: string;
  description?: string | null;
  deadlines: Date | null;
  note?: string | null;
  management_ids: string[];
  departments_ids: string[];
  executor_ids: string[];
  attachments: File[];
}

export interface TaskUpdateType {
  title: string;
  description?: string | null;
  deadlines: Date | null;
  note?: string | null;
  management_ids: string[];
  departments_ids: string[];
  executor_ids: string[];
  attachments: File[];
  old_attachments_ids: string[];
}

export interface TaskFormInputs {
  title: string;
  description: string;
  deadlines: Date | null;
  note: string | null;
  management_ids: string[];
  departments_ids: string[];
  executor_ids: string[];
}


export interface TaskType {
  id: string;
  target_type: TaskTargetType;
  can_edit: boolean;
  status: TasksStatus;
  author_id: string;
  author: UserType;
  title: string;
  description: string | null;
  deadlines: Date | null;
  note: string | null;
  managements: TaskManagementType[];
  departments: DepartmentLiteType[];
  executors: UserType[];
  attachments: DocumentLiteType[];
  created_at: Date;
  updated_at: Date;
}

export interface TasksApiResponseType {
  total: number;
  items: TaskType[];
}