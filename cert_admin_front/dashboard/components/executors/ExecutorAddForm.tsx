"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { AxiosError } from "axios";

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

import type { UserRegisterType } from "@/types/user";
import { useDepartments } from "@/services/queries/departments";
import { useManagements } from "@/services/queries/managements";
import { useMe } from "@/services/queries/users";
import { useAdminUserCreate } from "@/services/queries/admin/users";
import { useCreateManagementHeadUser } from "@/services/queries/management-head/organization";
import { useHeadUserCreate } from "@/services/queries/heads/user";

const ROLE_OPTIONS = {
  USER: "Сотрудник (USER)",
  DEPUTY: "Заместитель начальника отдела (DEPUTY)",
  HEAD: "Начальник отдела (HEAD)",
  MANAGEMENT_HEAD: "Начальник управления (MANAGEMENT_HEAD)",
  DIVISION_HEAD: "Руководитель подразделения (DIVISION_HEAD)",
} as const;

export default function ExecutorAddForm() {
  const router = useRouter();
  const createAdminUser = useAdminUserCreate();
  const createManagementHeadUser = useCreateManagementHeadUser();
  const createHeadUser = useHeadUserCreate();
  const { data: currentUser } = useMe();
  const { data: allDepartments = [], isLoading: isDepartmentsLoading } =
    useDepartments();
  const { data: managements = [], isLoading: isManagementsLoading } =
    useManagements();
  const currentRole = currentUser?.status;
  const allowedRoles =
    currentRole === "MANAGEMENT_HEAD"
      ? (["USER", "DEPUTY", "HEAD"] as const)
      : currentRole === "HEAD"
        ? (["USER", "DEPUTY"] as const)
        : currentRole === "DEPUTY"
          ? (["USER"] as const)
      : currentRole === "ADMIN" || currentRole === "DIVISION_HEAD"
        ? ([
            "USER",
            "DEPUTY",
            "HEAD",
            "MANAGEMENT_HEAD",
            "DIVISION_HEAD",
          ] as const)
        : [];
  const departments =
    currentRole === "MANAGEMENT_HEAD"
      ? allDepartments.filter(
          (department) =>
            String(department.management_id) ===
            String(currentUser?.management_id),
        )
      : allDepartments;

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserRegisterType>({
    defaultValues: {
      username: "",
      last_name: "",
      password: "",
      status: "USER",
      department_id:
        currentRole === "HEAD" || currentRole === "DEPUTY"
          ? currentUser?.department_id ?? null
          : null,
      management_id: null,
    },
  });

  const isDepartmentLocked =
    currentRole === "HEAD" || currentRole === "DEPUTY";
  const selectedRole = watch("status");
  const requiresDepartment =
    selectedRole === "HEAD" ||
    selectedRole === "DEPUTY" ||
    currentRole === "MANAGEMENT_HEAD" ||
    isDepartmentLocked;

  useEffect(() => {
    if (isDepartmentLocked && currentUser?.department_id) {
      setValue("department_id", currentUser.department_id);
    }
  }, [currentUser?.department_id, isDepartmentLocked, setValue]);

  const onSubmit = async (data: UserRegisterType) => {
    setServerError(null);

    try {
      const payload: UserRegisterType = {
        ...data,
        department_id: data.department_id
          ? String(data.department_id)
          : null,
        management_id:
          data.status === "MANAGEMENT_HEAD" ? data.management_id : null,
      };
      if (currentRole === "MANAGEMENT_HEAD") {
        await createManagementHeadUser.mutateAsync(payload);
      } else if (currentRole === "HEAD" || currentRole === "DEPUTY") {
        await createHeadUser.mutateAsync(payload);
      } else {
        await createAdminUser.mutateAsync(payload);
      }
      router.back();
    } catch (error) {
      const detail =
        error instanceof AxiosError
          ? error.response?.data?.detail
          : undefined;
      setServerError(detail || "Ошибка при создании сотрудника. Попробуйте снова.");
    }
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
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-zinc-700" />
            Добавление нового сотрудника
          </CardTitle>
          <CardDescription>
            Заполните учетные данные и назначьте роль в системе
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {serverError}
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

            {/* Пароль (password) */}
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
              />
            </div>

            {/* Роль / Статус (status) */}
            {currentRole !== "USER" && (
              <div className="space-y-2">
                <Label>Роль в системе *</Label>
                <Controller
                  name="status"
                  control={control}
                  rules={{ required: "Выберите роль" }}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? undefined}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "MANAGEMENT_HEAD") {
                          setValue("department_id", null);
                        } else {
                          setValue("management_id", null);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_OPTIONS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && (
                  <p className="text-xs text-red-500">
                    {errors.status.message}
                  </p>
                )}
              </div>
            )}

            {currentRole !== "HEAD" &&
              currentRole !== "DEPUTY" &&
              selectedRole === "MANAGEMENT_HEAD" && (
              <div className="space-y-2">
                <Label>Управление *</Label>
                <Controller
                  name="management_id"
                  control={control}
                  rules={{
                    required: "Выберите управление",
                    validate: (value) => value !== null || "Выберите управление",
                  }}
                  render={({ field }) => (
                    <Select
                      disabled={isManagementsLoading}
                      value={field.value ? String(field.value) : "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : Number(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите управление" />
                      </SelectTrigger>
                      <SelectContent>
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
            {currentRole !== "HEAD" && currentRole !== "DEPUTY" && (
              <div className="space-y-2">
                <Label>
                  Отдел {requiresDepartment && <span className="text-red-500">*</span>}
                </Label>
                <Controller
                  name="department_id"
                  control={control}
                  rules={
                    requiresDepartment
                      ? {
                          required: "Выберите отдел",
                          validate: (value) =>
                            value !== null || "Выберите отдел",
                        }
                      : undefined
                  }
                  render={({ field }) => (
                    <Select
                      disabled={isDepartmentsLoading || isDepartmentLocked}
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
                        {!requiresDepartment && (
                          <SelectItem value="none">Без отдела</SelectItem>
                        )}
                        {departments.map((dept) => (
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
                {currentRole === "MANAGEMENT_HEAD" &&
                  !isDepartmentsLoading &&
                  departments.length === 0 && (
                    <p className="text-xs text-red-500">
                      В вашем управлении пока нет отделов.
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
                disabled={
                  createAdminUser.isPending ||
                  createManagementHeadUser.isPending ||
                  createHeadUser.isPending
                }
                className="bg-zinc-900 text-white hover:bg-zinc-800"
              >
                {(createAdminUser.isPending ||
                  createManagementHeadUser.isPending ||
                  createHeadUser.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Создать сотрудника
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
