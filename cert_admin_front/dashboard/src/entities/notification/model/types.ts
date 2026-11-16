export type NotificationKind = "TASK_ASSIGNED";

/** Уведомление сотрудника внутри системы */
export interface NotificationType {
  id: number;
  kind: NotificationKind;
  task_id: number;
  task_title: string;
  /** ISO-строка срока задачи или null */
  task_deadlines: string | null;
  author_id: number | null;
  author_name: string | null;
  read_at: string | null;
  created_at: string;
}
