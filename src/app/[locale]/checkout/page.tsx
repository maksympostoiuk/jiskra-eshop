import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { prisma } from "@/lib/db";
import { pickTranslation } from "@/lib/i18n-content";
import { availablePaymentMethods } from "@/lib/payments";
import { getCurrency } from "@/server/currency";
import { CheckoutForm } from "./checkout-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  const methods = await prisma.shippingMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { translations: true } });
  return (
    <div className="container-shop pt-6">
      <Breadcrumbs locale={locale} items={[{ name: t("cart"), href: "/cart" }, { name: t("title"), href: "/checkout" }]} />
      <h1 className="mt-4 text-4xl sm:text-5xl">{t("title")}</h1>
      <CheckoutForm
        currency={await getCurrency()}
        paymentMethods={availablePaymentMethods()}
        shippingOptions={methods.map((m) => {
          const tr = pickTranslation(m.translations, locale);
          return {
            id: m.id,
            name: tr?.name ?? m.code,
            description: tr?.description ?? "",
            allowsCod: m.allowsCod,
            CZK: { price: m.priceCzk, freeFrom: m.freeFromCzk },
            USD: { price: m.priceUsd, freeFrom: m.freeFromUsd },
          };
        })}
      />
    </div>
  );
}
