import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { JsonLd } from "@/components/store/json-ld";
import { ProductCard } from "@/components/store/product-card";
import { ProductHero, ProductSubnav } from "@/components/store/product-hero";
import { Stars } from "@/components/store/rating";
import { ReviewForm } from "@/components/store/review-form";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { defaultVariant } from "@/lib/catalog/variants";
import { formatMoney } from "@/lib/money";
import { siteUrl } from "@/lib/site";
import { truncate } from "@/lib/text";
import { getCurrency } from "@/server/currency";
import { getProductPage } from "@/server/product-page";
import { alternates } from "@/server/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function load(locale: string, slug: string) {
  const tc = await getTranslations({ locale, namespace: "common" });
  const currency = await getCurrency();
  return { data: await getProductPage(slug, locale, currency, { yes: tc("yes"), no: tc("no") }), currency };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const { data } = await load(locale, slug);
  if (!data || "redirectSlug" in data) return {};
  const { product, images, slugs } = data;
  const description = product.seoDescription || truncate(product.shortDescription || product.description, 160);
  return {
    title: product.seoTitle || product.name,
    description,
    alternates: alternates(locale, slugs),
    openGraph: { title: product.name, description, images: images[0] ? [{ url: images[0].url, alt: images[0].alt }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { data, currency } = await load(locale, slug);
  if (data && "redirectSlug" in data && data.redirectSlug) redirect({ href: `/product/${data.redirectSlug}`, locale });
  if (!data || "redirectSlug" in data) notFound();
  const t = await getTranslations("product");
  const format = await getFormatter();
  const { product, variants, optionGroups, images, specs, path, reviews, distribution, related } = data;
  const fallback = defaultVariant(variants);
  if (!fallback) notFound(); // a published product without variants cannot be sold
  // Delivery note: the paid shipping method with the lowest free-shipping threshold (same rule as the cart).
  const freeMethod = await prisma.shippingMethod.findFirst({ where: { isActive: true, priceCzk: { gt: 0 }, freeFromCzk: { not: null } }, orderBy: { freeFromCzk: "asc" } });
  const freeFrom = freeMethod ? (currency === "CZK" ? freeMethod.freeFromCzk : freeMethod.freeFromUsd) : null;
  const shippingNote = freeFrom ? t("delivery.freeFrom", { amount: formatMoney(freeFrom, currency, locale) }) : null;
  const paragraphs = product.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const url = `${siteUrl()}/${locale}/product/${product.slug}`;
  const prices = variants.map((v) => v.price);

  const sections = [
    { id: "description", label: t("subnav.description") },
    { id: "specs", label: t("subnav.specs") },
    { id: "reviews", label: t("subnav.reviews", { count: product.ratingCount }) },
    ...(related.length ? [{ id: "related", label: t("subnav.related") }] : []),
  ];

  return (
    <div className="container-shop pt-6">
      <Breadcrumbs locale={locale} items={[...path.map((c) => ({ name: c.name, href: `/category/${c.slug}` })), { name: product.name, href: `/product/${product.slug}` }]} />
      <div className="mt-4 mb-6">
        {product.brand && <p className="text-sm tracking-wide text-ink-faint uppercase">{product.brand.name}</p>}
        <h1 className="text-3xl leading-tight sm:text-4xl lg:text-5xl">{product.name}</h1>
        {product.shortDescription && <p className="mt-2 max-w-3xl text-ink-soft">{product.shortDescription}</p>}
      </div>

      <ProductHero
        product={{ id: product.id, name: product.name, brand: product.brand?.name ?? null, ratingAvg: product.ratingAvg, ratingCount: product.ratingCount, badges: product.badges }}
        variants={variants}
        optionGroups={optionGroups}
        images={images}
        keySpecs={specs.filter((s) => s.isKey).slice(0, 6)}
        currency={currency}
        shippingNote={shippingNote}
      />

      <ProductSubnav name={product.name} sections={sections} fallback={fallback} variants={variants} currency={currency} />

      <div className="grid gap-x-12 lg:grid-cols-[1.4fr_1fr]">
        <section id="description" aria-labelledby="description-title" className="scroll-mt-48 pt-10">
          <h2 id="description-title" className="mb-4 text-3xl">{t("subnav.description")}</h2>
          <div className="flex max-w-prose flex-col gap-4 leading-relaxed text-ink-soft">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </div>
        </section>
        <section id="specs" aria-labelledby="specs-title" className="scroll-mt-48 pt-10">
          <h2 id="specs-title" className="mb-4 text-3xl">{t("subnav.specs")}</h2>
          {specs.length ? (
            <table className="w-full overflow-hidden rounded-xl bg-surface text-sm shadow-card">
              <caption className="sr-only">{t("specsCaption", { name: product.name })}</caption>
              <tbody>
                {specs.map((s) => (
                  <tr key={s.key} className="border-b border-line/60 last:border-b-0">
                    <th scope="row" className="w-1/2 px-4 py-3 text-left font-normal text-ink-soft">{s.label}</th>
                    <td className="px-4 py-3 font-medium">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-ink-soft">{t("noSpecs")}</p>
          )}
        </section>
      </div>

      <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-48 pt-14">
        <h2 id="reviews-title" className="mb-6 text-3xl">{t("reviews.title")}</h2>
        <div className="grid gap-10 lg:grid-cols-[20rem_1fr]">
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl bg-surface p-6 shadow-card">
              <div className="flex items-end gap-3">
                <span className="font-display text-6xl leading-none">{product.ratingCount ? product.ratingAvg.toFixed(1) : "–"}</span>
                <div className="pb-1">
                  <Stars rating={product.ratingAvg} size="md" label={t("ratingLabel", { rating: product.ratingAvg.toFixed(1) })} />
                  <p className="text-sm text-ink-soft">{t("reviewsCount", { count: product.ratingCount })}</p>
                </div>
              </div>
              <ul className="mt-5 flex flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((r) => {
                  const count = distribution[r] ?? 0;
                  const pct = product.ratingCount ? Math.round((count / product.ratingCount) * 100) : 0;
                  return (
                    <li key={r} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-ink-soft">{r}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="img" aria-label={t("reviews.distribution", { stars: r, count })}>
                        <span className="block h-full rounded-full bg-spark" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-6 text-right text-xs text-ink-faint">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="rounded-2xl bg-surface p-6 shadow-card">
              <ReviewForm productId={product.id} />
            </div>
          </div>
          <div>
            {reviews.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-ink-soft">{t("reviews.empty")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line/70">
                {reviews.map((r) => (
                  <li key={r.id} className="py-5 first:pt-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars rating={r.rating} label={t("ratingLabel", { rating: r.rating })} />
                      <span className="font-semibold">{r.authorName}</span>
                      <span className="text-sm text-ink-faint">{format.dateTime(r.createdAt, { dateStyle: "medium" })}</span>
                      {r.locale !== locale && <span className="rounded bg-muted px-1.5 text-xs text-ink-soft uppercase" title={t("reviews.otherLanguage")}>{r.locale}</span>}
                    </div>
                    <p className="mt-2 leading-relaxed">{r.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section id="related" aria-labelledby="related-title" className="scroll-mt-48 pt-14">
          <h2 id="related-title" className="mb-5 text-3xl">{t("related")}</h2>
          <ul className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
            {related.map((p) => (
              <li key={p.id} className="w-60 shrink-0 snap-start sm:w-64">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: truncate(product.shortDescription || product.description, 500),
          sku: fallback.sku,
          url,
          image: images.slice(0, 6).map((im) => `${siteUrl()}${im.url}`),
          ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: currency,
            lowPrice: (Math.min(...prices) / 100).toFixed(2),
            highPrice: (Math.max(...prices) / 100).toFixed(2),
            offerCount: variants.length,
            availability: variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url,
          },
          ...(product.ratingCount
            ? {
                aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount, bestRating: 5, worstRating: 1 },
                review: reviews.slice(0, 5).map((r) => ({
                  "@type": "Review",
                  author: { "@type": "Person", name: r.authorName },
                  datePublished: r.createdAt.toISOString().slice(0, 10),
                  reviewBody: r.text,
                  reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
                })),
              }
            : {}),
        }}
      />
    </div>
  );
}
