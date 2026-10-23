import type { TasksApiResponseType, TaskType } from "@/types/tasks";
import axiosApi from "@/lib/axiosApi";
import { PagingParams } from "@/types/main";
import type {
  TaskCreateType,
  TaskStatusUpdateType,
  TaskUpdateType,
} from "@/types/tasks";
import buildTaskFormData from "@/services/utils";

export async function getTasks(
  params: PagingParams,
  tasksPath = "/tasks/",
): Promise<TasksApiResponseType> {
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(params.limit));
  queryParams.set("offset", String(params.offset));

  if (params.department_id)
    queryParams.set("department_id", params.department_id);
  if (params.management_id)
    queryParams.set("management_id", params.management_id);
  if (params.from_date) queryParams.set("from_date", params.from_date);
  if (params.to_date) queryParams.set("to_date", params.to_date);
  if (params.rush !== undefined) queryParams.set("rush", String(params.rush));
  if (params.extra_rush !== undefined)
    queryParams.set("extra_rush", String(params.extra_rush));
  if (params.is_expired !== undefined) {
    queryParams.set("is_expired", String(params.is_expired));
  }
  params.status?.forEach((status) => queryParams.append("status", status));

  const res = await axiosApi.get(tasksPath, {
    params: queryParams,
  });
  return res.data;
}

export async function getTaskDetail(
  id: string,
  tasksPath = "/tasks",
): Promise<TaskType> {
  const res = await axiosApi.get(`${tasksPath}/${id}`);
  return res.data;
}

export async function postTask(data: TaskCreateType) {
  const res = await axiosApi.post("/tasks/", buildTaskFormData(data));
  return res.data;
}

export async function putTask({
  id,
  data,
}: {
  id: string;
  data: TaskUpdateType;
}) {
  const res = await axiosApi.put(`/tasks/${id}`, buildTaskFormData(data));
  return res.data;
}

export async function patchTaskStatus({
  id,
  data,
}: {
  id: string;
  data: TaskStatusUpdateType;
}) {
  const res = await axiosApi.patch(`/tasks/${id}`, data);
  return res.data;
}

export async function deleteTask(id: string) {
  await axiosApi.delete(`/tasks/${id}`);
}