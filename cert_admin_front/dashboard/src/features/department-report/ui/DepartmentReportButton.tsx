"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { downloadDepartmentReport } from "../api/downloadReport";

function toInputDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** По умолчанию — с начала текущего месяца по сегодня */
function defaultPeriod() {
  const today = new Date();
  return {
    from: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toInputDate(today),
  };
}

type Props = {
  departmentId: string | number;
  departmentTitle?: string;
};

/** Кнопка и диалог выгрузки отчёта отдела в Word: выполненные за период задачи сотрудников. */
export function DepartmentReportButton({ departmentId, departmentTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(defaultPeriod);
  const [isLoading, setIsLoading] = useState(false);

  const invalid = !period.from || !period.to || period.from > period.to;

  const handleDownload = async () => {
    if (invalid) return;
    setIsLoading(true);
    try {
      await downloadDepartmentReport({ departmentId, dateFrom: period.from, dateTo: period.to });
      toast.success("Отчёт сформирован");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сформировать отчёт");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPeriod(defaultPeriod());
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="border-zinc-200 text-zinc-700" />}>
        <FileText className="h-4 w-4 mr-2" />
        Отчёт в Word
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отчёт отдела</DialogTitle>
          <DialogDescription>
            {departmentTitle ? `${departmentTitle}: в` : "В"}ыполненные за период задачи каждого сотрудника.
            Файл .docx откроется в Word.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="report-date-from">С</Label>
            <Input
              id="report-date-from"
              type="date"
              value={period.from}
              max={period.to || undefined}
              onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-date-to">По</Label>
            <Input
              id="report-date-to"
              type="date"
              value={period.to}
              min={period.from || undefined}
              onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
            />
          </div>
        </div>
        {invalid && (
          <p className="text-xs text-red-500">Укажите период: дата начала не позже даты окончания.</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={invalid || isLoading}
            className="bg-zinc-900 text-white hover:bg-zinc-800"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Скачать .docx
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
