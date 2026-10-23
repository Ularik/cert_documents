"use client";

import { EmployeeCard } from "@/components/users/usersCard";
import { useUsers, useMe } from "@/services/queries/users";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserX } from "lucide-react";

export default function MyExecutors() {
  const { data: me, isPending: isMePending } = useMe();
  const department_id = me?.department_id ?? undefined;

  const { data: users = [], isPending: isUsersPending } =
    useUsers(department_id);

  const isLoading = isMePending || isUsersPending;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Шапка страницы */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-zinc-600" />
            Сотрудники моего отдела
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Список исполнителей и коллег вашего подразделения
          </p>
        </div>

        {!isLoading && (
          <div className="text-xs font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full border border-zinc-200">
            Всего:{" "}
            <span className="text-zinc-900 font-semibold">{users.length}</span>
          </div>
        )}
      </div>

      {/* Состояние загрузки (Skeleton) */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-16 w-full rounded-lg bg-zinc-100"
            />
          ))}
        </div>
      ) : users.length > 0 ? (
        /* Список сотрудников */
        <div className="flex gap-3">
          {users.map((employee) => (
            <div key={employee.id} className="w-[250px]">
              <EmployeeCard user={employee} variant="compact" />
            </div>
          ))}
        </div>
      ) : (
        /* Пустое состояние */
        <Card className="border-dashed border-zinc-300 bg-zinc-50/50">
          <CardContent className="p-8 text-center space-y-2">
            <UserX className="h-8 w-8 mx-auto text-zinc-400" />
            <p className="text-sm font-medium text-zinc-700">
              Сотрудники не найдены
            </p>
            <p className="text-xs text-zinc-500">
              В вашем отделе пока нет зарегистрированных исполнителей.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
