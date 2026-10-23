import type { UserRegisterType, UserResponse, UserType, UserUpdateType } from "@/types/user";
import axiosApi from "@/lib/axiosApi";


export async function adminsDeleteUser(id: string): Promise<void> {
    await axiosApi.delete(`/admin/users/${id}`);
}

export async function adminsCreateUser(
    body: UserRegisterType,
): Promise<UserResponse> {
    const { data } = await axiosApi.post<UserResponse>("/admin/users/", body);
    return data;
}

export async function adminsUserUpdate({ id, data }:
     { id: string, data: UserUpdateType }): Promise<UserType> {
    const res = await axiosApi.patch(`/admin/users/${id}`, data);
    return res.data;
}