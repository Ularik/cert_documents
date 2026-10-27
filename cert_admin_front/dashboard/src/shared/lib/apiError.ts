import { isAxiosError } from "axios";

const statusMessages: Record<number, string> = {
  401: "Неверные учётные данные",
  403: "Недостаточно прав для выполнения операции",
  404: "Не найдено",
  429: "Слишком много попыток, повторите позже",
  500: "Внутренняя ошибка сервера, попробуйте позже",
  502: "Сервер временно недоступен",
  503: "Сервер временно недоступен",
};

/** Превращает ошибку запроса в понятный текст: detail от сервера, иначе — по статусу. */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Что-то пошло не так, попробуйте ещё раз",
): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) {
    return "Не удалось связаться с сервером. Проверьте подключение к сети";
  }

  const { status, data } = error.response;
  const detail = data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  // 422 от FastAPI: detail — массив {loc, msg}
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => (typeof item?.msg === "string" ? item.msg : null))
      .filter(Boolean)
      .join("; ");
  }
  return statusMessages[status] ?? fallback;
}
