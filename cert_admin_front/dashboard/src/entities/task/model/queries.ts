import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTasks,
  getTaskDetail,
  patchTaskStatus,
  postTask,
  putTask,
  deleteTask
} from "../api/tasks";
import { PagingParams } from "@/shared/types/main";

export const useTasks = (
  params: PagingParams,
  tasksPath = "/tasks/",
  enabled = true,
) => {
  return useQuery({
    queryKey: ["tasks", tasksPath, params],
    queryFn: () => getTasks(params, tasksPath),
    enabled: enabled && params.management_id !== "",
  });
};

export const useTaskDetail = (id: string, tasksPath = "/tasks") => {
  return useQuery({
    queryKey: ["task", tasksPath, id],
    queryFn: () => getTaskDetail(id, tasksPath),
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: putTask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
};

export const usePatchTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchTaskStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["users", "tasks-stats"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
};


export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: deleteTask,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      },
    });
}