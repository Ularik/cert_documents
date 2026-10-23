"use client";

import CreateTaskForm from "@/components/tasks/createTask/CreateTaskForm";
import { useMe } from "@/services/queries/users";
import { useCreateAdminTask } from "@/services/queries/admin/tasks";
import { TaskCreateType } from "@/types/tasks";
import { useRouter } from "next/navigation";


export default function AdminTaskAddPage() {
  const router = useRouter();
  const { data: me, isPending } = useMe();
  const taskCreate = useCreateAdminTask();

  const sumbit = (data: TaskCreateType) => {
    taskCreate.mutate(data, {
      onSuccess: () => {
        router.back();
      },
    });
  };

  if (isPending) {
    return <ExecutorAddSkeleton />;
  }

  if (!me) {
    return null
  }

  return (
    <>
      <CreateTaskForm
        user={me}
        submitFunc={sumbit}
        isPending={taskCreate.isPending}
      />
    </>
  );
}

function ExecutorAddSkeleton() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-zinc-200 rounded w-1/3" />
      <div className="h-64 bg-zinc-200 rounded-xl" />
    </div>
  );
}
