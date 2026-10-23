"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DepartmentCreateForm from "@/components/departments/DepartmentCreateForm";
import { useAddDepartments } from "@/services/queries/departments";
import { DepartmentCreateType } from "@/types/departments";
import { toast } from "sonner";
import { AxiosError } from "axios";


export default function CreateDepartmentPage() {
  const router = useRouter();

  const { mutate: addDep, isPending } = useAddDepartments();

  const submit = (data: DepartmentCreateType) => {
    addDep(data, {
      onSuccess: () => {
        toast.success("Отдел успешно создан");
        router.push("/admin/departments");
      },
      onError: (error) => {
        const detail =
          error instanceof AxiosError
            ? error.response?.data?.detail
            : undefined;
        toast.error(detail || "Ошибка при создании");
      },
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6 lg:p-8">
      {/* Шапка страницы */}
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="border-zinc-200 text-zinc-700 hover:bg-zinc-100"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Создание нового отдела
          </h1>
          <p className="text-sm text-zinc-500">
            Заполните данные для создания нового подразделения в системе
          </p>
        </div>
      </div>
      <DepartmentCreateForm mutateFunc={submit} isPending={isPending} />
      
    </div>
  );
}
