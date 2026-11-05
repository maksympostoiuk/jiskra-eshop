import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ancestorIds, buildTree, descendantIds, flattenTree, visibleCategoryIds } from "@/lib/catalog/category-tree";
import { PAGE_SIZE, type CatalogFilters, type SortKey, type SpecFilterDef } from "@/lib/catalog/filters";
import { formatSpecValue } from "@/lib/catalog/spec-format";
import { pickLocalized, pickTranslation } from "@/lib/i18n-content";
import type { Currency } from "@/lib/money";
import { normalizeText } from "@/lib/text";

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategoryNode = {
  id: string;
  parentId: string | null;
  sortOrder: number;
  icon: string;
  name: string;
  slug: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /** published products in this category and its descendants */
  productCount: number;
  children: CategoryNode[];
  depth: number;
};

/** Active category tree for a locale, with product counts (memoized per request). */
export const getCategoryTree = cache(async (locale: string) => {
  const [rows, counts] = await Promise.all([
    prisma.category.findMany({ include: { translations: true } }),
    prisma.product.groupBy({ by: ["categoryId"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
  ]);
  const direct = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  const flatRows = rows.map((c) => {
    const tr = pickTranslation(c.translations, locale);
    return {
      id: c.id,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      icon: c.icon,
      name: tr?.name ?? "",
      slug: tr?.slug ?? c.id,
      description: tr?.description ?? "",
      seoTitle: tr?.seoTitle ?? null,
      seoDescription: tr?.seoDescription ?? null,
      productCount: 0,
    };
  });
  // Only categories that are active along their whole ancestor chain are shown.
  const visibleIds = visibleCategoryIds(rows);
  const visible = flatRows.filter((r) => visibleIds.has(r.id));
  for (const r of visible) r.productCount = descendantIds(visible, r.id).reduce((n, id) => n + (direct.get(id) ?? 0), 0);
  const roots = buildTree(visible) as CategoryNode[];
  const flat = flattenTree(roots) as CategoryNode[];
  return { roots, flat, byId: new Map(flat.map((c) => [c.id, c])) };
});

export async function getCategoryPath(locale: string, categoryId: string): Promise<CategoryNode[]> {
  const { flat, byId } = await getCategoryTree(locale);
  return ancestorIds(flat, categoryId).map((id) => byId.get(id)!).filter(Boolean);
}

/**
 * Find a category by slug in the locale. If the slug belongs to another locale, returns `redirectSlug`
 * with the correct slug for this locale (used after switching language).
 */
export async function findCategoryBySlug(locale: string, slug: string) {
  const { flat } = await getCategoryTree(locale);
  const found = flat.find((c) => c.slug === slug);
  if (found) return { category: found };
  const other = await prisma.categoryTranslation.findFirst({ where: { slug }, select: { categoryId: true } });
  const target = other ? flat.find((c) => c.id === other.categoryId) : undefined;
  return target ? { redirectSlug: target.slug } : {};
}

// ─── Spec definitions ─────────────────────────────────────────────────────────

export type SpecDef = SpecFilterDef & { id: string; label: string; unit: string; isFilterable: boolean; isKey: boolean; categoryId: string; sortOrder: number };

/** Spec definitions that apply to a category (its own + inherited from ancestors), in display order. */
export async function getSpecDefsForCategory(locale: string, categoryId: string): Promise<SpecDef[]> {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true, sortOrder: true } });
  const chain = ancestorIds(all, categoryId);
  const defs = await prisma.specDefinition.findMany({ where: { categoryId: { in: chain } }, include: { translations: true } });
  return defs
    .map((d) => {
      const tr = pickTranslation(d.translations, locale);
      return {
        id: d.id,
        key: d.key,
        type: (d.type === "NUMBER" || d.type === "BOOLEAN" ? d.type : "TEXT") as SpecDef["type"],
        label: tr?.label ?? d.key,
        unit: tr?.unit ?? "",
        isFilterable: d.isFilterable,
        isKey: d.isKey,
        categoryId: d.categoryId,
        sortOrder: d.sortOrder,
      };
    })
    .sort((a, b) => chain.indexOf(a.categoryId) - chain.indexOf(b.categoryId) || a.sortOrder - b.sortOrder);
}

