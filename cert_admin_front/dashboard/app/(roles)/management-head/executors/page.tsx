"use client";

import ExecutorsView from "@/components/executors/ExecutorsView";

export default function ManagementHeadExecutorsPage() {
  return (
    <ExecutorsView
      editBasePath="/management-head/executors"
      managementScopeOnly
    />
  );
}
