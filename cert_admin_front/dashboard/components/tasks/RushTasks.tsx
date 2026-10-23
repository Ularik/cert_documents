"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  Download,
  FileText,
  Loader2,
  UserRound,
} from "lucide-react";

import { useTasks } from "@/services/queries/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationControl } from "@/components/pagination/pagination";
import type { TaskType } from "@/types/tasks";

interface RushTasksProps {
  departmentId?: string;
  managementId?: string;
  taskBasePath?: string;
  tasksApiPath?: string;
  documentDownloadBasePath?: string;
}

export default function RushTasks({
  departmentId,
  managementId,
  taskBasePath = "/admin/tasks",
  tasksApiPath = "/tasks/",
  documentDownloadBasePath = "/api/tasks/task-documents",
}: RushTasksProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Управляющее состояние режима: "rush" | "extra_rush" | "expired"
  const [mode, setMode] = useState<"rush" | "extra_rush" | "expired">("rush");

  // Динамическое формирование параметров запроса
  const queryParams = {
    rush: mode === "rush" ? true : undefined,
    extra_rush: mode === "extra_rush" ? true : undefined,
    is_expired: mode === "expired" ? true : undefined,
  };

  const { data, isPending, isError } = useTasks(
    {
      limit,
      offset: (page - 1) * limit,
      department_id: departmentId,
      management_id: managementId,
      ...queryParams,
    },
    tasksApiPath,
  );

  const tasks: TaskType[] = data?.items ?? [];
  const total = data?.total ?? 0;

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("ru-RU");

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  // Циклическое переключение режимов: Rush -> Extra Rush -> Expired -> Rush
  const handleModeChange = () => {
    setMode((prevMode) => {
      if (prevMode === "rush") return "extra_rush";
      if (prevMode === "extra_rush") return "expired";
      return "rush";
    });
    setPage(1);
  };

  // Заголовки и подписи для кнопки
  const titleText = {
    rush: "Срочные задачи (срок до 3 дней)",
    extra_rush: "Весьма срочные задачи (срок до 1 дня)",
    expired: "Просроченные задачи",
  }[mode];

  const buttonText = {
    rush: "Показать весьма срочные",
    extra_rush: "Показать просроченные",
    expired: "Показать срочные",
  }[mode];

  const isDueSoon = (deadline: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // Конец завтрашнего дня

    return new Date(deadline) <= tomorrow;
  };

  return (
    <Card className="border-zinc-200 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-red-600" />
          {titleText}
        </CardTitle>
        <div className="flex items-center gap-2">
          {!isPending && !isError && (
            <span className="text-xs text-zinc-500">Всего: {total}</span>
          )}
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleModeChange}
            aria-pressed={mode === "expired"}
          >
            {buttonText}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-5 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка задач...
          </div>
        ) : isError ? (
          <p className="py-5 text-center text-sm text-red-600">
            Не удалось загрузить задачи.
          </p>
        ) : tasks.length === 0 ? (
          <p className="py-5 text-center text-sm text-zinc-500">Задач нет.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {tasks.map((task) => (
              <div key={task.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`${taskBasePath}/${task.id}`}
                      className="text-sm font-semibold text-zinc-900 hover:text-zinc-600"
                    >
                      {task.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-zinc-600">
                      {task.description || "Описание отсутствует"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {mode !== "extra_rush" && (
                      <Badge variant="destructive">
                        {mode === "expired" ? "Просроченная" : "Срочная"}
                      </Badge>
                    )}

                    {(mode === "extra_rush" ||
                      (mode === "rush" &&
                        isDueSoon(task.deadlines as Date))) && (
                      <Badge variant="destructive">Весьма срочно</Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-1.5 text-[11px] text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
                  <div>ID: {task.id}</div>
                  <div className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-zinc-400" />
                    Срок:{" "}
                    {task.deadlines ? formatDate(task.deadlines) : "не указан"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-zinc-400" />
                    Статус: {task.status}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-zinc-400" />
                    Автор: {task.author.username} {task.author.last_name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                    Создана: {formatDate(task.created_at)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                    Обновлена: {formatDate(task.updated_at)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {task.departments.map((department) => (
                    <Badge
                      key={department.id}
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {department.title}
                    </Badge>
                  ))}
                  {task.executors.map((executor) => (
                    <Badge
                      key={executor.id}
                      variant="outline"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {executor.last_name} {executor.username}
                    </Badge>
                  ))}
                </div>

                {task.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {task.attachments.map((document) => (
                      <a
                        key={document.id}
                        href={`${documentDownloadBasePath}/${document.id}/download`}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-full items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{document.filename}</span>
                        <Download className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <PaginationControl
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
          isLoading={isPending}
        />
      </CardContent>
    </Card>
  );
}
