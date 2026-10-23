"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import {
  ArrowLeft,
  Paperclip,
  X,
  Loader2,
  Building2,
  Users,
  FileText,
  UploadCloud,
  ChevronsUpDown,
  Check,
  Lock,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import type { TaskCreateType } from "@/types/tasks";
import { useDepartments } from "@/services/queries/departments";
import { useUsers } from "@/services/queries/users";
import { useManagements } from "@/services/queries/managements";
import { UserType } from "@/types/user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_IDS: string[] = [];

interface Props {
  user: UserType;
  submitFunc: (data: TaskCreateType) => Promise<unknown> | void;
  isPending?: boolean;
}

export default function CreateTaskForm({
  user,
  submitFunc,
  isPending = false,
}: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [openDeptSelect, setOpenDeptSelect] = useState(false);

  const { data: departments = [] } = useDepartments();
  const { data: managements = [] } = useManagements();
  const { data: users = [] } = useUsers();

  const isDepartmentLocked =
    user?.status === "HEAD" ||
    user?.status === "DEPUTY" ||
    user?.status === "USER";
  const isHead = user?.status === "HEAD";
  const canSelectManagement =
    user?.status === "ADMIN" || user?.status === "DIVISION_HEAD";
  const userDeptId = user?.department_id ? String(user.department_id) : null;
  const userDepartment = departments.find(
    (department) => String(department.id) === userDeptId,
  );
  const fixedManagementIdValue =
    user?.status === "MANAGEMENT_HEAD"
      ? user.management_id
      : isDepartmentLocked
        ? userDepartment?.management_id ?? user.management_id
        : undefined;
  const fixedManagementId =
    fixedManagementIdValue != null ? Number(fixedManagementIdValue) : null;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskCreateType>({
    defaultValues: {
      title: "",
      description: "",
      note: "",
      deadlines: null,
      management_id: fixedManagementId,
      departments_ids: isDepartmentLocked && userDeptId ? [userDeptId] : [],
      executor_ids: [],
      attachments: [],
    },
  });

  const selectedDepartments =
    useWatch({ control, name: "departments_ids" }) ?? EMPTY_IDS;
  const selectedManagementId = useWatch({ control, name: "management_id" });
  const selectedExecutors =
    useWatch({ control, name: "executor_ids" }) ?? EMPTY_IDS;
  const attachments = useWatch({ control, name: "attachments" }) ?? [];
  const filteredDepartments = useMemo(() => {
    const managementId = canSelectManagement
      ? selectedManagementId
      : fixedManagementId;
    if (managementId == null) return [];
    return departments.filter(
      (department) => String(department.management_id) === String(managementId),
    );
  }, [
    canSelectManagement,
    departments,
    fixedManagementId,
    selectedManagementId,
  ]);

  // Сотрудникам с ролью отдела разрешен выбор только своего отдела.
  useEffect(() => {
    if (isDepartmentLocked && userDeptId) {
      setValue("departments_ids", [userDeptId]);
    }
  }, [isDepartmentLocked, userDeptId, setValue]);

  // Фильтруем сотрудников по выбранным отделам (если ни один отдел не выбран — показываем всех)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedDepartments.length === 0) return true;
      return selectedDepartments.includes(String(u.department_id));
    });
  }, [users, selectedDepartments]);

  // Автоматический сброс исполнителей, не входящих в выбранные отделы
  useEffect(() => {
    if (selectedDepartments.length === 0) return;

    const validExecutorIds = selectedExecutors.filter((id) =>
      filteredUsers.some((u) => String(u.id) === String(id)),
    );

    if (validExecutorIds.length !== selectedExecutors.length) {
      setValue("executor_ids", validExecutorIds);
    }
  }, [selectedDepartments, filteredUsers, selectedExecutors, setValue]);

  // Переключение выбора исполнителя
  const toggleExecutor = (userId: string) => {
    const next = selectedExecutors.includes(userId)
      ? selectedExecutors.filter((id) => id !== userId)
      : [...selectedExecutors, userId];
    setValue("executor_ids", next);
  };

  // Добавление файлов
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setValue("attachments", [...attachments, ...newFiles]);
    }
  };

  // Удаление файла из списка
  const removeFile = (index: number) => {
    setValue(
      "attachments",
      attachments.filter((_, i) => i !== index),
    );
  };

  // Отправка формы
  const onSubmit = async (data: TaskCreateType) => {
    setServerError(null);
    try {
      const managementId = canSelectManagement
        ? data.management_id
        : fixedManagementId;
      if (managementId == null) {
        setServerError("Выберите управление для задачи");
        return;
      }
      await submitFunc({ ...data, management_id: managementId });
    } catch (err: unknown) {
      const detail =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "detail" in err.response.data
          ? err.response.data.detail
          : null;
      setServerError(
        typeof detail === "string" ? detail : "Ошибка при создании задачи",
      );
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />К списку задач
      </Button>

      <Card className="border-zinc-200 shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-zinc-700" />
            Создание новой задачи
          </CardTitle>
          <CardDescription>
            Заполните детали задачи, назначьте исполнителей и прикрепите файлы
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {serverError}
              </div>
            )}

            {/* Название задачи */}
            <div className="space-y-2">
              <Label htmlFor="title">Название задачи *</Label>
              <Input
                id="title"
                placeholder="Например: Подготовить отчет по продажам"
                {...register("title", {
                  required: "Название задачи обязательно",
                })}
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Описание */}
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Подробное описание задачи..."
                className="resize-y"
                {...register("description", {
                  setValueAs: (value: string) =>
                    typeof value === "string" ? value.trim() : value,
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Ссылки на обмен или примечание
              </Label>
              <Textarea
                id="note"
                rows={4}
                placeholder="Ссылки или примечания..."
                className="resize-y"
                {...register("note", {
                  setValueAs: (value: string) =>
                    typeof value === "string" ? value.trim() : value,
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadlines">Срок выполнения</Label>
              <Input
                id="deadlines"
                type="date"
                {...register("deadlines", { valueAsDate: true })}
              />
            </div>

            {canSelectManagement ? (
              <div className="space-y-2">
                <Label>Управление *</Label>
                <Controller
                  name="management_id"
                  control={control}
                  rules={{
                    required: "Выберите управление",
                    validate: (value) =>
                      value != null || "Выберите управление",
                  }}
                  render={({ field }) => (
                    <Select
                      value={
                        field.value != null ? String(field.value) : "none"
                      }
                      onValueChange={(value) => {
                        field.onChange(
                          value === "none" ? null : Number(value),
                        );
                        setValue("departments_ids", []);
                        setValue("executor_ids", []);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите управление" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Выберите управление</SelectItem>
                        {managements.map((management) => (
                          <SelectItem
                            key={management.id}
                            value={String(management.id)}
                          >
                            {management.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.management_id && (
                  <p className="text-xs text-red-500">
                    {errors.management_id.message}
                  </p>
                )}
              </div>
            ) : fixedManagementId != null ? (
              <div className="space-y-2">
                <Label>Управление</Label>
                <p className="text-sm text-zinc-600">
                  {managements.find(
                    (management) =>
                      String(management.id) === String(fixedManagementId),
                  )?.title ?? "Ваше управление"}
                </p>
              </div>
            ) : null}

            {/* Отделы */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-zinc-500" />
                Отделы ({selectedDepartments.length})
                {isHead && (
                  <span className="text-xs text-amber-600 font-normal flex items-center gap-1 ml-auto">
                    <Lock className="h-3 w-3" /> Фиксировано для вашего отдела
                  </span>
                )}
                {canSelectManagement && (
                  <span className="text-xs font-normal text-zinc-500">
                    Отделы доступны только в выбранном управлении
                  </span>
                )}
              </Label>

              <Controller
                name="departments_ids"
                control={control}
                render={({ field }) => {
                  const selectedIds: string[] = field.value || [];

                  const toggleDept = (deptId: string) => {
                    if (isDepartmentLocked) return;
                    const current = new Set(selectedIds);
                    if (current.has(deptId)) {
                      current.delete(deptId);
                    } else {
                      current.add(deptId);
                    }
                    field.onChange(Array.from(current));
                  };

                  return (
                    <div className="space-y-2">
                      {!isDepartmentLocked && (
                        <Popover
                          open={openDeptSelect}
                          onOpenChange={setOpenDeptSelect}
                        >
                          <PopoverTrigger>
                            <span
                              role="button"
                              tabIndex={0}
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                                className:
                                  "h-8 text-xs cursor-pointer inline-flex items-center justify-center",
                              })}
                            >
                              {selectedIds.length === 0
                                ? "Выберите отделы"
                                : `Выбрано отделов: ${selectedIds.length}`}
                              <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
                            </span>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput
                                placeholder="Поиск отдела..."
                                className="h-9 text-xs"
                              />
                              <CommandList>
                                <CommandEmpty className="py-2 text-xs text-center">
                                  Отделы не найдены.
                                </CommandEmpty>
                                <CommandGroup>
                                  {filteredDepartments.map((dept) => {
                                    const deptIdStr = String(dept.id);
                                    const isSelected =
                                      selectedIds.includes(deptIdStr);

                                    return (
                                      <CommandItem
                                        key={dept.id}
                                        value={dept.title}
                                        onSelect={() => toggleDept(deptIdStr)}
                                        className="text-xs flex items-center justify-between cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                          <span className="truncate">
                                            {dept.title}
                                          </span>
                                        </div>
                                        <Check
                                          className={`h-3.5 w-3.5 text-zinc-800 shrink-0 transition-opacity ${
                                            isSelected
                                              ? "opacity-100"
                                              : "opacity-0"
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
                      )}
                      {canSelectManagement &&
                        selectedManagementId == null && (
                          <p className="text-xs text-zinc-500">
                            Сначала выберите управление.
                          </p>
                        )}
                      {canSelectManagement &&
                        selectedManagementId != null &&
                        filteredDepartments.length === 0 && (
                          <p className="text-xs text-zinc-500">
                            В выбранном управлении нет отделов.
                          </p>
                        )}

                      {/* Отображение бейджей выбранных отделов */}
                      {selectedIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedIds.map((id) => {
                            const dept = filteredDepartments.find(
                              (d) => String(d.id) === id,
                            );
                            if (!dept) return null;
                            return (
                              <Badge
                                key={id}
                                variant="secondary"
                                className="bg-zinc-100 text-zinc-700 text-xs gap-1 font-normal"
                              >
                                {dept.title}
                                {!isDepartmentLocked && (
                                  <X
                                    className="h-3 w-3 cursor-pointer text-zinc-400 hover:text-zinc-700"
                                    onClick={() => toggleDept(id)}
                                  />
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </div>

            {/* Исполнители */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-zinc-500" />
                Исполнители ({selectedExecutors.length})
              </Label>
              <div className="border border-zinc-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-2">
                    Нет доступных сотрудников
                  </p>
                ) : (
                  filteredUsers.map((u) => {
                    const userIdStr = String(u.id);
                    const isSelected = selectedExecutors.includes(userIdStr);
                    const name = u.last_name
                      ? `${u.last_name} ${u.username}`
                      : u.username;

                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleExecutor(userIdStr)}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${
                          isSelected
                            ? "bg-zinc-100 text-zinc-900 font-medium"
                            : "hover:bg-zinc-50 text-zinc-600"
                        }`}
                      >
                        <span>{name}</span>
                        {isSelected && (
                          <Badge
                            variant="secondary"
                            className="bg-zinc-900 text-white text-[10px]"
                          >
                            Выбран
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Загрузка файлов */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-zinc-500" />
                Прикрепленные файлы ({attachments.length})
              </Label>

              <div className="border-2 border-dashed border-zinc-200 rounded-lg p-4 text-center hover:bg-zinc-50/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                <p className="text-xs text-zinc-600 font-medium">
                  Нажмите или перетащите файлы для загрузки
                </p>
              </div>

              {attachments.length > 0 && (
                <ul className="space-y-1.5 pt-2">
                  {attachments.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-xs text-zinc-700"
                    >
                      <span className="truncate max-w-xs">{file.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-zinc-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-zinc-400 hover:text-red-600"
                          onClick={() => removeFile(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isPending}
                className="bg-zinc-900 text-white hover:bg-zinc-800"
              >
                {(isSubmitting || isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Создать задачу
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
