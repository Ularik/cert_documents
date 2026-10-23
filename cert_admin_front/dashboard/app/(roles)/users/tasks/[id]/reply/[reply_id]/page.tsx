"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import ReplyDetail from "@/components/reply/ReplyDetail";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDetailReply } from "@/services/queries/reply";
import { useMe } from "@/services/queries/users";

export default function UserReplyDetailPage({
  params,
}: {
  params: Promise<{ id: string; reply_id: string }>;
}) {
  const { id, reply_id } = use(params);
  const { data: reply, isPending: isReplyPending } = useDetailReply(reply_id);
  const { data: user, isPending: isUserPending } = useMe();

  if (isReplyPending || isUserPending) {
    return <Skeleton className="mx-auto mt-6 h-96 max-w-5xl bg-zinc-200" />;
  }

  const canEdit = Boolean(reply?.author_id && user?.id === reply.author_id);

  if (!reply || !canEdit) {
    return (
      <div className="mx-auto max-w-xl space-y-5 p-6">
        <Link
          href={`/users/tasks/${id}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" /> Назад к задаче
        </Link>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-8 text-center text-sm text-red-700">
            Ответ не найден или вы не можете его редактировать.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ReplyDetail reply_id={reply_id} canEdit canDelete={false} />;
}
