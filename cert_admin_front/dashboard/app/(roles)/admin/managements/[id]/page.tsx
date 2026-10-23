"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ManagementForm from "@/components/managements/ManagementForm";
import {
  useManagement,
  useUpdateManagement,
} from "@/services/queries/managements";
import type { ManagementFormType } from "@/types/managements";

export default function EditManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const router = useRouter();
  const {
    data: management,
    isLoading,
    isError,
  } = useManagement(Number.isInteger(id) && id > 0 ? id : 0);
  const updateManagement = useUpdateManagement();

  const handleUpdate = (data: ManagementFormType) => {
    updateManagement.mutate(
      { id, ...data },
      {
        onSuccess: () => {
          toast.success("Данные управления обновлены");
          router.push("/admin/managements");
        },
        onError: (error) => {
          const detail =
            error instanceof AxiosError
              ? error.response?.data?.detail
              : undefined;
          toast.error(detail || "Не удалось обновить управление");
        },
      },
    );
  };

  if (!Number.isInteger(id) || id <= 0 || isError) {
    return (
      <div className="space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">
          Управление не найдено
        </h1>
        <Button variant="outline" onClick={() => router.push("/admin/managements")}>
          К списку управлений
        </Button>
      </div>
    );
  }

  if (isLoading || !management) {
    return (
      <div className="p-8 text-center text-sm text-zinc-500">
        Загрузка управления...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="mx-auto flex max-w-3xl items-center gap-4 border-b border-zinc-200 pb-5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/admin/managements")}
          aria-label="Назад к управлениям"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Изменение управления
          </h1>
          <p className="text-sm text-zinc-500">{management.title}</p>
        </div>
      </div>
      <ManagementForm
        initialValue={{
          title: management.title,
          description: management.description ?? "",
          head_id: management.head ? Number(management.head.id) : null,
        }}
        currentHeadId={management.head ? Number(management.head.id) : null}
        mutateFunc={handleUpdate}
        isPending={updateManagement.isPending}
      />
    </div>
  );
}
