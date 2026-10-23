import type { TaskCreateType, TaskUpdateType } from "@/types/tasks";

function formatDateOnly(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function buildTaskFormData(
  data: TaskUpdateType | TaskCreateType,
): FormData {
  const formData = new FormData();

  formData.append("title", data.title);

  if (data.description != null) {
    formData.append("description", data.description);
  }
  
  if (data.note != null) {
    formData.append("note", data.note);
  }
  if (data.deadlines && !Number.isNaN(data.deadlines.getTime())) {
    formData.append("deadlines", formatDateOnly(data.deadlines));
  }
  if ("management_id" in data && data.management_id != null) {
    formData.append("management_id", String(data.management_id));
  }
  for (const dep_id of data.departments_ids) {
    formData.append("departments_ids", dep_id);
  }
  for (const executorId of data.executor_ids) {
    formData.append("executor_ids", executorId);
  }

  for (const file of data.attachments) {
    formData.append("attachments", file);
  }

  if ("old_attachments_ids" in data) {
    data.old_attachments_ids.forEach((id) => {
      formData.append("old_attachments_ids", id);
    });
  }

  return formData;
}
