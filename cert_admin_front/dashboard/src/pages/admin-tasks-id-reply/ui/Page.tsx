"use client";

import { useReplies } from "@/entities/reply";
import { use } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

export default function TaskRepliesPage({ params, }: Props) {
  const { id } = use(params); 

  const { data: replies, isLoading, error } = useReplies(id);

  return (
    <>
      
    </>
  );
}
