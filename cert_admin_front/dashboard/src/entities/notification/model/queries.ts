import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markNotificationsRead } from "../api/notifications";

/** Как часто проверяем новые уведомления, пока вкладка открыта */
export const NOTIFICATIONS_POLL_MS = 15_000;

export function useUnreadNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => getNotifications({ unread: true }),
    enabled,
    refetchInterval: NOTIFICATIONS_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) => markNotificationsRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
