"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Calendar,
  CalendarClock,
  Pencil,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { TaskType } from "@/entities/task";
import { TaskStatusSelect } from "@/features/change-task-status";

interface Props {
  task: TaskType;
  taskBasePath?: string;
  /** Клик по карточке раскрывает описание вместо перехода на деталку */
  expandable?: boolean;
}

export default function TaskKanbanCard({
  task,
  taskBasePath = "tasks",
  expandable = false,
}: Props) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const detailHref = `${taskBasePath}/${task.id}`;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatDeadline = (date: Date | string | null) => {
    if (!date) return "не указан";
    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Право на изменение определяет бэкенд (автор или вышестоящий)
  const canEdit = Boolean(task.can_edit);

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Предотвращаем переход по родительскому Link
    e.stopPropagation();
    router.push(`${taskBasePath}/${task.id}/`);
  };

  const card = (
      <Card
        className={`border-zinc-200 py-1 group-hover:border-zinc-400 group-hover:shadow-sm transition-all bg-white cursor-pointer relative ${
          isExpanded ? "border-zinc-400 shadow-sm" : ""
        }`}
      >
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
                <span className="text-[11px] text-zinc-500 italic">
                  {task.managements?.length
                    ? `Всё управление: ${task.managements.map((m) => m.title).join(", ")}`
                    : "Без отдела"}
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
          <div className="flex items-start gap-2">
            <h4
              className={`flex-1 font-medium text-zinc-900 text-sm group-hover:text-zinc-700 leading-snug ${
                isExpanded ? "" : "line-clamp-2"
              }`}
            >
              {task.title}
            </h4>
            {expandable && (
              <ChevronDown
                className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            )}
          </div>

          {/* Раскрытое описание */}
          {expandable && isExpanded && (
            <div className="space-y-3 rounded-lg bg-zinc-50 p-3">
              <p className="whitespace-pre-line break-words text-sm text-zinc-700">
                {task.description?.trim() || (
                  <span className="italic text-zinc-400">Описание отсутствует</span>
                )}
              </p>
              <Link
                href={detailHref}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Подробнее
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <CalendarClock className="h-3 w-3" />
            <span>
              Срок: {formatDeadline(task.deadlines)}
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
                canChange={Boolean(task.can_change_status)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
  );

  if (!expandable) {
    return (
      <Link href={detailHref} className="block group">
        {card}
      </Link>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={() => setIsExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setIsExpanded((value) => !value);
        }
      }}
      className="block group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
    >
      {card}
    </div>
  );
}
