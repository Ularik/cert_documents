"use client";

import ProtectedLayout from "@/middlewares/ProtectedLayout";
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import Sidebar from "@/components/sideBar/sideBar";
import MobileSidebar from "@/components/sideBar/MobileSideBar";
import MobileTopbar from "@/components/sideBar/MobileTopBar";

type Props = {
  children: ReactNode;
};

export default function AdminLayout({ children }: Props) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <ProtectedLayout
      roles={[
        "ADMIN",
        "DIVISION_HEAD",
        "MANAGEMENT_HEAD",
        "HEAD",
        "DEPUTY",
        "USER",
      ]}
    >
      <div className="min-h-screen bg-slate-100">
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
        />

        <MobileSidebar
          open={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        <div
          className={clsx(
            "flex min-w-0 flex-col transition-[padding] duration-200",
            isSidebarCollapsed ? "lg:pl-20" : "lg:pl-72",
          )}
        >
          <MobileTopbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
