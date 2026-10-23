import axiosApi from "../../lib/axiosApi";
import type {
  UserType,
  UserWithDepartment,
  UserRegisterType,
  UserResponse,
  LoginFormData,
  UserUpdateType,
} from "@/types/user";

export async function registerUser(
  body: UserRegisterType,
): Promise<UserResponse> {
  const { data } = await axiosApi.post<UserResponse>("/users/", body);
  return data;
}

export async function getMe(): Promise<UserType> {
  const res = await axiosApi.get("users/me");
  return res.data;
}

export async function getUsers(department_id?: string): Promise<UserWithDepartment[]> {
  const res = await axiosApi.get("users/", {
    params: {
      department_id,
    },
  });

  return res.data;
}

export async function login(body: LoginFormData) {
  const res = await axiosApi.post("/users/login", body);
  return res.data;
}

export async function logout() {
  const res = await axiosApi.post("/users/logout");
  return res.data;
}

export async function userUpdate({ id, data }: { id: string, data: UserUpdateType }): Promise<UserType> {
    const res = await axiosApi.patch(`/users/${id}`, data);
    return res.data;
}

export async function userDetail(id: string): Promise<UserType> {
  const res = await axiosApi.get(`/users/${id}`);
  return res.data;
}

export async function deleteUser(id: string): Promise<void> {
  await axiosApi.delete(`/admin/users/${id}`);
}