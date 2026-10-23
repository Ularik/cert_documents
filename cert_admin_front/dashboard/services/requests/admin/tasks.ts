import type {
  TaskCreateType,
  TaskUpdateType,
  TaskStatusUpdateType,
} from "@/types/tasks";
import axiosApi from "@/lib/axiosApi";
import buildTaskFormData from "@/services/utils";


export async function postAdminTask(data: TaskCreateType) {
  const payload = buildTaskFormData(data);
  const res = await axiosApi.post("/admin/tasks/", payload);
  return res.data;
}

export async function putAdminTask({ id, data }: { id: string, data: TaskUpdateType }) {
  const form = buildTaskFormData(data);
  const res = await axiosApi.put(`/admin/tasks/${id}`, form);
  return res.data;
}

export async function deleteAdminTask(id: string) {
  await axiosApi.delete(`/admin/tasks/${id}`);
}

export async function patchAdminTaskStatus({
  id,
  data,
}: {
  id: string;
  data: TaskStatusUpdateType;
}) {
  const res = await axiosApi.patch(`/admin/tasks/${id}`, data);
  return res.data;
}