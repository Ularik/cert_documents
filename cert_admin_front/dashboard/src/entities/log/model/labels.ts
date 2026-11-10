/** Подписи для типов логов. Неизвестный тип показывается как есть. */
export const logTypeLabels: Record<string, string> = {
  "app.auth": "Вход / выход",
  "app.tasks": "Задачи",
};

export const logLevelLabels: Record<string, string> = {
  DEBUG: "Отладка",
  INFO: "Инфо",
  WARNING: "Внимание",
  ERROR: "Ошибка",
  CRITICAL: "Критично",
};

/** Подписи полей из `data` лога. */
export const logFieldLabels: Record<string, string> = {
  task_id: "ID задачи",
  title: "Название",
  description: "Описание",
  deadlines: "Срок",
  note: "Примечание",
  target_type: "Тип назначения",
  status: "Статус",
  author_id: "ID автора",
  management_ids: "Управления (ID)",
  departments_ids: "Отделы (ID)",
  executor_ids: "Исполнители (ID)",
  attachment_ids: "Вложения (ID)",
  changes: "Изменения",
};

export function getLogTypeLabel(logger: string): string {
  return logTypeLabels[logger] ?? logger;
}
