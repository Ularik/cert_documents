import axiosApi from "@/lib/axiosApi";
import { ReplyCreateType, ReplyType, ReplyUpdateType } from "@/types/replies";


export async function createReply({task_id, data}: {task_id: string, data: ReplyCreateType}) {
    const formData = new FormData();
    formData.append("content", data.content);
    data.attachments.forEach((file) =>
        formData.append("attachments", file),
    );

    const result = await axiosApi.post(`/tasks/${task_id}/tasks_reply`, formData);
    return result.data;
};


export async function updateReply(
    {reply_id, data}: {reply_id: string, data: ReplyUpdateType}
): Promise<ReplyType> {
    const formData = new FormData();
    formData.append("content", data.content);
    data.attachments.forEach((file) =>
        formData.append("attachments", file),
    );
    data.old_attachments_ids.forEach((id) =>
        formData.append("old_attachments_ids", id),
    );
    const result = await axiosApi.put(`/tasks/tasks_reply/${reply_id}`, formData);
    return result.data;
}


export async function getReplies(task_id: string): Promise<ReplyType[]> {
    const result = await axiosApi.get(`/tasks/${task_id}/tasks_reply`);
    return result.data;
}

export async function getDetailReply(reply_id: string): Promise<ReplyType> {
    const result = await axiosApi.get(`tasks/tasks_reply/${reply_id}`);
    return result.data;
}

export async function deleteReply(reply_id: string) {
    await axiosApi.delete(`/tasks/tasks_reply/${reply_id}`);
}