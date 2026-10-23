"use client";

import { useState } from "react";
import { useTasks } from "@/services/queries/tasks";

interface TaskStatusCountersProps {
  departmentId?: string;
  managementId?: string;
  tasksApiPath?: string;
}

export default function TaskStatusCounters({
  departmentId,
  managementId,
  tasksApiPath = "/tasks/",
}: TaskStatusCountersProps) {
  const [periodDays, setPeriodDays] = useState(5);
  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() - periodDays);
  const fromDate = periodStart.toISOString().slice(0, 10);
  const toDate = new Date().toISOString().slice(0, 10);

  const { data: doneData } = useTasks(
    {
      limit: 1,
      offset: 0,
      status: ["DONE"],
      department_id: departmentId,
      management_id: managementId,
      from_date: fromDate,
      to_date: toDate,
    },
    tasksApiPath,
  );

  const { data: activeData } = useTasks(
    {
      limit: 1,
      offset: 0,
      status: ["NEW", "PROGRESS"],
      department_id: departmentId,
      management_id: managementId,
      from_date: fromDate,
      to_date: toDate,
    },
    tasksApiPath,
  );

  const { data: expiredData } = useTasks(
    {
      limit: 1,
      offset: 0,
      department_id: departmentId,
      management_id: managementId,
      from_date: fromDate,
      to_date: toDate,
      is_expired: true,
    },
    tasksApiPath,
  );

  return (
    <section className="border-b border-zinc-200 pb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {managementId ? "Сводка по задачам управления" : "Сводка по всем задачам"}
        </h2>
        <label className="flex items-center gap-2 text-[11px] text-zinc-500">
          За последние
          <input
            type="number"
            min={1}
            value={periodDays}
            onChange={(event) => {
              setPeriodDays(Math.max(1, Number(event.target.value) || 1));
            }}
            className="h-8 w-16 rounded-md border border-zinc-200 bg-white px-2 text-center text-xs"
          />
          дней
        </label>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-2 text-center">
          <p className="text-lg font-semibold leading-none text-emerald-700">
            {doneData?.total ?? 0}
          </p>
          <p className="mt-1 text-[10px] text-emerald-600">ЗАВЕРШЕНЫ</p>
        </div>
        <div className="rounded-md border border-amber-100 bg-amber-50 px-2 py-2 text-center">
          <p className="text-lg font-semibold leading-none text-amber-700">
            {activeData?.total ?? 0}
          </p>
          <p className="mt-1 text-[10px] text-amber-600">НОВЫЕ И В РАБОТЕ</p>
        </div>
        <div className="rounded-md border border-red-100 bg-red-50 px-2 py-2 text-center">
          <p className="text-lg font-semibold leading-none text-red-700">
            {expiredData?.total ?? 0}
          </p>
          <p className="mt-1 text-[10px] text-red-600">ПРОСРОЧЕНЫ</p>
        </div>
      </div>
    </section>
  );
}
