// Срок задачи хранится на бэкенде с датой и временем (timestamptz).
// В интерфейсе показываем его в локальном времени браузера.

const pad = (value: number) => String(value).padStart(2, "0");

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** «20.11.2026, 18:00» */
export function formatTaskDeadline(
  value: Date | string | null | undefined,
  fallback = "Не указан",
): string {
  const date = toValidDate(value);
  if (!date) return fallback;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** «18:00» */
export function formatTaskDeadlineTime(value: Date | string | null | undefined): string {
  const date = toValidDate(value);
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Значение для <input type="datetime-local">: «2026-11-20T18:00» */
export function toDateTimeLocalValue(value: Date | string | null | undefined): string {
  const date = toValidDate(value);
  if (!date) return "";
  return `${toDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Разбор значения <input type="datetime-local"> в локальное время */
export function parseDateTimeLocalValue(value: string): Date | null {
  return value ? toValidDate(new Date(value)) : null;
}

/** Ключ дня в локальном времени: «2026-11-20» */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Время по умолчанию, когда срок выбирают по дню в календаре */
export const DEFAULT_DEADLINE_HOUR = 18;

/** «2026-11-20» -> дата этого дня в DEFAULT_DEADLINE_HOUR:00 */
export function deadlineFromDateKey(dateKey: string | null | undefined): Date | null {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, DEFAULT_DEADLINE_HOUR, 0);
  return date.getMonth() === month - 1 ? date : null;
}
