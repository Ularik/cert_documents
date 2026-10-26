"use client";

import { ReplyDetail } from "@/widgets/reply-detail";
import { useTaskDetail } from "@/entities/task";
import { use } from "react";

export default function ManagementHeadReplyDetailPage({
  params,
}: {
  params: Promise<{ reply_id: string; id: string }>;
}) {
  const { reply_id, id } = use(params);
  const { data: task } = useTaskDetail(id, "/management-head/tasks");

  return <ReplyDetail reply_id={reply_id} taskTitle={task?.title} />;
}
