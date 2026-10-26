"use client";

import { ExecutorsView } from "@/widgets/executors-view";
import { useMe } from "@/entities/user";


export default function HeadsExecutors() {
  const { data: me } = useMe();
  const canAdd = me?.department_id ? true : false
  return <ExecutorsView canAdd={canAdd}/>;
}
