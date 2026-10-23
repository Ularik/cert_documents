"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { useReplies } from "@/services/queries/reply";
import { useMe } from "@/services/queries/users";
import { ReplyItem } from "./ReplyItem";

interface Props {
  taskId: string;
  showReplyLinks?: boolean;
  replyBasePath?: string;
  onlyOwnReplyLinks?: boolean;
}

export default function Replies({
  taskId,
  showReplyLinks = true,
  replyBasePath,
  onlyOwnReplyLinks = false,
}: Props) {
  const { data: replies, isLoading, isError } = useReplies(taskId);
  const { data: currentUser } = useMe();

  if (isLoading) {
    return (
      <Card className="border-zinc-200 shadow-xs bg-white">
        <CardContent className="p-8 text-center text-xs text-zinc-500">
          Загрузка ответов...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50/50 shadow-xs">
        <CardContent className="p-8 text-center text-xs text-red-600">
          Не удалось загрузить ответы на задачу.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-200 shadow-xs bg-white">
      <CardHeader className="p-4 border-b border-zinc-100 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-zinc-500" />
          Ответы на задачу
        </CardTitle>
        <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 font-normal">
          Всего: {replies?.length || 0}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {replies?.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">
            На эту задачу пока нет ответов.
          </div>
        ) : (
          replies?.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              showOpen={
                showReplyLinks &&
                (!onlyOwnReplyLinks || reply.author_id === currentUser?.id)
              }
              replyBasePath={replyBasePath}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}