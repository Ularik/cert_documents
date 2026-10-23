"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartments } from "@/services/queries/departments";
import DepCard from "@/components/departments/DepCard";
import Link from "next/link";
import { useManagements } from "@/services/queries/managements";
import { useDeleteDepartment } from "@/services/queries/departments";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useMe } from "@/services/queries/users";


export default function DepartmentsPage() {
  const { data: currentUser } = useMe();
  const isManagementHead = currentUser?.status === "MANAGEMENT_HEAD";
  const [managementFilter, setManagementFilter] = useState("all");
  const {
    data: displayDepartments = [],
    isLoading,
    isError,
  } = useDepartments();
  const {
    data: managements = [],
    isLoading: isManagementsLoading,
    isError: isManagementsError,
  } = useManagements();
  const deleteDepartment = useDeleteDepartment();

  const filteredDepartments =
    !isManagementHead && managementFilter === "all"
      ? displayDepartments
      : displayDepartments.filter(
          (department) =>
            String(department.management_id) ===
            (isManagementHead
              ? String(currentUser?.management_id)
              : managementFilter),
        );

  const handleDelete = (id: string) => {
    deleteDepartment.mutate(id, {
      onSuccess: () => toast.success("Отдел удален"),
      onError: (error) => {
        const detail =
          error instanceof AxiosError
            ? error.response?.data?.detail
            : undefined;
        toast.error(detail || "Не удалось удалить отдел");
      },
    });
  };


  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Шапка страницы */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Отделы компании
          </h1>
          <p className="text-sm text-zinc-500">
            Управление структурами, подразделениями
          </p>
        </div>
        <Link href="/admin/departments/new">
          <Button className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm">
            <Plus size={16} />
            <span>Создать отдел</span>
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <label
          htmlFor="management-filter"
          className="text-sm font-medium text-zinc-700"
        >
          Фильтр по управлению
        </label>
        <Select
          value={
            isManagementHead
              ? String(currentUser?.management_id ?? "")
              : managementFilter
          }
          onValueChange={(value) => value && setManagementFilter(value)}
          disabled={isManagementsLoading || isManagementsError}
        >
          <SelectTrigger id="management-filter" className="w-full bg-white">
            <SelectValue placeholder="Выберите управление" />
          </SelectTrigger>
          <SelectContent>
            {!isManagementHead && (
              <SelectItem value="all">Все управления</SelectItem>
            )}
            {managements.map((management) => (
              <SelectItem key={management.id} value={String(management.id)}>
                {management.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isManagementsError && (
          <p className="text-xs text-destructive">
            Не удалось загрузить управления для фильтра.
          </p>
        )}
      </div>

      {/* Модальное окно создания отдела */}

      {/* Список или скелетон */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-zinc-200 bg-white shadow-xs">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-32 bg-zinc-100" />
                <Skeleton className="h-4 w-full bg-zinc-100" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-3/4 bg-zinc-100" />
                <Skeleton className="h-3 w-1/2 bg-zinc-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Не удалось загрузить список отделов. Проверьте соединение с сервером.
        </div>
      ) : (
        /* Грид-сетка отделов */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepartments.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
              {managementFilter === "all"
                ? "Отделов пока нет."
                : "В выбранном управлении отделов нет."}
            </div>
          ) : filteredDepartments.map((dept) => (
            <DepCard
              key={dept.id}
              dept={dept}
              onDelete={handleDelete}
              isDeleting={
                deleteDepartment.isPending &&
                deleteDepartment.variables === dept.id
              }
              managementTitle={
                managements.find(
                  (management) => management.id === dept.management_id,
                )?.title
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
