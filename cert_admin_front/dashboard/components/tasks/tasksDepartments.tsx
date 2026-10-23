"use client";

import { useMemo } from "react";
import { DepartmentType } from "@/types/departments";
import { TaskType } from "@/types/tasks";
import TaskKanbanCard from "@/components/tasks/cards/taskKanbanCard";
import { Building2, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  departments: DepartmentType[];
  tasks: TaskType[];
  departmentId?: string;
  taskBasePath?: string;
}

export default function TasksDepartments({
  departments,
  tasks,
  departmentId,
  taskBasePath = "tasks",
}: Props) {
  const visibleDepartments = departmentId
    ? departments.filter((department) => department.id === departmentId)
    : departments;

  // Группируем задачи по массиву departments
  const tasksByDepartment = useMemo(() => {
    const map = new Map<string | null, TaskType[]>();

    // Инициализируем колонку "Без отдела"
    map.set(null, []);

    // Инициализируем массив под каждый отдел
    visibleDepartments.forEach((dept) => {
      map.set(String(dept.id), []);
    });

    // Распределяем задачи по отделам
    tasks.forEach((task) => {
      const taskDepts = task.departments || [];

      // Если у задачи нет отделов, отправляем в "Без отдела"
      if (taskDepts.length === 0) {
        map.get(null)!.push(task);
        return;
      }

      let isAssignedToAnyKnownDept = false;

      // Задача добавляется в каждую колонку соответствия (дублирование)
      taskDepts.forEach((dept) => {
        const deptId = String(dept.id);
        if (map.has(deptId)) {
          map.get(deptId)!.push(task);
          isAssignedToAnyKnownDept = true;
        }
      });

      // Если отделы задачи не совпали ни с одним из имеющегося списка departments
      if (!isAssignedToAnyKnownDept) {
        map.get(null)!.push(task);
      }
    });

    return map;
  }, [tasks, visibleDepartments]);

  const unassignedTasks = tasksByDepartment.get(null) || [];

  return (
    <div className="w-full overflow-x-auto pb-4">
      {/* Контейнер колонок Канбана */}
      <div className="flex gap-4 min-w-max items-start">
        {/* 1. Колонка для отделов */}
        {visibleDepartments.map((dept) => {
          const deptTasks = tasksByDepartment.get(String(dept.id)) || [];

          return (
            <div
              key={dept.id}
              className="w-80 bg-zinc-100/80 border border-zinc-200/80 rounded-xl flex flex-col max-h-[calc(100vh-12rem)] shrink-0"
            >
              {/* Шапка колонки */}
              <div className="p-3.5 border-b border-zinc-200/60 flex items-center justify-between bg-zinc-100 rounded-t-xl sticky top-0 z-10">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Building2 className="h-4 w-4 text-zinc-500 shrink-0" />
                  <h3
                    className="font-semibold text-sm text-zinc-800 truncate"
                    title={dept.title}
                  >
                    {dept.title}
                  </h3>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-zinc-200/70 text-zinc-700 hover:bg-zinc-200 text-xs px-2 py-0.5 font-medium shrink-0"
                >
                  {deptTasks.length}
                </Badge>
              </div>

              {/* Список задач колонки с вертикальным скроллом */}
              <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
                {deptTasks.length > 0 ? (
                  deptTasks.map((task) => (
                    <TaskKanbanCard
                      key={`${dept.id}-${task.id}`}
                      task={task}
                      taskBasePath={taskBasePath}
                    />
                  ))
                ) : (
                  <div className="h-24 border-2 border-dashed border-zinc-200 rounded-lg flex items-center justify-center text-xs text-zinc-400">
                    Задач нет
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 2. Колонка "Без отдела" (отображается только если такие задачи есть) */}
        {unassignedTasks.length > 0 && (
          <div className="w-80 bg-zinc-100/80 border border-zinc-200/80 rounded-xl flex flex-col max-h-[calc(100vh-12rem)] shrink-0">
            {/* Шапка колонки */}
            <div className="p-3.5 border-b border-zinc-200/60 flex items-center justify-between bg-zinc-100 rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-zinc-400 shrink-0" />
                <h3 className="font-semibold text-sm text-zinc-700">
                  Без отдела
                </h3>
              </div>
              <Badge
                variant="secondary"
                className="bg-zinc-200/70 text-zinc-700 text-xs px-2 py-0.5 font-medium shrink-0"
              >
                {unassignedTasks.length}
              </Badge>
            </div>

            {/* Список задач без отдела */}
            <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
              {unassignedTasks.map((task) => (
                <TaskKanbanCard
                  key={`unassigned-${task.id}`}
                  task={task}
                  taskBasePath={taskBasePath}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
