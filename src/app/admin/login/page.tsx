import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { getAdmin } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.login");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const { next } = await searchParams;
  const t = await getTranslations("admin.login");
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="text-4xl" />
          <p className="mt-2 text-sm tracking-wide text-ink-soft uppercase">{t("subtitle")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-card">
          <h1 className="mb-6 text-2xl">{t("title")}</h1>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
