"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { dashboardMenuItems, roleDashboardPaths } from "@/constants/main";
import { useLogout, useMe } from "@/services/queries/users";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

const MobileSidebar = ({ open, onClose }: Props) => {
  const pathname = usePathname();
  const router = useRouter();

  const { data: user } = useMe();
  const logoutMutation = useLogout();

  if (!user) return null;

  const filteredItems = dashboardMenuItems.filter((item) =>
    item.roles.includes(user.status),
  );

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      toast.error("Не удалось завершить сессию на сервере");
    } finally {
      onClose();
      router.push("/login");
    }
  };

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={clsx(
          "fixed left-0 top-0 z-50 h-full w-72 border-r border-zinc-200 bg-white shadow-xl transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-6 py-5">
            <Link
              href={roleDashboardPaths[user.status]}
              onClick={onClose}
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white shadow-sm">
                A
              </div>

              <div>
                <p className="text-base font-bold tracking-tight text-zinc-900">
                  CERT
                </p>

                <p className="text-xs text-zinc-500">Studio Dashboard</p>
              </div>
            </Link>
          </div>

          <nav className="scrollbar-thin flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
            {filteredItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    pathname === item.href
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 border-t border-zinc-200 p-4">
            <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-3.5">
              <div className="truncate">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {user.username}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {user.status}
                </p>
              </div>
              <span className="inline-flex items-center rounded-md bg-zinc-200/70 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                Active
              </span>
            </div>

            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-xs transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
            >
              <LogOut size={16} />
              {logoutMutation.isPending ? "Выход..." : "Выйти"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default MobileSidebar;
