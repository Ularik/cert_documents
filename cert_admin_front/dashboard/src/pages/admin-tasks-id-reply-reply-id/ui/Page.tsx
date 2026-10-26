"use client";

import { ReplyDetail } from "@/widgets/reply-detail";
import { useTaskDetail } from "@/entities/task";
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