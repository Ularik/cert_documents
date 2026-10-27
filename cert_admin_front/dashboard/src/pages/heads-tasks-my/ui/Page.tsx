"use client";

import { MyTasksList } from "@/widgets/task-list";

export default function MyTasksPage() {
  return <MyTasksList taskBasePath="/heads/tasks" />;
}
