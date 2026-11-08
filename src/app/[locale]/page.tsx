import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { BannerLink } from "@/components/store/banner-link";
import { Bestsellers } from "@/components/store/bestsellers";
import { ProductCard } from "@/components/store/product-card";
import { ShopImage } from "@/components/store/shop-image";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { CategoryIcon } from "@/lib/category-icons";
import { descendantIds } from "@/lib/catalog/category-tree";
import { pickTranslation } from "@/lib/i18n-content";
import { getCards, getCategoryTree } from "@/server/catalog";
import { getCurrency } from "@/server/currency";
import { alternates } from "@/server/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternates(locale, "/") };
}

async function activeBanners(locale: string) {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
    orderBy: { sortOrder: "asc" },
    include: { translations: true },
  });
  return banners.map((b) => ({ ...b, tr: pickTranslation(b.translations, locale) }));
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const yesNo = { yes: tc("yes"), no: tc("no") };
  const currency = await getCurrency();
  const opts = { locale, currency, yesNo };
  const [banners, { roots, flat }, brands] = await Promise.all([
    activeBanners(locale),
    getCategoryTree(locale),
    prisma.brand.findMany({ where: { isActive: true, products: { some: { status: "PUBLISHED" } } }, orderBy: { sortOrder: "asc" } }),
  ]);
  const topCategories = roots.filter((c) => c.productCount > 0);
  const [top, newest, ...perCategory] = await Promise.all([
    getCards({}, { ...opts, take: 8 }),
    getCards({}, { ...opts, take: 8, orderBy: [{ createdAt: "desc" }] }),
    ...topCategories.slice(0, 6).map((c) => getCards({ categoryId: { in: descendantIds(flat, c.id) } }, { ...opts, take: 8 })),
  ]);
  const groups = [
    { key: "top", label: t("bestsellersAll"), products: top },
    ...topCategories.slice(0, 6).map((c, i) => ({ key: c.id, label: c.name, products: perCategory[i] })),
  ].filter((g) => g.products.length > 0);

  const hero = banners.find((b) => b.placement === "HERO");
  const side = banners.filter((b) => b.placement === "HERO_SIDE").slice(0, 2);
  const promos = banners.filter((b) => b.placement === "PROMO").slice(0, 4);

  return (
    <div className="container-shop">
      <h1 className="sr-only">{t("title")}</h1>

      {/* Hero: one large editorial banner + two side tiles */}
      {(hero || side.length > 0) && (
        <section aria-label={t("promotions")} className="mt-6 grid gap-4 lg:grid-cols-[1.9fr_1fr]">
          {hero?.tr && (
            <BannerLink href={hero.tr.linkUrl} className="group relative grid min-h-64 overflow-hidden sm:min-h-[22rem] rounded-2xl p-7 sm:grid-cols-[1fr_0.9fr] sm:p-10">
              <span className="absolute inset-0" style={{ background: hero.bgColor }} aria-hidden="true" />
              <div className="relative z-10 flex flex-col justify-end gap-4 self-stretch" style={{ color: hero.textColor }}>
                <h2 className="text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">{hero.tr.title}</h2>
                {hero.tr.subtitle && <p className="max-w-sm text-lg opacity-80">{hero.tr.subtitle}</p>}
                {hero.tr.ctaLabel && (
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors group-hover:bg-brand">
                    {hero.tr.ctaLabel}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                )}
              </div>
              {hero.imageUrl && (
                <div className="relative -mr-4 hidden min-h-64 sm:block">
                  <ShopImage src={hero.imageUrl} alt={hero.tr.imageAlt} fill priority sizes="(min-width: 1024px) 40vw, 50vw" className="object-contain transition-transform duration-500 group-hover:scale-105" />
                </div>
              )}
            </BannerLink>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {side.map((b) =>
              b.tr ? (
                <BannerLink key={b.id} href={b.tr.linkUrl} className="group relative flex min-h-40 items-center gap-4 overflow-hidden rounded-2xl p-6">
                  <span className="absolute inset-0" style={{ background: b.bgColor }} aria-hidden="true" />
                  <div className="relative z-10 flex-1" style={{ color: b.textColor }}>
                    <h2 className="text-2xl leading-tight">{b.tr.title}</h2>
                    {b.tr.subtitle && <p className="mt-1 text-sm opacity-80">{b.tr.subtitle}</p>}
                    {b.tr.ctaLabel && <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">{b.tr.ctaLabel} <ArrowRight className="size-4" aria-hidden="true" /></span>}
                  </div>
                  {b.imageUrl && (
                    <div className="relative size-32 shrink-0">
                      <ShopImage src={b.imageUrl} alt={b.tr.imageAlt} fill sizes="128px" className="object-contain transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  )}
                </BannerLink>
              ) : null,
            )}
          </div>
        </section>
      )}

      {/* Category tiles */}
      <section aria-labelledby="home-categories" className="mt-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="home-categories" className="text-3xl">{t("categories")}</h2>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {topCategories.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}`} className="group flex h-full flex-col items-center gap-3 rounded-2xl p-3 text-center hover:bg-surface">
                <span className="grid size-20 place-items-center rounded-full bg-surface text-brand shadow-card transition-transform group-hover:-translate-y-0.5 group-hover:bg-brand-soft">
                  <CategoryIcon name={c.icon} className="size-8" />
                </span>
                <span className="text-sm leading-tight font-medium">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Bestsellers with chips */}
      {groups.length > 0 && (
        <section aria-labelledby="home-bestsellers" className="mt-14">
          <h2 id="home-bestsellers" className="mb-5 text-3xl">{t("bestsellers")}</h2>
          <Bestsellers groups={groups} label={t("bestsellers")} />
        </section>
      )}

      {/* Promo tiles */}
      {promos.length > 0 && (
        <section aria-labelledby="home-promos" className="mt-14">
          <h2 id="home-promos" className="mb-5 text-3xl">{t("inspiration")}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {promos.map((b) =>
              b.tr ? (
                <li key={b.id}>
                  <BannerLink href={b.tr.linkUrl} className="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl p-5">
                    <span className="absolute inset-0" style={{ background: b.bgColor }} aria-hidden="true" />
                    <div className="relative z-10" style={{ color: b.textColor }}>
                      <h3 className="text-2xl leading-tight">{b.tr.title}</h3>
                      {b.tr.subtitle && <p className="mt-1 text-sm opacity-80">{b.tr.subtitle}</p>}
                    </div>
                    {b.imageUrl && (
                      <div className="relative mt-auto aspect-square w-full">
                        <ShopImage src={b.imageUrl} alt={b.tr.imageAlt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-contain transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    )}
                  </BannerLink>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}

      {/* New arrivals */}
      {newest.length > 0 && (
        <section aria-labelledby="home-new" className="mt-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="home-new" className="text-3xl">{t("newArrivals")}</h2>
            <Link href="/search?sort=newest" className="rounded-full border border-ink px-4 py-1.5 text-sm font-medium hover:bg-ink hover:text-white">
              {t("viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {newest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Brand strip */}
      {brands.length > 0 && (
        <section aria-labelledby="home-brands" className="mt-14">
          <h2 id="home-brands" className="mb-5 text-3xl">{t("brands")}</h2>
          <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {brands.map((b) => (
              <li key={b.id} className="shrink-0">
                <Link href={`/search?brand=${b.slug}`} className="grid h-20 w-36 place-items-center rounded-xl border border-line/70 bg-surface font-display text-xl font-semibold tracking-tight text-ink-soft shadow-card hover:text-ink">
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Benefits */}
      <section aria-label={t("benefitsLabel")} className="mt-14 grid gap-4 rounded-2xl bg-surface p-6 shadow-card sm:grid-cols-3">
        {[
          { Icon: Truck, title: t("benefits.shippingTitle"), text: t("benefits.shippingText") },
          { Icon: RotateCcw, title: t("benefits.returnsTitle"), text: t("benefits.returnsText") },
          { Icon: ShieldCheck, title: t("benefits.warrantyTitle"), text: t("benefits.warrantyText") },
        ].map(({ Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-sans font-semibold">{title}</h3>
              <p className="text-sm text-ink-soft">{text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
