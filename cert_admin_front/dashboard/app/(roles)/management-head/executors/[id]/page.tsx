"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ExecutorDetail from "@/components/executors/ExecutorDetail";
import { useMe, useUserDetail } from "@/services/queries/users";
import {
  useDeleteManagementHeadUser,
  useUpdateManagementHeadUser,
} from "@/services/queries/management-head/organization";
import type { UserUpdateType } from "@/types/user";

export default function ManagementHeadExecutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: currentUser } = useMe();
  const { data: user, isPending } = useUserDetail(id);
  const updateUser = useUpdateManagementHeadUser();
  const deleteUser = useDeleteManagementHeadUser();

  const handleUpdate = (
    variables: { id: string; data: UserUpdateType },
  ) => {
    updateUser.mutate(variables, {
      onSuccess: () => {
        toast.success("Данные сотрудника успешно обновлены");
        router.back();
      },
      onError: () => toast.error("Не удалось обновить сотрудника"),
    });
  };

  const handleDelete = (userId: string) => {
    deleteUser.mutate(userId, {
      onSuccess: () => {
        toast.success("Сотрудник успешно удален");
        router.back();
      },
      onError: () => toast.error("Не удалось удалить сотрудника"),
    });
  };

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }
  if (!user) return <div className="p-6">Сотрудник не найден</div>;

  return (
    <ExecutorDetail
      user={user}
      isUpdating={updateUser.isPending}
      handleUpdate={handleUpdate}
      isDeleting={deleteUser.isPending}
      handleDelete={handleDelete}
      serverError={updateUser.error}
      isAdmin={false}
      isManagementHead={currentUser?.status === "MANAGEMENT_HEAD"}
    />
  );
}
