import type { TaskCreateType, TaskUpdateType } from "../model/types";

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
    // дата и время с часовым поясом (UTC), бэкенд хранит timestamptz
    formData.append("deadlines", data.deadlines.toISOString());
  }
  for (const managementId of data.management_ids) {
    formData.append("management_ids", managementId);
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
