"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Paperclip,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
} from "lucide-react";
import type { DocumentLiteType } from "@/types/document";
import type { ReplyType } from "@/types/replies";
import { usePathname } from "next/navigation";


interface ReplyItemProps {
  reply: ReplyType;
  showOpen?: boolean;
  replyBasePath?: string;
}

export function ReplyItem({
  reply,
  showOpen = true,
  replyBasePath,
}: ReplyItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathName = usePathname();
  const mockAuthorName = "Неизвестный сотрудник";
  const mockDate = "2026-09-01T14:30:00Z";

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  const authorName =
    reply.author?.last_name && reply.author?.username
      ? `${reply.author.last_name} ${reply.author.username}`
      : reply.author?.username || mockAuthorName;

  return (
    <div className="p-4 rounded-lg border border-zinc-100 bg-zinc-50/40 space-y-3 transition-colors hover:border-zinc-200">
      {/* Шапка ответа */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 text-xs bg-zinc-200 text-zinc-700 font-medium">
            <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-xs text-zinc-900">{authorName}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <User className="h-3 w-3 text-zinc-400" />
              <span>{reply.author?.username || "Сотрудник"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(mockDate)}</span>
          </div>

          {/* Кнопка "Открыть" для детального просмотра */}
          {showOpen && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-medium gap-1 text-zinc-700 border-zinc-200 hover:bg-white hover:text-zinc-900"
            >
              <Link href={`${replyBasePath || pathName}/reply/${reply.id}`}>
                <span>Открыть</span>
                <ExternalLink className="h-3 w-3 text-zinc-400" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Текст ответа с фиксацией длины */}
      <div>
        <p
          className={`text-xs text-zinc-700 whitespace-pre-line leading-relaxed ${
            !isExpanded ? "line-clamp-3" : ""
          }`}
        >
          {reply.content}
        </p>

        {reply.content && reply.content.length > 150 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-0.5 cursor-pointer"
          >
            {isExpanded ? (
              <>
                Свернуть <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Показать полностью <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Вложения */}
      {reply.attachments && reply.attachments.length > 0 && (
        <div className="pt-2 border-t border-zinc-200/60 space-y-1.5">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            Прикрепленные файлы ({reply.attachments.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {reply.attachments.map((file: DocumentLiteType) => (
              <a
                key={file.id}
                href={`/api/documents/${file.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 transition-colors group cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-700 shrink-0" />
                <span className="truncate max-w-[180px]" title={file.filename}>
                  {file.filename}
                </span>
                <Download className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}