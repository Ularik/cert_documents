"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  FileText,
  Paperclip,
  User,
  Download,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react";
import type { ReplyType, ReplyUpdateType } from "@/types/replies";
import type { DocumentLiteType } from "@/types/document";
import {
  useDetailReply,
  useReplyDelete,
  useReplyUpdate,
} from "@/services/queries/reply";
import { ReplyEditForm } from "./ReplyEditForm"; // Путь к файлу формы выше
import { toast } from "sonner";
import { AxiosError } from "axios";
import { ApiErrorResponse } from "@/types/main";


interface Props {
  reply_id: string;
  taskTitle?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function ReplyDetail({
  reply_id,
  taskTitle,
  canEdit = true,
  canDelete = true,
}: Props) {
  const { data: reply, isPending, error } = useDetailReply(reply_id);
  const { mutate: deleteReply, isPending: isDeleting } = useReplyDelete();
  const { mutate: updateReply, isPending: isUpdating } = useReplyUpdate();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const router = useRouter();

const handleDelete = () => {
  deleteReply(reply_id, {
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      router.back();
    },
    onError: (err: AxiosError<ApiErrorResponse>) => {
      // Сообщение с сервера (если бэкенд возвращает сообщение в err.response?.data)
      const serverMessage = err.response?.data?.detail; 
      
      // Иначе стандартное сообщение Axios (например, "Network Error" или HTTP-статус)
      const fallbackMessage = err.message;

      console.error("Ошибка при удалении:", serverMessage || fallbackMessage);
    },
  });
};

  const handleUpdate = (updatedData: ReplyUpdateType) => {
    updateReply(
      { reply_id, data: updatedData },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.success("Изменения успешно сохранены");
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
          const message =
            error?.response?.data?.detail ||
            error?.message ||
            "Не удалось обновить ответ. Проверьте данные.";

          toast.error("Ошибка при сохранении", {
            description: message,
          });
        },
      }
    );
  };

  const getUserInitials = (u: ReplyType["author"]) => {
    if (!u) return "??";
    if (u.last_name && u.username) {
      return `${u.last_name[0]}${u.username[0]}`.toUpperCase();
    }
    return (u.username?.[0] || "U").toUpperCase();
  };

  const getUserDisplayName = (u: ReplyType["author"]) => {
    if (!u) return "Неизвестный сотрудник";
    return u.last_name ? `${u.last_name} ${u.username}` : u.username;
  };

  // 1. Состояние загрузки (Skeleton)
  if (isPending) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-zinc-200 bg-white">
              <CardHeader className="pb-4 border-b border-zinc-100 flex flex-row items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="border-zinc-200 bg-white">
              <CardHeader className="pb-3 border-b border-zinc-100">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 2. Состояние ошибки или отсутствия данных
  if (error || !reply) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-zinc-200 rounded-xl text-center space-y-4 shadow-xs">
        <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Не удалось загрузить ответ
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Ответ не найден или произошла ошибка при загрузке данных.
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          <Link href="/tasks">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            К списку задач
          </Link>
        </Button>
      </div>
    );
  }

  // 3. Основной рендер
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Шапка / Навигация и действия */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад к задаче
        </Button>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs font-normal text-zinc-500 bg-zinc-50 mr-1"
          >
            ID ответа:{" "}
            <span className="font-mono ml-1 text-zinc-700">{reply.id}</span>
          </Badge>

          {/* Кнопка режима редактирования */}
          {canEdit && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 gap-1.5 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              Редактировать
            </Button>
          )}

          {/* Диалог подтверждения удаления */}
          {canDelete && <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="icon" disabled={isDeleting}>
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить этот ответ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Ответ и все прикрепленные к
                  нему файлы будут удалены навсегда.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Отмена
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
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
          </AlertDialog>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основной контент */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-zinc-200 shadow-xs bg-white">
            <CardHeader className="pb-4 border-b border-zinc-100 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-zinc-500" />
                {isEditing ? "Редактирование ответа" : "Детали ответа"}
              </CardTitle>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[11px] gap-1 font-normal">
                <CheckCircle2 className="h-3 w-3" /> Отправлено
              </Badge>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Информация об авторе */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 bg-zinc-50/50">
                <Avatar className="h-10 w-10 border border-zinc-200 bg-zinc-100 text-zinc-700">
                  <AvatarFallback className="text-sm font-medium">
                    {getUserInitials(reply.author)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-900 truncate">
                    {getUserDisplayName(reply.author)}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3 text-zinc-400" />
                    {reply.author?.username ||
                      reply.author?.status ||
                      "Сотрудник"}
                  </p>
                </div>
              </div>

              {/* Условный рендеринг: Форма редактирования ИЛИ Просмотр */}
              {isEditing ? (
                <ReplyEditForm
                  reply={reply}
                  isUpdating={isUpdating}
                  onSubmit={handleUpdate}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <>
                  {/* Текст ответа */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Содержание ответа
                    </h4>
                    <div className="p-4 rounded-lg border border-zinc-200/80 bg-white text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                      {reply.content || (
                        <span className="text-zinc-400 italic">
                          Текст ответа отсутствует
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Прикрепленные документы */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      Прикрепленные файлы ({reply.attachments?.length || 0})
                    </h4>

                    {reply.attachments && reply.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {reply.attachments.map((file: DocumentLiteType) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50 transition-all group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="p-1.5 rounded-md bg-zinc-100 group-hover:bg-zinc-200/60 transition-colors shrink-0">
                                <FileText className="h-4 w-4 text-zinc-600" />
                              </div>
                              <span
                                className="text-xs font-medium text-zinc-700 truncate"
                                title={file.filename}
                              >
                                {file.filename}
                              </span>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-400 hover:text-zinc-900 shrink-0"
                            >
                              <a
                                href={`/api/tasks/tasks_reply/${file.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-zinc-200 rounded-lg text-xs text-zinc-400">
                        К этому ответу не прикреплено ни одного файла
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Боковая панель с метаданными */}
        <div className="space-y-6">
          <Card className="border-zinc-200 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <CardTitle className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                Связанная задача
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-[11px] text-zinc-400">
                  Идентификатор задачи
                </p>
                <p className="text-xs font-mono font-medium text-zinc-800 mt-0.5 truncate">
                  {reply.task_id}
                </p>
              </div>

              {taskTitle && (
                <div>
                  <p className="text-[11px] text-zinc-400">Название задачи</p>
                  <p className="text-xs font-medium text-zinc-800 mt-0.5 line-clamp-2">
                    {taskTitle}
                  </p>
                </div>
              )}

              <Separator className="bg-zinc-100" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}