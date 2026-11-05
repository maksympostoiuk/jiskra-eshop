/**
 * Catalogue filter state ⇄ URL query string. Pure functions (shared by server queries and client UI).
 *
 * Query parameters:
 *   sort=popular|price_asc|price_desc|newest|rating   view=grid|list   page=N
 *   pmin / pmax   price range in major units of the current currency
 *   brand=slug1,slug2   stock=1   rating=4
 *   f_<specKey>=v1,v2   spec facets (NUMBER: numbers, TEXT: localized texts, BOOLEAN: "1")
 */

export const SORTS = ["popular", "price_asc", "price_desc", "newest", "rating"] as const;
export type SortKey = (typeof SORTS)[number];
export const VIEWS = ["grid", "list"] as const;
export type ViewMode = (typeof VIEWS)[number];
export const PAGE_SIZE = 12;
export const MAX_PAGE = 500;

export type SpecFilterDef = { key: string; type: "NUMBER" | "TEXT" | "BOOLEAN" };

export type CatalogFilters = {
  sort: SortKey;
  view: ViewMode;
  page: number;
  /** minor units */
  priceMin: number | null;
  priceMax: number | null;
  brands: string[];
  inStock: boolean;
  minRating: number | null;
  /** key → selected values (numbers as strings, texts, or ["1"] for booleans) */
  specs: Record<string, string[]>;
};

export type QueryInput = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: QueryInput, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | undefined, max = 30): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((v) => v.trim()).filter(Boolean))].slice(0, max).map((v) => v.slice(0, 80));
}

function majorToMinor(value: string | undefined): number | null {
  if (!value || !/^\d{1,9}$/.test(value.trim())) return null;
  return Number(value.trim()) * 100;
}

export function parseFilters(params: QueryInput, specDefs: SpecFilterDef[] = []): CatalogFilters {
  const sort = get(params, "sort");
  const view = get(params, "view");
  const page = Number(get(params, "page"));
  const rating = Number(get(params, "rating"));
  let priceMin = majorToMinor(get(params, "pmin"));
  let priceMax = majorToMinor(get(params, "pmax"));
  if (priceMin !== null && priceMax !== null && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin];

  const specs: Record<string, string[]> = {};
  for (const def of specDefs) {
    let values = list(get(params, `f_${def.key}`));
    if (def.type === "NUMBER") values = values.filter((v) => /^-?\d+(\.\d+)?$/.test(v));
    if (def.type === "BOOLEAN") values = values.includes("1") ? ["1"] : [];
    if (values.length) specs[def.key] = values;
  }

  return {
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as SortKey) : "popular",
    view: view === "list" ? "list" : "grid",
    page: Number.isInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
    priceMin,
    priceMax,
    brands: list(get(params, "brand")).filter((b) => /^[a-z0-9-]+$/.test(b)),
    inStock: get(params, "stock") === "1",
    minRating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    specs,
  };
}

/** Serialize filters back to a query string (defaults omitted, stable order). */
export function serializeFilters(filters: Partial<CatalogFilters>): string {
  const q = new URLSearchParams();
  if (filters.sort && filters.sort !== "popular") q.set("sort", filters.sort);
  if (filters.view === "list") q.set("view", "list");
  if (filters.priceMin != null) q.set("pmin", String(Math.floor(filters.priceMin / 100)));
  if (filters.priceMax != null) q.set("pmax", String(Math.ceil(filters.priceMax / 100)));
  if (filters.brands?.length) q.set("brand", [...filters.brands].sort().join(","));
  if (filters.inStock) q.set("stock", "1");
  if (filters.minRating) q.set("rating", String(filters.minRating));
  for (const key of Object.keys(filters.specs ?? {}).sort()) {
    const values = filters.specs![key];
    if (values.length) q.set(`f_${key}`, [...values].sort().join(","));
  }
  if (filters.page && filters.page > 1) q.set("page", String(filters.page));
  return q.toString();
}

/** Number of active (narrowing) filters, for "clear all" UI. */
export function countActiveFilters(f: CatalogFilters): number {
  return (
    (f.priceMin !== null || f.priceMax !== null ? 1 : 0) +
    f.brands.length +
    (f.inStock ? 1 : 0) +
    (f.minRating ? 1 : 0) +
    Object.values(f.specs).reduce((n, v) => n + v.length, 0)
  );
}

/** Toggle one value of a multi-value filter, resetting pagination. */
export function toggleValue(filters: CatalogFilters, kind: "brand" | `spec:${string}`, value: string): CatalogFilters {
  const flip = (values: string[]) => (values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  if (kind === "brand") return { ...filters, page: 1, brands: flip(filters.brands) };
  const key = kind.slice(5);
  const next = flip(filters.specs[key] ?? []);
  const specs = { ...filters.specs };
  if (next.length) specs[key] = next;
  else delete specs[key];
  return { ...filters, page: 1, specs };
}

/** Round up to a "nice" number (1, 2, 2.5, 5 × 10^n) in major units. */
export function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  for (const m of [1, 2, 2.5, 5, 10]) if (value <= m * base) return m * base;
  return 10 * base;
}

/**
 * Up to 4 price presets (DNS-style) for a min–max range in minor units.
 * Returns [min, max] pairs in minor units; null = open-ended.
 */
export function pricePresets(min: number, max: number): Array<[number | null, number | null]> {
  if (max <= min || max - min < 200) return [];
  const span = (max - min) / 100;
  const cuts = [...new Set([0.25, 0.5, 0.75].map((q) => niceCeil(min / 100 + span * q) * 100))].filter((c) => c > min && c < max);
  if (!cuts.length) return [];
  const presets: Array<[number | null, number | null]> = [[null, cuts[0]]];
  for (let i = 1; i < cuts.length; i++) presets.push([cuts[i - 1], cuts[i]]);
  presets.push([cuts[cuts.length - 1], null]);
  return presets;
}
