"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ManagementForm from "@/components/managements/ManagementForm";
import { useCreateManagement } from "@/services/queries/managements";
import type { ManagementFormType } from "@/types/managements";

export default function CreateManagementPage() {
  const router = useRouter();
  const createManagement = useCreateManagement();

  const handleCreate = (data: ManagementFormType) => {
    createManagement.mutate(data, {
      onSuccess: () => {
        toast.success("Управление создано");
        router.push("/admin/managements");
      },
      onError: (error) => {
        const detail =
          error instanceof AxiosError
            ? error.response?.data?.detail
            : undefined;
        toast.error(detail || "Не удалось создать управление");
      },
    });
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="mx-auto flex max-w-3xl items-center gap-4 border-b border-zinc-200 pb-5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          aria-label="Назад к управлениям"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Создание управления
          </h1>
          <p className="text-sm text-zinc-500">
            Заполните основные данные и при необходимости назначьте начальника.
          </p>
        </div>
      </div>
      <ManagementForm
        mutateFunc={handleCreate}
        isPending={createManagement.isPending}
      />
    </div>
  );
}
