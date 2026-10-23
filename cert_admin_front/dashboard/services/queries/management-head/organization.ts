import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  createManagementHeadDepartment,
  deleteManagementHeadDepartment,
  updateManagementHeadDepartment,
} from "@/services/requests/management-head/departments";
import {
  createManagementHeadUser,
  deleteManagementHeadUser,
  updateManagementHeadUser,
} from "@/services/requests/management-head/users";
import type {
  UserRegisterType,
  UserResponse,
  UserType,
  UserUpdateType,
} from "@/types/user";
import type { DepartmentUpdateType } from "@/types/departments";
import type { ApiErrorResponse } from "@/types/main";

function useInvalidateManagementOrganization() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["departments"] });
    queryClient.invalidateQueries({ queryKey: ["department"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["managements"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };
}

export function useCreateManagementHeadDepartment() {
  const invalidate = useInvalidateManagementOrganization();
  return useMutation({
    mutationFn: createManagementHeadDepartment,
    onSuccess: invalidate,
  });
}

export function useUpdateManagementHeadDepartment() {
  const invalidate = useInvalidateManagementOrganization();
  return useMutation({
    mutationFn: (data: DepartmentUpdateType) =>
      updateManagementHeadDepartment(data),
    onSuccess: invalidate,
  });
}

export function useDeleteManagementHeadDepartment() {
  const invalidate = useInvalidateManagementOrganization();
  return useMutation({
    mutationFn: deleteManagementHeadDepartment,
    onSuccess: invalidate,
  });
}

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
