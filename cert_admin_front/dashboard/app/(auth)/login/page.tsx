"use client";

import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LoginFormData } from "@/types/user";
import { useLogin } from "@/services/queries/users";
import { useRouter } from "next/navigation";


export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      username: "",
      last_name: "",
      password: "",
    },
  });

  const { mutate: login, isPending, isError, error } = useLogin();
  const router = useRouter();
  function onSubmit(values: LoginFormData) {
    login(values, {
      onSuccess: () => {
        router.push("/admin");
      },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Вход в систему
          </CardTitle>
          <CardDescription>
            Введите свои учетные данные для авторизации
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div role="form" className="space-y-4">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                placeholder="johndoe"
                {...register("username", {
                  required: "Имя пользователя обязательно",
                  minLength: {
                    value: 3,
                    message: "Минимум 3 символа",
                  },
                })}
              />
              {errors.username && (
                <p className="text-xs font-medium text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Last Name Field */}
            <div className="space-y-2">
              <Label htmlFor="last_name">Фамилия</Label>
              <Input
                id="last_name"
                placeholder="Doe"
                {...register("last_name", {
                  required: "Фамилия обязательна",
                  minLength: {
                    value: 2,
                    message: "Минимум 2 символа",
                  },
                })}
              />
              {errors.last_name && (
                <p className="text-xs font-medium text-destructive">
                  {errors.last_name.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password", {
                  required: "Пароль обязателен",
                  // minLength: {
                  //   value: 6,
                  //   message: "Пароль должен быть не менее 6 символов",
                  // },
                })}
              />
              {errors.password && (
                <p className="text-xs font-medium text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {isError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error.message}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="w-full"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
