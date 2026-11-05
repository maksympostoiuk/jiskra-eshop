import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Phone, Truck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getCategoryTree, type CategoryNode } from "@/server/catalog";
import { getCurrency } from "@/server/currency";
import { getSettings } from "@/server/settings";
import { getCustomer } from "@/lib/auth/customer-session";
import { CatalogMenu, type MenuCategory } from "./catalog-menu";
import { HeaderActions, LocaleCurrencySwitcher } from "./header-controls";
import { SearchBox } from "./search-box";

const toMenu = (c: CategoryNode): MenuCategory => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon, count: c.productCount, children: c.children.map(toMenu) });

export async function SiteHeader() {
  const locale = await getLocale();
  const t = await getTranslations("common.header");
  const [{ roots }, currency, settings, freeFrom, customer] = await Promise.all([
    getCategoryTree(locale),
    getCurrency(),
    getSettings(),
    prisma.shippingMethod.findFirst({ where: { isActive: true, freeFromCzk: { not: null } }, orderBy: { freeFromCzk: "asc" } }),
    getCustomer(),
  ]);
  const threshold = freeFrom ? (currency === "CZK" ? freeFrom.freeFromCzk : freeFrom.freeFromUsd) : null;

  return (
    <header className="relative z-40 border-b md:sticky md:top-0 border-line/80 bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
      <div className="hidden border-b border-line/60 md:block">
        <div className="container-shop flex h-9 items-center gap-6 text-xs text-ink-soft">
          {threshold !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Truck className="size-3.5 text-brand" aria-hidden="true" />
              {t("freeShipping", { amount: formatMoney(threshold, currency, locale) })}
            </span>
          )}
          {settings.contactPhone && (
            <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-ink">
              <Phone className="size-3.5" aria-hidden="true" />
              {settings.contactPhone}
            </a>
          )}
          <span className="flex-1" />
          <Suspense>
            <LocaleCurrencySwitcher currency={currency} />
          </Suspense>
        </div>
      </div>
      <div className="relative">
        <div className="container-shop flex flex-wrap items-center gap-x-3 gap-y-2 py-3 md:flex-nowrap md:gap-x-5">
          <Link href="/" aria-label={t("home")} className="mr-auto shrink-0 md:mr-0">
            <Logo />
          </Link>
          <div className="order-last flex w-full items-center gap-2 md:order-none md:w-auto md:flex-1 md:gap-4">
            <CatalogMenu categories={roots.filter((c) => c.productCount > 0).map(toMenu)} />
            <SearchBox className="min-w-0 flex-1" />
          </div>
          <HeaderActions signedIn={Boolean(customer)} />
        </div>
      </div>
      <div className="border-t border-line/60 md:hidden">
        <div className="container-shop flex h-10 items-center justify-end">
          <Suspense>
            <LocaleCurrencySwitcher currency={currency} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
