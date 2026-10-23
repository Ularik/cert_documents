"use client";

import Link from "next/link";
import {
  UserPlus,
  Crown,
  Users,
  Search,
  UserCheck,
  Building2,
  Shield,
  ShieldCheck,
  BriefcaseBusiness,
} from "lucide-react";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeCard } from "@/components/users/usersCard";
import { useUsers } from "@/services/queries/users";
import { useManagements } from "@/services/queries/managements";
import { useDepartments } from "@/services/queries/departments";
import { useMe } from "@/services/queries/users";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole, UserWithDepartment } from "@/types/user";

const LEADERSHIP_SECTIONS: {
  role: Exclude<UserRole, "USER">;
  title: string;
  icon: typeof Crown;
  iconClass: string;
}[] = [
  {
    role: "ADMIN",
    title: "Администраторы",
    icon: ShieldCheck,
    iconClass: "text-purple-600",
  },
  {
    role: "DIVISION_HEAD",
    title: "Руководители подразделений",
    icon: BriefcaseBusiness,
    iconClass: "text-indigo-600",
  },
  {
    role: "MANAGEMENT_HEAD",
    title: "Начальники управлений",
    icon: Building2,
    iconClass: "text-teal-600",
  },
  {
    role: "HEAD",
    title: "Начальники отделов",
    icon: Crown,
    iconClass: "text-amber-500",
  },
  {
    role: "DEPUTY",
    title: "Заместители начальников",
    icon: Shield,
    iconClass: "text-blue-500",
  },
];

interface ExecutorsViewProps {
  /** Разрешить ли отображение кнопки "Добавить" */
  canAdd?: boolean;
  readOnly?: boolean;
  editBasePath?: string;
  managementScopeOnly?: boolean;
}

