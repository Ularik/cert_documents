"use client";

import { useState } from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Building2,
  CalendarClock,
  Paperclip,
  Download,
  FileText,
  X,
  Upload,
  ChevronsUpDown,
  Check,
} from "lucide-react";

import type { DocumentLiteType } from "@/types/document";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useMe } from "@/services/queries/users";
import { ADMIN_ACCESS_ROLES } from "@/constants/main";
import { useDepartments } from "@/services/queries/departments";
import { TaskFormInputs, TaskType } from "@/types/tasks";

function formatDateInput(value: Date | string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

interface TaskMainInfoProps {
  task: TaskType;
  isEditing: boolean;
  form: UseFormReturn<TaskFormInputs>;
  existingFiles: DocumentLiteType[];
  newFiles: File[];
  onRemoveExistingFile: (fileId: string) => void;
  onRemoveNewFile: (index: number) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  documentDownloadBasePath?: string;
}

export function TaskMainInfo({
  task,
  isEditing,
  form,
  existingFiles,
  newFiles,
  onRemoveExistingFile,
  onRemoveNewFile,
  onFileChange,
  documentDownloadBasePath = "/api/tasks/task-documents",
}: TaskMainInfoProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  const { data: me } = useMe();

  const isAdmin = Boolean(me && ADMIN_ACCESS_ROLES.includes(me.status));
  const { data: departments = [] } = useDepartments();
  const availableDepartments =
    me?.status === "MANAGEMENT_HEAD"
      ? departments.filter(
          (department) =>
            String(department.management_id) === String(me.management_id),
        )
      : departments;

  const [openDeptSelect, setOpenDeptSelect] = useState(false);

  return (
    <Card className="border-zinc-200 shadow-xs">
      <CardHeader className="space-y-3 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="border-zinc-300 text-zinc-600">
            ID: #{task.id}
          </Badge>

          {!isEditing ? (
            task.departments?.map((dep) => (
              <Badge
                key={dep.id}
                variant="secondary"
                className="bg-zinc-100 text-zinc-700 font-normal flex items-center gap-1"
              >
                <Building2 className="h-3 w-3" />
                {dep.title}
              </Badge>
            ))
          ) : (
            <Controller
              name="departments_ids"
              control={control}
              render={({ field }) => {
                const selectedIds: string[] = field.value || [];

                const toggleDept = (deptId: string) => {
                  if (!isAdmin) return;

                  const current = new Set(selectedIds);
                  if (current.has(deptId)) {
                    current.delete(deptId);
                  } else {
                    current.add(deptId);
                  }
                  field.onChange(Array.from(current));
                };

                return (
                  <Popover
                    open={isAdmin ? openDeptSelect : false}
                    onOpenChange={isAdmin ? setOpenDeptSelect : undefined}
                  >
                    <PopoverTrigger
                      disabled={!isAdmin}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: `h-8 text-xs inline-flex items-center justify-center ${
                          !isAdmin
                            ? "pointer-events-none opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`,
                      })}
                    >
                      {selectedIds.length === 0
                        ? "Выберите отделы"
                        : `Выбрано отделов: ${selectedIds.length}`}
                      <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
                    </PopoverTrigger>

                    <PopoverContent className="w-[220px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Поиск отдела..."
                          className="h-8 text-xs"
                        />
                        <CommandList>
                          <CommandEmpty className="py-2 text-xs text-center">
                            Отделы не найдены.
                          </CommandEmpty>
                          <CommandGroup>
                            {availableDepartments.map((dept) => {
                              const deptIdStr = String(dept.id);
                              const isSelected =
                                selectedIds.includes(deptIdStr);

                              return (
                                <CommandItem
                                  key={dept.id}
                                  value={dept.title}
                                  onSelect={() => toggleDept(deptIdStr)}
                                  className="text-xs flex items-center justify-between cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2 truncate pointer-events-none">
                                    <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                    <span className="truncate">
                                      {dept.title}
                                    </span>
                                  </div>
                                  <Check
                                    className={`h-3.5 w-3.5 text-zinc-700 shrink-0 transition-opacity pointer-events-none ${
                                      isSelected ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                );
              }}
            />
          )}
        </div>

        {!isEditing ? (
          <CardTitle className="text-2xl font-bold text-zinc-900 leading-tight">
            {form.getValues("title")}
          </CardTitle>
        ) : (
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium">
              Заголовок задачи *
            </label>
            <Input
              {...register("title", { required: "Заголовок обязателен" })}
              className="text-lg font-semibold"
              placeholder="Введите заголовок"
            />
            {errors.title && (
              <span className="text-xs text-red-500">
                {errors.title.message as string}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          <CalendarClock className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Срок выполнения:
          </span>
          {!isEditing ? (
            <span className="font-medium text-zinc-800">
              {task.deadlines
                ? new Date(task.deadlines).toLocaleDateString("ru-RU")
                : "Не указан"}
            </span>
          ) : (
            <Controller
              name="deadlines"
              control={control}
              render={({ field }) => (
                <Input
                  type="date"
                  value={formatDateInput(field.value)}
                  onChange={(event) => {
                    const value = event.target.value;
                    field.onChange(
                      value ? new Date(`${value}T00:00:00`) : null,
                    );
                  }}
                  className="h-8 w-auto text-sm"
                />
              )}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Описание задачи
          </h4>
          {!isEditing ? (
            form.getValues("description") ? (
              <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {form.getValues("description")}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 italic">
                Описание отсутствует
              </p>
            )
          ) : (
            <Textarea
              {...register("description")}
              rows={5}
              placeholder="Введите описание задачи..."
              className="text-sm"
            />
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Ссылки и примечания
          </h4>
          {!isEditing ? (
            form.getValues("note") ? (
              <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {form.getValues("note")}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 italic">
                Нет прмечаний
              </p>
            )
          ) : (
            <Textarea
              {...register("note")}
              rows={2}
              placeholder="Введите ссылку в обмене или напишите примечание..."
              className="text-sm"
            />
          )}
        </div>

        <div className="pt-4 border-t border-zinc-100">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5" />
            Прикрепленные файлы
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="text-xs font-medium text-zinc-700 truncate">
                    {file.filename}
                  </span>
                </div>
                {isEditing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveExistingFile(file.id)}
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <a
                    href={`${documentDownloadBasePath}/${file.id}/download`}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 hover:text-zinc-900"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="space-y-3 pt-2">
              {newFiles.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-zinc-500">
                    Новые файлы для загрузки:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {newFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-blue-50/50 border border-blue-200 rounded-lg"
                      >
                        <span className="text-xs text-blue-900 truncate">
                          {file.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveNewFile(idx)}
                          className="h-6 w-6 text-zinc-400 hover:text-zinc-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-zinc-200 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors">
                <Upload className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-600">
                  Загрузить файлы
                </span>
                <input
                  type="file"
                  multiple
                  onChange={onFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {!isEditing && existingFiles.length === 0 && (
            <p className="text-xs text-zinc-400 italic">
              Нет прикрепленных файлов
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
