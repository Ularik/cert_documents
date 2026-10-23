"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import DepartmentCreateForm from "@/components/departments/DepartmentCreateForm";
import { Button } from "@/components/ui/button";
import {
  useOneDepartment,
} from "@/services/queries/departments";
import { useUpdateManagementHeadDepartment } from "@/services/queries/management-head/organization";
import type {
  DepartmentCreateType,
  DepartmentUpdateType,
} from "@/types/departments";

export default function ManagementHeadDepartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data: department, isPending, isError } = useOneDepartment(id ?? "");
  const updateDepartment = useUpdateManagementHeadDepartment();

  const initialValue = useMemo<DepartmentCreateType | undefined>(() => {
    if (!department) return undefined;
    return {
      title: department.title,
      description: department.description,
      management_id: department.management_id,
      head_id: department.head ? Number(department.head.id) : null,
      deputy_head_id: department.deputy_head
        ? Number(department.deputy_head.id)
        : null,
    };
  }, [department]);

  const submit = (data: DepartmentCreateType) => {
    if (!id) return;
    const managementId = data.management_id;
    if (managementId === null) {
      toast.error("Не удалось определить управление отдела");
      return;
    }
    const payload: DepartmentUpdateType = {
      ...data,
      id,
      management_id: managementId,
    };
    updateDepartment.mutate(payload, {
      onSuccess: () => toast.success("Данные отдела обновлены"),
      onError: (error) => {
        const detail =
          error instanceof AxiosError ? error.response?.data?.detail : undefined;
        toast.error(detail || "Не удалось обновить отдел");
      },
    });
  };

  if (!id) return <p className="p-8 text-center text-red-500">Некорректный идентификатор отдела.</p>;
  if (isPending) return <div className="p-8">Загрузка отдела...</div>;
  if (isError || !department) {
    return <div className="p-8 text-center text-red-500">Отдел не найден.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-5">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-bold text-zinc-900">
          Редактирование отдела: {department.title}
        </h1>
      </div>
      <DepartmentCreateForm
        initialValue={initialValue}
        isPending={updateDepartment.isPending}
        mutateFunc={submit}
      />
    </div>
  );
}
