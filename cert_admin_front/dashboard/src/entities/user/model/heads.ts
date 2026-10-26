import {
    headsCreateUser,
    headsUserUpdate,
    headsDeleteUser,
} from "../api/heads";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { UserUpdateType } from "./types";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "@/shared/types/main";
import type { UserRegisterType, UserResponse } from "./types";

export function useHeadUserCreate() {
    const queryClient = useQueryClient();
    return useMutation<
        UserResponse,
        AxiosError<ApiErrorResponse>,
        UserRegisterType
    >({
        mutationFn: headsCreateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
    });
}

export function useHeadUserUpdate() {
    const queryClient = useQueryClient();

    return useMutation<unknown, AxiosError<ApiErrorResponse>, { id: string; data: UserUpdateType }>({
        mutationFn: ({ id, data }) => headsUserUpdate({ id, data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
    });
}

export function useHeadUserDelete() {
    const queryClient = useQueryClient();
    return useMutation<unknown, AxiosError<ApiErrorResponse>, string>({
        mutationFn: (id: string) => headsDeleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["departments"] });
        }
    });
}