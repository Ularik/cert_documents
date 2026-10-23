"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/services/queries/users";
import { useRouter } from "next/navigation";

export default function Header() {
    const router = useRouter();
    const { mutate: logout } = useLogout();
    const handleLogout = async () => {
        logout();
        router.push('/login');
    };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Логотип */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tight"
        >
          <span className="bg-primary text-primary-foreground px-2 py-1 rounded-lg text-sm">
            CERT
          </span>
          <span>Панель</span>
        </Link>

        {/* Кнопка выхода */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Выйти</span>
        </Button>
      </div>
    </header>
  );
}
