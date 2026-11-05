import { getLocale, getTranslations } from "next-intl/server";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { pickTranslation } from "@/lib/i18n-content";
import { getCategoryTree } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { availablePaymentMethods } from "@/lib/payments";

export async function SiteFooter() {
  const locale = await getLocale();
  const t = await getTranslations("common.footer");
  const tPay = await getTranslations("common.paymentMethod");
  const [{ roots }, settings, shipping] = await Promise.all([
    getCategoryTree(locale),
    getSettings(),
    prisma.shippingMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { translations: true } }),
  ]);
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-shop grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Logo className="text-3xl" />
          <p className="mt-3 max-w-xs text-sm text-ink-soft">{t("about")}</p>
          <address className="mt-5 flex flex-col gap-2 text-sm text-ink-soft not-italic">
            {settings.contactPhone && (
              <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:text-ink">
                <Phone className="size-4" aria-hidden="true" />
                {settings.contactPhone}
              </a>
            )}
            {settings.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} className="inline-flex items-center gap-2 hover:text-ink">
                <Mail className="size-4" aria-hidden="true" />
                {settings.contactEmail}
              </a>
            )}
            {settings.address && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4" aria-hidden="true" />
                {settings.address}
              </span>
            )}
          </address>
        </div>
        <nav aria-labelledby="footer-catalog">
          <h2 id="footer-catalog" className="mb-3 text-lg">{t("catalog")}</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            {roots.filter((c) => c.productCount > 0).map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="hover:text-ink">{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="footer-shopping">
          <h2 id="footer-shopping" className="mb-3 text-lg">{t("shopping")}</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            <li><Link href="/cart" className="hover:text-ink">{t("cart")}</Link></li>
            <li><Link href="/favorites" className="hover:text-ink">{t("favorites")}</Link></li>
            <li><Link href="/compare" className="hover:text-ink">{t("compare")}</Link></li>
            <li><Link href="/search" className="hover:text-ink">{t("search")}</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="mb-3 text-lg">{t("delivery")}</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            {shipping.map((m) => (
              <li key={m.id}>{pickTranslation(m.translations, locale)?.name}</li>
            ))}
          </ul>
          <h2 className="mt-6 mb-3 text-lg">{t("payment")}</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            {availablePaymentMethods().map((p) => (
              <li key={p}>{tPay(p)}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line/70">
        <div className="container-shop flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-ink-faint">
          <p>{t("copyright", { year: new Date().getFullYear(), name: settings.shopName })}</p>
          <p>{t("demo")}</p>
        </div>
      </div>
    </footer>
  );
}
