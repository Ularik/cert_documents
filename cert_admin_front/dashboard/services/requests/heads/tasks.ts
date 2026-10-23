import type {
  TaskCreateType,
  TaskUpdateType,
  TaskStatusUpdateType,
} from "@/types/tasks";
import axiosApi from "@/lib/axiosApi";
import buildTaskFormData from "@/services/utils";

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

export async function deleteHeadsTask(id: string) {
  await axiosApi.delete(`/head/tasks/${id}`);
}
