import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/store/account-forms";
import { Alert } from "@/components/ui/alert";
import { Link, redirect } from "@/i18n/navigation";
import { getCustomer } from "@/lib/auth/customer-session";
import { AuthCard } from "../layout-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.login");
  return { title: t("title"), robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; verify?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next, verify } = await searchParams;
  if (await getCustomer()) redirect({ href: "/account", locale });
  const t = await getTranslations("account");
  return (
    <AuthCard
      title={t("login.title")}
      intro={t("login.intro")}
      footer={
        <>
          {t("login.noAccount")} <Link href="/account/register" className="font-semibold text-brand hover:underline">{t("login.register")}</Link>
        </>
      }
    >
      {verify === "invalid" && <Alert tone="error" className="mb-4">{t("login.verifyInvalid")}</Alert>}
      <LoginForm next={next} />
      <Link href="/account/forgot" className="mt-4 inline-block text-sm text-ink-soft hover:text-ink hover:underline">{t("login.forgot")}</Link>
    </AuthCard>
  );
}
