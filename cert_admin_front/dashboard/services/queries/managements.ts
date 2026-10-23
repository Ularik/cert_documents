import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createManagement,
  deleteManagement,
  getManagement,
  getManagements,
  updateManagement,
} from "@/services/requests/managements";

export function useManagements() {
  return useQuery({
    queryKey: ["managements"],
    queryFn: getManagements,
  });
}

export function useManagement(id: number) {
  return useQuery({
    queryKey: ["management", id],
    queryFn: () => getManagement(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

function useInvalidateOrganizationQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["managements"] });
    queryClient.invalidateQueries({ queryKey: ["management"] });
    queryClient.invalidateQueries({ queryKey: ["departments"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };
}

export function useCreateManagement() {
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({
    mutationFn: createManagement,
    onSuccess: invalidate,
  });
}

export function useUpdateManagement() {
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({
    mutationFn: updateManagement,
    onSuccess: invalidate,
  });
}

export function useDeleteManagement() {
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({
    mutationFn: deleteManagement,
    onSuccess: invalidate,
  });
}
