"use client";

import { useMe } from "@/services/queries/users";
import { Menu } from "lucide-react";

type Props = {
  onMenuClick: () => void;
};

const MobileTopbar = ({ onMenuClick }: Props) => {
  const { data: user } = useMe();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white shadow-sm">
          A
        </div>
        <div>
          <p className="text-base font-bold tracking-tight text-zinc-900">
            CERT
          </p>
          <p className="text-xs text-zinc-500">
            {user ? `${user.username} · ${user.status}` : "Studio Dashboard"}
          </p>
        </div>
      </div>

      <button
        type="button"
        aria-label="Открыть меню"
        onClick={onMenuClick}
        className="rounded-xl border border-zinc-200 p-2 text-zinc-700 shadow-xs transition hover:bg-zinc-100 hover:text-zinc-900"
      >
        <Menu size={20} />
      </button>
    </header>
  );
};

export default MobileTopbar;
