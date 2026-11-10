import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getLogTypes, getLogs } from "../api/logs";
import type { LogsParams } from "./types";

export function useLogs(params: LogsParams) {
  return useQuery({
    queryKey: ["logs", params],
    queryFn: () => getLogs(params),
    // при смене страницы/фильтра таблица не мигает пустотой
    placeholderData: keepPreviousData,
  });
}

export function useLogTypes() {
  return useQuery({
    queryKey: ["logs", "types"],
    queryFn: getLogTypes,
  });
}
