"use client";

import AllTasksList from "@/components/tasks/allTasksList/AllTasksList";
import { useMe } from "@/services/queries/users";

export default function AdminsTasksPage() {
  const { data: me, isPending } = useMe();

  if (isPending) {
    return <TasksSkeleton />;
  }

  if (!me) {
    return null;
  }

  return <AllTasksList user={me} />;
}

function TasksSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-zinc-200 rounded w-1/4 mb-6" />
      <div className="space-y-3">
        <div className="h-16 bg-zinc-200 rounded-lg" />
        <div className="h-16 bg-zinc-200 rounded-lg" />
        <div className="h-16 bg-zinc-200 rounded-lg" />
      </div>
    </div>
  );
}
