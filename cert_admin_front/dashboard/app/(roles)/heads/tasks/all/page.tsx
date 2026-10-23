"use client";

import DepartmentTasksList, {
  DepartmentTasksLoading,
} from "@/components/tasks/departmentTasksList/DepartmentTasksList";
import { useMe } from "@/services/queries/users";

export default function HeadsAllTasksPage() {
  const { data: user, isPending } = useMe();

  if (isPending) {
    return <DepartmentTasksLoading />;
  }

  if (!user) return null;

  return (
    <DepartmentTasksList user={user} taskBasePath="/heads/tasks" canCreate />
  );
}
