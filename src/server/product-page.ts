import "server-only";
import { prisma } from "@/lib/db";
import { formatSpecValue } from "@/lib/catalog/spec-format";
import { pickLocalized, pickTranslation } from "@/lib/i18n-content";
import type { Currency } from "@/lib/money";
import { getCards, getCategoryPath, getSpecDefsForCategory } from "./catalog";

export type ProductVariantView = { id: string; sku: string; price: number; oldPrice: number | null; stock: number; options: Record<string, string> };
export type OptionGroupView = { name: string; values: Array<{ value: string; label: string; hex: string | null }> };
export type ProductImageView = { url: string; alt: string; color: string | null };

/** Everything the product page needs. Returns `{ redirectSlug }` when the slug belongs to another locale. */
export async function getProductPage(slug: string, locale: string, currency: Currency, yesNo: { yes: string; no: string }) {
  const tr = await prisma.productTranslation.findUnique({ where: { locale_slug: { locale, slug } } });
  if (!tr) {
    const other = await prisma.productTranslation.findFirst({ where: { slug } });
    if (!other) return null;
    const target = await prisma.productTranslation.findUnique({ where: { productId_locale: { productId: other.productId, locale } } });
    return target ? { redirectSlug: target.slug } : null;
  }
  const product = await prisma.product.findFirst({
    where: { id: tr.productId, status: "PUBLISHED" },
    include: {
      translations: true,
      brand: true,
      variants: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
      images: { orderBy: { sortOrder: "asc" }, include: { variant: { include: { options: true } } } },
      badges: { orderBy: { sortOrder: "asc" }, include: { translations: true } },
      specValues: true,
    },
  });
  if (!product) return null;

  const [path, specDefs, reviews, distribution, related] = await Promise.all([
    getCategoryPath(locale, product.categoryId),
    getSpecDefsForCategory(locale, product.categoryId),
    prisma.review.findMany({ where: { productId: product.id, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.review.groupBy({ by: ["rating"], where: { productId: product.id, status: "APPROVED" }, _count: { _all: true } }),
    getCards({ categoryId: product.categoryId, id: { not: product.id } }, { locale, currency, yesNo, take: 8 }),
  ]);

  const variants: ProductVariantView[] = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    price: currency === "CZK" ? v.priceCzk : v.priceUsd,
    oldPrice: currency === "CZK" ? v.oldPriceCzk : v.oldPriceUsd,
    stock: v.stock,
    options: Object.fromEntries(v.options.map((o) => [o.name, o.value])),
  }));
  const groups = new Map<string, OptionGroupView>();
  for (const v of product.variants)
    for (const o of v.options) {
      const g = groups.get(o.name) ?? { name: o.name, values: [] };
      if (!g.values.some((x) => x.value === o.value)) g.values.push({ value: o.value, label: pickLocalized(o.labelCs, o.labelEn, locale), hex: o.colorHex });
      groups.set(o.name, g);
    }
  const images: ProductImageView[] = product.images.map((im) => ({
    url: im.url,
    alt: pickLocalized(im.altCs, im.altEn, locale) || tr.name,
    color: im.variant?.options.find((o) => o.name === "color")?.value ?? null,
  }));

  const specs = specDefs
    .map((def) => {
      const value = product.specValues.find((s) => s.specDefinitionId === def.id);
      const formatted = value ? formatSpecValue(value, def, locale, yesNo) : null;
      return formatted ? { key: def.key, label: def.label, value: formatted, isKey: def.isKey } : null;
    })
    .filter((s): s is { key: string; label: string; value: string; isKey: boolean } => s !== null);

  const slugs = Object.fromEntries(product.translations.map((x) => [x.locale, `/product/${x.slug}`]));

  return {
    product: {
      id: product.id,
      name: tr.name,
      slug: tr.slug,
      shortDescription: tr.shortDescription,
      description: tr.description,
      seoTitle: tr.seoTitle,
      seoDescription: tr.seoDescription,
      brand: product.brand ? { name: product.brand.name, slug: product.brand.slug } : null,
      categoryId: product.categoryId,
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      badges: product.badges.map((b) => ({ code: b.code, label: pickTranslation(b.translations, locale)?.label ?? b.code, bgColor: b.bgColor, textColor: b.textColor })),
    },
    variants,
    optionGroups: [...groups.values()],
    images,
    specs,
    path,
    reviews: reviews.map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, text: r.text, createdAt: r.createdAt, locale: r.locale })),
    distribution: Object.fromEntries(distribution.map((d) => [d.rating, d._count._all])) as Record<number, number>,
    related,
    slugs,
  };
}
