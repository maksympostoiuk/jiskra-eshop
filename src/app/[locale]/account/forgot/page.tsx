import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ForgotForm } from "@/components/store/account-forms";
import { Link } from "@/i18n/navigation";
import { AuthCard } from "../layout-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.forgot");
  return { title: t("title"), robots: { index: false } };
}

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  return (
    <AuthCard title={t("forgot.title")} intro={t("forgot.intro")} footer={<Link href="/account/login" className="text-brand hover:underline">{t("forgot.back")}</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
