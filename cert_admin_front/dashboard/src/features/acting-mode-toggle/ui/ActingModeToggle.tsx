"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { roleDashboardPaths, useMe, useSwitchRole } from "@/entities/user";

type Props = {
  collapsed?: boolean;
  onSwitched?: () => void;
};

/** Кнопка переключения начальника отдела в режим заместителя начальника управления и обратно.
 *  Показывается только тем, кому выдан флаг can_act_as_management_head. */
export function ActingModeToggle({ collapsed = false, onSwitched }: Props) {
  const router = useRouter();
  const { data: user } = useMe();
  const switchRole = useSwitchRole();

  if (!user || user.own_status !== "HEAD" || !user.can_act_as_management_head) {
    return null;
  }

  const acting = Boolean(user.acting);
  const label = acting ? "Вернуться к отделу" : "Режим начальника управления";

  const handleClick = () => {
    switchRole.mutate(acting ? null : "MANAGEMENT_HEAD", {
      onSuccess: ({ status }) => {
        toast.success(
          acting
            ? "Вы вернулись в режим начальника отдела"
            : "Включён режим заместителя начальника управления",
        );
        onSwitched?.();
        router.replace(roleDashboardPaths[status]);
      },
      onError: () => toast.error("Не удалось переключить режим"),
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={switchRole.isPending}
      aria-label={label}
      title={label}
      className={clsx(
        "flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium shadow-xs transition disabled:opacity-50",
        acting
          ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
        collapsed ? "px-2" : "px-4",
      )}
    >
      {switchRole.isPending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <ArrowLeftRight size={16} />
      )}
      <span className={clsx(collapsed && "hidden")}>{label}</span>
    </button>
  );
}
