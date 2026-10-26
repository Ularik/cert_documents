import { useQueryClient } from "@tanstack/react-query";

/** Invalidates everything a management-head organization change can affect. */
export function useInvalidateManagementOrganization() {
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
