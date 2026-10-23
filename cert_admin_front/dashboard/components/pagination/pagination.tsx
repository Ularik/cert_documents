"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PaginationControlProps {
  /** Текущая страница (начиная с 1) */
  page: number;
  /** Текущий лимит элементов на странице */
  limit: number;
  /** Общее количество элементов */
  total: number;
  /** Функция изменения текущей страницы */
  onPageChange: (newPage: number) => void;
  /** Функция изменения лимита элементов (опционально) */
  onLimitChange?: (newLimit: number) => void;
  /** Заблокировать кнопки (например, при загрузке) */
  isLoading?: boolean;
  /** Доступные варианты выбора количества элементов */
  pageSizeOptions?: number[];
}

export function PaginationControl({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  isLoading = false,
  pageSizeOptions = [5, 10, 20, 50],
}: PaginationControlProps) {
  // Расчет общего количества страниц
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Расчет выводимого диапазона "startItem–endItem из total"
  const offset = (page - 1) * limit;
  const startItem = total === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + limit, total);

  const handleLimitSelect = (value: string | null) => {
    if (value !== null && onLimitChange) {
      onLimitChange(Number(value));
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200">
      {/* Левая часть: Выбор количества элементов и счетчик */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {onLimitChange && (
          <>
            <span>Показывать по:</span>
            <Select
              value={String(limit)}
              onValueChange={handleLimitSelect}
              disabled={isLoading}
            >
              <SelectTrigger className="h-8 w-18 text-xs border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <span>
          ({startItem}–{endItem} из {total})
        </span>
      </div>

      {/* Правая часть: Переключение страниц */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || isLoading}
          className="h-8 px-2 sm:px-3 text-xs"
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Назад</span>
        </Button>

        <span className="text-xs font-medium px-2 text-zinc-600">
          {page} из {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || isLoading}
          className="h-8 px-2 sm:px-3 text-xs"
        >
          <span className="hidden sm:inline">Вперед</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
      </div>
    </div>
  );
}
