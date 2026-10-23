"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useDeleteManagement,
  useManagements,
} from "@/services/queries/managements";
import { useMe } from "@/services/queries/users";

export default function ManagementsView() {
  const { data: managements = [], isLoading, isError } = useManagements();
  const { data: currentUser } = useMe();
  const isManagementHead = currentUser?.status === "MANAGEMENT_HEAD";
  const deleteManagement = useDeleteManagement();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteManagement.mutate(id, {
      onSuccess: () => toast.success("Управление удалено"),
      onError: (error) => {
        const detail =
          error instanceof AxiosError
            ? error.response?.data?.detail
            : undefined;
        toast.error(
          detail ||
            "Не удалось удалить управление. Сначала переместите или удалите связанные отделы.",
        );
      },
      onSettled: () => setDeletingId(null),
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Управления
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Структура компании, начальники и входящие в управления отделы
          </p>
        </div>
        {!isManagementHead && <Link href="/admin/managements/new">
          <Button className="bg-zinc-900 text-white hover:bg-zinc-800">
            <Plus className="mr-2 h-4 w-4" />
            Создать управление
          </Button>
        </Link>}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          Загрузка управлений...
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Не удалось загрузить управления. Проверьте соединение с сервером.
        </div>
      ) : managements.length === 0 ? (
        <Card className="border-dashed border-zinc-300 bg-white">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Building2 className="h-10 w-10 text-zinc-400" />
            <p className="font-medium text-zinc-900">Управлений пока нет</p>
            <p className="text-sm text-zinc-500">
              Создайте управление, чтобы привязывать к нему отделы.
            </p>
            {!isManagementHead && <Link href="/admin/managements/new">
              <Button variant="outline">Создать управление</Button>
            </Link>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {managements.map((management) => (
            <Card key={management.id} className="border-zinc-200 bg-white">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                    <Building2 className="h-5 w-5 text-zinc-700" />
                  </div>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                    ID: {management.id}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-lg">{management.title}</CardTitle>
                  <p className="mt-1 min-h-5 text-sm text-zinc-500">
                    {management.description || "Описание отсутствует"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 border-t border-zinc-100 pt-3 text-sm">
                  <p className="text-zinc-600">
                    Начальник:{" "}
                    <span className="font-medium text-zinc-900">
                      {management.head
                        ? [management.head.last_name, management.head.username]
                            .filter(Boolean)
                            .join(" ")
                        : "Не назначен"}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Users className="h-4 w-4" />
                    Отделов: {management.departments.length}
                  </div>
                  {management.departments.length > 0 && (
                    <ul className="space-y-1 pl-5 text-xs text-zinc-500">
                      {management.departments.slice(0, 4).map((department) => (
                        <li key={department.id} className="list-disc">
                          {department.title}
                        </li>
                      ))}
                      {management.departments.length > 4 && (
                        <li className="list-none">
                          И еще {management.departments.length - 4}
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {!isManagementHead && <div className="flex justify-end gap-2">
                  <Link href={`/admin/managements/${management.id}`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-2 h-4 w-4" />
                      Изменить
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleteManagement.isPending}
                        />
                      }
                    >
                      {deletingId === management.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Удалить
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Удалить управление «{management.title}»?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Управление с отделами удалить нельзя. Сначала
                          перенесите отделы в другое управление или удалите их.
                          Назначенный начальник при удалении станет сотрудником.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(management.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
