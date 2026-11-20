import type {
  TaskCreateType,
  TaskUpdateType,
  TaskStatusUpdateType,
} from "../model/types";
import axiosApi from "@/shared/api/axiosApi";
import buildTaskFormData from "../lib/buildTaskFormData";

export async function postHeadsTask(data: TaskCreateType) {
  const payload = buildTaskFormData(data);
  const res = await axiosApi.post("/head/tasks/", payload);
  return res.data;
}

export async function putHeadsTask({id, data}: { id: string; data: TaskUpdateType }) {
  const form = buildTaskFormData(data);
  const res = await axiosApi.put(`/head/tasks/${id}`, form);
  return res.data;
}

export async function patchHeadsTaskStatus({
  id,
  data,
}: {
  id: string;
  data: TaskStatusUpdateType;
}) {
  const res = await axiosApi.patch(`/head/tasks/${id}`, data);
  return res.data;
}

/** Начальник отдела назначает исполнителей из своего отдела; тип задачи не меняется */
export async function patchHeadsTaskExecutors({
  id,
  executorIds,
}: {
  id: string;
  executorIds: string[];
}) {
  const res = await axiosApi.patch(`/head/tasks/${id}/executors`, {
    executor_ids: executorIds.map(Number),
  });
  return res.data;
}

export async function deleteHeadsTask(id: string) {
  await axiosApi.delete(`/head/tasks/${id}`);
}
