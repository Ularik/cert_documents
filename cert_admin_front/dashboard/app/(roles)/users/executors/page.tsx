"use client";

import ExecutorsView from "@/components/executors/ExecutorsView";

export default function UserExecutorsPage() {
  return <ExecutorsView canAdd={false} readOnly />;
}
