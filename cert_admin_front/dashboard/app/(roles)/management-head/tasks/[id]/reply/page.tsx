"use client";

import { use } from "react";
import Replies from "@/components/reply/Replies";

export default function ManagementHeadTaskRepliesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Replies
      taskId={id}
      replyBasePath={`/management-head/tasks/${id}`}
    />
  );
}
