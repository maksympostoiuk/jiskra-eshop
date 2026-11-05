import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { FavoritesView } from "./favorites-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog.favorites");
  return { title: t("title"), robots: { index: false } };
}

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog.favorites");
  return (
    <div className="container-shop pt-6">
      <Breadcrumbs locale={locale} items={[{ name: t("title"), href: "/favorites" }]} />
      <h1 className="mt-4 text-4xl sm:text-5xl">{t("title")}</h1>
      <FavoritesView />
    </div>
  );
}
