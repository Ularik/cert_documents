"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type { UserRegisterCheckType } from "@/types/user";
import { useRegisterMutation } from "@/services/queries/users";

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UserRegisterCheckType>({
    defaultValues: {
      username: "",
      last_name: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  const { mutate, isPending, isError, error } = useRegisterMutation();

  function onSubmit(values: UserRegisterCheckType) {
    const { confirmPassword: _confirmPassword, ...payload } = values;
    mutate(payload, {
      onSuccess: () => {
        router.push("/login")
      }
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold">Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт, чтобы начать работу</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              placeholder="Иван Иванов"
              autoComplete="name"
              aria-invalid={!!errors.username}
              {...register("username", {
                required: "Введите имя",
                minLength: {
                  value: 2,
                  message: "Имя должно содержать минимум 2 символа",
                },
                maxLength: {
                  value: 50,
                  message: "Имя слишком длинное",
                },
                setValueAs: (value: string) => value.trim(),
                validate: (value) =>
                  value.trim().length > 0 ||
                  "Имя не может состоять из пробелов",
              })}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Фамилия</Label>
            <Input
              id="last_name"
              placeholder="Македонский"
              autoComplete="email"
              aria-invalid={!!errors.last_name}
              {...register("last_name", {
                required: "Введите фамилию",
                setValueAs: (value: string) => value.trim(),
                validate: (value) =>
                  value.trim().length > 0 ||
                  "Фамилия не может состоять из пробелов",
              })}
            />
            {errors.last_name && (
              <p className="text-sm text-destructive">
                {errors.last_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password", {
                  required: "Введите пароль",
                  minLength: {
                    value: 3,
                    message: "Пароль должен быть не менее 3 символов",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword", {
                  required: "Подтвердите пароль",
                  validate: (value) =>
                    value === password || "Пароли не совпадают",
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={
                  showConfirmPassword ? "Скрыть пароль" : "Показать пароль"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <a
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Войти
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
