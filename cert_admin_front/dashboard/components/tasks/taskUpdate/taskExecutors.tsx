"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Users, UserCheck, X, Check, ChevronsUpDown } from "lucide-react";

import type { UserWithDepartment, UserType } from "@/types/user";
import { UseFormReturn } from "react-hook-form";
import { TaskFormInputs } from "@/types/tasks";

interface TaskExecutorsProps {
  isEditing: boolean;
  executors: UserType[];
  form: UseFormReturn<TaskFormInputs>;
  allUsers: UserWithDepartment[];
  selectedExecutors: string[];
}

export function TaskExecutors({
  isEditing,
  executors,
  form,
  allUsers,
  selectedExecutors,
}: TaskExecutorsProps) {
  const [open, setOpen] = useState(false);

  const toggleExecutor = (userId: string) => {
    const current = new Set(selectedExecutors);
    current.has(userId) ? current.delete(userId) : current.add(userId);
    form.setValue("executor_ids", Array.from(current));
  };

  const getUserInitials = (u: Partial<UserWithDepartment>) =>
  u.last_name && u.username
    ? `${u.last_name[0]}${u.username[0]}`.toUpperCase()
    : "??";

  const getUserDisplayName = (u: Partial<UserWithDepartment>) =>
  u.last_name ? `${u.last_name} ${u.username}` : u.username || "Пользователь";

  return (
    <Card className="border-zinc-200 shadow-xs">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-900">
          <Users className="h-4 w-4 text-zinc-500" />
          Исполнители (
          {isEditing ? selectedExecutors.length : executors?.length || 0})
        </CardTitle>

        {isEditing && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>
              <span
                role="button"
                tabIndex={0}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className:
                    "h-8 text-xs cursor-pointer inline-flex items-center justify-center",
                })}
              >
                Изменить
                <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Поиск сотрудника..."
                  className="h-8 text-xs"
                />
                <CommandList>
                  <CommandEmpty className="py-2 text-xs text-center">
                    Сотрудники не найдены.
                  </CommandEmpty>
                  <CommandGroup>
                    {allUsers.map((user) => {
                      const isSelected = selectedExecutors.includes(
                        String(user.id),
                      );
                      return (
                        <CommandItem
                          key={user.id}
                          value={getUserDisplayName(user)}
                          onSelect={() => toggleExecutor(String(user.id))}
                          className="text-xs flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px]">
                                {getUserInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">
                              {getUserDisplayName(user)}
                            </span>
                          </div>
                          <Check
                            className={`h-3.5 w-3.5 ${
                              isSelected ? "opacity-100" : "opacity-0"
                            }`}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {isEditing ? (
          selectedExecutors.length > 0 ? (
            <ul className="space-y-3">
              {selectedExecutors.map((executorId) => {
                const user = allUsers.find((u) => String(u.id) === executorId);
                if (!user) return null;

                return (
                  <li
                    key={user.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 bg-zinc-200 text-zinc-700 border border-zinc-200">
                        <AvatarFallback className="text-xs font-medium">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-900 truncate">
                          {getUserDisplayName(user)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExecutor(String(user.id))}
                      className="h-6 w-6 text-zinc-400 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-4 text-xs text-zinc-400 italic">
              Выберите хотя бы одного исполнителя
            </div>
          )
        ) : executors && executors.length > 0 ? (
          <ul className="space-y-3">
            {executors.map((user) => (
              <li key={user.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8 bg-zinc-200 text-zinc-700 border border-zinc-200">
                  <AvatarFallback className="text-xs font-medium">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-900 truncate">
                    {getUserDisplayName(user)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 bg-zinc-100 text-zinc-500 font-normal"
                    >
                      {user.status}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-4 text-xs text-zinc-400 italic flex items-center justify-center gap-1">
            <UserCheck className="h-4 w-4 text-zinc-300" />
            Исполнители не назначены
          </div>
        )}
      </CardContent>
    </Card>
  );
}
