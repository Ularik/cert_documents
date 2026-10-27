"use client";

import { useState } from "react";
import { FileText, RotateCcw } from "lucide-react";

import { useTasks } from "@/entities/task";
import { PaginationControl } from "@/shared/ui/pagination";
import TaskKanbanCard from "./taskKanbanCard";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import type { TaskType } from "@/entities/task";
import { useMe } from "@/entities/user";

export default function MyTasksList({
  taskBasePath,
}: {
  taskBasePath: "/heads/tasks" | "/users/tasks";
}) {
  const { data: me, isPending: isMePending } = useMe();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rushOnly, setRushOnly] = useState(false);

  const { data, isLoading: isTasksLoading, isError } = useTasks({
    limit,
    offset: (page - 1) * limit,
    executor_id: me?.id,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    rush: rushOnly || undefined,
  }, "/tasks/", Boolean(me));

  const isLoading = isMePending || isTasksLoading;
  const tasks: TaskType[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const handleDateChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
            <FileText className="h-6 w-6 text-zinc-700" />
            Мои задачи
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Всего задач: {total}</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-600">
          С даты
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) =>
              handleDateChange(setFromDate, event.target.value)
            }
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-600">
          По дату
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) =>
              handleDateChange(setToDate, event.target.value)
            }
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="flex h-9 items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={rushOnly}
            onChange={(event) => {
              setRushOnly(event.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
          />
          Только срочные
        </label>
        {(fromDate || toDate) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
            className="h-9 gap-2 border-zinc-200 bg-white text-zinc-600"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Сбросить период
          </Button>
        )}
      </div>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
          Не удалось загрузить задачи. Попробуйте обновить страницу.
        </div>
      )}
      {isLoading ? (
        <TasksSkeleton limit={limit} />
      ) : tasks.length === 0 ? (
        <Card className="border-dashed border-zinc-300 bg-zinc-50/50">
          <CardContent className="space-y-3 p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-zinc-400" />
            <p className="font-medium text-zinc-600">Задачи не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskKanbanCard
              key={task.id}
              task={task}
              taskBasePath={taskBasePath}
            />
          ))}
        </div>
      )}

      <PaginationControl
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        isLoading={isLoading}
      />
    </main>
  );
}

function TasksSkeleton({ limit }: { limit: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: Math.min(limit, 5) }).map((_, index) => (
        <Card key={index} className="border-zinc-200">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-5 w-1/3 bg-zinc-200" />
            <Skeleton className="h-3 w-2/3 bg-zinc-100" />
            <Skeleton className="h-4 w-24 bg-zinc-100" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
