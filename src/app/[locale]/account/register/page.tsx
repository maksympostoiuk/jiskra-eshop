import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RegisterForm } from "@/components/store/account-forms";
import { Link } from "@/i18n/navigation";
import { AuthCard } from "../layout-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.register");
  return { title: t("title"), robots: { index: false } };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  return (
    <AuthCard
      title={t("register.title")}
      intro={t("register.intro")}
      footer={
        <>
          {t("register.haveAccount")} <Link href="/account/login" className="font-semibold text-brand hover:underline">{t("register.login")}</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
