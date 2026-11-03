"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { calendarTasksQueryOptions, formatTaskDeadline } from "@/entities/task";
import type { TaskCalendarItemType } from "@/entities/task";
import { useMe } from "@/entities/user";

import {
  ALERT_WINDOW_DAYS,
  alertScope,
  alertStorageKey,
  currentAlertSlot,
  pluralTasks,
} from "../model/schedule";

const TOAST_ID = "deadline-alerts";
const CHECK_INTERVAL_MS = 30_000;
const MAX_LISTED = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Напоминания о приближающихся сроках задач: всплывают в 9:00 и в 15:00.
 * Каждый слот показывается один раз (запоминается в localStorage), а если
 * пользователь открыл систему позже, пропущенный слот текущего дня
 * показывается сразу.
 */
export default function DeadlineAlerts() {
  const { data: user } = useMe();
  const queryClient = useQueryClient();
  const router = useRouter();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!user) return;
    const storageKey = alertStorageKey(user.id);
    const scope = alertScope(user);

    const showAlert = (tasks: TaskCalendarItemType[]) => {
      const listed = tasks.slice(0, MAX_LISTED);
      toast.warning(`Приближается срок: ${pluralTasks(tasks.length)}`, {
        id: TOAST_ID,
        duration: Infinity,
        closeButton: true,
        description: (
          <ul className="mt-1 space-y-1">
            {listed.map((task) => (
              <li key={task.id} className="leading-snug">
                <Link
                  href={`${scope.taskBasePath}/${task.id}`}
                  onClick={() => toast.dismiss(TOAST_ID)}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {task.title}
                </Link>
                <span className="block text-xs opacity-75">
                  до {formatTaskDeadline(task.deadlines)}
                </span>
              </li>
            ))}
            {tasks.length > listed.length && (
              <li className="text-xs opacity-75">
                и ещё {pluralTasks(tasks.length - listed.length)}
              </li>
            )}
          </ul>
        ),
        action: {
          label: "Все задачи",
          onClick: () => router.push(scope.tasksListPath),
        },
      });
    };

    const check = async () => {
      const now = new Date();
      const slot = currentAlertSlot(now);
      if (!slot || inFlight.current) return;
      if (localStorage.getItem(storageKey) === slot) return;

      // отмечаем слот заранее, чтобы другие вкладки не показали его повторно
      localStorage.setItem(storageKey, slot);
      inFlight.current = true;
      try {
        const tasks = await queryClient.fetchQuery({
          ...calendarTasksQueryOptions(
            {
              deadline_from: now.toISOString(),
              deadline_to: new Date(now.getTime() + ALERT_WINDOW_DAYS * DAY_MS).toISOString(),
              ...scope.params,
            },
            scope.calendarPath,
          ),
          staleTime: 0,
        });
        const upcoming = tasks.filter((task) => task.status !== "DONE");
        if (upcoming.length > 0) showAlert(upcoming);
      } catch {
        // не удалось загрузить — попробуем при следующей проверке
        localStorage.removeItem(storageKey);
      } finally {
        inFlight.current = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, queryClient, router]);

  return null;
}
