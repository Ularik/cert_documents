import type { DepartmentType } from "@/types/departments"
import { Building2, ArrowUpRight, Calendar, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  dept: DepartmentType;
  managementTitle?: string;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  basePath?: string;
}


export default function DepCard({
  dept,
  managementTitle,
  onDelete,
  isDeleting,
  basePath = "/admin/departments",
}: Props) {
  return (
    <Card
      key={dept.id}
      className="group relative border-zinc-200 bg-white transition-all duration-200 hover:border-zinc-400 hover:shadow-md flex flex-col justify-between"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-200">
            <Building2 size={20} />
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-mono font-medium text-zinc-600">
            ID: {dept.id}
          </span>
        </div>
        <CardTitle className="text-lg font-bold text-zinc-900 pt-2 group-hover:text-zinc-900">
          {dept.title}
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500 line-clamp-2 min-h-[2.25rem]">
          {dept.description || "Описание отсутствует"}
        </CardDescription>
        <p className="text-xs text-zinc-600">
          Управление:{" "}
          <span className="font-medium text-zinc-900">
            {managementTitle || `ID ${dept.management_id}`}
          </span>
        </p>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="border-t border-zinc-100 pt-3 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} />
            <span>
              {new Date(dept.created_at).toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`${basePath}/${dept.id}`}
              className="flex items-center gap-1 font-medium text-zinc-900 hover:underline"
            >
              <span>Подробнее</span>
              <ArrowUpRight size={14} />
            </Link>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={isDeleting}
                    aria-label={`Удалить отдел ${dept.title}`}
                  />
                }
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Удалить отдел «{dept.title}»?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Отдел будет удален из структуры. Его руководители станут
                    обычными сотрудниками, а связанные задачи останутся в системе
                    без привязки к этому отделу.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(dept.id)}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Удалить отдел
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}