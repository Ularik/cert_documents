import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { registerUser, login, 
  getMe, logout, 
  getUsers, userUpdate, 
  userDetail, deleteUser,
  getUsersTasksStats, getMyTasksStats,
  switchRole,
} from "../api/users";


export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    }
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => userDetail(id),
  });
}

export function useUsers(department_id?: string) {
  return useQuery({
    queryKey: ["users", department_id],
    queryFn: () => getUsers(department_id),
  });
}

/** usersPath: "/admin/users" или "/management-head/users" — зависит от роли. */
export function useUsersTasksStats(usersPath = "/admin/users") {
  return useQuery({
    queryKey: ["users", "tasks-stats", usersPath],
    queryFn: () => getUsersTasksStats(usersPath),
  });
}

export function useMyTasksStats() {
  return useQuery({
    queryKey: ["users", "tasks-stats", "me"],
    queryFn: getMyTasksStats,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: login,
  });
}

/** Переключение режима «заместитель начальника управления»: после него меняются права,
 *  поэтому сбрасываем весь кэш запросов. */
export function useSwitchRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: switchRole,
    onSuccess: () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
      return queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["me"]});
    }
  });
}

export function useUserUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["users"]});
      queryClient.invalidateQueries({queryKey: ["departments"]});
    }
  })
}

export function useUserDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["users"]});
      queryClient.invalidateQueries({queryKey: ["tasks"]});
    }
  })
}