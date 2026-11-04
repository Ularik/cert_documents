import axiosApi from "@/shared/api/axiosApi";
import type { NoteFormValues, NoteType, NotesPeriodParams } from "../model/types";

const toPayload = (values: NoteFormValues) => ({
  title: values.title,
  description: values.description,
  deadlines: values.deadlines.toISOString(),
});

export async function getNotes(params: NotesPeriodParams): Promise<NoteType[]> {
  const res = await axiosApi.get("/notes/", { params });
  return res.data;
}

export async function postNote(values: NoteFormValues): Promise<NoteType> {
  const res = await axiosApi.post("/notes/", toPayload(values));
  return res.data;
}

export async function putNote({ id, ...values }: NoteFormValues & { id: number }): Promise<NoteType> {
  const res = await axiosApi.put(`/notes/${id}`, toPayload(values));
  return res.data;
}

export async function deleteNote(id: number): Promise<void> {
  await axiosApi.delete(`/notes/${id}`);
}
