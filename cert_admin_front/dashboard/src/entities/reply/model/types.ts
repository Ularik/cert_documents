import { DocumentLiteType } from "@/entities/document/@x/reply";
import { UserType } from "@/entities/user/@x/reply";

export interface ReplyCreateType {
    content: string;
    attachments: File[]
}

export interface ReplyUpdateType {
    content: string;
    attachments: File[];
    old_attachments_ids: string[];
}

export interface ReplyType {
    id: string;
    author_id: string | null;
    task_id: string;
    content: string;
    author: UserType | null;
    attachments: DocumentLiteType[]
}