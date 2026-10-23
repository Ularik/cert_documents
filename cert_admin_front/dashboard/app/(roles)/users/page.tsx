"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, UserRound, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/services/queries/users";

export default function UserDashboardPage() {
    const { data: user, isPending, isError } = useMe();

    if (isPending) {
        return (
            <div className="mx-auto max-w-5xl space-y-6 p-6">
                <Skeleton className="h-10 w-64 bg-zinc-200" />
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-40 bg-zinc-200" />
                    <Skeleton className="h-40 bg-zinc-200" />
                </div>
            </div>
        );
    }

    if (isError || !user) {
        return <p className="p-6 text-sm text-red-600">Не удалось загрузить профиль.</p>;
    }

    const fullName = user.last_name ? `${user.last_name} ${user.username}` : user.username;

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-6">
            <header className="border-b border-zinc-200 pb-5">
                <p className="text-sm font-medium text-zinc-500">Личный кабинет</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Добро пожаловать, {fullName}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                    <Badge variant="secondary">Сотрудник</Badge>
                    <span>{user.department_id ? "Ваш отдел доступен в задачах" : "Отдел не назначен"}</span>
                </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2" aria-label="Разделы кабинета">
                <DashboardLink href="/users/tasks" icon={ClipboardList} title="Задачи отдела" description="Просматривайте задачи, назначенные вашему подразделению." />
                <DashboardLink href="/users/executors" icon={Users} title="Сотрудники управления" description="Откройте список сотрудников и руководителей вашего управления." />
            </section>

            <Card className="border-zinc-200 bg-zinc-50/70">
                <CardContent className="flex items-start gap-3 p-5">
                    <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
                    <div>
                        <h2 className="font-semibold text-zinc-900">Ваш профиль</h2>
                        <p className="mt-1 text-sm text-zinc-500">{fullName}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function DashboardLink({
    href,
    icon: Icon,
    title,
    description,
}: {
    href: string;
    icon: typeof ClipboardList;
    title: string;
    description: string;
}) {
    return (
        <Link href={href} className="group">
            <Card className="h-full border-zinc-200 transition-colors group-hover:border-zinc-400 group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-zinc-900">
                <CardContent className="flex h-full items-start justify-between gap-4 p-6">
                    <div>
                        <Icon className="h-6 w-6 text-zinc-700" />
                        <h2 className="mt-5 text-lg font-semibold text-zinc-900">{title}</h2>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-1" />
                </CardContent>
            </Card>
        </Link>
    );
}