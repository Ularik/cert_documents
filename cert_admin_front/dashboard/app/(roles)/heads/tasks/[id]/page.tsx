"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import TaskDetail from "@/components/tasks/taskDetail/TaskDetail";
import { useMe } from "@/services/queries/users";
import { useUpdateHeadsTask, useDeleteHeadsTask } from "@/services/queries/heads/tasks";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskDetail } from "@/services/queries/tasks";
import { useRouter } from "next/navigation";
import { use } from "react";
import { TaskUpdateType } from "@/types/tasks";
import { ADMIN_ACCESS_ROLES } from "@/constants/main";


export default function TaskAdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: task, isLoading, isError } = useTaskDetail(id);
  const router = useRouter();

  const { data: me, isLoading: isMeLoading } = useMe();

  console.log("me", me);
  const updateTask = useUpdateHeadsTask();

  const handleUpdate = (data: TaskUpdateType) => {
    updateTask.mutateAsync({ id, data });
  }
  const deleteTask = useDeleteHeadsTask();

  const handleDelete = async () => {
    try {
      deleteTask.mutateAsync(id);
      router.back();
    } catch (error) {
      console.error("Ошибка удаления:", error);
    }
  };


  if (isLoading || isMeLoading) return <TaskDetailSkeleton />;

  if (
    !me ||
    (!ADMIN_ACCESS_ROLES.includes(me.status) && me.department_id === null)
  ) {

    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 text-center">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к списку
        </Button>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 text-center">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к списку
        </Button>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-8 space-y-3">
            <AlertTriangle className="h-10 w-10 mx-auto text-red-500" />
            <h2 className="text-lg font-semibold text-red-900">
              Задача не найдена
            </h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TaskDetail
      task={task}
      user={me!}
      updateTaskFunc={handleUpdate}
      deleteTaskFunc={handleDelete}
      isUpdating={updateTask.isPending}
      isDeleting={deleteTask.isPending}
    />
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-8 w-32 bg-zinc-200" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] w-full bg-zinc-200 rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-[250px] w-full bg-zinc-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
