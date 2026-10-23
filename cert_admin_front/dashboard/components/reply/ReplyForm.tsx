"use client";

import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Send,
  Paperclip,
  X,
  FileText,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useReplyCreate } from "@/services/queries/reply";
import { ReplyCreateType } from "@/types/replies";
import { toast } from "sonner";


export default function ReplyForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const { mutate: createReply, isPending, error: serverError } = useReplyCreate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReplyCreateType>({
    defaultValues: {
      content: "",
      attachments: [],
    },
  });

  const attachments = watch("attachments") || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setValue("attachments", [...attachments, ...newFiles], {
        shouldValidate: true,
      });
    }
  };

  const removeFile = (indexToRemove: number) => {
    const updatedFiles = attachments.filter(
      (_, index) => index !== indexToRemove,
    );
    setValue("attachments", updatedFiles, { shouldValidate: true });
  };

  const onSubmit = (data: ReplyCreateType) => {
    createReply({ task_id: taskId, data }, {
      onSuccess: () => {
        toast.success("Ответ успешно отправлен");
        router.back();
      }
    });
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Кнопка «Назад» и шапка */}
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-5">
        <Button
          variant="outline"
          size="icon"
          disabled={isPending}
          onClick={() => router.back()}
          className="border-zinc-200 text-zinc-700 hover:bg-zinc-100"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="block">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            К задаче #{taskId}
          </h1>
        </div>
      </div>

      <Card className="border-zinc-200 shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-zinc-700" />
            Отправить решение задачи
          </CardTitle>
          <CardDescription>
            Опишите выполненную работу и прикрепите необходимые файлы или отчеты
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Вывод серверной ошибки из error */}
            {serverError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {serverError.response?.data.detail || "Ошибка запроса. Попробуйте снова."}
              </div>
            )}

            {/* Текст ответа / решения */}
            <div className="space-y-2">
              <Label htmlFor="content">Текст ответа *</Label>
              <Textarea
                id="content"
                rows={5}
                disabled={isPending}
                placeholder="Опишите полученные результаты, возникшие сложности или пояснения к решению..."
                className="resize-none border-zinc-200 focus-visible:ring-zinc-400 disabled:opacity-60"
                {...register("content", {
                  required: "Пожалуйста, введите текст ответа",
                  validate: (val) =>
                    val.trim().length > 0 ||
                    "Ответ не может состоять из одних пробелов",
                })}
              />
              {errors.content && (
                <p className="text-xs text-red-500">{errors.content.message}</p>
              )}
            </div>

            {/* Загрузка и список прикрепленных файлов */}
            <div className="space-y-3">
              <Label>Прикрепленные файлы</Label>

              <div className="flex items-center gap-3">
                <label
                  className={`cursor-pointer ${isPending ? "pointer-events-none opacity-50" : ""}`}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-zinc-200 rounded-md hover:bg-zinc-100 text-zinc-700 transition-colors">
                    <Paperclip size={16} />
                    Выбрать файлы
                  </div>
                  <input
                    type="file"
                    multiple
                    disabled={isPending}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <span className="text-xs text-zinc-500">
                  {attachments.length > 0
                    ? `Выбрано файлов: ${attachments.length}`
                    : "Файлы не выбраны"}
                </span>
              </div>

              {/* Список прикрепленных файлов */}
              {attachments.length > 0 && (
                <ul className="space-y-2 pt-2">
                  {attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between p-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-md"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText
                          size={16}
                          className="text-zinc-500 shrink-0"
                        />
                        <span className="truncate font-medium text-zinc-800">
                          {file.name}
                        </span>
                        <span className="text-xs text-zinc-400 shrink-0">
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isPending}
                        onClick={() => removeFile(index)}
                        className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      >
                        <X size={14} />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Кнопки действия */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => router.back()}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-zinc-900 text-white hover:bg-zinc-800 min-w-[160px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Отправить ответ
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
