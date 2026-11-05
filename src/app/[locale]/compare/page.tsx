import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CompareView } from "./compare-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog.compare");
  return { title: t("title"), robots: { index: false } };
}

export default async function ComparePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog.compare");
  return (
    <div className="container-shop pt-6">
      <Breadcrumbs locale={locale} items={[{ name: t("title"), href: "/compare" }]} />
      <h1 className="mt-4 text-4xl sm:text-5xl">{t("title")}</h1>
      <CompareView />
    </div>
  );
}
