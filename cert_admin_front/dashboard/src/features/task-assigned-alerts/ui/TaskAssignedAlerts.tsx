"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useMarkNotificationsRead, useUnreadNotifications } from "@/entities/notification";
import type { NotificationType } from "@/entities/notification";
import { formatTaskDeadline } from "@/entities/task";
import { roleDashboardPaths, useMe } from "@/entities/user";

/** Больше стольких новых задач — показываем одно общее уведомление */
const MAX_SEPARATE_TOASTS = 3;
const SUMMARY_TOAST_ID = "task-assigned-summary";

/**
 * Всплывающие уведомления о назначении исполнителем задачи. Непрочитанные
 * уведомления опрашиваются раз в 15 секунд; уведомление считается прочитанным,
 * когда его открыли или закрыли.
 */
export default function TaskAssignedAlerts() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useMe();
  const { data: notifications = [] } = useUnreadNotifications(Boolean(user));
  // mutate у TanStack Query стабилен между рендерами
  const { mutate: markRead } = useMarkNotificationsRead();
  const shown = useRef(new Set<number>());

  useEffect(() => {
    if (!user) return;
    const fresh = notifications.filter((n) => !shown.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => shown.current.add(n.id));
    // в списках задач должна появиться новая
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });

    const tasksPath = `${roleDashboardPaths[user.status] ?? ""}/tasks`;
    const allUnread = notifications;

    if (allUnread.length > MAX_SEPARATE_TOASTS) {
      allUnread.forEach((n) => toast.dismiss(`task-assigned-${n.id}`));
      const ids = allUnread.map((n) => n.id);
      toast.info(`Вам назначено новых задач: ${allUnread.length}`, {
        id: SUMMARY_TOAST_ID,
        duration: Infinity,
        closeButton: true,
        description: allUnread
          .slice(0, MAX_SEPARATE_TOASTS)
          .map((n) => n.task_title)
          .join(", ") + (allUnread.length > MAX_SEPARATE_TOASTS ? "…" : ""),
        action: {
          label: "К задачам",
          onClick: () => {
            markRead(ids);
            router.push(tasksPath);
          },
        },
        onDismiss: () => markRead(ids),
      });
      return;
    }

    fresh.forEach((n: NotificationType) => {
      const details = [
        n.author_name ? `Назначил: ${n.author_name}` : null,
        n.task_deadlines ? `Срок: ${formatTaskDeadline(n.task_deadlines)}` : null,
      ].filter(Boolean);
      toast.info(`Новая задача: ${n.task_title}`, {
        id: `task-assigned-${n.id}`,
        duration: Infinity,
        closeButton: true,
        description: details.length ? details.join(" · ") : undefined,
        action: {
          label: "Открыть",
          onClick: () => {
            markRead([n.id]);
            router.push(`${tasksPath}/${n.task_id}`);
          },
        },
        onDismiss: () => markRead([n.id]),
      });
    });
  }, [notifications, user, queryClient, router, markRead]);

  return null;
}
