import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/product-listing";
import { SearchBox } from "@/components/store/search-box";
import { searchScope } from "@/server/catalog";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const t = await getTranslations("catalog.search");
  const q = (await searchParams).q;
  return { title: typeof q === "string" && q ? t("titleFor", { q }) : t("title"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog.search");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  // Without a query the page lists the whole catalogue (used by "new arrivals" and brand links).
  const scope = q ? searchScope(q, locale) : {};
  return (
    <div className="container-shop pt-6">
      <Breadcrumbs locale={locale} items={[{ name: t("title"), href: "/search" }]} />
      <h1 className="mt-4 text-4xl sm:text-5xl">{q ? t("titleFor", { q }) : t("allProducts")}</h1>
      <SearchBox initialQuery={q} className="mt-5 max-w-2xl" />
      <ProductListing scope={scope} specDefs={[]} searchParams={sp} basePath="/search" locale={locale} extra={{ q }} />
    </div>
  );
}
