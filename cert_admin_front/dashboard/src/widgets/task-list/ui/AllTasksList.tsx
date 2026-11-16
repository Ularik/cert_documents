"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileText, RotateCcw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { useDepartments } from "@/entities/department";
import { useManagements } from "@/entities/management";
import type { TaskType } from "@/entities/task";
import { useTasks } from "@/entities/task";
import { PaginationControl } from "@/shared/ui/pagination";
import TaskKanbanCard from "./taskKanbanCard";
import { TaskScopeToggle } from "@/features/task-scope-toggle";
import { UserType } from "@/entities/user";
import { ADMIN_ACCESS_ROLES } from "@/entities/user";

const EMPTY_TASKS: TaskType[] = [];

const selectClassName =
  "h-9 w-full min-w-56 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-100";
const dateInputClassName =
  "h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

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
  const isManagementHead = user.status === "MANAGEMENT_HEAD";
  const isDepartmentScope = taskScope === "department";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rushOnly, setRushOnly] = useState(false);
  // "" = все управления / все отделы
  const [managementFilter, setManagementFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(departmentId ?? "");

  const offset = (page - 1) * limit;

  const { data: departments = [] } = useDepartments();
  const { data: managements = [], isError: isManagementsError } =
    useManagements();

  // Начальник управления видит только своё управление
  const ownManagementId = user.management_id
    ? String(user.management_id)
    : "";
  const visibleManagements = isManagementHead
    ? managements.filter((m) => String(m.id) === ownManagementId)
    : managements;
  const selectedManagementId = isManagementHead
    ? ownManagementId
    : managementFilter;

  const visibleDepartments = selectedManagementId
    ? departments.filter(
        (d) => String(d.management_id) === selectedManagementId,
      )
    : departments;
  const selectedDepartmentId = isDepartmentScope
    ? (departmentId ?? "")
    : departmentFilter;

  const {
    data,
    isLoading,
    isError: isTasksError,
  } = useTasks(
    {
      limit,
      offset,
      department_id: selectedDepartmentId || undefined,
      management_id:
        isDepartmentScope ? undefined : selectedManagementId || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      rush: rushOnly || undefined,
    },
    tasksApiPath,
  );

  const tasks: TaskType[] = data?.items ?? EMPTY_TASKS;
  const total = data?.total ?? 0;
  const isError = isManagementsError || isTasksError;
  const hasFilters = Boolean(
    fromDate ||
      toDate ||
      rushOnly ||
      (!isManagementHead && managementFilter) ||
      (!isDepartmentScope && departmentFilter),
  );

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const withPageReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const handleManagementChange = (value: string) => {
    setManagementFilter(value);
    // выбранный отдел может не принадлежать новому управлению
    if (
      departmentFilter &&
      value &&
      !departments.some(
        (d) =>
          String(d.id) === departmentFilter &&
          String(d.management_id) === value,
      )
    ) {
      setDepartmentFilter("");
    }
    setPage(1);
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setRushOnly(false);
    if (!isManagementHead) setManagementFilter("");
    if (!isDepartmentScope) setDepartmentFilter("");
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
              {isDepartmentScope ? "Задачи отдела" : "Все задачи"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Найдено задач: {total}</p>
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
      </div>

      {/* Фильтры */}
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        {!isDepartmentScope && (
          <>
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
                disabled={isManagementHead}
                onChange={(event) => handleManagementChange(event.target.value)}
                className={selectClassName}
              >
                {!isManagementHead && <option value="">Все управления</option>}
                {visibleManagements.map((management) => (
                  <option key={management.id} value={String(management.id)}>
                    {management.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="tasks-department"
                className="text-xs font-medium text-zinc-600"
              >
                Отдел
              </label>
              <select
                id="tasks-department"
                value={departmentFilter}
                onChange={(event) =>
                  withPageReset(setDepartmentFilter)(event.target.value)
                }
                className={selectClassName}
              >
                <option value="">Все отделы</option>
                {visibleDepartments.map((department) => (
                  <option key={department.id} value={String(department.id)}>
                    {department.title}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
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
            onChange={(event) => withPageReset(setFromDate)(event.target.value)}
            className={dateInputClassName}
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
            onChange={(event) => withPageReset(setToDate)(event.target.value)}
            className={dateInputClassName}
          />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={rushOnly}
            onChange={(event) => withPageReset(setRushOnly)(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
          />
          Только срочные
        </label>
        {hasFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="h-9 gap-2 border-zinc-200 bg-white text-zinc-600"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Сбросить фильтры
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
      ) : tasks.length === 0 ? (
        <Card className="border-dashed border-zinc-300 bg-zinc-50/50">
          <CardContent className="p-12 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-zinc-400" />
            <p className="text-zinc-600 font-medium">Задачи не найдены</p>
            <p className="text-xs text-zinc-400">
              {hasFilters
                ? "Попробуйте изменить фильтры"
                : "Создайте первую задачу, чтобы она появилась в списке"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskKanbanCard
              key={task.id}
              task={task}
              taskBasePath={taskBasePath}
              expandable
            />
          ))}
        </div>
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
