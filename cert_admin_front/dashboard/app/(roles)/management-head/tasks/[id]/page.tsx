"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TaskDetail from "@/components/tasks/taskDetail/TaskDetail";
import { useMe } from "@/services/queries/users";
import { useTaskDetail } from "@/services/queries/tasks";
import {
  useDeleteManagementHeadTask,
  useUpdateManagementHeadTask,
} from "@/services/queries/management-head/tasks";
import type { TaskUpdateType } from "@/types/tasks";

export default function ManagementHeadTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: task, isLoading, isError } = useTaskDetail(
    id,
    "/management-head/tasks",
  );
  const { data: user, isLoading: isUserLoading } = useMe();
  const updateTask = useUpdateManagementHeadTask();
  const deleteTask = useDeleteManagementHeadTask();

  const handleUpdate = (data: TaskUpdateType) =>
    updateTask.mutateAsync({ id, data });
  const handleDelete = async () => {
    await deleteTask.mutateAsync(id);
    router.back();
  };

  if (isLoading || isUserLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-32 bg-zinc-200" />
      </div>
    );
  }

  if (isError || !task || !user) {
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
      user={user}
      updateTaskFunc={handleUpdate}
      deleteTaskFunc={handleDelete}
      isUpdating={updateTask.isPending}
      isDeleting={deleteTask.isPending}
      replyBasePath="/management-head/tasks"
      documentDownloadBasePath="/api/management-head/tasks/task-documents"
    />
  );
}
