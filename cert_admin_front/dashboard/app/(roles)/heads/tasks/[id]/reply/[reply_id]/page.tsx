"use client";

import ReplyDetail from "@/components/reply/ReplyDetail";
import { useTaskDetail } from "@/services/queries/tasks";
import { use } from "react";

interface Props {
  params: Promise<{ reply_id: string; id: string }>;
}


export default function ReplyDetailPage({ params }: Props) {
    const { reply_id, id } = use(params);

    const { data: task } = useTaskDetail(id);
    return (
        <>
        <ReplyDetail reply_id={reply_id} taskTitle={task?.title} />        
        </>
    )
}