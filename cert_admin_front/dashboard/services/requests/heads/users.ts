import type {
    UserRegisterType,
    UserResponse,
    UserType,
    UserUpdateType,
} from "@/types/user";
import axiosApi from "@/lib/axiosApi";

export async function headsCreateUser(
    body: UserRegisterType,
): Promise<UserResponse> {
    const res = await axiosApi.post("/head/users/", body);
    return res.data;
}

export async function headsDeleteUser(id: string): Promise<void> {
    await axiosApi.delete(`/head/users/${id}`);
}

export async function headsUserUpdate({ id, data }:
     { id: string, data: UserUpdateType }): Promise<UserType> {
    const res = await axiosApi.patch(`/head/users/${id}`, data);
    return res.data;
}