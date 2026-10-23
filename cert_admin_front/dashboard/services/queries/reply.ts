import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createReply, getReplies, deleteReply, getDetailReply, updateReply } from "../requests/reply";
import { AxiosError } from "axios";
import type { ReplyCreateType, ReplyType, ReplyUpdateType } from "@/types/replies";
import { ApiErrorResponse } from "@/types/main";


export const useReplyCreate = () => {
    const queryClient = useQueryClient();
    return useMutation<unknown, AxiosError<ApiErrorResponse>, { task_id: string; data: ReplyCreateType }>({
        mutationFn: createReply,
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["replies"]});
            queryClient.invalidateQueries({queryKey: ["tasks"]});
        }
    });
};


export const useReplyDelete = () => {
    const queryClient = useQueryClient();
    return useMutation<unknown, AxiosError<ApiErrorResponse>, string>({
        mutationFn: deleteReply,
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["replies"]})
        }
    });
};

export const useReplies = (task_id: string) => {
    return useQuery({
        queryKey: ["replies", "list", task_id],
        queryFn: () => getReplies(task_id)
    })
};

export const useDetailReply = (reply_id: string) => {
    return useQuery({
        queryKey: ["replies", "detail", reply_id],
        queryFn: () => getDetailReply(reply_id)
    })
}

export const useReplyUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ReplyType, // <-- Тип данных, которые возвращает updateReply (и приходят в onSuccess)
    AxiosError<ApiErrorResponse>, // <-- Тип ошибки
    { reply_id: string; data: ReplyUpdateType } // <-- Тип входящих переменных
  >({
    mutationFn: updateReply, // убедитесь, что сама функция updateReply возвращает Promise<ReplyType>
    onSuccess: () => {
      // 1. Обновляем кэш конкретного ответа
      queryClient.invalidateQueries({ queryKey: ["replies"] });
    },
  });
};