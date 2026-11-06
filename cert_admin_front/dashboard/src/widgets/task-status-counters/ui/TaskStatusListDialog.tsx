"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

import { formatTaskDeadline, useTasks } from "@/entities/task";
import type { TasksStatus } from "@/entities/task";
import type { PagingParams } from "@/shared/types/main";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";

const PAGE_SIZE = 20;

const statusLabels: Record<TasksStatus, string> = {
  NEW: "Новая",
  PROGRESS: "В работе",
  DONE: "Завершена",
};

interface TaskStatusListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Фильтры без limit/offset — те же, что у счётчика */
  filters: Omit<PagingParams, "limit" | "offset">;
  tasksApiPath: string;
  taskBasePath: string;
}

export default function TaskStatusListDialog({
  open,
  onOpenChange,
  title,
  filters,
  tasksApiPath,
  taskBasePath,
}: TaskStatusListDialogProps) {
  const [page, setPage] = useState(0);

  const { data, isPending, isError } = useTasks(
    { ...filters, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    tasksApiPath,
    open,
  );

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPage(0);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isPending ? "Загрузка..." : `Всего задач: ${total}`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 bg-zinc-200" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-red-600">
              Не удалось загрузить задачи.
            </p>
          ) : !data?.items.length ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              <FileText className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
              Задач нет
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
              {data.items.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`${taskBasePath}/${task.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Срок: {formatTaskDeadline(task.deadlines)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
                      {statusLabels[task.status] ?? task.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Назад
            </Button>
            <span className="text-xs text-zinc-500">
              {page + 1} из {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
