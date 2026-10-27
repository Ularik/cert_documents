"use client";

import { useState } from "react";
import { useUsersTasksStats } from "@/entities/user";
import { Skeleton } from "@/shared/ui/skeleton";

interface EmployeeTaskStatsProps {
  usersPath?: string;
}

const columns = [
  { key: "total", label: "Всего", className: "text-zinc-900" },
  { key: "new", label: "Новые", className: "text-sky-700" },
  { key: "progress", label: "В работе", className: "text-amber-700" },
  { key: "done", label: "Завершены", className: "text-emerald-700" },
  { key: "expired", label: "Просрочены", className: "text-red-700" },
] as const;

export default function EmployeeTaskStats({
  usersPath = "/admin/users",
}: EmployeeTaskStatsProps) {
  const { data, isPending, isError } = useUsersTasksStats(usersPath);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const rows = (data ?? []).filter((row) =>
    `${row.last_name ?? ""} ${row.username} ${row.department_title ?? ""}`
      .toLowerCase()
      .includes(query),
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Статистика задач по сотрудникам
        </h2>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по ФИО или отделу"
          className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs sm:w-64"
        />
      </div>

      {isPending ? (
        <Skeleton className="h-40 w-full bg-zinc-200" />
      ) : isError ? (
        <p className="text-sm text-red-600">Не удалось загрузить статистику.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Сотрудник</th>
                <th className="px-3 py-2 font-medium">Отдел</th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-3 py-2 text-center font-medium"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-3 py-6 text-center text-zinc-500"
                  >
                    Сотрудники не найдены
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      {row.last_name
                        ? `${row.last_name} ${row.username}`
                        : row.username}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      {row.department_title ?? "—"}
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-3 py-2 text-center tabular-nums ${
                          row[column.key] > 0 ? column.className : "text-zinc-300"
                        }`}
                      >
                        {row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
