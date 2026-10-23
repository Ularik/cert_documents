import {
  deleteHeadsTask,
  putHeadsTask,
  postHeadsTask,
  patchHeadsTaskStatus,
} from "@/services/requests/heads/tasks";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export const useCreateHeadsTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postHeadsTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export function useDeleteHeadsTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteHeadsTask,
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["tasks"]});
        }
    })
};

export const useUpdateHeadsTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putHeadsTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
};

export const usePatchHeadsTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchHeadsTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
};