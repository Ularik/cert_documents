import axiosApi from "@/shared/api/axiosApi";
import type { TaskCalendarItemType, TaskCalendarParams } from "../model/types";

export async function getCalendarTasks(
  params: TaskCalendarParams,
  calendarPath = "/tasks/calendar",
): Promise<TaskCalendarItemType[]> {
  const queryParams = new URLSearchParams();
  queryParams.set("deadline_from", params.deadline_from);
  queryParams.set("deadline_to", params.deadline_to);
  if (params.department_id) queryParams.set("department_id", params.department_id);
  if (params.management_id) queryParams.set("management_id", params.management_id);
  if (params.executor_id) queryParams.set("executor_id", params.executor_id);

  const res = await axiosApi.get(calendarPath, { params: queryParams });
  return res.data;
}
