"use client";

import Link from "next/link";
import { Building2, List } from "lucide-react";

interface Props {
  active: "all" | "department";
  basePath?: string;
}

export default function TaskScopeToggle({ active, basePath = "/users/tasks" }: Props) {
  return (
    <div className="inline-flex w-full rounded-lg border border-zinc-200 bg-zinc-50 p-1 sm:w-auto" aria-label="Область задач">
      <Link
        href={basePath}
        className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:flex-none ${
          active === "department"
            ? "bg-white text-zinc-900 shadow-sm"
            : "text-zinc-500 hover:text-zinc-900"
        }`}
        aria-current={active === "department" ? "page" : undefined}
      >
        <Building2 className="h-4 w-4" />
        Задачи отдела
      </Link>
      <Link
        href={`${basePath}/all`}
        className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:flex-none ${
          active === "all"
            ? "bg-white text-zinc-900 shadow-sm"
            : "text-zinc-500 hover:text-zinc-900"
        }`}
        aria-current={active === "all" ? "page" : undefined}
      >
        <List className="h-4 w-4" />
        Все задачи
      </Link>
    </div>
  );
}
