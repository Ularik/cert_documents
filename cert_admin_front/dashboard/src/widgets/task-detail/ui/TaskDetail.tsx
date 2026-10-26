"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Card, CardContent } from "@/shared/ui/card";
import { buttonVariants, Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Lock,
  Trash2,
  Loader2,
  Pencil,
  X,
  Check,
  MessageSquarePlus,
} from "lucide-react";

import { TaskMainInfo } from "@/features/update-task";
import { TaskExecutors } from "@/features/update-task";
import { useUsers } from "@/entities/user";
import { useDepartments } from "@/entities/department";
import { Replies as TaskReplies } from "@/features/reply-list";
import type { UserType } from "@/entities/user";
import type { DocumentLiteType } from "@/entities/document";
import { TaskType, TaskUpdateType } from "@/entities/task";
import type { TaskFormInputs } from "@/entities/task";

interface TaskDetailPageProps {
  task: TaskType;
  user: UserType;
  updateTaskFunc: (data: TaskUpdateType) => void;
  deleteTaskFunc: () => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  replyBasePath?: string;
  documentDownloadBasePath?: string;
}

function parseTaskDeadline(deadline: Date | null) {
  if (!deadline) return null;

  const parsed = new Date(deadline);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function TaskDetail({
  task,
  user,
  updateTaskFunc,
  deleteTaskFunc,
  isUpdating = false,
  isDeleting = false,
  replyBasePath = "/heads/tasks",
  documentDownloadBasePath = "/api/tasks/task-documents",
}: TaskDetailPageProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [existingFiles, setExistingFiles] = useState<DocumentLiteType[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const userDeptId = user?.department_id ? String(user.department_id) : null;
  const { data: allUsers = [] } = useUsers(user?.department_id ?? undefined);
  const { data: departments = [] } = useDepartments();

  // Исполнителей можно выбирать только из отделов задачи (для задач отделам),
  // иначе — из отделов управлений задачи
  const users = useMemo(() => {
    const taskDepartmentIds = (task.departments || []).map((d) => String(d.id));
    const taskManagementIds = (task.managements || []).map((m) => String(m.id));
    const allowedDepartmentIds =
      task.target_type === "DEPARTMENTS" && taskDepartmentIds.length > 0
        ? taskDepartmentIds
        : departments
            .filter((d) => taskManagementIds.includes(String(d.management_id)))
            .map((d) => String(d.id));
    return allUsers.filter((u) =>
      allowedDepartmentIds.includes(String(u.department_id)),
    );
  }, [allUsers, departments, task]);

  // Права на изменение вычисляет бэкенд: автор, либо вышестоящий для задач,
  // поручённых конкретным сотрудникам. Общие задачи управлений/отделов меняет только автор.
  const canEdit = Boolean(task.can_edit);
  const canDelete = canEdit;

  const canReply = useMemo(() => {
    if (task.executors?.some((executor) => String(executor.id) === String(user.id))) {
      return true;
    }
    const taskDepartments = task.departments || [];
    if (taskDepartments.length > 0) {
      return taskDepartments.some((dep) => String(dep.id) === userDeptId);
    }
    // задача поручена управлениям целиком — отвечать могут их сотрудники
    if (user.management_id != null) {
      return (task.managements || []).some(
        (management) => String(management.id) === String(user.management_id),
      );
    }
    return userDeptId != null;
  }, [task, user, userDeptId]);

  const form = useForm<TaskFormInputs>({
    defaultValues: {
      title: "",
      description: "",
      deadlines: null,
      note: "",
      management_ids: [],
      departments_ids: [],
      executor_ids: [],
    },
  });

  const selectedExecutors = form.watch("executor_ids") || [];

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title || "",
        description: task.description || "",
        note: task.note || "",
        deadlines: parseTaskDeadline(task.deadlines),
        management_ids: task.managements?.map((m) => String(m.id)) || [],
        departments_ids: task.departments?.map((d) => String(d.id)) || [],
        executor_ids: task.executors?.map((e) => String(e.id)) || [],
      });
      setExistingFiles(task.attachments || []);
      setNewFiles([]);
    }
  }, [task, form]);

  const handleCancel = () => {
    if (task) {
      form.reset({
        title: task.title || "",
        description: task.description || "",
        note: task.note || "",
        deadlines: parseTaskDeadline(task.deadlines),
        management_ids: task.managements?.map((m) => String(m.id)) || [],
        departments_ids: task.departments?.map((d) => String(d.id)) || [],
        executor_ids: task.executors?.map((e) => String(e.id)) || [],
      });
      setExistingFiles(task.attachments || []);
      setNewFiles([]);
    }
    setIsEditing(false);
  };

  const onSubmit = async (data: TaskFormInputs) => {
    if (!canEdit) return;

    // управления передаём только для задач без отделов и исполнителей:
    // иначе бэкенд выводит их из отделов сам
    const targetsManagementsOnly =
      data.departments_ids.length === 0 && data.executor_ids.length === 0;
    const fullData: TaskUpdateType = {
      ...data,
      management_ids: targetsManagementsOnly ? data.management_ids : [],
      // отделы исполнителей бэкенд выводит сам, иначе старые отделы задачи отклонят новых исполнителей
      departments_ids:
        data.executor_ids.length > 0 && task.target_type === "EXECUTORS"
          ? []
          : data.departments_ids,
      attachments: newFiles,
      old_attachments_ids: existingFiles.map((f) => f.id),
    };
    try {
      updateTaskFunc(fullData);
      setIsEditing(false);
    } catch (error) {
      console.error("Ошибка обновления:", error);
    }
  };

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const lockedReason =
    task.target_type === "EXECUTORS"
      ? "Вы не можете редактировать эту задачу: она поручена сотрудникам другим лицом или за пределами вашей зоны."
      : "Задача поручена управлениям или отделам целиком — изменять её может только автор.";

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="p-6 max-w-5xl mx-auto space-y-6"
    >
      {!canEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600 shrink-0" />
          {lockedReason}
        </div>
      )}

      {/* Встроенная Шапка (TaskHeader) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />К списку задач
        </Button>

        <div className="flex items-center gap-2">
          {/* Кнопка создания ответа доступна всегда, когда форма не в режиме редактирования */}
          {!isEditing && canReply && (
            <Link
              href={`${replyBasePath}/${task.id}/reply/new`}
              className={buttonVariants({
                variant: "default",
                size: "sm",
                className: "bg-zinc-900 text-white hover:bg-zinc-800",
              })}
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Отправить ответ
            </Link>
          )}

          {canEdit && (
            <>
              {!isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-zinc-700 border-zinc-300"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Редактировать
                  </Button>

                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className:
                            "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700",
                        })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие нельзя отменить. Задача будет
                            безвозвратно удалена из системы.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTaskFunc()}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {isDeleting && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isUpdating}
                    className="bg-zinc-900 text-white hover:bg-zinc-800"
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Сохранить
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TaskMainInfo
            task={task}
            documentDownloadBasePath={documentDownloadBasePath}
            isEditing={isEditing && canEdit}
            form={form}
            existingFiles={existingFiles}
            newFiles={newFiles}
            onRemoveExistingFile={(fId) =>
              setExistingFiles((prev) => prev.filter((f) => f.id !== fId))
            }
            onRemoveNewFile={(idx) =>
              setNewFiles((prev) => prev.filter((_, i) => i !== idx))
            }
            onFileChange={(e) =>
              e.target.files &&
              setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)])
            }
          />

          {/* Ответы на задачу */}
          <TaskReplies taskId={task.id} />
        </div>

        <div className="space-y-6">
          <TaskExecutors
            isEditing={isEditing && canEdit}
            executors={task.executors || []}
            form={form}
            allUsers={users}
            selectedExecutors={selectedExecutors}
          />

          <Card className="border-zinc-200 shadow-xs bg-zinc-50/50">
            <CardContent className="p-4 space-y-3 text-xs text-zinc-600">
              <div>
                <span className="text-zinc-400 block mb-1">Автор задачи</span>
                <p className="font-medium text-zinc-800">
                  {task.author.username} {task.author.last_name}
                </p>
              </div>

              <div className="border-t border-zinc-200 pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Создана:</span>
                  <span className="font-medium text-zinc-800 ml-auto">
                    {formatDate(task.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Обновлена:</span>
                  <span className="font-medium text-zinc-800 ml-auto">
                    {formatDate(task.updated_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Срок:</span>
                  <span className="font-medium text-zinc-800 ml-auto">
                    {task.deadlines
                      ? new Date(task.deadlines).toLocaleDateString("ru-RU")
                      : "Не указан"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
