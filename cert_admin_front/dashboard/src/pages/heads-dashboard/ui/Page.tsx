
"use client";

import { EmployeeTaskStats, EmployeeTasksHistory, MyTaskStats } from "@/widgets/employee-task-stats";
import { RushTasks } from "@/widgets/rush-tasks";
import { TaskStatusCounters } from "@/widgets/task-status-counters";
import { useMe } from "@/entities/user";

export default function Page() {
    const { data: user, isPending } = useMe();

    if (isPending) return <div className="p-6 text-sm text-zinc-500">Загрузка панели...</div>;
    if (!user?.department_id) {
        return <div className="p-6 text-sm text-zinc-500">Отдел не назначен.</div>;
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">Панель отдела</h1>
                <p className="mt-1 text-sm text-zinc-500">Сводка и срочные задачи вашего отдела</p>
            </div>
            <TaskStatusCounters departmentId={user.department_id} />
            <RushTasks departmentId={user.department_id} taskBasePath="/heads/tasks" />
            <MyTaskStats />
            <EmployeeTaskStats usersPath="/head/users" />
            <EmployeeTasksHistory usersPath="/head/users" taskBasePath="/heads/tasks" />
        </div>
    );
}