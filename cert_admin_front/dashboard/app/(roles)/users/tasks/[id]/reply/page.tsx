"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";

import ReplyForm from "@/components/reply/ReplyForm";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskDetail } from "@/services/queries/tasks";
import { useMe } from "@/services/queries/users";

export default function UserReplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: task, isPending: isTaskPending } = useTaskDetail(id);
  const { data: user, isPending: isUserPending } = useMe();

  if (isTaskPending || isUserPending) {
    return <Skeleton className="mx-auto mt-6 h-96 max-w-2xl bg-zinc-200" />;
  }

  const isAssignedExecutor = Boolean(
    user?.department_id &&
    task?.executors?.some((executor) => executor.id === user.department_id),
  );
  
  if (!task || !isAssignedExecutor) {
    return (
      <div className="mx-auto max-w-xl space-y-5 p-6">
        <Link href={`/users/tasks/${id}`} className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" /> Назад к задаче
        </Link>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="space-y-3 p-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-amber-600" />
            <h1 className="font-semibold text-zinc-900">Ответ недоступен</h1>
            <p className="text-sm text-zinc-600">Отправлять ответы могут только назначенные исполнители этой задачи.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ReplyForm />;
}
