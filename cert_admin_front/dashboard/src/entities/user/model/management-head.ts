import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useInvalidateManagementOrganization } from "@/shared/lib/useInvalidateManagementOrganization";
import type { ApiErrorResponse } from "@/shared/types/main";
import {
  createManagementHeadUser,
  deleteManagementHeadUser,
  updateManagementHeadUser,
} from "../api/management-head";
import type {
  UserRegisterType,
  UserResponse,
  UserType,
  UserUpdateType,
} from "./types";

export function useCreateManagementHeadUser() {
  const invalidate = useInvalidateManagementOrganization();
  return useMutation<
    UserResponse,
    AxiosError<ApiErrorResponse>,
    UserRegisterType
  >({
    mutationFn: (data: UserRegisterType) => createManagementHeadUser(data),
    onSuccess: invalidate,
  });
}

export function useUpdateManagementHeadUser() {
  const invalidate = useInvalidateManagementOrganization();
  return useMutation<
    UserType,
    AxiosError<ApiErrorResponse>,
    { id: string; data: UserUpdateType }
  >({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UserUpdateType;
    }) => updateManagementHeadUser({ id, data }),
    onSuccess: invalidate,
  });
}

export function useDeleteManagementHeadUser() {
  const invalidate = useInvalidateManagementOrganization();
  return useMutation<void, AxiosError<ApiErrorResponse>, string>({
    mutationFn: deleteManagementHeadUser,
    onSuccess: invalidate,
  });
}
