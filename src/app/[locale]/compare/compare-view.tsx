"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Scale, X } from "lucide-react";
import { compareStore, useStoreValue } from "@/components/store/client-store";
import { Price } from "@/components/store/price";
import { QuickAddButton } from "@/components/store/product-actions";
import { Stars } from "@/components/store/rating";
import { ShopImage } from "@/components/store/shop-image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatRating } from "@/lib/format";
import { getCompareData, type CompareGroup } from "@/server/store-actions";

export function CompareView({ currency }: { currency: string }) {
  const t = useTranslations("catalog.compare");
  const locale = useLocale();
  const ids = useStoreValue(compareStore);
  const [groups, setGroups] = useState<CompareGroup[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [diffOnly, setDiffOnly] = useState(false);
  const key = ids.join(",");
  useEffect(() => {
    let cancelled = false;
    getCompareData(key ? key.split(",") : []).then((g) => !cancelled && setGroups(g));
    return () => {
      cancelled = true;
    };
  }, [key, currency]);

  if (groups === null) return <p className="mt-8 text-ink-soft" aria-busy="true">{t("loading")}</p>;
  const visible = groups.map((g) => ({ ...g, products: g.products.filter((p) => ids.includes(p.id)) })).filter((g) => g.products.length);
  if (!visible.length)
    return (
      <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
        <Scale className="size-10 text-ink-faint" aria-hidden="true" />
        <p className="mt-3 font-display text-2xl">{t("emptyTitle")}</p>
        <p className="mt-1 max-w-md text-sm text-ink-soft">{t("emptyText")}</p>
        <Link href="/" className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand">{t("browse")}</Link>
      </div>
    );
  const group = visible.find((g) => g.categoryId === active) ?? visible[0];
  const rows = group.specLabels.filter((s) => !diffOnly || new Set(group.products.map((p) => p.specs[s.key] ?? "")).size > 1);

  return (
    <div className="mt-4">
      <p className="text-sm text-ink-soft">{t("hint")}</p>
      {visible.length > 1 && (
        <div role="tablist" aria-label={t("categories")} className="scrollbar-none mt-4 flex gap-2 overflow-x-auto">
          {visible.map((g) => (
            <button key={g.categoryId} role="tab" type="button" aria-selected={g.categoryId === group.categoryId} onClick={() => setActive(g.categoryId)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", g.categoryId === group.categoryId ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink")}>
              {g.categoryName} ({g.products.length})
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} className="size-4 accent-brand" />
          {t("diffOnly")}
        </label>
        <button type="button" onClick={() => compareStore.set((l) => l.filter((id) => !group.products.some((p) => p.id === id)))} className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          {t("clearGroup")}
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl bg-surface shadow-card">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">{t("caption", { category: group.categoryName })}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-44 bg-surface p-4 text-left align-bottom text-xs font-semibold text-ink-faint uppercase">{t("parameter")}</th>
              {group.products.map((p) => (
                <th key={p.id} scope="col" className="w-60 p-4 text-left align-top font-normal">
                  <div className="relative">
                    <button type="button" onClick={() => compareStore.set((l) => l.filter((x) => x !== p.id))} aria-label={t("remove", { name: p.name })} className="absolute -top-1 -right-1 z-10 grid size-8 place-items-center rounded-full bg-surface text-ink-soft shadow-card hover:text-ink">
                      <X className="size-4" aria-hidden="true" />
                    </button>
                    <Link href={`/product/${p.slug}`} className="relative block aspect-square w-full overflow-hidden rounded-lg bg-canvas">
                      {p.imageUrl && <ShopImage src={p.imageUrl} alt={p.imageAlt} fill sizes="240px" className="object-contain" />}
                    </Link>
                    <Link href={`/product/${p.slug}`} className="mt-3 line-clamp-2 block font-medium hover:underline">{p.name}</Link>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <Price price={p.price} oldPrice={p.oldPrice} currency={p.currency} locale={locale} size="sm" />
                      <QuickAddButton variantId={p.defaultVariantId} name={p.name} />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line/60">
              <th scope="row" className="sticky left-0 bg-surface p-4 text-left font-normal text-ink-soft">{t("brand")}</th>
              {group.products.map((p) => <td key={p.id} className="p-4">{p.brand ?? "—"}</td>)}
            </tr>
            <tr className="border-t border-line/60">
              <th scope="row" className="sticky left-0 bg-surface p-4 text-left font-normal text-ink-soft">{t("rating")}</th>
              {group.products.map((p) => (
                <td key={p.id} className="p-4">
                  {p.ratingCount ? <Stars rating={p.ratingAvg} label={t("ratingLabel", { rating: formatRating(p.ratingAvg, locale) })} /> : "—"}
                </td>
              ))}
            </tr>
            {rows.map((s) => (
              <tr key={s.key} className="border-t border-line/60">
                <th scope="row" className="sticky left-0 bg-surface p-4 text-left font-normal text-ink-soft">{s.label}</th>
                {group.products.map((p) => <td key={p.id} className="p-4">{p.specs[s.key] ?? "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
