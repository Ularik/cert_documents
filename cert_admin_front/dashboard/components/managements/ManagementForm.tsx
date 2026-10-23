"use client";

import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/services/queries/users";
import type { ManagementFormType } from "@/types/managements";

interface Props {
  initialValue?: ManagementFormType;
  currentHeadId?: number | null;
  mutateFunc: (data: ManagementFormType) => void;
  isPending: boolean;
}

export default function ManagementForm({
  initialValue,
  currentHeadId = null,
  mutateFunc,
  isPending,
}: Props) {
  const router = useRouter();
  const { data: users = [], isLoading: isUsersLoading, isError } = useUsers();
  const isEdit = Boolean(initialValue);
  const eligibleUsers = users.filter(
    (user) => user.status === "USER" || String(user.id) === String(currentHeadId),
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ManagementFormType>({
    values: initialValue ?? {
      title: "",
      description: "",
      head_id: null,
    },
  });

  const getUserDisplayName = (user: (typeof users)[number]) =>
    [user.last_name, user.username].filter(Boolean).join(" ") ||
    `Пользователь #${user.id}`;

  return (
    <form
      onSubmit={handleSubmit(mutateFunc)}
      className="mx-auto max-w-3xl space-y-6"
    >
      <Card className="border-zinc-200 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Основная информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="management-title">
              Название управления <span className="text-red-500">*</span>
            </Label>
            <Input
              id="management-title"
              {...register("title", {
                required: "Укажите название управления",
                minLength: {
                  value: 2,
                  message: "Название должно содержать минимум 2 символа",
                },
              })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="management-description">Описание</Label>
            <Textarea
              id="management-description"
              rows={4}
              {...register("description")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Начальник управления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Controller
            control={control}
            name="head_id"
            render={({ field }) => (
              <Select
                disabled={isUsersLoading || isError}
                onValueChange={(value) =>
                  field.onChange(value === "none" ? null : Number(value))
                }
                value={field.value ? String(field.value) : "none"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите начальника" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначен</SelectItem>
                  {eligibleUsers.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {getUserDisplayName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isError && (
            <p className="text-xs text-destructive">
              Не удалось загрузить список сотрудников.
            </p>
          )}
          {!isUsersLoading && !isError && eligibleUsers.length === 0 && (
            <p className="text-xs text-zinc-500">
              Назначить начальника можно после создания учетной записи сотрудника.
            </p>
          )}
          <p className="text-xs text-zinc-500">
            Доступны сотрудники без руководящей роли. При снятии начальника его
            роль будет возвращена к роли сотрудника.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Отмена
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isPending
            ? "Сохранение..."
            : isEdit
              ? "Сохранить изменения"
              : "Создать управление"}
        </Button>
      </div>
    </form>
  );
}
