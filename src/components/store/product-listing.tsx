import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { parseFilters, serializeFilters, type QueryInput } from "@/lib/catalog/filters";
import { buildListingWhere, getFacets, listProducts, visibleProductWhere, type SpecDef } from "@/server/catalog";
import { getCurrency } from "@/server/currency";
import { FilterPanel, ListingToolbar } from "./filter-panel";
import { ProductCard } from "./product-card";

/** Filter sidebar + toolbar + grid/list + pagination for a product scope (category or search). */
export async function ProductListing({
  scope: requestedScope,
  specDefs,
  searchParams,
  basePath,
  locale,
  extra = {},
}: {
  scope: Prisma.ProductWhereInput;
  specDefs: SpecDef[];
  searchParams: QueryInput;
  basePath: string;
  locale: string;
  extra?: Record<string, string>;
}) {
  const t = await getTranslations("catalog");
  const tc = await getTranslations("common");
  const yesNo = { yes: tc("yes"), no: tc("no") };
  const currency = await getCurrency();
  const filters = parseFilters(searchParams, specDefs);
  const scope: Prisma.ProductWhereInput = { AND: [requestedScope, await visibleProductWhere(locale)] };
  const where = buildListingWhere(scope, filters, specDefs, currency);
  const [facets, result] = await Promise.all([getFacets(scope, specDefs, filters, currency, locale, yesNo), listProducts(where, filters, { locale, currency, yesNo })]);

  const pageHref = (page: number) => {
    const q = new URLSearchParams(serializeFilters({ ...filters, page }));
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_1fr]">
      <aside aria-label={t("filters.title")}>
        <FilterPanel facets={facets} filters={filters} currency={currency} extra={extra} />
      </aside>
      <div className="min-w-0">
        <div className="rounded-xl border border-line/70 bg-surface px-4 py-3 shadow-card">
          <ListingToolbar filters={filters} total={result.total} extra={extra} />
        </div>
        {result.items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
            <SearchX className="size-10 text-ink-faint" aria-hidden="true" />
            <p className="mt-3 font-display text-2xl">{t("empty.title")}</p>
            <p className="mt-1 text-sm text-ink-soft">{t("empty.text")}</p>
          </div>
        ) : (
          <ul className={cn("mt-4 grid gap-3 sm:gap-4", filters.view === "grid" ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1")}>
            {result.items.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} view={filters.view} priority={i < 3} />
              </li>
            ))}
          </ul>
        )}
        {result.pageCount > 1 && (
          <nav aria-label={t("pagination.label")} className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
            {result.page > 1 && (
              <Link href={pageHref(result.page - 1)} rel="prev" className="inline-flex h-10 items-center gap-1 rounded-full border border-line-strong bg-surface px-4 text-sm hover:border-ink">
                <ChevronLeft className="size-4" aria-hidden="true" />
                {t("pagination.prev")}
              </Link>
            )}
            {Array.from({ length: result.pageCount }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === result.pageCount || Math.abs(p - result.page) <= 1)
              .map((p, i, arr) => (
                <span key={p} className="inline-flex items-center gap-1.5">
                  {i > 0 && p - arr[i - 1] > 1 && <span aria-hidden="true">…</span>}
                  <Link
                    href={pageHref(p)}
                    aria-current={p === result.page ? "page" : undefined}
                    aria-label={t("pagination.page", { page: p })}
                    className={cn("grid size-10 place-items-center rounded-full text-sm font-medium", p === result.page ? "bg-ink text-white" : "border border-line-strong bg-surface hover:border-ink")}
                  >
                    {p}
                  </Link>
                </span>
              ))}
            {result.page < result.pageCount && (
              <Link href={pageHref(result.page + 1)} rel="next" className="inline-flex h-10 items-center gap-1 rounded-full border border-line-strong bg-surface px-4 text-sm hover:border-ink">
                {t("pagination.next")}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
