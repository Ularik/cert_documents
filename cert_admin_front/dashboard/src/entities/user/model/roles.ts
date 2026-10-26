import type { UserRole } from "./types";

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
