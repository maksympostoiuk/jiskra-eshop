import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { prisma } from "@/lib/db";
import { CartView } from "./cart-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title"), robots: { index: false } };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  // The cheapest paid method with a free-shipping threshold drives the "free shipping from" progress bar.
  const method = await prisma.shippingMethod.findFirst({ where: { isActive: true, freeFromCzk: { not: null }, priceCzk: { gt: 0 } }, orderBy: { freeFromCzk: "asc" } });
  return (
    <div className="container-shop pt-6">
      <Breadcrumbs locale={locale} items={[{ name: t("title"), href: "/cart" }]} />
      <h1 className="mt-4 text-4xl sm:text-5xl">{t("title")}</h1>
      <CartView
        freeShipping={{
          CZK: method ? { price: method.priceCzk, freeFrom: method.freeFromCzk } : null,
          USD: method ? { price: method.priceUsd, freeFrom: method.freeFromUsd } : null,
        }}
      />
    </div>
  );
}
