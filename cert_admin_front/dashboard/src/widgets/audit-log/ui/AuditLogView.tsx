"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, ScrollText, X } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { PaginationControl } from "@/shared/ui/pagination";
import {
  getLogTypeLabel,
  logFieldLabels,
  logLevelLabels,
  useLogTypes,
  useLogs,
  type LogType,
  type LogUserType,
} from "@/entities/log";

const fieldClassName =
  "h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

const levelClassNames: Record<string, string> = {
  INFO: "bg-sky-50 text-sky-700",
  WARNING: "bg-amber-50 text-amber-700",
  ERROR: "bg-red-50 text-red-700",
  CRITICAL: "bg-red-100 text-red-800",
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    timeZone: "Asia/Bishkek",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const userName = (user: LogUserType) =>
  [user.last_name, user.username].filter(Boolean).join(" ");

/** Задержка для поля поиска, чтобы не слать запрос на каждую букву. */
function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function AuditLogView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [logger, setLogger] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [user, setUser] = useState<LogUserType | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const debouncedSearch = useDebounced(search.trim());

  const { data: logTypes = [] } = useLogTypes();
  const { data, isLoading, isError, isFetching } = useLogs({
    limit,
    offset: (page - 1) * limit,
    logger: logger || undefined,
    user_id: user?.id,
    search: debouncedSearch || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  });

  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilters = Boolean(logger || search || fromDate || toDate || user);

  // любой фильтр возвращает на первую страницу
  const withReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const resetFilters = () => {
    setLogger("");
    setSearch("");
    setFromDate("");
    setToDate("");
    setUser(null);
    setPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
          <ScrollText className="h-6 w-6 text-zinc-700" />
          Аудит
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Журнал действий пользователей: входы и выходы, создание, изменение и
          удаление задач. Записей: {total}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-type" className="text-xs font-medium text-zinc-600">
            Тип
          </label>
          <select
            id="audit-type"
            value={logger}
            onChange={(event) => withReset(setLogger)(event.target.value)}
            className={`${fieldClassName} min-w-44`}
          >
            <option value="">Все типы</option>
            {logTypes.map((type) => (
              <option key={type} value={type}>
                {getLogTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="audit-search" className="text-xs font-medium text-zinc-600">
            Поиск по событию
          </label>
          <input
            id="audit-search"
            type="search"
            value={search}
            placeholder="Например: Удалена задача"
            onChange={(event) => withReset(setSearch)(event.target.value)}
            className={fieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-from" className="text-xs font-medium text-zinc-600">
            С даты
          </label>
          <input
            id="audit-from"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => withReset(setFromDate)(event.target.value)}
            className={fieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-to" className="text-xs font-medium text-zinc-600">
            По дату
          </label>
          <input
            id="audit-to"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => withReset(setToDate)(event.target.value)}
            className={fieldClassName}
          />
        </div>
        {hasFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="h-9 gap-2 border-zinc-200 bg-white text-zinc-600"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Сбросить
          </Button>
        )}
        {user && (
          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700">
            Пользователь: <span className="font-medium">{userName(user)}</span>
            <button
              type="button"
              aria-label="Убрать фильтр по пользователю"
              onClick={() => withReset(setUser)(null)}
              className="text-zinc-400 hover:text-zinc-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
          Не удалось загрузить журнал. Попробуйте обновить страницу.
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full bg-zinc-100" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card className="border-dashed border-zinc-300 bg-zinc-50/50">
          <CardContent className="space-y-3 p-12 text-center">
            <ScrollText className="mx-auto h-10 w-10 text-zinc-400" />
            <p className="font-medium text-zinc-600">Записей не найдено</p>
            {hasFilters && (
              <p className="text-xs text-zinc-400">Попробуйте изменить фильтры</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={`overflow-x-auto rounded-lg border border-zinc-200 bg-white transition-opacity ${
            isFetching ? "opacity-60" : ""
          }`}
        >
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="w-8 px-3 py-2.5" />
                <th className="px-3 py-2.5">Время</th>
                <th className="px-3 py-2.5">Тип</th>
                <th className="px-3 py-2.5">Событие</th>
                <th className="px-3 py-2.5">Пользователь</th>
                <th className="px-3 py-2.5">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  expanded={expandedId === log.id}
                  onToggle={() =>
                    setExpandedId((current) => (current === log.id ? null : log.id))
                  }
                  onUserClick={(logUser) => withReset(setUser)(logUser)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationControl
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        isLoading={isLoading}
        pageSizeOptions={[20, 50, 100]}
      />
    </div>
  );
}

function LogRow({
  log,
  expanded,
  onToggle,
  onUserClick,
}: {
  log: LogType;
  expanded: boolean;
  onToggle: () => void;
  onUserClick: (user: LogUserType) => void;
}) {
  const taskTitle =
    typeof log.data?.title === "string" ? log.data.title : undefined;

  return (
    <Fragment>
      <tr
        onClick={onToggle}
        className="cursor-pointer align-top hover:bg-zinc-50"
      >
        <td className="px-3 py-2.5 text-zinc-400">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-zinc-600">
          {formatDateTime(log.created_at)}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700">
            {getLogTypeLabel(log.logger)}
          </span>
          {log.level !== "INFO" && (
            <span
              className={`ml-1.5 rounded px-1.5 py-0.5 text-xs font-medium ${
                levelClassNames[log.level] ?? "bg-zinc-100 text-zinc-600"
              }`}
            >
              {logLevelLabels[log.level] ?? log.level}
            </span>
          )}
        </td>
        <td className="px-3 py-2.5 text-zinc-900">
          {log.message}
          {taskTitle && (
            <span className="text-zinc-500"> — «{taskTitle}»</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5">
          {log.user ? (
            <button
              type="button"
              title="Показать действия только этого пользователя"
              onClick={(event) => {
                event.stopPropagation();
                onUserClick(log.user!);
              }}
              className="text-zinc-800 underline-offset-2 hover:underline"
            >
              {userName(log.user)}
            </button>
          ) : log.user_id ? (
            <span className="text-zinc-400">Удалён (ID {log.user_id})</span>
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-zinc-500">
          {log.ip_address ?? "—"}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-zinc-50/70">
          <td />
          <td colSpan={5} className="px-3 pb-4 pt-1">
            <LogDetails log={log} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDateTime(value);
  }
  return String(value);
}

function isChange(value: unknown): value is { old: unknown; new: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "old" in value &&
    "new" in value
  );
}

function FieldRow({ name, value }: { name: string; value: unknown }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 py-1">
      <dt className="text-zinc-500">{logFieldLabels[name] ?? name}</dt>
      <dd className="break-words text-zinc-800">
        {isChange(value) ? (
          <>
            <span className="text-zinc-500 line-through">{formatValue(value.old)}</span>
            {" → "}
            <span className="font-medium">{formatValue(value.new)}</span>
          </>
        ) : (
          formatValue(value)
        )}
      </dd>
    </div>
  );
}

function LogDetails({ log }: { log: LogType }) {
  const { changes, ...rest } = log.data ?? {};
  const changeEntries =
    changes && typeof changes === "object" ? Object.entries(changes) : [];

  return (
    <div className="space-y-3 text-sm">
      <dl className="divide-y divide-zinc-100">
        {Object.entries(rest).map(([name, value]) => (
          <FieldRow key={name} name={name} value={value} />
        ))}
        {log.user_agent && <FieldRow name="Браузер" value={log.user_agent} />}
      </dl>

      {changes !== undefined && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Изменения
          </p>
          {changeEntries.length === 0 ? (
            <p className="text-zinc-500">Поля задачи не изменились</p>
          ) : (
            <dl className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white px-3">
              {changeEntries.map(([name, value]) => (
                <FieldRow key={name} name={name} value={value} />
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
