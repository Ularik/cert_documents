"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import DepartmentCreateForm from "@/components/departments/DepartmentCreateForm";
import { Button } from "@/components/ui/button";
import { useCreateManagementHeadDepartment } from "@/services/queries/management-head/organization";
import type { DepartmentCreateType } from "@/types/departments";

export default function CreateManagementHeadDepartmentPage() {
  const router = useRouter();
  const createDepartment = useCreateManagementHeadDepartment();

  const submit = (data: DepartmentCreateType) => {
    createDepartment.mutate(data, {
      onSuccess: () => {
        toast.success("Отдел успешно создан");
        router.push("/management-head/departments");
      },
      onError: (error) => {
        const detail =
          error instanceof AxiosError ? error.response?.data?.detail : undefined;
        toast.error(detail || "Ошибка при создании отдела");
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          aria-label="Назад"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Создание отдела</h1>
          <p className="text-sm text-zinc-500">
            Новый отдел будет создан в вашем управлении
          </p>
        </div>
      </div>
      <DepartmentCreateForm
        mutateFunc={submit}
        isPending={createDepartment.isPending}
      />
    </div>
  );
}
