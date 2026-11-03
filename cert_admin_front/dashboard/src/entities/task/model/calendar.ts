import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { getCalendarTasks } from "../api/calendar";
import type { TaskCalendarParams } from "./types";

// ключ начинается с "tasks", чтобы мутации задач обновляли и календарь
export const calendarTasksQueryOptions = (
  params: TaskCalendarParams,
  calendarPath = "/tasks/calendar",
) =>
  queryOptions({
    queryKey: ["tasks", "calendar", calendarPath, params],
    queryFn: () => getCalendarTasks(params, calendarPath),
  });

export const useCalendarTasks = (
  params: TaskCalendarParams,
  calendarPath = "/tasks/calendar",
) => {
  return useQuery({
    ...calendarTasksQueryOptions(params, calendarPath),
    placeholderData: keepPreviousData,
  });
};
