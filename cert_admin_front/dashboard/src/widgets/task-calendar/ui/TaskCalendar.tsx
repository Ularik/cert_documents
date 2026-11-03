"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
} from "lucide-react";

import {
  formatTaskDeadlineTime,
  toDateKey,
  useCalendarTasks,
} from "@/entities/task";
import type { TaskCalendarItemType } from "@/entities/task";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

interface TaskCalendarProps {
  /** Эндпоинт календаря: "/tasks/calendar" или "/management-head/tasks/calendar" */
  calendarApiPath?: string;
  /** База ссылок на задачу: "/admin/tasks", "/heads/tasks", … */
  taskBasePath: string;
  /** Страница создания задачи; если указана, можно создать задачу на выбранную дату */
  createTaskPath?: string;
  departmentId?: string;
  managementId?: string;
}

type MarkerKind = "expired" | "DONE" | "PROGRESS" | "NEW";

const MARKERS: Record<MarkerKind, { label: string; dot: string; badge: string }> = {
  expired: { label: "Просрочена", dot: "bg-red-500", badge: "border-red-200 bg-red-50 text-red-700" },
  NEW: { label: "Новая", dot: "bg-sky-500", badge: "border-sky-200 bg-sky-50 text-sky-700" },
  PROGRESS: { label: "В работе", dot: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  DONE: { label: "Выполнена", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

const LEGEND_ORDER: MarkerKind[] = ["NEW", "PROGRESS", "DONE", "expired"];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const GRID_DAYS = 42; // 6 недель
const MAX_DOTS = 3;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Понедельник недели, в которую попадает первое число месяца */
function gridStart(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const weekday = (first.getDay() + 6) % 7; // 0 = понедельник
  return addDays(first, -weekday);
}

function markerKind(task: TaskCalendarItemType, now: Date): MarkerKind {
  if (task.status === "DONE") return "DONE";
  if (task.is_expired || new Date(task.deadlines) < now) return "expired";
  return task.status;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function TaskCalendar({
  calendarApiPath = "/tasks/calendar",
  taskBasePath,
  createTaskPath,
  departmentId,
  managementId,
}: TaskCalendarProps) {
  const [now] = useState(() => new Date());
  const today = startOfDay(now);
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

  const start = gridStart(month);
  const days = Array.from({ length: GRID_DAYS }, (_, index) => addDays(start, index));

  const { data: tasks = [], isPending, isError, isFetching } = useCalendarTasks(
    {
      deadline_from: start.toISOString(),
      deadline_to: addDays(start, GRID_DAYS).toISOString(),
      department_id: departmentId,
      management_id: managementId,
    },
    calendarApiPath,
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskCalendarItemType[]>();
    for (const task of tasks) {
      const key = toDateKey(new Date(task.deadlines));
      const bucket = map.get(key);
      if (bucket) bucket.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [tasks]);

  const selectedKey = toDateKey(selected);
  const selectedTasks = tasksByDay.get(selectedKey) ?? [];
  const canCreateForSelected = Boolean(createTaskPath) && selected >= today;

  const showMonth = (target: Date) => {
    const nextMonth = new Date(target.getFullYear(), target.getMonth(), 1);
    setMonth(nextMonth);
    const isCurrentMonth =
      nextMonth.getFullYear() === today.getFullYear() &&
      nextMonth.getMonth() === today.getMonth();
    setSelected(isCurrentMonth ? today : nextMonth);
  };

  const selectDay = (day: Date) => {
    setSelected(day);
    if (day.getMonth() !== month.getMonth()) {
      setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  };

  const monthTitle = capitalize(
    month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
  );
  const selectedTitle = capitalize(
    selected.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  );

  return (
    <Card className="border-zinc-200">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-zinc-500" />
          Календарь задач
          {isFetching && !isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" aria-label="Обновление" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Календарь */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{monthTitle}</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => showMonth(today)}
              >
                Сегодня
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Предыдущий месяц"
                onClick={() => showMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Следующий месяц"
                onClick={() => showMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="py-1">{weekday}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = toDateKey(day);
              const dayTasks = tasksByDay.get(key) ?? [];
              const inMonth = day.getMonth() === month.getMonth();
              const isToday = key === toDateKey(today);
              const isSelected = key === selectedKey;
              const label = day.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDay(day)}
                  aria-pressed={isSelected}
                  aria-label={dayTasks.length ? `${label}: задач — ${dayTasks.length}` : label}
                  className={cn(
                    "flex h-16 flex-col items-start justify-between rounded-md border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 sm:h-20",
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50",
                    !inMonth && !isSelected && "text-zinc-300",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday && !isSelected && "bg-zinc-900 text-white",
                      isToday && isSelected && "bg-white text-zinc-900",
                    )}
                  >
                    {day.getDate()}
                  </span>

                  {dayTasks.length > 0 && (
                    <span className="flex w-full items-center gap-1">
                      {dayTasks.slice(0, MAX_DOTS).map((task) => (
                        <span
                          key={task.id}
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            MARKERS[markerKind(task, now)].dot,
                            isSelected && "ring-1 ring-white",
                          )}
                        />
                      ))}
                      {dayTasks.length > MAX_DOTS && (
                        <span className={cn("text-[10px] font-medium", isSelected ? "text-zinc-200" : "text-zinc-500")}>
                          +{dayTasks.length - MAX_DOTS}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            {LEGEND_ORDER.map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", MARKERS[kind].dot)} />
                {MARKERS[kind].label}
              </span>
            ))}
          </div>
        </div>

        {/* Задачи выбранного дня */}
        <aside className="flex min-h-64 flex-col rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Срок</p>
          <h3 className="mt-0.5 text-sm font-semibold text-zinc-900">{selectedTitle}</h3>

          <div className="mt-3 flex-1 space-y-2 overflow-y-auto lg:max-h-[420px]">
            {isPending ? (
              <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка задач...
              </div>
            ) : isError ? (
              <p className="py-6 text-sm text-red-600">Не удалось загрузить задачи.</p>
            ) : selectedTasks.length === 0 ? (
              <p className="py-6 text-sm text-zinc-500">На этот день задач нет.</p>
            ) : (
              selectedTasks.map((task) => {
                const marker = MARKERS[markerKind(task, now)];
                return (
                  <Link
                    key={task.id}
                    href={`${taskBasePath}/${task.id}`}
                    className="block rounded-md border border-zinc-200 bg-white p-2.5 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-xs font-semibold text-zinc-700">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        {formatTaskDeadlineTime(task.deadlines)}
                      </span>
                      <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", marker.badge)}>
                        {marker.label}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-900">{task.title}</p>
                  </Link>
                );
              })
            )}
          </div>

          {canCreateForSelected && (
            <Link
              href={`${createTaskPath}?deadline=${selectedKey}`}
              className={cn(buttonVariants({ size: "sm" }), "mt-3 w-full")}
            >
              <Plus className="h-4 w-4" />
              Задача на эту дату
            </Link>
          )}
        </aside>
      </CardContent>
    </Card>
  );
}