// ─── Product cards ────────────────────────────────────────────────────────────

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  categoryId: string;
  imageUrl: string | null;
  imageAlt: string;
  price: number;
  oldPrice: number | null;
  currency: Currency;
  ratingAvg: number;
  ratingCount: number;
  inStock: boolean;
  defaultVariantId: string | null;
  variantCount: number;
  badges: Array<{ code: string; label: string; bgColor: string; textColor: string }>;
  colors: Array<{ hex: string; label: string }>;
  keySpecs: Array<{ label: string; value: string }>;
  shortDescription: string;
};

export const cardInclude = {
  translations: true,
  brand: { select: { name: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  variants: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
  badges: { orderBy: { sortOrder: "asc" }, include: { translations: true } },
  specValues: { where: { specDefinition: { isKey: true } }, include: { specDefinition: { include: { translations: true } } } },
} satisfies Prisma.ProductInclude;

type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function toCard(p: CardProduct, locale: string, currency: Currency, yesNo: { yes: string; no: string }): ProductCardData {
  const tr = pickTranslation(p.translations, locale);
  const priceOf = (v: CardProduct["variants"][number]) => (currency === "CZK" ? v.priceCzk : v.priceUsd);
  // Default variant: cheapest in stock, otherwise cheapest overall.
  const sorted = [...p.variants].sort((a, b) => priceOf(a) - priceOf(b));
  const def = sorted.find((v) => v.stock > 0) ?? sorted[0];
  const colors = new Map<string, { hex: string; label: string }>();
  for (const v of p.variants) {
    const c = v.options.find((o) => o.name === "color");
    if (c?.colorHex && !colors.has(c.value)) colors.set(c.value, { hex: c.colorHex, label: pickLocalized(c.labelCs, c.labelEn, locale) });
  }
  const keySpecs = p.specValues
    .sort((a, b) => a.specDefinition.sortOrder - b.specDefinition.sortOrder)
    .map((sv) => {
      const t = pickTranslation(sv.specDefinition.translations, locale);
      const value = formatSpecValue(sv, { type: sv.specDefinition.type, unit: t?.unit ?? "" }, locale, yesNo);
      return value ? { label: t?.label ?? sv.specDefinition.key, value } : null;
    })
    .filter((x): x is { label: string; value: string } => x !== null)
    .slice(0, 5);
  return {
    id: p.id,
    slug: tr?.slug ?? p.id,
    name: tr?.name ?? "",
    brand: p.brand?.name ?? null,
    categoryId: p.categoryId,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: (locale === "en" ? p.images[0]?.altEn : p.images[0]?.altCs) || tr?.name || "",
    price: def ? priceOf(def) : 0,
    oldPrice: def ? (currency === "CZK" ? def.oldPriceCzk : def.oldPriceUsd) : null,
    currency,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    inStock: p.inStock,
    defaultVariantId: def && def.stock > 0 ? def.id : null,
    variantCount: p.variants.length,
    badges: p.badges.map((b) => ({ code: b.code, label: pickTranslation(b.translations, locale)?.label ?? b.code, bgColor: b.bgColor, textColor: b.textColor })),
    colors: [...colors.values()],
    keySpecs,
    shortDescription: tr?.shortDescription ?? "",
  };
}

export function orderByFor(sort: SortKey, currency: Currency): Prisma.ProductOrderByWithRelationInput[] {
  const price = currency === "CZK" ? "minPriceCzk" : "minPriceUsd";
  switch (sort) {
    case "price_asc":
      return [{ [price]: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ [price]: "desc" }, { id: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }, { id: "asc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { id: "asc" }];
    default:
      return [{ soldCount: "desc" }, { id: "asc" }];
  }
}

/**
 * Products the storefront may show: published and in a visible category (the category and all its
 * ancestors are active). Deactivating a category therefore hides its products everywhere.
 */
export async function visibleProductWhere(locale: string): Promise<Prisma.ProductWhereInput> {
  const { byId } = await getCategoryTree(locale);
  return { status: "PUBLISHED", categoryId: { in: [...byId.keys()] } };
}

export async function getCards(
  where: Prisma.ProductWhereInput,
  opts: { locale: string; currency: Currency; yesNo: { yes: string; no: string }; orderBy?: Prisma.ProductOrderByWithRelationInput[]; take?: number; skip?: number },
): Promise<ProductCardData[]> {
  const products = await prisma.product.findMany({
    where: { AND: [where, await visibleProductWhere(opts.locale)] },
    include: cardInclude,
    orderBy: opts.orderBy ?? [{ soldCount: "desc" }],
    take: opts.take,
    skip: opts.skip,
  });
  return products.map((p) => toCard(p, opts.locale, opts.currency, opts.yesNo));
}

/** Cards for a list of ids, in the given order (favorites, compare, recently viewed). */
export async function getCardsByIds(ids: string[], opts: { locale: string; currency: Currency; yesNo: { yes: string; no: string } }) {
  const cards = await getCards({ id: { in: ids.slice(0, 60) } }, opts);
  const byId = new Map(cards.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is ProductCardData => Boolean(c));
}

// ─── Listing with filters ─────────────────────────────────────────────────────

/** Prisma `where` for a filtered listing (category scope + all active filters). */
export function buildListingWhere(
  scope: Prisma.ProductWhereInput,
  filters: CatalogFilters,
  specDefs: SpecDef[],
  currency: Currency,
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [scope, { status: "PUBLISHED" }];
  const priceField = currency === "CZK" ? "minPriceCzk" : "minPriceUsd";
  if (filters.priceMin !== null) and.push({ [priceField]: { gte: filters.priceMin } });
  if (filters.priceMax !== null) and.push({ [priceField]: { lte: filters.priceMax } });
  if (filters.brands.length) and.push({ brand: { slug: { in: filters.brands } } });
  if (filters.inStock) and.push({ inStock: true });
  if (filters.minRating) and.push({ ratingAvg: { gte: filters.minRating } });
  for (const [key, values] of Object.entries(filters.specs)) {
    const def = specDefs.find((d) => d.key === key);
    if (!def) continue;
    const valueWhere: Prisma.ProductSpecValueWhereInput =
      def.type === "NUMBER"
        ? { numberValue: { in: values.map(Number) } }
        : def.type === "BOOLEAN"
          ? { boolValue: true }
          : { textKey: { in: values } };
    and.push({ specValues: { some: { specDefinitionId: def.id, ...valueWhere } } });
  }
  return { AND: and };
}

export type Facets = {
  brands: Array<{ slug: string; name: string; count: number }>;
  price: { min: number; max: number } | null;
  inStockCount: number;
  specs: Array<{ key: string; label: string; type: SpecDef["type"]; unit: string; values: Array<{ value: string; label: string; count: number }> }>;
};

/**
 * Facets with "disjunctive" counts: every group is counted with all *other* active filters applied, so
 * counts tell how many products a click would show. The option lists come from the unfiltered scope, so
 * options (and the user's current selections) never disappear; unavailable ones get a count of 0.
 */
export async function getFacets(
  scope: Prisma.ProductWhereInput,
  specDefs: SpecDef[],
  filters: CatalogFilters,
  currency: Currency,
  locale: string,
  yesNo: { yes: string; no: string },
): Promise<Facets> {
  const base: Prisma.ProductWhereInput = { AND: [scope, { status: "PUBLISHED" }] };
  const without = (patch: Partial<CatalogFilters>) => buildListingWhere(scope, { ...filters, ...patch }, specDefs, currency);
  const filterable = specDefs.filter((d) => d.isFilterable);
  const specWhere = (key: string) => {
    const specs = { ...filters.specs };
    delete specs[key];
    return without({ specs });
  };
  const groupSpecs = (defIds: string[], product: Prisma.ProductWhereInput) =>
    defIds.length
      ? prisma.productSpecValue.groupBy({
          by: ["specDefinitionId", "numberValue", "boolValue", "textKey", "textCs", "textEn"],
          where: { specDefinitionId: { in: defIds }, product },
          _count: { _all: true },
        })
      : Promise.resolve([]);

  const [allBrands, brandCounts, priceAgg, inStockCount, allSpecValues, ...specCounts] = await Promise.all([
    prisma.product.groupBy({ by: ["brandId"], where: base }),
    prisma.product.groupBy({ by: ["brandId"], where: without({ brands: [] }), _count: { _all: true } }),
    prisma.product.aggregate({ where: base, _min: { minPriceCzk: true, minPriceUsd: true }, _max: { minPriceCzk: true, minPriceUsd: true } }),
    prisma.product.count({ where: { AND: [without({ inStock: false }), { inStock: true }] } }),
    groupSpecs(filterable.map((d) => d.id), base),
    ...filterable.map((d) => groupSpecs([d.id], specWhere(d.key))),
  ]);

  const brandRows = await prisma.brand.findMany({ where: { id: { in: allBrands.map((b) => b.brandId).filter((x): x is string => !!x) } } });
  const brands = brandRows
    .map((b) => ({ slug: b.slug, name: b.name, count: brandCounts.find((g) => g.brandId === b.id)?._count._all ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const min = currency === "CZK" ? priceAgg._min.minPriceCzk : priceAgg._min.minPriceUsd;
  const max = currency === "CZK" ? priceAgg._max.minPriceCzk : priceAgg._max.minPriceUsd;

  type Group = (typeof allSpecValues)[number];
  const valueOf = (def: SpecDef, g: Group): { value: string; sort: number | string } | null => {
    if (def.type === "NUMBER") return g.numberValue === null ? null : { value: String(g.numberValue), sort: g.numberValue };
    if (def.type === "BOOLEAN") return g.boolValue === true ? { value: "1", sort: 0 } : null;
    return g.textKey ? { value: g.textKey, sort: (locale === "en" ? g.textEn : g.textCs) ?? g.textKey } : null;
  };

  const specs = filterable
    .map((def, i) => {
      const counts = new Map<string, number>();
      for (const g of specCounts[i]) {
        const v = valueOf(def, g);
        if (v) counts.set(v.value, (counts.get(v.value) ?? 0) + g._count._all);
      }
      const options = new Map<string, { value: string; label: string; count: number; sort: number | string }>();
      for (const g of allSpecValues.filter((x) => x.specDefinitionId === def.id)) {
        const v = valueOf(def, g);
        if (!v || options.has(v.value)) continue;
        const label = def.type === "BOOLEAN" ? yesNo.yes : (formatSpecValue(g, def, locale, yesNo) ?? v.value);
        options.set(v.value, { value: v.value, label, sort: v.sort, count: counts.get(v.value) ?? 0 });
      }
      const values = [...options.values()]
        .sort((a, b) => (typeof a.sort === "number" && typeof b.sort === "number" ? a.sort - b.sort : String(a.sort).localeCompare(String(b.sort), locale)))
        .map(({ value, label, count }) => ({ value, label, count }));
      return { key: def.key, label: def.label, type: def.type, unit: def.unit, values };
    })
    .filter((f) => f.values.length > 0);

  return { brands, price: min !== null && max !== null ? { min, max } : null, inStockCount, specs };
}

export async function listProducts(where: Prisma.ProductWhereInput, filters: CatalogFilters, opts: { locale: string; currency: Currency; yesNo: { yes: string; no: string } }) {
  const total = await prisma.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const items = await getCards(where, { ...opts, orderBy: orderByFor(filters.sort, opts.currency), take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE });
  return { total, page, pageCount, items };
}

/** Category scope for listings: the category and all its descendants. */
export async function categoryScope(locale: string, categoryId: string): Promise<Prisma.ProductWhereInput> {
  const { flat } = await getCategoryTree(locale);
  return { categoryId: { in: descendantIds(flat, categoryId) } };
}

/** Text search scope (portable `contains` on normalized text). */
export function searchScope(q: string, locale: string): Prisma.ProductWhereInput {
  const terms = normalizeText(q).split(" ").filter(Boolean).slice(0, 6);
  if (!terms.length) return { id: "__none__" };
  return { AND: terms.map((term) => ({ translations: { some: { locale, searchText: { contains: term } } } })) };
}
