import axiosApi from "@/lib/axiosApi";
import type {
  UserRegisterType,
  UserResponse,
  UserType,
  UserUpdateType,
} from "@/types/user";

const USERS_PATH = "/management-head/users";

export async function createManagementHeadUser(
  body: UserRegisterType,
): Promise<UserResponse> {
  const res = await axiosApi.post(`${USERS_PATH}/`, body);
  return res.data;
}

export async function updateManagementHeadUser({
  id,
  data,
}: {
  id: string;
  data: UserUpdateType;
}): Promise<UserType> {
  const res = await axiosApi.patch(`${USERS_PATH}/${id}`, data);
  return res.data;
}

export async function deleteManagementHeadUser(id: string): Promise<void> {
  await axiosApi.delete(`${USERS_PATH}/${id}`);
}
