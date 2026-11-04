/** Личная заметка сотрудника: видна только своему автору */
export interface NoteType {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  /** ISO-строка с часовым поясом */
  deadlines: string;
  created_at: string;
  updated_at: string;
}

export interface NoteFormValues {
  title: string;
  description: string | null;
  deadlines: Date;
}

export interface NotesPeriodParams {
  deadline_from: string;
  deadline_to: string;
}
