"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  StickyNote,
} from "lucide-react";

import {
  deadlineFromDateKey,
  formatTaskDeadlineTime,
  toDateKey,
  useCalendarTasks,
} from "@/entities/task";
import type { TaskCalendarItemType } from "@/entities/task";
import { useNotes } from "@/entities/note";
import type { NoteType } from "@/entities/note";
import { NoteFormDialog } from "@/features/note-form";
import { TaskStatusSelect } from "@/features/change-task-status";
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
  executorId?: string;
}

type MarkerKind = "expired" | "DONE" | "PROGRESS" | "NEW" | "note";

/** Запись дня: задача или личная заметка */
type CalendarEntry =
  | { kind: "task"; key: string; deadline: Date; task: TaskCalendarItemType }
  | { kind: "note"; key: string; deadline: Date; note: NoteType };

const MARKERS: Record<MarkerKind, { label: string; dot: string; badge: string }> = {
  expired: { label: "Просрочена", dot: "bg-red-500", badge: "border-red-200 bg-red-50 text-red-700" },
  NEW: { label: "Новая", dot: "bg-sky-500", badge: "border-sky-200 bg-sky-50 text-sky-700" },
  PROGRESS: { label: "В работе", dot: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  DONE: { label: "Выполнена", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  note: { label: "Заметка", dot: "bg-violet-500", badge: "border-violet-200 bg-violet-50 text-violet-700" },
};

const LEGEND_ORDER: MarkerKind[] = ["NEW", "PROGRESS", "DONE", "expired", "note"];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const GRID_DAYS = 42; // 6 недель
const MAX_DOTS = 3;
const NOW_REFRESH_MS = 60_000;

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

function entryMarker(entry: CalendarEntry, now: Date): MarkerKind {
  return entry.kind === "note" ? "note" : markerKind(entry.task, now);
}

/** Срок сегодня и запись ещё актуальна — отметка мигает */
function isDueToday(entry: CalendarEntry, todayKey: string) {
  if (entry.kind === "task" && entry.task.status === "DONE") return false;
  return toDateKey(entry.deadline) === todayKey;
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
  executorId,
}: TaskCalendarProps) {
  const [now, setNow] = useState(() => new Date());
  // «сейчас» обновляется, чтобы мигание и просрочка не застывали на открытой вкладке
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), NOW_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, []);
  const today = startOfDay(now);
  const todayKey = toDateKey(today);
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; note: NoteType | null }>({
    open: false,
    note: null,
  });

  const start = gridStart(month);
  const days = Array.from({ length: GRID_DAYS }, (_, index) => addDays(start, index));
  const period = {
    deadline_from: start.toISOString(),
    deadline_to: addDays(start, GRID_DAYS).toISOString(),
  };

  const tasksQuery = useCalendarTasks(
    {
      ...period,
      department_id: departmentId,
      management_id: managementId,
      executor_id: executorId,
    },
    calendarApiPath,
  );
  const notesQuery = useNotes(period);
  const tasks = tasksQuery.data;
  const notes = notesQuery.data;
  const isPending = tasksQuery.isPending || notesQuery.isPending;
  const isError = tasksQuery.isError || notesQuery.isError;
  const isFetching = tasksQuery.isFetching || notesQuery.isFetching;

  const entriesByDay = useMemo(() => {
    const entries: CalendarEntry[] = [
      ...(tasks ?? []).map((task): CalendarEntry => ({
        kind: "task",
        key: `task-${task.id}`,
        deadline: new Date(task.deadlines),
        task,
      })),
      ...(notes ?? []).map((note): CalendarEntry => ({
        kind: "note",
        key: `note-${note.id}`,
        deadline: new Date(note.deadlines),
        note,
      })),
    ].sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = toDateKey(entry.deadline);
      const bucket = map.get(key);
      if (bucket) bucket.push(entry);
      else map.set(key, [entry]);
    }
    return map;
  }, [tasks, notes]);

  const selectedKey = toDateKey(selected);
  const selectedEntries = entriesByDay.get(selectedKey) ?? [];
  const canCreateForSelected = selected >= today;

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
          Календарь задач и заметок
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
              const dayEntries = entriesByDay.get(key) ?? [];
              const inMonth = day.getMonth() === month.getMonth();
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const label = day.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
              const hiddenDueToday = dayEntries
                .slice(MAX_DOTS)
                .some((entry) => isDueToday(entry, todayKey));

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDay(day)}
                  aria-pressed={isSelected}
                  aria-label={dayEntries.length ? `${label}: записей — ${dayEntries.length}` : label}
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

                  {dayEntries.length > 0 && (
                    <span className="flex w-full items-center gap-1">
                      {dayEntries.slice(0, MAX_DOTS).map((entry) => (
                        <span
                          key={entry.key}
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            MARKERS[entryMarker(entry, now)].dot,
                            isSelected && "ring-1 ring-white",
                            isDueToday(entry, todayKey) && "deadline-blink",
                          )}
                        />
                      ))}
                      {dayEntries.length > MAX_DOTS && (
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            isSelected ? "text-zinc-200" : "text-zinc-500",
                            hiddenDueToday && "deadline-blink",
                          )}
                        >
                          +{dayEntries.length - MAX_DOTS}
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
            <span className="flex items-center gap-1.5">
              <span className="deadline-blink h-2 w-2 rounded-full bg-zinc-500" />
              Срок сегодня
            </span>
          </div>
        </div>

        {/* Задачи и заметки выбранного дня */}
        <aside className="flex min-h-64 flex-col rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Срок</p>
          <h3 className="mt-0.5 text-sm font-semibold text-zinc-900">{selectedTitle}</h3>

          <div className="mt-3 flex-1 space-y-2 overflow-y-auto lg:max-h-[420px]">
            {isPending ? (
              <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка...
              </div>
            ) : isError ? (
              <p className="py-6 text-sm text-red-600">Не удалось загрузить задачи и заметки.</p>
            ) : selectedEntries.length === 0 ? (
              <p className="py-6 text-sm text-zinc-500">На этот день задач и заметок нет.</p>
            ) : (
              selectedEntries.map((entry) => {
                const markerKind = entryMarker(entry, now);
                const marker = MARKERS[markerKind];
                const canChangeStatus = entry.kind === "task" && Boolean(entry.task.can_change_status);
                // статус показывает выпадающий список; бейдж нужен, если менять нельзя или задача просрочена
                const showBadge = !canChangeStatus || markerKind === "expired";
                const cardClass = cn(
                  "block w-full rounded-md border bg-white p-2.5 text-left transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900",
                  entry.kind === "note" ? "border-violet-200" : "border-zinc-200",
                );
                const body = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-xs font-semibold text-zinc-700">
                        {entry.kind === "note" ? (
                          <StickyNote className="h-3.5 w-3.5 text-violet-400" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                        {formatTaskDeadlineTime(entry.deadline)}
                        {isDueToday(entry, todayKey) && (
                          <span
                            className={cn("deadline-blink ml-1 h-1.5 w-1.5 rounded-full", marker.dot)}
                            title="Срок сегодня"
                          />
                        )}
                      </span>
                      {showBadge && (
                        <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", marker.badge)}>
                          {marker.label}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-900">
                      {entry.kind === "note" ? entry.note.title : entry.task.title}
                    </p>
                    {entry.kind === "note" && entry.note.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{entry.note.description}</p>
                    )}
                  </>
                );

                if (entry.kind === "task" && canChangeStatus) {
                  // ссылка растянута поверх карточки, а список статусов лежит над ней:
                  // так интерактивные элементы не вложены друг в друга
                  return (
                    <div key={entry.key} className={cn(cardClass, "relative")}>
                      <Link
                        href={`${taskBasePath}/${entry.task.id}`}
                        className="absolute inset-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                        aria-label={`Открыть задачу «${entry.task.title}»`}
                      />
                      {body}
                      <div className="relative z-10 mt-2 w-fit">
                        <TaskStatusSelect
                          taskId={String(entry.task.id)}
                          status={entry.task.status}
                          canChange
                        />
                      </div>
                    </div>
                  );
                }

                return entry.kind === "task" ? (
                  <Link key={entry.key} href={`${taskBasePath}/${entry.task.id}`} className={cardClass}>
                    {body}
                  </Link>
                ) : (
                  <button
                    key={entry.key}
                    type="button"
                    className={cardClass}
                    onClick={() => setNoteDialog({ open: true, note: entry.note })}
                  >
                    {body}
                  </button>
                );
              })
            )}
          </div>

          {canCreateForSelected && (
            <div className={cn("mt-3 grid gap-2", createTaskPath && "grid-cols-2")}>
              {createTaskPath && (
                <Link
                  href={`${createTaskPath}?deadline=${selectedKey}`}
                  className={cn(buttonVariants({ size: "sm" }), "w-full")}
                >
                  <Plus className="h-4 w-4" />
                  Задача
                </Link>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
                onClick={() => setNoteDialog({ open: true, note: null })}
              >
                <StickyNote className="h-4 w-4" />
                Заметка
              </Button>
            </div>
          )}
        </aside>
      </CardContent>

      <NoteFormDialog
        open={noteDialog.open}
        onOpenChange={(open) => setNoteDialog((state) => ({ ...state, open }))}
        note={noteDialog.note}
        defaultDeadline={deadlineFromDateKey(selectedKey)}
      />
    </Card>
  );
}
