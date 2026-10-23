import type {
  TaskCreateType,
  TaskStatusUpdateType,
  TaskUpdateType,
} from "@/types/tasks";
import axiosApi from "@/lib/axiosApi";
import buildTaskFormData from "@/services/utils";

const TASKS_PATH = "/management-head/tasks";

export async function postManagementHeadTask(data: TaskCreateType) {
  const res = await axiosApi.post(`${TASKS_PATH}/`, buildTaskFormData(data));
  return res.data;
}

export async function putManagementHeadTask({
  id,
  data,
}: {
  id: string;
  data: TaskUpdateType;
}) {
  const res = await axiosApi.put(
    `${TASKS_PATH}/${id}`,
    buildTaskFormData(data),
  );
  return res.data;
}

export async function patchManagementHeadTaskStatus({
  id,
  data,
}: {
  id: string;
  data: TaskStatusUpdateType;
}) {
  const res = await axiosApi.patch(`${TASKS_PATH}/${id}`, data);
  return res.data;
}

export async function deleteManagementHeadTask(id: string) {
  await axiosApi.delete(`${TASKS_PATH}/${id}`);
}
