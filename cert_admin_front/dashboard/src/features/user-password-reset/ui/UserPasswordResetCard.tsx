"use client";

import { useForm } from "react-hook-form";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { useAdminUserPasswordReset } from "@/entities/user";

const MIN_PASSWORD_LENGTH = 8;

interface Props {
  userId: string;
  username: string;
}

interface FormValues {
  password: string;
  confirm: string;
}

export default function UserPasswordResetCard({ userId, username }: Props) {
  const { mutate, isPending, error, reset: resetMutation } = useAdminUserPasswordReset();
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { password: "", confirm: "" } });

  const onSubmit = ({ password }: FormValues) => {
    mutate(
      { id: userId, password },
      {
        onSuccess: () => {
          toast.success(`Пароль пользователя ${username} изменён`);
          reset();
        },
      },
    );
  };

  const serverMessage =
    typeof error?.response?.data?.detail === "string"
      ? error.response.data.detail
      : "Не удалось изменить пароль. Попробуйте снова.";

  return (
    <Card className="border-zinc-200 shadow-xs">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-zinc-700" />
          Восстановление пароля
        </CardTitle>
        <CardDescription>
          Задайте новый пароль для пользователя и передайте его сотруднику
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          onChange={() => error && resetMutation()}
          className="space-y-4"
        >
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {serverMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">Новый пароль *</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("password", {
                required: "Введите новый пароль",
                minLength: {
                  value: MIN_PASSWORD_LENGTH,
                  message: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`,
                },
              })}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Повторите пароль *</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("confirm", {
                required: "Повторите пароль",
                validate: (value) =>
                  value === getValues("password") || "Пароли не совпадают",
              })}
            />
            {errors.confirm && (
              <p className="text-xs text-red-500">{errors.confirm.message}</p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-zinc-900 text-white hover:bg-zinc-800"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сменить пароль
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
