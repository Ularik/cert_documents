"use client";

import { MyTasksList } from "@/widgets/task-list";

export default function MyTasksPage() {
  return <MyTasksList taskBasePath="/users/tasks" />;
}
