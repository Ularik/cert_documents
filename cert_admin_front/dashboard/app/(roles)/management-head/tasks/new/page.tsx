"use client";

import CreateTaskForm from "@/components/tasks/createTask/CreateTaskForm";
import { useCreateManagementHeadTask } from "@/services/queries/management-head/tasks";
import { useMe } from "@/services/queries/users";
import type { TaskCreateType } from "@/types/tasks";
import { useRouter } from "next/navigation";

export default function ManagementHeadTaskAddPage() {
  const router = useRouter();
  const { data: user, isPending } = useMe();
  const createTask = useCreateManagementHeadTask();

  const submit = (data: TaskCreateType) => {
    createTask.mutate(data, {
      onSuccess: () => router.back(),
    });
  };

  if (isPending) {
    return <div className="p-6 text-sm text-zinc-500">Загрузка...</div>;
  }
  if (!user) return null;

  return (
    <CreateTaskForm
      user={user}
      submitFunc={submit}
      isPending={createTask.isPending}
    />
  );
}
