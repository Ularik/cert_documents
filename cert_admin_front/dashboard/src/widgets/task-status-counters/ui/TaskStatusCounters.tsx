"use client";

import { useState } from "react";
import { useTasks } from "@/entities/task";
import type { PagingParams } from "@/shared/types/main";

import TaskStatusListDialog from "./TaskStatusListDialog";

type CounterKey = "done" | "active" | "expired";

interface CounterCard {
  key: CounterKey;
  label: string;
  dialogTitle: string;
  filters: Omit<PagingParams, "limit" | "offset">;
  className: string;
  valueClassName: string;
  labelClassName: string;
}

interface TaskStatusCountersProps {
  departmentId?: string;
  managementId?: string;
  tasksApiPath?: string;
  /** Базовый путь страницы задачи для ссылок в списке, напр. "/heads/tasks" */
  taskBasePath?: string;
}

export default function TaskStatusCounters({
  departmentId,
  managementId,
  tasksApiPath = "/tasks/",
  taskBasePath = "/admin/tasks",
}: TaskStatusCountersProps) {
  const [periodDays, setPeriodDays] = useState(5);
  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() - periodDays);
  const fromDate = periodStart.toISOString().slice(0, 10);
  const toDate = new Date().toISOString().slice(0, 10);

  const baseFilters = {
    department_id: departmentId,
    management_id: managementId,
    from_date: fromDate,
    to_date: toDate,
  };

  const cards: CounterCard[] = [
    {
      key: "done",
      label: "ЗАВЕРШЕНЫ",
      dialogTitle: "Завершённые задачи",
      filters: { ...baseFilters, status: ["DONE"] },
      className: "border-emerald-100 bg-emerald-50 hover:border-emerald-300",
      valueClassName: "text-emerald-700",
      labelClassName: "text-emerald-600",
    },
    {
      key: "active",
      label: "НОВЫЕ И В РАБОТЕ",
      dialogTitle: "Новые задачи и задачи в работе",
      filters: { ...baseFilters, status: ["NEW", "PROGRESS"] },
      className: "border-amber-100 bg-amber-50 hover:border-amber-300",
      valueClassName: "text-amber-700",
      labelClassName: "text-amber-600",
    },
    {
      key: "expired",
      label: "ПРОСРОЧЕНЫ",
      dialogTitle: "Просроченные задачи",
      filters: { ...baseFilters, is_expired: true },
      className: "border-red-100 bg-red-50 hover:border-red-300",
      valueClassName: "text-red-700",
      labelClassName: "text-red-600",
    },
  ];

  const { data: doneData } = useTasks({ ...cards[0].filters, limit: 1, offset: 0 }, tasksApiPath);
  const { data: activeData } = useTasks({ ...cards[1].filters, limit: 1, offset: 0 }, tasksApiPath);
  const { data: expiredData } = useTasks({ ...cards[2].filters, limit: 1, offset: 0 }, tasksApiPath);
  const totals: Record<CounterKey, number> = {
    done: doneData?.total ?? 0,
    active: activeData?.total ?? 0,
    expired: expiredData?.total ?? 0,
  };

  const [openKey, setOpenKey] = useState<CounterKey | null>(null);
  const openCard = cards.find((card) => card.key === openKey);

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
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setOpenKey(card.key)}
            title="Показать список задач"
            className={`cursor-pointer rounded-md border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 ${card.className}`}
          >
            <p className={`text-lg font-semibold leading-none ${card.valueClassName}`}>
              {totals[card.key]}
            </p>
            <p className={`mt-1 text-[10px] ${card.labelClassName}`}>{card.label}</p>
          </button>
        ))}
      </div>
      <TaskStatusListDialog
        open={Boolean(openCard)}
        onOpenChange={(open) => {
          if (!open) setOpenKey(null);
        }}
        title={openCard ? `${openCard.dialogTitle} за последние ${periodDays} дн.` : ""}
        filters={openCard?.filters ?? baseFilters}
        tasksApiPath={tasksApiPath}
        taskBasePath={taskBasePath}
      />
    </section>
  );
}
