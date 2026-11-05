import "server-only";
import { prisma } from "@/lib/db";
import { ancestorIds } from "@/lib/catalog/category-tree";
import { pickTranslation } from "@/lib/i18n-content";
import { getSettings } from "@/server/settings";
import { getBadgeOptions, getBrandOptions, getCategoryOptions } from "./queries";

/** Everything the product editor needs besides the product itself. */
export async function getProductEditorData(locale: string) {
  const [categories, brands, badges, specs, cats, settings] = await Promise.all([
    getCategoryOptions(locale),
    getBrandOptions(),
    getBadgeOptions(locale),
    prisma.specDefinition.findMany({ orderBy: { sortOrder: "asc" }, include: { translations: true } }),
    prisma.category.findMany({ select: { id: true, parentId: true, sortOrder: true } }),
    getSettings(),
  ]);
  return {
    categories,
    brands,
    badges,
    specDefinitions: specs.map((s) => {
      const tr = pickTranslation(s.translations, locale);
      return { id: s.id, categoryId: s.categoryId, key: s.key, type: s.type, label: tr?.label ?? s.key, unit: tr?.unit ?? "" };
    }),
    categoryAncestors: Object.fromEntries(cats.map((c) => [c.id, ancestorIds(cats, c.id)])),
    rate: { usdRate: settings.usdRate, usdRounding: settings.usdRounding },
  };
}
