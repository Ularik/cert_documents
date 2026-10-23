"use client";

import ExecutorsView from "@/components/executors/ExecutorsView";
import { useMe } from "@/services/queries/users";


export default function HeadsExecutors() {
  const { data: me } = useMe();
  const canAdd = me?.department_id ? true : false
  return <ExecutorsView canAdd={canAdd}/>;
}
