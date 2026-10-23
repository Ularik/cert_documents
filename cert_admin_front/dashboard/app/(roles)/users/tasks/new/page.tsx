"use client";

import CreateTaskForm from "@/components/tasks/createTask/CreateTaskForm";
import { useCreateTask } from "@/services/queries/tasks";
import { useMe } from "@/services/queries/users";
import type { TaskCreateType } from "@/types/tasks";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserTaskAddPage() {
  const router = useRouter();
  const { data: user, isPending } = useMe();
  const taskCreate = useCreateTask();

  const submit = (data: TaskCreateType) => {
    taskCreate.mutate(data, {
      onSuccess: () => router.back(),
    });
  };

  if (isPending) {
    return <UserTaskAddSkeleton />;
  }

  if (!user?.department_id) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <Card className="border-amber-200 bg-amber-50/50 text-center shadow-sm">
          <CardContent className="space-y-4 p-8">
            <AlertCircle className="mx-auto h-6 w-6 text-amber-600" />
            <h2 className="text-lg font-semibold text-zinc-900">
              Отдел не привязан
            </h2>
            <p className="text-sm text-zinc-600">
              Создание задач доступно после привязки аккаунта к отделу.
            </p>
            <Link href="/users/tasks">
              <Button variant="outline" className="border-zinc-300">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад к задачам
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CreateTaskForm
      user={user}
      submitFunc={submit}
      isPending={taskCreate.isPending}
    />
  );
}

function UserTaskAddSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
