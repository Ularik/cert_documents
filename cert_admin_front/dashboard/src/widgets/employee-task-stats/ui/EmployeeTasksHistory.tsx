"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, RotateCcw } from "lucide-react";
import { useTasks } from "@/entities/task";
import type { TasksStatus } from "@/entities/task";
import { useUsersTasksStats } from "@/entities/user";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { PaginationControl } from "@/shared/ui/pagination";
import { Skeleton } from "@/shared/ui/skeleton";

interface EmployeeTasksHistoryProps {
  usersPath?: string;
  tasksApiPath?: string;
  taskBasePath?: string;
}

const statusLabels: Record<TasksStatus, { label: string; className: string }> = {
  NEW: { label: "Новая", className: "bg-sky-50 text-sky-700" },
  PROGRESS: { label: "В работе", className: "bg-amber-50 text-amber-700" },
  DONE: { label: "Завершена", className: "bg-emerald-50 text-emerald-700" },
};

const formatDate = (date: Date | string | null) =>
  date ? new Date(date).toLocaleDateString("ru-RU") : "—";

export default function EmployeeTasksHistory({
  usersPath = "/admin/users",
  tasksApiPath = "/tasks/",
  taskBasePath = "/tasks",
}: EmployeeTasksHistoryProps) {
  const { data: employees = [] } = useUsersTasksStats(usersPath);
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const employee = employees.find((item) => String(item.id) === employeeId);
  const employeeName = (item: (typeof employees)[number]) =>
    item.last_name ? `${item.last_name} ${item.username}` : item.username;

  const { data, isFetching, isError } = useTasks(
    {
      limit,
      offset: (page - 1) * limit,
      executor_id: employeeId || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    },
    tasksApiPath,
    Boolean(employeeId),
  );
  const tasks = data?.items ?? [];

  const selectEmployee = (id: string) => {
    setEmployeeId(id);
    setPage(1);
    setOpen(false);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Задачи сотрудника
      </h2>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-600">Сотрудник</span>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="h-9 w-72 justify-between bg-white text-sm font-normal"
                />
              }
            >
              <span className="truncate">
                {employee ? employeeName(employee) : "Выберите сотрудника"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Поиск сотрудника..." />
                <CommandList>
                  <CommandEmpty>Сотрудники не найдены.</CommandEmpty>
                  <CommandGroup>
                    {employees.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${employeeName(item)} ${item.department_title ?? ""} ${item.id}`}
                        onSelect={() => selectEmployee(String(item.id))}
                        className="cursor-pointer"
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{employeeName(item)}</span>
                          {item.department_title ? (
                            <span className="truncate text-[11px] text-zinc-500">
                              {item.department_title}
                            </span>
                          ) : null}
                        </div>
                        <Check
                          className={`h-4 w-4 ${
                            String(item.id) === employeeId
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="history-from-date"
            className="text-xs font-medium text-zinc-600"
          >
            С даты
          </label>
          <input
            id="history-from-date"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => {
              setFromDate(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="history-to-date"
            className="text-xs font-medium text-zinc-600"
          >
            По дату
          </label>
          <input
            id="history-to-date"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => {
              setToDate(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          />
        </div>
        {(fromDate || toDate) && (
          <Button
            variant="outline"
            className="h-9"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Сбросить даты
          </Button>
        )}
      </div>

      {!employeeId ? (
        <p className="rounded-md border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
          Выберите сотрудника, чтобы увидеть его задачи.
        </p>
      ) : isError ? (
        <p className="text-sm text-red-600">Не удалось загрузить задачи.</p>
      ) : !data && isFetching ? (
        <Skeleton className="h-40 w-full bg-zinc-200" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Задача</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium">Создана</th>
                  <th className="px-3 py-2 font-medium">Срок</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-zinc-500"
                    >
                      Задач не найдено
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={`${taskBasePath}/${task.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${statusLabels[task.status].className}`}
                        >
                          {statusLabels[task.status].label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {formatDate(task.created_at)}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {formatDate(task.deadlines)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControl
            page={page}
            limit={limit}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            isLoading={isFetching}
          />
        </>
      )}
    </section>
  );
}
