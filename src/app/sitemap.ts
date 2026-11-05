import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/site";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/routing";
import { getCategoryTree, visibleProductWhere } from "@/server/catalog";

export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

function entry(paths: Record<string, string>, lastModified: Date, priority: number): Entry[] {
  const base = siteUrl();
  const languages = Object.fromEntries(Object.entries(paths).map(([l, p]) => [l, `${base}/${l}${p}`]));
  return Object.entries(paths).map(([, p], i) => ({
    url: `${base}/${Object.keys(paths)[i]}${p}`,
    lastModified,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    getCategoryTree(DEFAULT_LOCALE).then(({ byId }) =>
      prisma.category.findMany({ where: { id: { in: [...byId.keys()] } }, include: { translations: { select: { locale: true, slug: true } } } }),
    ),
    prisma.product.findMany({ where: await visibleProductWhere(DEFAULT_LOCALE), select: { updatedAt: true, translations: { select: { locale: true, slug: true } } } }),
  ]);
  const home = entry(Object.fromEntries(LOCALES.map((l) => [l, ""])), new Date(), 1);
  const cats = categories.flatMap((c) => entry(Object.fromEntries(c.translations.map((t) => [t.locale, `/category/${t.slug}`])), c.updatedAt, 0.8));
  const prods = products.flatMap((p) => entry(Object.fromEntries(p.translations.map((t) => [t.locale, `/product/${t.slug}`])), p.updatedAt, 0.6));
  return [...home, ...cats, ...prods];
}
