"use client";

import { useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import { Loader2, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCreateNote, useDeleteNote, useUpdateNote } from "@/entities/note";
import type { NoteType } from "@/entities/note";
import { parseDateTimeLocalValue, toDateTimeLocalValue } from "@/entities/task";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Заметка для правки; без неё диалог создаёт новую */
  note?: NoteType | null;
  /** Срок по умолчанию для новой заметки */
  defaultDeadline?: Date | null;
}

/** Создание, правка и удаление личной заметки */
export default function NoteFormDialog({
  open,
  onOpenChange,
  note,
  defaultDeadline,
}: NoteFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* key сбрасывает поля при каждом открытии */}
        {open && (
          <NoteForm
            key={note?.id ?? `new-${defaultDeadline?.getTime() ?? ""}`}
            note={note}
            defaultDeadline={defaultDeadline}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function errorDetail(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

function NoteForm({
  note,
  defaultDeadline,
  onDone,
}: {
  note?: NoteType | null;
  defaultDeadline?: Date | null;
  onDone: () => void;
}) {
  const isEdit = Boolean(note);
  const [title, setTitle] = useState(note?.title ?? "");
  const [description, setDescription] = useState(note?.description ?? "");
  const [deadline, setDeadline] = useState(() =>
    toDateTimeLocalValue(note?.deadlines ?? defaultDeadline ?? null),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const isSaving = createNote.isPending || updateNote.isPending;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const deadlines = parseDateTimeLocalValue(deadline);
    if (!trimmedTitle) return setError("Укажите название заметки");
    if (!deadlines) return setError("Укажите срок заметки");

    setError(null);
    const values = {
      title: trimmedTitle,
      description: description.trim() || null,
      deadlines,
    };
    try {
      if (note) {
        await updateNote.mutateAsync({ id: note.id, ...values });
        toast.success("Заметка сохранена");
      } else {
        await createNote.mutateAsync(values);
        toast.success("Заметка добавлена");
      }
      onDone();
    } catch (err) {
      setError(errorDetail(err, "Не удалось сохранить заметку"));
    }
  };

  const onDelete = async () => {
    if (!note) return;
    if (!confirmDelete) return setConfirmDelete(true);
    try {
      await deleteNote.mutateAsync(note.id);
      toast.success("Заметка удалена");
      onDone();
    } catch (err) {
      setError(errorDetail(err, "Не удалось удалить заметку"));
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-violet-500" />
          {isEdit ? "Заметка" : "Новая заметка"}
        </DialogTitle>
        <DialogDescription>Заметка видна только вам.</DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="note-title">Название</Label>
        <Input
          id="note-title"
          value={title}
          maxLength={255}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Например: подготовить отчёт"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-description">Описание</Label>
        <Textarea
          id="note-description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Подробности (необязательно)"
          className="resize-y"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-deadline">Срок (дата и время)</Label>
        <Input
          id="note-deadline"
          type="datetime-local"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <DialogFooter className="sm:justify-between">
        {isEdit ? (
          <Button
            type="button"
            variant={confirmDelete ? "destructive" : "outline"}
            onClick={onDelete}
            disabled={deleteNote.isPending || isSaving}
          >
            {deleteNote.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {confirmDelete ? "Точно удалить?" : "Удалить"}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={isSaving || deleteNote.isPending}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Сохранить" : "Добавить заметку"}
        </Button>
      </DialogFooter>
    </form>
  );
}
