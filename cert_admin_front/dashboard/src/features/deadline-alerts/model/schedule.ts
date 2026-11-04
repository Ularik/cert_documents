import { toDateKey } from "@/entities/task";
import type { TaskCalendarParams } from "@/entities/task";
import type { UserType } from "@/entities/user";

/** Часы показа напоминаний (локальное время браузера) */
export const ALERT_HOURS = [9, 15] as const;
/** Насколько вперёд смотрим на сроки */
export const ALERT_WINDOW_DAYS = 3;

/**
 * Последний наступивший сегодня слот напоминания, например «2026-11-03T09».
 * До 9:00 — null. Если пользователь зашёл в 11:00, слот 9:00 ещё не показан
 * и всплывёт сразу.
 */
export function currentAlertSlot(now: Date): string | null {
  const passed = ALERT_HOURS.filter((hour) => now.getHours() >= hour);
  if (passed.length === 0) return null;
  const hour = passed[passed.length - 1];
  return `${toDateKey(now)}T${String(hour).padStart(2, "0")}`;
}

export function alertStorageKey(userId: string | number) {
  return `deadline-alerts:last-slot:${userId}`;
}

interface AlertScope {
  calendarPath: string;
  /** База ссылок на задачу */
  taskBasePath: string;
  /** Куда ведёт кнопка «Все задачи» */
  tasksListPath: string;
  params: Pick<TaskCalendarParams, "department_id" | "management_id" | "executor_id">;
}

/** Чьи задачи попадают в напоминание — по роли, как на главной панели */
export function alertScope(user: UserType): AlertScope {
  switch (user.status) {
    case "ADMIN":
    case "DIVISION_HEAD":
      return {
        calendarPath: "/tasks/calendar",
        taskBasePath: "/admin/tasks",
        tasksListPath: "/admin/tasks",
        params: {},
      };
    case "MANAGEMENT_HEAD":
      return {
        calendarPath: "/management-head/tasks/calendar",
        taskBasePath: "/management-head/tasks",
        tasksListPath: "/management-head/tasks",
        params: {},
      };
    case "HEAD":
    case "DEPUTY":
      return {
        calendarPath: "/tasks/calendar",
        taskBasePath: "/heads/tasks",
        tasksListPath: "/heads/tasks",
        params: user.department_id
          ? { department_id: String(user.department_id) }
          : { executor_id: String(user.id) },
      };
    default:
      return {
        calendarPath: "/tasks/calendar",
        taskBasePath: "/users/tasks",
        tasksListPath: "/users/tasks/my",
        params: { executor_id: String(user.id) },
      };
  }
}

function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

/** 1 задача, 2 задачи, 5 задач */
export const pluralTasks = (count: number) => plural(count, "задача", "задачи", "задач");

/** 1 заметка, 2 заметки, 5 заметок */
export const pluralNotes = (count: number) => plural(count, "заметка", "заметки", "заметок");
