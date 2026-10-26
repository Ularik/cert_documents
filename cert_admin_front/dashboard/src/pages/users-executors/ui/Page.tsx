"use client";

import { ExecutorsView } from "@/widgets/executors-view";

export default function UserExecutorsPage() {
  return <ExecutorsView canAdd={false} readOnly />;
}
