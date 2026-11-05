"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { countActiveFilters, pricePresets, serializeFilters, SORTS, toggleValue, type CatalogFilters } from "@/lib/catalog/filters";
import { formatMoney, type Currency } from "@/lib/money";
import type { Facets } from "@/server/catalog";

/**
 * Navigate to the same page with new filters (keeping extra params such as the search query).
 * Filters are applied optimistically so controls react immediately while the page re-renders.
 */
function useFilters(serverFilters: CatalogFilters, extra: Record<string, string>) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const serverKey = serializeFilters(serverFilters) + JSON.stringify(serverFilters.view);
  const [state, setState] = useState({ key: serverKey, filters: serverFilters });
  // Reset to the server state whenever the URL-derived filters change.
  if (state.key !== serverKey) setState({ key: serverKey, filters: serverFilters });
  const apply = (next: CatalogFilters) => {
    setState({ key: serverKey, filters: next });
    const q = new URLSearchParams(serializeFilters(next));
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
    const s = q.toString();
    start(() => router.push(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };
  return { filters: state.filters, apply, pending };
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-line/70 py-4 last:border-b-0">
      <h3 className="font-sans">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-sm font-semibold">
          {title}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </h3>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function CheckRow({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 rounded accent-brand" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-ink-faint">{count}</span>}
    </label>
  );
}

export function FilterPanel({ facets, filters: serverFilters, currency, extra = {} }: { facets: Facets; filters: CatalogFilters; currency: Currency; extra?: Record<string, string> }) {
  const t = useTranslations("catalog.filters");
  const locale = useLocale();
  const { filters, apply, pending } = useFilters(serverFilters, extra);
  const [drawer, setDrawer] = useState(false);
  const [pmin, setPmin] = useState(filters.priceMin !== null ? String(filters.priceMin / 100) : "");
  const [pmax, setPmax] = useState(filters.priceMax !== null ? String(filters.priceMax / 100) : "");
  useEffect(() => {
    setPmin(filters.priceMin !== null ? String(filters.priceMin / 100) : "");
    setPmax(filters.priceMax !== null ? String(filters.priceMax / 100) : "");
  }, [filters.priceMin, filters.priceMax]);
  const active = countActiveFilters(filters);
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const toMinor = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) * 100 : null);

  const panel = (
    <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      {active > 0 && (
        <button
          type="button"
          onClick={() => apply({ ...filters, page: 1, priceMin: null, priceMax: null, brands: [], inStock: false, minRating: null, specs: {} })}
          className="mb-2 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted-strong"
        >
          <X className="size-4" aria-hidden="true" />
          {t("clearAll", { count: active })}
        </button>
      )}
      <Section title={t("availability")}>
        <CheckRow checked={filters.inStock} onChange={() => apply({ ...filters, page: 1, inStock: !filters.inStock })} label={t("inStock")} count={facets.inStockCount} />
      </Section>
      {facets.price && (
        <Section title={t("price", { currency })}>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              apply({ ...filters, page: 1, priceMin: toMinor(pmin), priceMax: toMinor(pmax) });
            }}
          >
            <label className="sr-only" htmlFor="pmin">{t("priceFrom")}</label>
            <input id="pmin" inputMode="numeric" value={pmin} onChange={(e) => setPmin(e.target.value)} placeholder={String(Math.floor(facets.price.min / 100))} className="h-9 w-full min-w-0 rounded-md border border-line-strong bg-surface px-2 text-sm" />
            <span aria-hidden="true">–</span>
            <label className="sr-only" htmlFor="pmax">{t("priceTo")}</label>
            <input id="pmax" inputMode="numeric" value={pmax} onChange={(e) => setPmax(e.target.value)} placeholder={String(Math.ceil(facets.price.max / 100))} className="h-9 w-full min-w-0 rounded-md border border-line-strong bg-surface px-2 text-sm" />
            <button type="submit" className="h-9 shrink-0 rounded-full bg-ink px-3 text-sm font-medium text-white hover:bg-brand">{t("apply")}</button>
          </form>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {pricePresets(facets.price.min, facets.price.max).map(([min, max]) => {
              const selected = filters.priceMin === min && filters.priceMax === max;
              const label = min === null ? t("upTo", { amount: money(max!) }) : max === null ? t("from", { amount: money(min) }) : `${money(min)} – ${money(max)}`;
              return (
                <li key={`${min}-${max}`}>
                  <button type="button" aria-pressed={selected} onClick={() => apply({ ...filters, page: 1, priceMin: selected ? null : min, priceMax: selected ? null : max })} className={cn("rounded-full border px-2.5 py-1 text-xs", selected ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink")}>
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
      {facets.brands.length > 0 && (
        <Section title={t("brand")}>
          {facets.brands.map((b) => (
            <CheckRow key={b.slug} checked={filters.brands.includes(b.slug)} onChange={() => apply(toggleValue(filters, "brand", b.slug))} label={b.name} count={b.count} />
          ))}
        </Section>
      )}
      <Section title={t("rating")}>
        {[4, 3].map((r) => (
          <CheckRow key={r} checked={filters.minRating === r} onChange={() => apply({ ...filters, page: 1, minRating: filters.minRating === r ? null : r })} label={t("ratingAtLeast", { rating: r })} />
        ))}
      </Section>
      {facets.specs.map((s, i) => (
        <Section key={s.key} title={s.type === "NUMBER" && s.unit ? `${s.label} (${s.unit})` : s.label} defaultOpen={i < 4}>
          {s.values.map((v) => (
            <CheckRow key={v.value} checked={(filters.specs[s.key] ?? []).includes(v.value)} onChange={() => apply(toggleValue(filters, `spec:${s.key}`, v.value))} label={v.label} count={v.count} />
          ))}
        </Section>
      ))}
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setDrawer(true)} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        {t("title")}
        {active > 0 && <span className="grid size-5 place-items-center rounded-full bg-ink text-xs text-white">{active}</span>}
      </button>
      <div className="hidden rounded-xl border border-line/70 bg-surface px-4 shadow-card lg:block">{panel}</div>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("title")}>
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label={t("close")} onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(24rem,90vw)] flex-col bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-xl">{t("title")}</h2>
              <button type="button" onClick={() => setDrawer(false)} aria-label={t("close")} className="grid size-10 place-items-center rounded-full hover:bg-muted" autoFocus>
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4">{panel}</div>
            <div className="border-t border-line p-4">
              <button type="button" onClick={() => setDrawer(false)} className="h-11 w-full rounded-full bg-ink font-semibold text-white">
                {t("showResults")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ListingToolbar({ filters: serverFilters, total, extra = {} }: { filters: CatalogFilters; total: number; extra?: Record<string, string> }) {
  const t = useTranslations("catalog");
  const { filters, apply, pending } = useFilters(serverFilters, extra);
  return (
    <div className={cn("flex flex-wrap items-center gap-3", pending && "opacity-60")}>
      <p className="mr-auto text-sm text-ink-soft" aria-live="polite">{t("results", { count: total })}</p>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-soft">{t("sort.label")}</span>
        <select value={filters.sort} onChange={(e) => apply({ ...filters, page: 1, sort: e.target.value as CatalogFilters["sort"] })} className="h-10 rounded-full border border-line-strong bg-surface px-3 text-sm font-medium">
          {SORTS.map((s) => (
            <option key={s} value={s}>{t(`sort.${s}`)}</option>
          ))}
        </select>
      </label>
      <div role="group" aria-label={t("view.label")} className="flex rounded-full border border-line-strong bg-surface p-0.5">
        {(["grid", "list"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={filters.view === v} aria-label={t(`view.${v}`)} title={t(`view.${v}`)} onClick={() => apply({ ...filters, view: v })} className={cn("grid size-9 place-items-center rounded-full", filters.view === v ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}>
            {v === "grid" ? <LayoutGrid className="size-4" aria-hidden="true" /> : <List className="size-4" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
