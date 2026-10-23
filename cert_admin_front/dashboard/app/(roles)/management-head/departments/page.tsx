"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import DepCard from "@/components/departments/DepCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartments } from "@/services/queries/departments";
import { useManagements } from "@/services/queries/managements";
import { useDeleteManagementHeadDepartment } from "@/services/queries/management-head/organization";
import { useMe } from "@/services/queries/users";

export default function ManagementHeadDepartmentsPage() {
  const { data: user } = useMe();
  const { data: departments = [], isLoading, isError } = useDepartments();
  const { data: managements = [] } = useManagements();
  const deleteDepartment = useDeleteManagementHeadDepartment();
  const handleDelete = (id: string) => {
    deleteDepartment.mutate(id, {
      onSuccess: () => {
        toast.success("Отдел удален");
      },
      onError: (error) => {
        const detail =
          error instanceof AxiosError ? error.response?.data?.detail : undefined;
        toast.error(detail || "Не удалось удалить отдел");
      },
    });
  };

  const visibleDepartments = departments.filter(
    (department) =>
      String(department.management_id) === String(user?.management_id),
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Отделы управления
          </h1>
          <p className="text-sm text-zinc-500">
            Создание и управление отделами вашего управления
          </p>
        </div>
        <Link href="/management-head/departments/new">
          <Button className="bg-zinc-900 text-white hover:bg-zinc-800">
            <Plus size={16} className="mr-2" />
            Создать отдел
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-zinc-200 bg-white">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-32 bg-zinc-100" />
                <Skeleton className="h-4 w-full bg-zinc-100" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-3/4 bg-zinc-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Не удалось загрузить отделы управления.
        </div>
      ) : visibleDepartments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          В вашем управлении пока нет отделов.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleDepartments.map((department) => (
            <div key={department.id} className="relative">
              <DepCard
                dept={department}
                basePath="/management-head/departments"
                managementTitle={managements[0]?.title}
                onDelete={handleDelete}
                isDeleting={
                  deleteDepartment.isPending &&
                  deleteDepartment.variables === department.id
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
