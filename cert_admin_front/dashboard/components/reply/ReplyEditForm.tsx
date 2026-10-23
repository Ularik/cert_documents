"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, X, Loader2 } from "lucide-react";
import type { ReplyCreateType, ReplyType, ReplyUpdateType } from "@/types/replies";
import type { DocumentLiteType } from "@/types/document";

interface ReplyEditFormProps {
  reply: ReplyType;
  isUpdating: boolean;
  onSubmit: (data: ReplyUpdateType) => void;
  onCancel: () => void;
}

export function ReplyEditForm({
  reply,
  isUpdating,
  onSubmit,
  onCancel,
}: ReplyEditFormProps) {
  const [existingFiles, setExistingFiles] = useState<DocumentLiteType[]>(
    reply.attachments || []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const { register, handleSubmit } = useForm<ReplyCreateType>({
    defaultValues: {
      content: reply.content || "",
    },
  });

  const handleRemoveExistingFile = (fileId: string) => {
    setExistingFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onFormSubmit = (data: ReplyCreateType) => {
    onSubmit({
      ...data,
      old_attachments_ids: existingFiles.map((file) => file.id),
      attachments: newFiles,
    } as ReplyUpdateType);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Текст ответа */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-xs font-medium text-zinc-700">
          Текст ответа
        </Label>
        <Textarea
          id="content"
          className="min-h-[140px] text-xs resize-y border-zinc-200 focus:border-zinc-400"
          placeholder="Введите текст ответа..."
          {...register("content", { required: true })}
        />
      </div>

      {/* Список текущих прикрепленных файлов */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-zinc-500">
            Сохраненные файлы ({existingFiles.length})
          </Label>
          <div className="space-y-2">
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 rounded-md border border-zinc-200 bg-zinc-50/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-700 truncate">
                    {file.filename}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-400 hover:text-red-600"
                  onClick={() => handleRemoveExistingFile(file.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Загрузка новых файлов */}
      <div className="space-y-2">
        <Label htmlFor="files" className="text-xs font-medium text-zinc-700">
          Прикрепить новые файлы
        </Label>
        <Input
          id="files"
          type="file"
          multiple
          className="text-xs h-9 border-zinc-200 cursor-pointer"
          onChange={handleFileChange}
        />
      </div>

      {/* Список новых выбранных файлов */}
      {newFiles.length > 0 && (
        <div className="space-y-1.5">
          {newFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-1.5 px-2.5 rounded border border-dashed border-emerald-300 bg-emerald-50/30 text-xs"
            >
              <span className="truncate text-emerald-900">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-emerald-600 hover:text-red-600"
                onClick={() => handleRemoveNewFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isUpdating}
          className="text-xs h-8"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isUpdating}
          className="text-xs h-8 gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white"
        >
          {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Сохранить изменения
        </Button>
      </div>
    </form>
  );
}