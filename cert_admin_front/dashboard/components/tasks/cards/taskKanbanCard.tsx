"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Calendar,
  CalendarClock,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TaskType } from "@/types/tasks";
import { useMe } from "@/services/queries/users";
import TaskStatusSelect from "@/components/tasks/taskStatusSelect/TaskStatusSelect";
import { ADMIN_ACCESS_ROLES } from "@/constants/main";

interface Props {
  task: TaskType;
  taskBasePath?: string;
}

export default function TaskKanbanCard({
  task,
  taskBasePath = "tasks",
}: Props) {
  const router = useRouter();
  const { data: me } = useMe();

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
    });
  };

  // Проверяем, входит ли отдел текущего пользователя в список отделов задачи
  const canEdit =
    Boolean(me && ADMIN_ACCESS_ROLES.includes(me.status)) ||
    (Boolean(me?.department_id) &&
      task.departments?.some(
        (dept) => String(dept.id) === String(me?.department_id),
      ) &&
      task.departments?.length === 1);

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Предотвращаем переход по родительскому Link
    e.stopPropagation();
    router.push(`${taskBasePath}/${task.id}/`);
  };

  return (
    <Link href={`${taskBasePath}/${task.id}`} className="block group">
      <Card className="border-zinc-200 py-1 group-hover:border-zinc-400 group-hover:shadow-sm transition-all bg-white cursor-pointer relative">
        <CardContent className="p-3 space-y-2.5">
          {/* 1. Сверху: Отделы и Исполнители */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs pr-6">
            {/* Отделы */}
            <div className="flex flex-wrap items-center gap-1">
              <Building2 className="h-3 w-3 text-zinc-500 shrink-0" />
              {task.departments && task.departments.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {task.departments.map((dept) => (
                    <span
                      key={dept.id}
                      className="font-medium text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px] truncate max-w-[120px]"
                    >
                      {dept.title}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-zinc-400 italic">
                  Без отдела
                </span>
              )}
            </div>

            {/* Исполнители */}
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-zinc-400 shrink-0" />
              {task.executors && task.executors.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {task.executors.map((user) => (
                    <Badge
                      key={user.id}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-zinc-200 font-normal text-zinc-700 bg-zinc-50/50"
                    >
                      {user.last_name
                        ? `${user.last_name} ${user.username[0]}.`
                        : user.username}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-zinc-400 italic">
                  Не назначен
                </span>
              )}
            </div>
          </div>

          {/* Кнопка редактирования (отображается только для пользователей из отдела задачи) */}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditClick}
              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
              title="Редактировать задачу"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* 2. Заголовок задачи */}
          <h4 className="font-medium text-zinc-900 text-sm line-clamp-2 group-hover:text-zinc-700 leading-snug">
            {task.title}
          </h4>

          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <CalendarClock className="h-3 w-3" />
            <span>
              Срок: {task.deadlines ? formatDate(task.deadlines) : "не указан"}
            </span>
          </div>

          {/* 3. Снизу: Дата */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-100">
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(task.created_at)}</span>
            </div>
            <div
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <TaskStatusSelect
                taskId={task.id}
                status={task.status}
                canChange={canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
