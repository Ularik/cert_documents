"use client";

import AllTasksList from "@/components/tasks/allTasksList/AllTasksList";
import { useMe } from "@/services/queries/users";

export default function ManagementHeadTasksPage() {
  const { data: user, isPending } = useMe();

  if (isPending) {
    return <div className="p-6 text-sm text-zinc-500">Загрузка задач...</div>;
  }
  if (!user) return null;

  return (
    <AllTasksList
      user={user}
      taskBasePath="/management-head/tasks"
      tasksApiPath="/management-head/tasks/"
    />
  );
}
