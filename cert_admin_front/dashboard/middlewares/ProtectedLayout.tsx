"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  ADMIN_DASHBOARD_ROLES,
  roleDashboardPaths,
} from "@/constants/main";
import type { UserRole } from "@/types/user";
import { useMe } from "@/services/queries/users";

type Props = {
  children: ReactNode;
  roles: UserRole[];
};

const ProtectedLayout = ({ children, roles }: Props) => {
  const router = useRouter();
  const pathname = usePathname();

  const { data: user, isLoading } = useMe();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }
    
    if (
      pathname.startsWith("/admin") &&
      !ADMIN_DASHBOARD_ROLES.includes(user.status)
    ) {
      router.replace(roleDashboardPaths[user.status]);
      return;
    }

    if (
      pathname.startsWith("/heads") &&
      ![...ADMIN_DASHBOARD_ROLES, "HEAD", "DEPUTY"].includes(user.status)
    ) {
      router.replace(roleDashboardPaths[user.status]);
      return;
    }

    if (
      pathname.startsWith("/management-head") &&
      user.status !== "MANAGEMENT_HEAD"
    ) {
      router.replace(roleDashboardPaths[user.status]);
    }

    if (!roles.includes(user.status)) {
      const redirectPath = roleDashboardPaths[user.status] || "/login";

      // Предотвращаем бесконечный редирект на тот же URL
      if (pathname !== redirectPath) {
        router.replace(redirectPath);
      }
    }
  }, [isLoading, router, user, roles, pathname]);

  // Защита от мигания интерфейса во время загрузки или редиректа
  if (isLoading || !user || !roles.includes(user.status)) {
    return null; // Здесь можно вернуть Loader/Spinner
  }

  return <>{children}</>;
};

export default ProtectedLayout;
