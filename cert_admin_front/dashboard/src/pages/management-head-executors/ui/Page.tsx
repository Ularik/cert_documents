"use client";

import { ExecutorsView } from "@/widgets/executors-view";

export default function ManagementHeadExecutorsPage() {
  return (
    <ExecutorsView
      editBasePath="/management-head/executors"
      managementScopeOnly
    />
  );
}
