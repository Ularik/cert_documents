import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { deleteNote, getNotes, postNote, putNote } from "../api/notes";
import type { NotesPeriodParams } from "./types";

export const notesQueryOptions = (params: NotesPeriodParams) =>
  queryOptions({
    queryKey: ["notes", params],
    queryFn: () => getNotes(params),
  });

export const useNotes = (params: NotesPeriodParams) =>
  useQuery({
    ...notesQueryOptions(params),
    placeholderData: keepPreviousData,
  });

const useNotesMutation = <TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });
};

export const useCreateNote = () => useNotesMutation(postNote);
export const useUpdateNote = () => useNotesMutation(putNote);
export const useDeleteNote = () => useNotesMutation(deleteNote);
