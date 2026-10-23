"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePatchAdminTaskStatus } from "@/services/queries/admin/tasks";
import { usePatchHeadsTaskStatus } from "@/services/queries/heads/tasks";
import { usePatchManagementHeadTaskStatus } from "@/services/queries/management-head/tasks";
import { usePatchTaskStatus } from "@/services/queries/tasks";
import { useMe } from "@/services/queries/users";
import type { TasksStatus } from "@/types/tasks";
import { ADMIN_ACCESS_ROLES } from "@/constants/main";

const STATUS_LABELS: Record<TasksStatus, string> = {
  NEW: "Новая",
  PROGRESS: "В работе",
  DONE: "Завершена",
};

const STATUS_CLASSES: Record<TasksStatus, string> = {
  NEW: "border-sky-200 bg-sky-50 text-sky-700",
  PROGRESS: "border-amber-200 bg-amber-50 text-amber-700",
  DONE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

interface Props {
  taskId: string;
  status: TasksStatus;
  canChange: boolean;
}

export default function TaskStatusSelect({ taskId, status, canChange }: Props) {
  const { data: user } = useMe();
  const adminMutation = usePatchAdminTaskStatus();
  const headsMutation = usePatchHeadsTaskStatus();
  const managementHeadMutation = usePatchManagementHeadTaskStatus();
  const userMutation = usePatchTaskStatus();
  const [selectedStatus, setSelectedStatus] = useState<TasksStatus>(status);

  const isPending =
    adminMutation.isPending ||
    headsMutation.isPending ||
    managementHeadMutation.isPending ||
    userMutation.isPending;

  const handleChange = (value: string | null) => {
    if (!value || value === selectedStatus || !canChange) return;

    const nextStatus = value as TasksStatus;
    setSelectedStatus(nextStatus);
    const mutation =
      user?.status === "MANAGEMENT_HEAD"
        ? managementHeadMutation
        : user && ADMIN_ACCESS_ROLES.includes(user.status)
        ? adminMutation
        : user?.status === "HEAD" || user?.status === "DEPUTY"
          ? headsMutation
          : userMutation;

    mutation.mutate(
      { id: taskId, data: { status: nextStatus } },
      {
        onSuccess: () => toast.success("Статус задачи обновлен"),
        onError: () => {
          setSelectedStatus(status);
          toast.error("Не удалось изменить статус задачи");
        },
      },
    );
  };

  if (!canChange) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${STATUS_CLASSES[selectedStatus]}`}
      >
        <Check className="h-3 w-3" />
        {STATUS_LABELS[selectedStatus]}
      </span>
    );
  }

  return (
    <Select
      value={selectedStatus}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger
        size="sm"
        className={`h-7 min-w-28 text-[11px] font-medium ${STATUS_CLASSES[selectedStatus]}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <SelectValue>
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            STATUS_LABELS[selectedStatus]
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(STATUS_LABELS) as TasksStatus[]).map((option) => (
          <SelectItem key={option} value={option}>
            {STATUS_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
