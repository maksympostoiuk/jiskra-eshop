import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResetForm } from "@/components/store/account-forms";
import { Alert } from "@/components/ui/alert";
import { Link } from "@/i18n/navigation";
import { AuthCard } from "../layout-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.reset");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function ResetPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token } = await searchParams;
  const t = await getTranslations("account");
  return (
    <AuthCard title={t("reset.title")}>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <>
          <Alert tone="error">{t("reset.invalid")}</Alert>
          <Link href="/account/forgot" className="mt-4 inline-block text-sm text-brand hover:underline">{t("reset.again")}</Link>
        </>
      )}
    </AuthCard>
  );
}
