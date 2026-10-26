"use client";

import ProtectedLayout from "@/app/guards/ProtectedLayout";
import type { ReactNode } from "react";

export default function ManagementHeadLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedLayout roles={["MANAGEMENT_HEAD"]}>
      {children}
    </ProtectedLayout>
  );
}
