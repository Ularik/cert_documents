"use client";

import RushTasks from "@/components/tasks/RushTasks";
import TaskStatusCounters from "@/components/tasks/TaskStatusCounters";
import { useMe } from "@/services/queries/users";

export default function ManagementHeadDashboard() {
  const { data: user, isPending } = useMe();

  if (isPending) {
    return <div className="p-6 text-sm text-zinc-500">Загрузка сводки...</div>;
  }
  if (!user) return null;

  const managementId = user.management_id
    ? String(user.management_id)
    : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Панель начальника управления
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Сводка срочных задач и документов вашего управления
        </p>
      </div>
      <TaskStatusCounters
        managementId={managementId}
        tasksApiPath="/management-head/tasks/"
      />
      <RushTasks
        managementId={managementId}
        taskBasePath="/management-head/tasks"
        tasksApiPath="/management-head/tasks/"
        documentDownloadBasePath="/api/management-head/tasks/task-documents"
      />
    </div>
  );
}
