
"use client";

import { RushTasks } from "@/widgets/rush-tasks";
import { TaskStatusCounters } from "@/widgets/task-status-counters";
import { useMe } from "@/entities/user";

export default function Page() {
    const { data: user } = useMe();
    const managementId =
        user?.status === "MANAGEMENT_HEAD" && user.management_id
            ? String(user.management_id)
            : undefined;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">Панель администратора</h1>
                <p className="mt-1 text-sm text-zinc-500">Контроль срочных задач и документов</p>
            </div>
            <TaskStatusCounters managementId={managementId} />
            <RushTasks managementId={managementId} />
        </div>
    );
}