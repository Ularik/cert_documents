"use client";

import { useMyTasksStats } from "@/entities/user";
import { Skeleton } from "@/shared/ui/skeleton";

const counters = [
  { key: "total", label: "Всего", className: "text-zinc-900" },
  { key: "new", label: "Новые", className: "text-sky-700" },
  { key: "progress", label: "В работе", className: "text-amber-700" },
  { key: "done", label: "Завершены", className: "text-emerald-700" },
  { key: "expired", label: "Просрочены", className: "text-red-700" },
] as const;

export default function MyTaskStats() {
  const { data, isPending, isError } = useMyTasksStats();

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Моя статистика по задачам
      </h2>
      {isPending ? (
        <Skeleton className="h-20 w-full bg-zinc-200" />
      ) : isError || !data ? (
        <p className="text-sm text-red-600">Не удалось загрузить статистику.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {counters.map((counter) => (
            <div
              key={counter.key}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <p className="text-xs text-zinc-500">{counter.label}</p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums ${
                  data[counter.key] > 0 ? counter.className : "text-zinc-300"
                }`}
              >
                {data[counter.key]}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
