"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { ArrowLeft, UserCheck, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import type { UserUpdateType, UserType } from "@/types/user";
import { useDepartments } from "@/services/queries/departments";
import { useManagements } from "@/services/queries/managements";
import { AxiosError } from "axios";


interface Props {
  user: UserType;
  isUpdating: boolean;
  handleUpdate: ({id, data}: {id: string; data: UserUpdateType}) => void;
  isDeleting: boolean;
  handleDelete: (id: string) => void;
  serverError: AxiosError<{ detail: string }> | null;
  isAdmin?: boolean;
  isManagementHead?: boolean;
}

export default function ExecutorDetail({ 
  user, 
  isUpdating,
  handleUpdate,
  isDeleting, 
  handleDelete, 
  serverError,
  isAdmin = false,
  isManagementHead = false,
}: Props) {

  const router = useRouter();
  const { data: departments = [] } = useDepartments();
  const { data: managements = [] } = useManagements();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<UserUpdateType>({
    defaultValues: {
      username: user.username,
      last_name: user.last_name,
      status: user.status,
      department_id: user.department_id,
      management_id:
        user.management_id !== null && user.management_id !== undefined
          ? Number(user.management_id)
          : null,
    },
  });

  const selectedRole = useWatch({ control, name: "status" });
  const selectedDepartmentId = useWatch({ control, name: "department_id" });
  const selectedManagementId = useWatch({ control, name: "management_id" });
  const departmentRole =
    selectedRole === "USER" ||
    selectedRole === "HEAD" ||
    selectedRole === "DEPUTY";
  const departmentRequired =
    selectedRole === "HEAD" ||
    selectedRole === "DEPUTY" ||
    (isAdmin && selectedRole === "USER" && user.status !== "USER");
  const filteredDepartments = (isAdmin || isManagementHead) && departmentRole
    ? departments.filter(
        (department) =>
          selectedManagementId !== null &&
          selectedManagementId !== undefined &&
          String(department.management_id) === String(selectedManagementId),
      )
    : departments;

  useEffect(() => {
    if (
      (isAdmin || isManagementHead) &&
      departmentRole &&
      selectedManagementId == null &&
      selectedDepartmentId != null
    ) {
      const department = departments.find(
        (item) => String(item.id) === String(selectedDepartmentId),
      );
      if (department) {
        setValue("management_id", department.management_id, {
          shouldDirty: false,
        });
      }
    }
  }, [
    departments,
    departmentRole,
    isAdmin,
    isManagementHead,
    selectedDepartmentId,
    selectedManagementId,
    setValue,
  ]);

  const onSubmit = (data: UserUpdateType) => {
    handleUpdate({
      id: user.id,
      data: {
        ...data,
        management_id:
          departmentRole ||
          selectedRole === "MANAGEMENT_HEAD" ||
          selectedRole === "DIVISION_HEAD"
            ? data.management_id ?? null
            : null,
      },
    });
  };


  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Кнопка «Назад» */}
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="border-zinc-200 text-zinc-700 hover:bg-zinc-100"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="block">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            К списку сотрудников
          </h1>
        </div>
      </div>

      <Card className="border-zinc-200 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-zinc-700" />
              Редактирование сотрудника
            </CardTitle>
            <CardDescription>
              Измените персональные данные, статус или привязку к отделу
            </CardDescription>
          </div>

          {/* Диалог подтверждения удаления */}
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button variant="destructive" 
              size="icon" 
              disabled={isDeleting || isUpdating} />
              }>
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Пользователь{" "}
                  <strong className="text-zinc-900">{user?.username}</strong>{" "}
                  будет навсегда удален из системы.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(user.id)}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {serverError.response?.data.detail || "Ошибка при обновлении данных. Попробуйте снова."}
              </div>
            )}

            {/* Имя (username) */}
            <div className="space-y-2">
              <Label htmlFor="username">Имя (Логин) *</Label>
              <Input
                id="username"
                placeholder="Иван"
                {...register("username", {
                  required: "Имя пользователя обязательно",
                  validate: (val) =>
                    !val ||
                    val.trim().length > 0 ||
                    "Имя не может состоять из пробелов",
                })}
              />
              {errors.username && (
                <p className="text-xs text-red-500">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Фамилия (last_name) */}
            <div className="space-y-2">
              <Label htmlFor="last_name">Фамилия</Label>
              <Input
                id="last_name"
                placeholder="Иванов"
                {...register("last_name")}
              />
            </div>

            <div className="space-y-2">
              <Label>Роль в системе *</Label>
              <Controller
                name="status"
                control={control}
                rules={{ required: "Выберите роль" }}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === "MANAGEMENT_HEAD") {
                        setValue("department_id", null);
                      } else if (
                        value === "ADMIN" ||
                        value === "DIVISION_HEAD"
                      ) {
                        setValue("department_id", null);
                        setValue("management_id", null);
                      }
                      clearErrors(["department_id", "management_id"]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите роль" />
                    </SelectTrigger>
                    <SelectContent>
                      {(isAdmin
                        ? [
                            ["ADMIN", "Администратор (ADMIN)"],
                            ["DIVISION_HEAD", "Руководитель подразделения (DIVISION_HEAD)"],
                            ["MANAGEMENT_HEAD", "Начальник управления (MANAGEMENT_HEAD)"],
                            ["HEAD", "Начальник отдела (HEAD)"],
                            ["DEPUTY", "Заместитель начальника (DEPUTY)"],
                            ["USER", "Сотрудник (USER)"],
                          ]
                        : isManagementHead
                        ? [
                            ["USER", "Сотрудник (USER)"],
                            ["DEPUTY", "Заместитель начальника (DEPUTY)"],
                            ["HEAD", "Начальник отдела (HEAD)"],
                          ]
                        : [
                            ["USER", "Сотрудник (USER)"],
                            ["DEPUTY", "Зам. начальника (DEPUTY)"],
                            ["HEAD", "Начальник отдела (HEAD)"],
                            ["ADMIN", "Администратор (ADMIN)"],
                          ]
                      ).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-xs text-red-500">{errors.status.message}</p>
              )}
            </div>

            {(isAdmin || isManagementHead) &&
              (selectedRole === "MANAGEMENT_HEAD" ||
                selectedRole === "DIVISION_HEAD" ||
                departmentRole) && (
                <div className="space-y-2">
                  <Label>
                    Управление{" "}
                    {(isManagementHead ||
                      selectedRole === "MANAGEMENT_HEAD" ||
                      departmentRequired) && (
                      <span className="text-red-500">*</span>
                    )}
                  </Label>
                  <Controller
                    name="management_id"
                    control={control}
                    rules={
                      isManagementHead ||
                      selectedRole === "MANAGEMENT_HEAD" ||
                      departmentRequired
                        ? {
                            required: "Выберите управление",
                            validate: (value) =>
                              value != null || "Выберите управление",
                          }
                        : undefined
                    }
                    render={({ field }) => (
                      <Select
                        value={
                          field.value !== null && field.value !== undefined
                            ? String(field.value)
                            : "none"
                        }
                        onValueChange={(value) =>
                          {
                            field.onChange(
                              value === "none" ? null : Number(value),
                            );
                            if (departmentRole) {
                              setValue("department_id", null, {
                                shouldDirty: true,
                              });
                              clearErrors("department_id");
                            }
                          }
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите управление" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {isManagementHead ||
                            selectedRole === "MANAGEMENT_HEAD" ||
                            departmentRequired
                              ? "Не выбрано"
                              : "Без управления"}
                          </SelectItem>
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
              )}

            {/* Отдел (department_id) */}
            {(!isAdmin ||
              departmentRole) && (
            <div className="space-y-2">
              <Label>
                Отдел{" "}
                {(departmentRequired ||
                  ((isAdmin || isManagementHead) &&
                    selectedManagementId != null)) && (
                  <span className="text-red-500">*</span>
                )}
              </Label>
              <Controller
                name="department_id"
                control={control}
                rules={
                  departmentRequired ||
                  ((isAdmin || isManagementHead) &&
                    selectedManagementId != null)
                    ? {
                        required: "Для этой роли нужно выбрать отдел",
                        validate: (value) =>
                          value != null || "Для этой роли нужно выбрать отдел",
                      }
                    : undefined
                }
                render={({ field }) => (
                  <Select
                    disabled={
                      filteredDepartments.length === 0 ||
                      ((isAdmin || isManagementHead) &&
                        departmentRole &&
                        selectedManagementId == null)
                    }
                    value={
                      field.value !== null && field.value !== undefined
                        ? String(field.value)
                        : "none"
                    }
                    onValueChange={(val) =>
                      field.onChange(val === "none" ? null : val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите отдел" />
                    </SelectTrigger>
                    <SelectContent>
                      {(!departmentRequired &&
                        (!(isAdmin || isManagementHead) ||
                          selectedManagementId == null)) && (
                        <SelectItem value="none">Без отдела</SelectItem>
                      )}
                      {filteredDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.title || `Отдел #${dept.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.department_id && (
                <p className="text-xs text-red-500">
                  {errors.department_id.message}
                </p>
              )}
            </div>
            )}

            {/* Кнопки действия */}
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
                disabled={isUpdating || isDeleting || !isDirty}
                className="bg-zinc-900 text-white hover:bg-zinc-800"
              >
                {isUpdating && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Сохранить изменения
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}