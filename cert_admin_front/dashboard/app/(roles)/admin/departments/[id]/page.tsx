"use client";

import {
  useOneDepartment,
  useUpdateDepartment,
} from "@/services/queries/departments";
import DepartmentCreateForm from "@/components/departments/DepartmentCreateForm";
import {
  DepartmentCreateType,
  DepartmentUpdateType,
} from "@/types/departments";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { AxiosError } from "axios";

export default function DepDetail() {
  const params = useParams();
  const router = useRouter();

  // Гарантируем, что id — это строка и она существует
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const {
    data: department,
    isPending: isLoading,
    isError,
  } = useOneDepartment(id ?? "");

  const { mutate: updateDep, isPending: isUpdating } = useUpdateDepartment();

  // Преобразуем данные из DepartmentType в формат initialValues для формы (с ID руководителей)
  const initialFormValues = useMemo(() => {
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

  const handleUpdate = (data: DepartmentCreateType) => {
    if (!id) return;
    if (data.management_id === null) {
      toast.error("Выберите управление");
      return;
    }

    const payload: DepartmentUpdateType = {
      ...data,
      id,
      management_id: data.management_id,
    };

    updateDep(payload, {
      onSuccess: () => {
        toast.success("Данные отдела успешно обновлены");
      },
      onError: (error) => {
        const detail =
          error instanceof AxiosError
            ? error.response?.data?.detail
            : undefined;
        toast.error(detail || "Не удалось обновить отдел");
        console.error("Update department error:", error);
      },
    });
  };

  // 1. Проверка на отсутствие ID в URL
  if (!id) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Некорректный идентификатор отдела.
      </div>
    );
  }

  // 2. Состояние загрузки (Skeleton UI)
  if (isLoading) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="h-10 bg-gray-200 rounded w-full" />
        <div className="h-10 bg-gray-200 rounded w-full" />
        <div className="h-10 bg-gray-200 rounded w-1/4" />
      </div>
    );
  }

  // 3. Состояние ошибки или отсутствия данных
  if (isError || !department) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-red-600">Отдел не найден</h2>
        <p className="text-gray-500 text-sm">
          Возможно, он был удален, или передан неверный адрес страницы.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="border-zinc-200 text-zinc-700 hover:bg-zinc-100"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="block">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Редактирование отдела: {department.title}
          </h1>
          <p className="text-sm text-zinc-500">
            Измените необходимые поля и сохраните изменения.
          </p>
        </div>
      </div>

      <DepartmentCreateForm
        initialValue={initialFormValues}
        isPending={isUpdating}
        mutateFunc={handleUpdate}
      />
    </div>
  );
}
