import { useMutation } from "@tanstack/react-query";
import { useInvalidateManagementOrganization } from "@/shared/lib/useInvalidateManagementOrganization";
import {
  createManagementHeadDepartment,
  deleteManagementHeadDepartment,
  updateManagementHeadDepartment,
} from "../api/management-head";
import type { DepartmentUpdateType } from "./types";

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
