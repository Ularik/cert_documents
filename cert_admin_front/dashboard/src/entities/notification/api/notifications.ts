import axiosApi from "@/shared/api/axiosApi";
import type { NotificationType } from "../model/types";

export async function getNotifications(params: { unread?: boolean; limit?: number } = {}) {
  const { data } = await axiosApi.get<NotificationType[]>("/notifications/", { params });
  return data;
}

/** ids не переданы — отметить прочитанными все свои уведомления */
export async function markNotificationsRead(ids?: number[]) {
  await axiosApi.post("/notifications/read", ids ? { ids } : {});
}
