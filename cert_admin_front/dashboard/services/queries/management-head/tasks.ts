import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteManagementHeadTask,
  patchManagementHeadTaskStatus,
  postManagementHeadTask,
  putManagementHeadTask,
} from "@/services/requests/management-head/tasks";

export const useCreateManagementHeadTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postManagementHeadTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useUpdateManagementHeadTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putManagementHeadTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
};

export const useDeleteManagementHeadTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManagementHeadTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const usePatchManagementHeadTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchManagementHeadTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
};
