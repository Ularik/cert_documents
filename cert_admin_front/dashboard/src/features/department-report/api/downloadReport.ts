import { AxiosError } from "axios";
import axiosApi from "@/shared/api/axiosApi";

export interface DepartmentReportParams {
  departmentId: string | number;
  /** YYYY-MM-DD, включительно */
  dateFrom: string;
  dateTo: string;
}

function filenameFromHeader(header: string | undefined): string | null {
  const match = header?.match(/filename\*=UTF-8''([^;]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Скачивает отчёт отдела .docx. При ошибке бросает Error с текстом от сервера. */
export async function downloadDepartmentReport({ departmentId, dateFrom, dateTo }: DepartmentReportParams) {
  try {
    const res = await axiosApi.get<Blob>(`/reports/departments/${departmentId}`, {
      params: { date_from: dateFrom, date_to: dateTo },
      responseType: "blob",
    });
    const filename =
      filenameFromHeader(res.headers["content-disposition"]) ?? `Отчёт отдела ${dateFrom}-${dateTo}.docx`;
    const objectUrl = URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    // при responseType: "blob" текст ошибки тоже приходит blob'ом
    let detail = "Не удалось сформировать отчёт";
    if (error instanceof AxiosError && error.response?.data instanceof Blob) {
      try {
        const body = JSON.parse(await error.response.data.text());
        if (typeof body?.detail === "string") detail = body.detail;
      } catch {
        // ответ не JSON — оставляем общий текст
      }
    }
    throw new Error(detail);
  }
}
