"use client";

import { use } from "react";
import TaskDetail from "@/components/tasks/taskDetail/TaskDetail";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskDetail, useUpdateTask, useDeleteTask } from "@/services/queries/tasks";
import { useMe } from "@/services/queries/users";
import type { TaskUpdateType } from "@/types/tasks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";


export default function UserTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const router = useRouter();

  const { data: task, isPending, isError } = useTaskDetail(id);
  const { data: user, isPending: isUserPending } = useMe();
  const { mutate: updateTask, isPending: updateLoading, error} = useUpdateTask();
  const { mutate: deleteTask, isPending: isDeleting, error: deleteError } = useDeleteTask();

  const submit = (data: TaskUpdateType) => {
    updateTask({id, data}, {
      onSuccess: () => {
        toast.success("Обновили задачу", { position: 'top-center'})
      },
      onError: () => {
        toast.error("Ошибка при обновлении", {position: 'top-center'})
      }
    })
  };

  const handleDelete = () => {
    deleteTask(id, {
      onSuccess: () => {
        toast.success("Success delete", { position: "top-center" });
        router.back();
      },
      onError: () => {
        toast.error("Ошибка при удалении", { position: "top-center" });
      }
    })
  }

  if (isPending || isUserPending) return <TaskDetailSkeleton />;

  const hasDepartmentAccess = Boolean(
    user?.department_id &&
    task?.departments?.some(
      (department) => String(department.id) === String(user.department_id),
    ),
  );
  if (isError || !task || !hasDepartmentAccess) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-8 text-center text-sm text-red-700">
            Задача не найдена или недоступна.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TaskDetail
      task={task}
      user={user!}
      updateTaskFunc={submit}
      deleteTaskFunc={handleDelete}
      isDeleting={isDeleting}
      isUpdating={updateLoading}
      replyBasePath="/users/tasks"
    />
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <Skeleton className="h-5 w-32 bg-zinc-200" />
      <Skeleton className="h-96 w-full bg-zinc-200" />
    </div>
  );
}
