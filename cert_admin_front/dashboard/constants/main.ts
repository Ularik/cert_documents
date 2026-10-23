import {
  Building2,
  LayoutDashboard,
  type LucideIcon,
  Newspaper,
  Plane,
  Users,
  UserRound,
} from "lucide-react";

import type { UserRole } from "@/types/user";

export const ADMIN_ACCESS_ROLES: UserRole[] = [
  "ADMIN",
  "DIVISION_HEAD",
  "MANAGEMENT_HEAD",
];

export const ADMIN_DASHBOARD_ROLES: UserRole[] = ["ADMIN", "DIVISION_HEAD"];

export const roleDashboardPaths: Record<UserRole, string> = {
  ADMIN: "/admin",
  DIVISION_HEAD: "/admin",
  MANAGEMENT_HEAD: "/management-head",
  HEAD: "/heads",
  DEPUTY: "/heads",
  USER: "/users",
};

export type DashboardMenuItem = {
  label: string;
  href: string;
  roles: UserRole[];
  icon: LucideIcon;
};

export const dashboardMenuItems: DashboardMenuItem[] = [
  {
    label: "Панель",
    href: "/admin",
    roles: ADMIN_DASHBOARD_ROLES,
    icon: LayoutDashboard,
  },
  {
    label: "Отделы",
    href: "/admin/departments",
    roles: ADMIN_DASHBOARD_ROLES,
    icon: Users,
  },
  {
    label: "Управления",
    href: "/admin/managements",
    roles: ADMIN_DASHBOARD_ROLES,
    icon: Building2,
  },
  {
    label: "Задачи",
    href: "/admin/tasks",
    roles: ADMIN_DASHBOARD_ROLES,
    icon: Newspaper,
  },
  {
    label: "Сотрудники",
    href: "/admin/executors",
    roles: ADMIN_DASHBOARD_ROLES,
    icon: Plane,
  },
  {
    label: "Панель",
    href: "/management-head",
    roles: ["MANAGEMENT_HEAD"],
    icon: LayoutDashboard,
  },
  {
    label: "Задачи управления",
    href: "/management-head/tasks",
    roles: ["MANAGEMENT_HEAD"],
    icon: Newspaper,
  },
  {
    label: "Отделы",
    href: "/management-head/departments",
    roles: ["MANAGEMENT_HEAD"],
    icon: Users,
  },
  {
    label: "Сотрудники",
    href: "/management-head/executors",
    roles: ["MANAGEMENT_HEAD"],
    icon: Plane,
  },
  {
    label: "Панель",
    href: "/heads",
    roles: ["HEAD"],
    icon: LayoutDashboard,
  },
  {
    label: "Задачи",
    href: "/heads/tasks",
    roles: ["HEAD"],
    icon: Newspaper,
  },
  {
    label: "Сотрудники",
    href: "/heads/executors",
    roles: ["HEAD"],
    icon: Plane,
  },
  {
    label: "Сотрудники моего отдела",
    href: "/heads/myexecutors",
    roles: ["HEAD"],
    icon: Plane,
  },

  {
    label: "Панель",
    href: "/heads",
    roles: ["DEPUTY"],
    icon: LayoutDashboard,
  },
  {
    label: "Задачи",
    href: "/heads/tasks",
    roles: ["DEPUTY"],
    icon: Newspaper,
  },
  {
    label: "Сотрудники",
    href: "/heads/executors",
    roles: ["DEPUTY"],
    icon: Plane,
  },
  {
    label: "Сотрудники моего отдела",
    href: "/heads/myexecutors",
    roles: ["DEPUTY"],
    icon: Plane,
  },

  {
    label: "Панель",
    href: "/users",
    roles: ["USER"],
    icon: LayoutDashboard,
  },
  {
    label: "Задачи",
    href: "/users/tasks",
    roles: ["USER"],
    icon: Newspaper,
  },
  {
    label: "Сотрудники",
    href: "/users/executors",
    roles: ["USER"],
    icon: UserRound,
  },
];
