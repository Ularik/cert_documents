import axiosApi from "@/shared/api/axiosApi";
import type { LogsApiResponseType, LogsParams } from "../model/types";

export async function getLogs(params: LogsParams): Promise<LogsApiResponseType> {
  const query: Record<string, string | number> = {
    limit: params.limit,
    offset: params.offset,
  };
  if (params.logger) query.logger = params.logger;
  if (params.level) query.level = params.level;
  if (params.user_id !== undefined) query.user_id = params.user_id;
  if (params.search) query.search = params.search;
  if (params.from_date) query.from_date = params.from_date;
  if (params.to_date) query.to_date = params.to_date;

  const { data } = await axiosApi.get<LogsApiResponseType>("/logs/", {
    params: query,
  });
  return data;
}

export async function getLogTypes(): Promise<string[]> {
  const { data } = await axiosApi.get<string[]>("/logs/types");
  return data;
}
