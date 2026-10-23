import { DepartmentLiteType } from "./departments";
import { DocumentLiteType } from "./document";
import { UserType } from "./user";

export type TasksStatus = "NEW" | "PROGRESS" | "DONE";


export interface TaskStatusUpdateType {
  status: TasksStatus;
}


export interface TaskCreateType {
  title: string;
  description?: string | null;
  deadlines: Date | null;
  note?: string | null;
  management_id: number | null;
  departments_ids: string[];
  executor_ids: string[];
  attachments: File[];
}

export interface TaskUpdateType {
  title: string;
  description?: string | null;
  deadlines: Date | null;
  note?: string | null;
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
  departments_ids: string[];
  executor_ids: string[];
}


export interface TaskType {
  id: string;
  management_id: number;
  status: TasksStatus;
  author_id: string;
  author: UserType;
  title: string;
  description: string | null;
  deadlines: Date | null;
  note: string | null;
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