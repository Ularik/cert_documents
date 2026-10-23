import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Регистрация",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <RegisterForm />
    </main>
  );
}
