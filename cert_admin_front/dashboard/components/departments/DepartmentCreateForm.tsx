"use client";

import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Стилизованный компонент shadcn
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/services/queries/users";
import { useManagements } from "@/services/queries/managements";
import { useMe } from "@/services/queries/users";
import type { DepartmentCreateType } from "@/types/departments";
import Link from "next/link";

interface Props {
  initialValue?: DepartmentCreateType;
  mutateFunc: (data: DepartmentCreateType) => void;
  isPending: boolean;
  submitLabel?: string;
}

export default function DepartmentCreateForm({
  initialValue,
  mutateFunc,
  isPending,
  submitLabel,
}: Props) {
  const router = useRouter();
  const { data: users = [], isLoading: isUsersLoading } = useUsers();
  const {
    data: managements = [],
    isLoading: isManagementsLoading,
    isError: isManagementsError,
  } = useManagements();
  const { data: currentUser } = useMe();
  const availableManagements =
    currentUser?.status === "MANAGEMENT_HEAD"
      ? managements.filter(
          (management) =>
            String(management.id) === String(currentUser.management_id),
        )
      : managements;

  const isEdit = Boolean(initialValue);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DepartmentCreateType>({
    // `values` автоматически реактивно обновит форму при загрузке initialValue с сервера
    values: initialValue || {
      title: "",
      description: "",
      management_id:
        currentUser?.status === "MANAGEMENT_HEAD" &&
        currentUser.management_id != null
          ? Number(currentUser.management_id)
          : null,
      head_id: null,
      deputy_head_id: null,
    },
  });

  const onSubmit = (data: DepartmentCreateType) => {
    mutateFunc(data);
  };

  // Вспомогательный форматировщик имени пользователя
  const getUserDisplayName = (user: (typeof users)[number]) => {
    const fullName = [user.username, user.last_name]
      .filter(Boolean)
      .join(" ");
    return fullName || user.username || `Пользователь #${user.id}`;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Основная информация */}
      <Card className="border-zinc-200 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-900">
            Основная информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="management_id"
              className="text-xs font-semibold text-zinc-700"
            >
              Управление <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="management_id"
              rules={{
                required: "Выберите управление",
                validate: (value) => value !== null || "Выберите управление",
              }}
              render={({ field }) => (
                <Select
                  disabled={
                    isManagementsLoading ||
                    availableManagements.length === 0 ||
                    currentUser?.status === "MANAGEMENT_HEAD"
                  }
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? null : Number(value))
                  }
                  value={field.value === null ? "none" : String(field.value)}
                >
                  <SelectTrigger id="management_id" className="w-full">
                    <SelectValue placeholder="Выберите управление" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground">
                      Не выбрано
                    </SelectItem>
                    {availableManagements.map((management) => (
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
              <p className="text-[11px] font-medium text-destructive">
                {errors.management_id.message}
              </p>
            )}
            {isManagementsError && (
              <p className="text-[11px] font-medium text-destructive">
                Не удалось загрузить список управлений.
              </p>
            )}
            {!isManagementsLoading &&
              !isManagementsError &&
              availableManagements.length === 0 && (
                <p className="text-[11px] text-zinc-500">
                  {currentUser?.status === "MANAGEMENT_HEAD"
                    ? "Для вашей учетной записи не найдено связанное управление."
                    : (
                        <>
                          Сначала{" "}
                          <Link
                            href="/admin/managements/new"
                            className="font-medium text-zinc-900 underline"
                          >
                            создайте управление
                          </Link>
                          .
                        </>
                      )}
                </p>
              )}
          </div>

          {/* Название отдела */}
          <div className="space-y-2">
            <Label
              htmlFor="title"
              className="text-xs font-semibold text-zinc-700"
            >
              Название отдела <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Например, Отдел веб-разработки"
              className="border-zinc-200 focus-visible:ring-zinc-900"
              {...register("title", {
                required: "Укажите название отдела",
                minLength: {
                  value: 2,
                  message: "Название должно содержать минимум 2 символа",
                },
              })}
            />
            {errors.title && (
              <p className="text-[11px] font-medium text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-xs font-semibold text-zinc-700"
            >
              Описание
            </Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Подробно опишите сферы ответственности и задачи отдела..."
              className="border-zinc-200 focus-visible:ring-zinc-900 resize-none"
              {...register("description")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Руководство отдела */}
      <Card className="border-zinc-200 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-900">
            Руководящий состав
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Руководитель отдела */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-700">
              Руководитель отдела
            </Label>
            <Controller
              control={control}
              name="head_id"
              render={({ field }) => (
                <Select
                  disabled={isUsersLoading}
                  onValueChange={(val) =>
                    field.onChange(val === "none" ? null : Number(val))
                  }
                  value={field.value ? String(field.value) : "none"}
                >
                  <SelectTrigger className="w-full border-zinc-200 focus:ring-zinc-900">
                    <SelectValue placeholder="Выберите руководителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground">
                      Не выбрано
                    </SelectItem>
                    {users
                      .filter((user) =>
                        currentUser?.status === "MANAGEMENT_HEAD"
                          ? ["USER", "HEAD", "DEPUTY"].includes(user.status) &&
                            String(user.id) !== String(currentUser.id)
                          : true,
                      )
                      .map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {getUserDisplayName(user)}
                      </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Заместитель руководителя */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-700">
              Заместитель руководителя
            </Label>
            <Controller
              control={control}
              name="deputy_head_id"
              render={({ field }) => (
                <Select
                  disabled={isUsersLoading}
                  onValueChange={(val) =>
                    field.onChange(val === "none" ? null : Number(val))
                  }
                  value={field.value ? String(field.value) : "none"}
                >
                  <SelectTrigger className="w-full border-zinc-200 focus:ring-zinc-900">
                    <SelectValue placeholder="Выберите заместителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground">
                      Не выбрано
                    </SelectItem>
                    {users
                      .filter((user) =>
                        currentUser?.status === "MANAGEMENT_HEAD"
                          ? ["USER", "HEAD", "DEPUTY"].includes(user.status) &&
                            String(user.id) !== String(currentUser.id)
                          : true,
                      )
                      .map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {getUserDisplayName(user)}
                      </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Действия */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="border-zinc-200 text-zinc-700 hover:bg-zinc-100"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save size={16} />
              {submitLabel ||
                (isEdit ? "Сохранить изменения" : "Создать отдел")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
