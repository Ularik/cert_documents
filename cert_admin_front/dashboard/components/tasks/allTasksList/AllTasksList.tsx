"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileText, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartments } from "@/services/queries/departments";
import { useManagements } from "@/services/queries/managements";
import type { TaskType } from "@/types/tasks";
import { useTasks } from "@/services/queries/tasks";
import { PaginationControl } from "@/components/pagination/pagination";
import TasksDepartments from "@/components/tasks/tasksDepartments";
import TaskScopeToggle from "@/components/tasks/taskScopeToggle/TaskScopeToggle";
import { UserType } from "@/types/user";
import { ADMIN_ACCESS_ROLES } from "@/constants/main";

const EMPTY_TASKS: TaskType[] = [];

interface Props {
  user: UserType;
  departmentId?: string;
  canCreate?: boolean;
  taskBasePath?: string;
  taskScope?: "all" | "department";
  scopeBasePath?: string;
  showScopeToggle?: boolean;
  tasksApiPath?: string;
}

export default function AllTasksList({
  user,
  departmentId,
  canCreate =
    ADMIN_ACCESS_ROLES.includes(user.status) || Boolean(user.department_id),
  taskBasePath = "tasks",
  taskScope,
  scopeBasePath,
  showScopeToggle = true,
  tasksApiPath = "/tasks/",
}: Props) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rushOnly, setRushOnly] = useState(false);
  const [requestedManagementId, setRequestedManagementId] = useState(
    user.management_id ? String(user.management_id) : "",
  );

  const offset = (page - 1) * limit;

  const { data: departments = [] } = useDepartments();
  const {
    data: managements = [],
    isLoading: isManagementsLoading,
    isError: isManagementsError,
  } = useManagements();
  const visibleManagements =
    user.status === "MANAGEMENT_HEAD"
      ? managements.filter(
          (management) =>
            String(management.id) === String(user.management_id),
        )
      : managements;

  const selectedManagementId = visibleManagements.some(
    (management) => String(management.id) === requestedManagementId,
  )
    ? requestedManagementId
    : visibleManagements.length > 0
      ? String(
          (
            visibleManagements.find(
              (management) =>
                String(management.id) === String(user.management_id),
            ) ?? visibleManagements[0]
          ).id,
        )
      : isManagementsLoading
        ? requestedManagementId
        : "";
  const { data, isLoading: isTasksLoading, isError: isTasksError } = useTasks(
    {
      limit,
      offset,
      department_id: departmentId,
      management_id:
        taskScope === "department" ? undefined : selectedManagementId,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      rush: rushOnly || undefined,
    },
    tasksApiPath,
  );

  const tasks: TaskType[] = data?.items ?? EMPTY_TASKS;
  const total = data?.total ?? 0;
  const selectedManagement = managements.find(
    (management) => String(management.id) === selectedManagementId,
  );
  const isLoading =
    isManagementsLoading ||
    (taskScope === "department" ? isTasksLoading : Boolean(selectedManagementId) && isTasksLoading);
  const isError =
    isManagementsError ||
    (Boolean(selectedManagementId) && isTasksError);

  // Обработчик смены размера страницы (сбрасываем на 1-ю страницу)
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleDateChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const resetDates = () => {
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Шапка страницы */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-zinc-700" />
              {taskScope === "department" ? "Задачи отдела" : "Все задачи"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {taskScope === "department"
                ? `Задач отдела: ${total}`
                : `Задач управления: ${total}`}
            </p>
          </div>

          {canCreate ? (
            <Link href={`${taskBasePath}/new`}>
              <Button className="bg-zinc-900 hover:bg-zinc-800 text-white shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Создать задачу
              </Button>
            </Link>
          ) : null}
        </div>
        {taskScope && showScopeToggle && (
          <TaskScopeToggle active={taskScope} basePath={scopeBasePath} />
        )}
        {taskScope !== "department" && !isManagementsLoading && (
          visibleManagements.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="tasks-management"
                className="text-xs font-medium text-zinc-600"
              >
                Управление
              </label>
              <select
                id="tasks-management"
                value={selectedManagementId}
                onChange={(event) => {
                  setRequestedManagementId(event.target.value);
                  setPage(1);
                }}
                className="h-9 w-full max-w-sm rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              >
                {visibleManagements.map((management) => (
                  <option key={management.id} value={String(management.id)}>
                    {management.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Управления для отображения задач не найдены.
            </p>
          )
        )}
        </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tasks-from-date"
            className="text-xs font-medium text-zinc-600"
          >
            С даты
          </label>
          <input
            id="tasks-from-date"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) =>
              handleDateChange(setFromDate, event.target.value)
            }
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tasks-to-date"
            className="text-xs font-medium text-zinc-600"
          >
            По дату
          </label>
          <input
            id="tasks-to-date"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) =>
              handleDateChange(setToDate, event.target.value)
            }
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />
        </div>
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
            onClick={resetDates}
            className="h-9 gap-2 border-zinc-200 bg-white text-zinc-600"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Сбросить период
          </Button>
        )}
      </div>

      {/* Ошибка загрузки */}
      {isError && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg text-center">
          Не удалось загрузить список задач. Попробуйте обновить страницу.
        </div>
      )}

      {/* Список задач */}
      {isLoading ? (
        <TasksSkeleton limit={limit} />
      ) : taskScope !== "department" && !selectedManagementId ? (
        <Card className="border-dashed border-zinc-300 bg-zinc-50/50">
          <CardContent className="p-12 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-zinc-400" />
            <p className="text-zinc-600 font-medium">
              Выберите управление для просмотра задач
            </p>
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card className="border-dashed border-zinc-300 bg-zinc-50/50">
          <CardContent className="p-12 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-zinc-400" />
            <p className="text-zinc-600 font-medium">Задачи не найдены</p>
            <p className="text-xs text-zinc-400">
              Создайте первую задачу, чтобы она появилась в списке
            </p>
          </CardContent>
        </Card>
      ) : (
        taskScope === "department" ? (
          <TasksDepartments
            tasks={tasks}
            departments={departments}
            departmentId={departmentId}
            taskBasePath={taskBasePath}
          />
        ) : (
          <section className="space-y-3">
            {selectedManagement && (
              <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold text-zinc-800">
                {selectedManagement.title}
              </h2>
            )}
            <TasksDepartments
              tasks={tasks}
              departments={departments.filter(
                (department) =>
                  String(department.management_id) === selectedManagementId,
              )}
              taskBasePath={taskBasePath}
            />
          </section>
        )
      )}

      {/* Пагинация */}
      <PaginationControl
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        isLoading={isLoading}
      />
    </div>
  );
}

function TasksSkeleton({ limit }: { limit: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
        <Card key={i} className="border-zinc-200">
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-5 w-1/3 bg-zinc-200" />
            <Skeleton className="h-3 w-2/3 bg-zinc-100" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20 bg-zinc-100" />
              <Skeleton className="h-4 w-24 bg-zinc-100" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
