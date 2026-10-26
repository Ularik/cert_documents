"use client";

import { DepartmentTasksList, DepartmentTasksLoading, } from "@/widgets/task-list";
import { useMe } from "@/entities/user";

export default function UserTasksPage() {
  const { data: user, isPending } = useMe();

  if (isPending) {
    return <DepartmentTasksLoading />;
  }

  if (!user) return null;

  return (
    <DepartmentTasksList user={user} taskBasePath="/users/tasks" canCreate />
  );
}
