export interface PagingParams {
  limit: number;
  offset: number;
  department_id?: string;
  management_id?: string;
  from_date?: string;
  to_date?: string;
  rush?: boolean;
  extra_rush?: boolean;
  is_expired?: boolean;
  status?: string[];
}

export interface ApiErrorResponse {
  detail: string;
}