export default function ExecutorsView({
  canAdd = true,
  readOnly = false,
  editBasePath,
  managementScopeOnly = false,
}: ExecutorsViewProps) {
  const { data: currentUser } = useMe();
  const isManagementHead = currentUser?.status === "MANAGEMENT_HEAD";
  const isManagementScoped =
    isManagementHead || currentUser?.status === "USER";
  const { data: users = [], isLoading, isError } = useUsers();
  const {
    data: managements = [],
    isLoading: isManagementsLoading,
    isError: isManagementsError,
  } = useManagements();
  const { data: departments = [] } = useDepartments();
  const [search, setSearch] = useState("");
  const [managementFilter, setManagementFilter] = useState(
    currentUser?.status === "MANAGEMENT_HEAD" && currentUser.management_id
      ? String(currentUser.management_id)
      : "all",
  );

  const departmentManagements = useMemo(
    () =>
      new Map(
        departments.map((department) => [
          String(department.id),
          String(department.management_id),
        ]),
      ),
    [departments],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    const getUserManagementId = (user: UserWithDepartment) =>
      user.management_id
        ? String(user.management_id)
        : user.department_id
          ? departmentManagements.get(String(user.department_id))
          : undefined;

    return users.filter((user) => {
      if (
        managementScopeOnly &&
        (!["USER", "HEAD", "DEPUTY"].includes(user.status) ||
          (currentUser?.status === "MANAGEMENT_HEAD" &&
            String(user.id) === String(currentUser.id)))
      ) {
        return false;
      }
      const matchesManagement =
        managementFilter === "all" ||
        getUserManagementId(user) === managementFilter;
      const matchesSearch =
        !query ||
        user.username.toLocaleLowerCase("ru").includes(query) ||
        (user.last_name?.toLocaleLowerCase("ru").includes(query) ?? false) ||
        (user.department_title?.toLocaleLowerCase("ru").includes(query) ?? false);
      return matchesManagement && matchesSearch;
    });
  }, [
    users,
    search,
    managementFilter,
    departmentManagements,
    managementScopeOnly,
    currentUser,
  ]);

  const regularEmployees = useMemo(() => {
    return filteredUsers.filter((user) => user.status === "USER");
  }, [filteredUsers]);

  const employeesByDepartment = useMemo(() => {
    const groups: Record<
      string,
      { title: string; users: UserWithDepartment[] }
    > = {};

    regularEmployees.forEach((employee) => {
      const deptId = employee.department_id || "no_department";
      const deptTitle = employee.department_title || "Без отдела";

      if (!groups[deptId]) {
        groups[deptId] = {
          title: deptTitle,
          users: [],
        };
      }

      groups[deptId].users.push(employee);
    });

    return groups;
  }, [regularEmployees]);

  if (isLoading || isManagementsLoading) return <EmployeesSkeleton />;

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Не удалось загрузить список сотрудников.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Шапка страницы */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-zinc-700" />
            {isManagementScoped ? "Сотрудники управления" : "Сотрудники компании"}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {filteredUsers.length} сотрудников отображено из {users.length}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Поиск */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-zinc-200 focus-visible:ring-zinc-900"
            />
          </div>

          {!managementScopeOnly && (
            <Select
              value={managementFilter}
              onValueChange={(value) => value && setManagementFilter(value)}
              disabled={isManagementsError}
            >
              <SelectTrigger className="w-full bg-white sm:w-60">
                <SelectValue placeholder="Все управления" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все управления</SelectItem>
                {managements.map((management) => (
                  <SelectItem key={management.id} value={String(management.id)}>
                    {management.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Кнопка добавления по условию */}
          {canAdd && (
            <Link href={`executors/new`}>
              <Button className="bg-zinc-900 hover:bg-zinc-800 text-white shrink-0">
                <UserPlus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            </Link>
          )}
        </div>
      </div>

      {isManagementsError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Не удалось загрузить список управлений. Фильтр по управлению недоступен.
        </p>
      )}

      {filteredUsers.length === 0 ? (
        <Card className="border-dashed border-zinc-300 bg-white">
          <CardContent className="p-12 text-center text-sm text-zinc-500">
            Сотрудники по выбранным фильтрам не найдены.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {LEADERSHIP_SECTIONS.map(({ role, title, icon: Icon, iconClass }) => {
            const roleUsers = filteredUsers.filter(
              (user) => user.status === role,
            );
            if (roleUsers.length === 0) return null;

            return (
              <section key={role} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
                  <Icon className={`h-5 w-5 ${iconClass}`} />
                  <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
                  <Badge variant="secondary" className="ml-auto font-mono">
                    {roleUsers.length}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {roleUsers.map((user) => (
                    <EmployeeCard
                      key={user.id}
                      user={user}
                      variant="featured"
                      readOnly={readOnly}
                      editHref={
                        editBasePath ? `${editBasePath}/${user.id}` : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
              <UserCheck className="h-5 w-5 text-zinc-600" />
              <h2 className="text-lg font-semibold text-zinc-900">
                Сотрудники по отделам
              </h2>
              <Badge variant="secondary" className="ml-auto font-mono">
                {regularEmployees.length}
              </Badge>
            </div>
            {Object.keys(employeesByDepartment).length === 0 ? (
              <Card className="border-dashed border-zinc-300 bg-zinc-50/50">
                <CardContent className="p-8 text-center text-sm text-zinc-500">
                  Сотрудников без руководящей роли не найдено.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Object.entries(employeesByDepartment).map(
                  ([deptId, { title, users: deptUsers }]) => (
                    <Card key={deptId} className="border-zinc-200 bg-white">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                          <Building2 className="h-4 w-4 shrink-0 text-zinc-500" />
                          <h3 className="truncate text-sm font-semibold text-zinc-800">
                            {title}
                          </h3>
                          <Badge
                            variant="outline"
                            className="ml-auto shrink-0 font-mono text-xs"
                          >
                            {deptUsers.length}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {deptUsers.map((employee) => (
                            <EmployeeCard
                              key={employee.id}
                              user={employee}
                              variant="compact"
                              readOnly={readOnly}
                              editHref={
                                editBasePath
                                  ? `${editBasePath}/${employee.id}`
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function EmployeesSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-10 bg-zinc-200 rounded-md w-1/3" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="h-6 bg-zinc-200 rounded w-1/2 mb-4" />
          <div className="h-24 bg-zinc-200 rounded-lg" />
          <div className="h-24 bg-zinc-200 rounded-lg" />
        </div>
        <div className="lg:col-span-8 space-y-3 min-w-0">
          <div className="h-6 bg-zinc-200 rounded w-1/4 mb-4" />
          <div className="flex gap-4 overflow-hidden">
            <div className="w-72 shrink-0 space-y-2">
              <div className="h-5 bg-zinc-200 rounded w-1/2 mb-2" />
              <div className="h-20 bg-zinc-200 rounded-lg" />
              <div className="h-20 bg-zinc-200 rounded-lg" />
            </div>
            <div className="w-72 shrink-0 space-y-2">
              <div className="h-5 bg-zinc-200 rounded w-1/2 mb-2" />
              <div className="h-20 bg-zinc-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
