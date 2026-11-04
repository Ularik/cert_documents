"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StickyNote } from "lucide-react";
import { toast } from "sonner";

import { notesQueryOptions } from "@/entities/note";
import { calendarTasksQueryOptions, formatTaskDeadline } from "@/entities/task";
import { roleDashboardPaths, useMe } from "@/entities/user";

import {
  ALERT_WINDOW_DAYS,
  alertScope,
  alertStorageKey,
  currentAlertSlot,
  pluralNotes,
  pluralTasks,
} from "../model/schedule";

const TOAST_ID = "deadline-alerts";
const CHECK_INTERVAL_MS = 30_000;
const MAX_LISTED = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Пункт напоминания: задача или личная заметка */
interface AlertItem {
  key: string;
  kind: "task" | "note";
  title: string;
  deadline: string;
  href: string;
}

function alertTitle(taskCount: number, noteCount: number) {
  const parts = [
    taskCount > 0 ? pluralTasks(taskCount) : null,
    noteCount > 0 ? pluralNotes(noteCount) : null,
  ].filter(Boolean);
  return `Приближается срок: ${parts.join(" и ")}`;
}

/**
 * Напоминания о приближающихся сроках задач и личных заметок: всплывают
 * в 9:00 и в 15:00. Каждый слот показывается один раз (запоминается в
 * localStorage), а если пользователь открыл систему позже, пропущенный слот
 * текущего дня показывается сразу.
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
    // заметки открываются в календаре на главной панели
    const dashboardPath = roleDashboardPaths[user.status] ?? "/";

    const showAlert = (items: AlertItem[], taskCount: number, noteCount: number) => {
      const listed = items.slice(0, MAX_LISTED);
      const rest = items.length - listed.length;
      toast.warning(alertTitle(taskCount, noteCount), {
        id: TOAST_ID,
        duration: Infinity,
        closeButton: true,
        description: (
          <ul className="mt-1 space-y-1">
            {listed.map((item) => (
              <li key={item.key} className="leading-snug">
                <Link
                  href={item.href}
                  onClick={() => toast.dismiss(TOAST_ID)}
                  className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                >
                  {item.kind === "note" && (
                    <StickyNote className="h-3.5 w-3.5 shrink-0" aria-label="Заметка" />
                  )}
                  {item.title}
                </Link>
                <span className="block text-xs opacity-75">
                  до {formatTaskDeadline(item.deadline)}
                </span>
              </li>
            ))}
            {rest > 0 && <li className="text-xs opacity-75">и ещё {rest}</li>}
          </ul>
        ),
        action: {
          label: taskCount > 0 ? "Все задачи" : "Календарь",
          onClick: () => router.push(taskCount > 0 ? scope.tasksListPath : dashboardPath),
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
        const period = {
          deadline_from: now.toISOString(),
          deadline_to: new Date(now.getTime() + ALERT_WINDOW_DAYS * DAY_MS).toISOString(),
        };
        const [tasks, notes] = await Promise.all([
          queryClient.fetchQuery({
            ...calendarTasksQueryOptions({ ...period, ...scope.params }, scope.calendarPath),
            staleTime: 0,
          }),
          queryClient.fetchQuery({ ...notesQueryOptions(period), staleTime: 0 }),
        ]);

        const upcomingTasks = tasks.filter((task) => task.status !== "DONE");
        const items: AlertItem[] = [
          ...upcomingTasks.map((task): AlertItem => ({
            key: `task-${task.id}`,
            kind: "task",
            title: task.title,
            deadline: task.deadlines,
            href: `${scope.taskBasePath}/${task.id}`,
          })),
          ...notes.map((note): AlertItem => ({
            key: `note-${note.id}`,
            kind: "note",
            title: note.title,
            deadline: note.deadlines,
            href: dashboardPath,
          })),
        ].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

        if (items.length > 0) showAlert(items, upcomingTasks.length, notes.length);
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
