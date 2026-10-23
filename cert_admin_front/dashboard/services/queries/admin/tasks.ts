import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  postAdminTask,
  putAdminTask,
  patchAdminTaskStatus,
  deleteAdminTask

} from "@/services/requests/admin/tasks";


export const useCreateAdminTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postAdminTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useUpdateAdminTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putAdminTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
};

export const usePatchAdminTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchAdminTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
};

export const useDeleteAdminTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: deleteAdminTask,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      },
    });
}