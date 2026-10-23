"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ExecutorAddForm from "@/components/executors/ExecutorAddForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMe } from "@/services/queries/users";

export default function ExecutorAddPage() {
  const { data: me, isLoading } = useMe();

  if (isLoading) {
    return <ExecutorAddSkeleton />;
  }

  if (!me?.department_id) {
    return (
      <div className="p-6 max-w-xl mx-auto min-h-[400px] flex items-center justify-center">
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm text-center">
          <CardContent className="p-8 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-zinc-900">
                Отдел не привязан
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Вы не можете добавить сотрудника, так как за вашим аккаунтом не
                закреплен отдел. Обратитесь в поддержку или к администратору.
              </p>
            </div>

            <div className="pt-2">
              <Link href="..">
                <Button variant="outline" className="border-zinc-300">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад к списку
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ExecutorAddForm />;
}

function ExecutorAddSkeleton() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-zinc-200 rounded w-1/3" />
      <div className="h-64 bg-zinc-200 rounded-xl" />
    </div>
  );
}
