import type { MouseEvent } from "react";
import axiosApi from "./axiosApi";

/**
 * Скачивает файл через axios (тот же baseURL и cookie, что и у остальных запросов),
 * а не через прямую ссылку: в dev API живёт на другом хосте, и относительная
 * ссылка `/api/...` попадала на страницу Next (отсюда «download.html»).
 */
export async function downloadFile(url: string, filename: string) {
  // пути в компонентах начинаются с "/api", а baseURL axios уже содержит его
  const path = url.replace(/^\/api(?=\/)/, "");
  try {
    const res = await axiosApi.get<Blob>(path, { responseType: "blob" });
    const objectUrl = URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.alert("Не удалось скачать файл");
  }
}

export function handleDownloadClick(
  e: MouseEvent<HTMLElement>,
  url: string,
  filename: string,
) {
  e.preventDefault();
  e.stopPropagation();
  void downloadFile(url, filename);
}
