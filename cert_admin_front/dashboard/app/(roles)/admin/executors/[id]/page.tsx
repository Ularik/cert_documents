"use client";

import ExecutorDetail from "@/components/executors/ExecutorDetail";
import { use } from "react";
import { useUserDetail } from "@/services/queries/users";
import { useAdminUserDelete, useAdminUserUpdate } from "@/services/queries/admin/users";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { UserUpdateType } from "@/types/user";
import { useMe } from "@/services/queries/users";


interface Props {
  params: Promise<{ id: string }>
}

export default function ExecutorDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { data: currentUser } = useMe();
  const { data: user, isPending: isUserLoading } = useUserDetail(id);
  
  const { mutateAsync: updateUser, isPending: isUpdating, error: updateError } = useAdminUserUpdate();
  const handleUpdate = ({ id, data }: { id: string; data: UserUpdateType }) => {
    updateUser({ id, data }, {
      onSuccess: () => {
        toast.success("Данные сотрудника успешно обновлены");
        router.back();
      },
    });
  }

  
  const { mutateAsync: deleteUser, isPending: isDeleting, error } = useAdminUserDelete();
  const handleDelete = (id: string) => {
    deleteUser(id, {
      onSuccess: () => {
        toast.success("Сотрудник успешно удален");
        router.back();
      },
    });
  };

  if (!user && !isUserLoading) {
    return <div>Сотрудник не найден</div>;
  }

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }
  
  return (
    <>
    {user && (<ExecutorDetail 
    user={user} 
    isUpdating={isUpdating}
    handleUpdate={handleUpdate}
    isDeleting={isDeleting} 
    handleDelete={handleDelete} 
    serverError={error || updateError}
    isAdmin={currentUser?.status === "ADMIN" || currentUser?.status === "DIVISION_HEAD"}
    isManagementHead={currentUser?.status === "MANAGEMENT_HEAD"}
    />)}
    </>
  )
}