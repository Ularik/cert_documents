import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDepartments,
  createDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../requests/departments";


export const useDepartments = () => {
    return useQuery({
        queryKey: ["departments"],
        queryFn: getDepartments
    });
};


export const useAddDepartments = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationKey: ["departments"],
      mutationFn: createDepartments,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        queryClient.invalidateQueries({ queryKey: ["users"] });
      },
    });
};

export const useOneDepartment = (department_id: string) => {
  return useQuery({
    queryKey: ["department", department_id],
    queryFn: () => getDepartmentById(department_id),
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["managements"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};