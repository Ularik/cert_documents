import {
    adminsUserUpdate,
    adminsDeleteUser,
    adminsCreateUser,
} from "@/services/requests/admin/users";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { UserUpdateType } from "@/types/user";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "@/types/main";
import type { UserRegisterType, UserResponse } from "@/types/user";

export function useAdminUserCreate() {
    const queryClient = useQueryClient();
    return useMutation<UserResponse, AxiosError<ApiErrorResponse>, UserRegisterType>({
        mutationFn: adminsCreateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            queryClient.invalidateQueries({ queryKey: ["managements"] });
        },
    });
}

export function useAdminUserUpdate() {
    const queryClient = useQueryClient();

    return useMutation<unknown, AxiosError<ApiErrorResponse>, { id: string; data: UserUpdateType }>({
        mutationFn: ({ id, data }) => adminsUserUpdate({ id, data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            queryClient.invalidateQueries({ queryKey: ["managements"] });
        },
    });
}

export function useAdminUserDelete() {
    const queryClient = useQueryClient();
    return useMutation<unknown, AxiosError<ApiErrorResponse>, string>({
        mutationFn: (id: string) => adminsDeleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["departments"] });
        }
    });
}