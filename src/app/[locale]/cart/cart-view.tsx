"use client";

import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { cartStore } from "@/components/store/client-store";
import { ShopImage } from "@/components/store/shop-image";
import { useCartQuote } from "@/components/store/use-cart-quote";
import { Link } from "@/i18n/navigation";
import { computeTotals, findStockIssues, remainingForFreeShipping, removeLine, setLineQty } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

export function CartView({ currency: pageCurrency, freeShipping }: {
  currency: string; freeShipping: { CZK: { price: number; freeFrom: number | null } | null; USD: { price: number; freeFrom: number | null } | null } }) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const { quoted, currency, loading } = useCartQuote(pageCurrency);

  if (loading) return <p className="mt-8 text-ink-soft" aria-busy="true">{t("loading")}</p>;
  if (!quoted.length || !currency)
    return (
      <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
        <ShoppingBag className="size-10 text-ink-faint" aria-hidden="true" />
        <p className="mt-3 font-display text-2xl">{t("emptyTitle")}</p>
        <p className="mt-1 text-sm text-ink-soft">{t("emptyText")}</p>
        <Link href="/" className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand">{t("continue")}</Link>
      </div>
    );

  const money = (n: number) => formatMoney(n, currency, locale);
  const valid = quoted.filter((l) => l.available);
  const issues = findStockIssues(valid.map((l) => ({ variantId: l.variantId, qty: l.qty, unitPrice: l.unitPrice, stock: l.stock })));
  const unavailable = quoted.filter((l) => !l.available);
  const totals = computeTotals(valid.map((l) => ({ unitPrice: l.unitPrice, qty: l.qty })));
  const rule = freeShipping[currency];
  const remaining = remainingForFreeShipping(totals.itemsTotal, rule);
  const blocked = issues.length > 0 || unavailable.length > 0;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="cart-items">
        <h2 id="cart-items" className="sr-only">{t("items")}</h2>
        {(issues.length > 0 || unavailable.length > 0) && (
          <div role="alert" className="mb-4 flex gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{t("stockWarning")}</p>
          </div>
        )}
        <ul className="flex flex-col gap-3">
          {quoted.map((l) => {
            const issue = issues.find((i) => i.variantId === l.variantId);
            const max = Math.max(1, Math.min(l.stock, 99));
            return (
              <li key={l.variantId} className="grid grid-cols-[5rem_1fr] gap-4 rounded-xl border border-line/70 bg-surface p-4 shadow-card sm:grid-cols-[6rem_1fr_auto]">
                <div className="relative size-20 overflow-hidden rounded-lg bg-canvas sm:size-24">
                  {l.imageUrl && <ShopImage src={l.imageUrl} alt={l.imageAlt} fill sizes="96px" className="object-contain" />}
                </div>
                <div className="min-w-0">
                  {l.available ? (
                    <Link href={`/product/${l.slug}`} className="font-medium hover:underline">{l.name}</Link>
                  ) : (
                    <p className="font-medium text-ink-faint">{l.name || t("unavailableItem")}</p>
                  )}
                  {l.variantLabel && <p className="text-sm text-ink-soft">{l.variantLabel}</p>}
                  <p className="text-xs text-ink-faint">{t("unitPrice", { price: money(l.unitPrice) })}</p>
                  {!l.available && <p className="mt-1 text-sm font-medium text-danger">{t("unavailable")}</p>}
                  {issue && <p className="mt-1 text-sm font-medium text-warning">{issue.available > 0 ? t("onlyLeft", { count: issue.available }) : t("soldOut")}</p>}
                </div>
                <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                  <div className="flex h-10 items-center rounded-full border border-line-strong" role="group" aria-label={t("quantityFor", { name: l.name })}>
                    <button type="button" aria-label={t("decrease")} disabled={l.qty <= 1} onClick={() => cartStore.set((ls) => setLineQty(ls, l.variantId, l.qty - 1))} className="grid size-10 place-items-center rounded-full disabled:opacity-30">
                      <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <output className="w-8 text-center text-sm font-semibold">{l.qty}</output>
                    <button type="button" aria-label={t("increase")} disabled={!l.available || l.qty >= max} onClick={() => cartStore.set((ls) => setLineQty(ls, l.variantId, l.qty + 1))} className="grid size-10 place-items-center rounded-full disabled:opacity-30">
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="font-semibold">{money(l.unitPrice * l.qty)}</p>
                  <div className="flex gap-1">
                    {issue && issue.available > 0 && (
                      <button type="button" onClick={() => cartStore.set((ls) => setLineQty(ls, l.variantId, issue.available))} className="rounded-full px-3 py-1 text-xs font-medium text-brand hover:bg-brand-soft">
                        {t("setToAvailable", { count: issue.available })}
                      </button>
                    )}
                    <button type="button" onClick={() => cartStore.set((ls) => removeLine(ls, l.variantId))} aria-label={t("remove", { name: l.name })} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-ink-soft hover:bg-muted hover:text-ink">
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      {t("removeShort")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <aside aria-labelledby="cart-summary" className="lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-2xl border border-line/70 bg-surface p-6 shadow-card">
          <h2 id="cart-summary" className="text-2xl">{t("summary")}</h2>
          {rule && rule.freeFrom !== null && rule.price > 0 && (
            <div className="mt-4 rounded-xl bg-canvas p-3 text-sm">
              <p className="flex items-center gap-2">
                <Truck className="size-4 text-brand" aria-hidden="true" />
                {remaining > 0 ? t("freeShippingRemaining", { amount: money(remaining) }) : t("freeShippingReached")}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted-strong">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (totals.itemsTotal / rule.freeFrom) * 100)}%` }} />
              </div>
            </div>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-soft">{t("itemsCount", { count: totals.itemCount })}</dt>
            <dd className="text-right">{money(totals.itemsTotal)}</dd>
            <dt className="text-ink-soft">{t("shipping")}</dt>
            <dd className="text-right text-ink-soft">{t("shippingAtCheckout")}</dd>
            <dt className="border-t border-line pt-3 font-semibold">{t("total")}</dt>
            <dd className="border-t border-line pt-3 text-right font-display text-2xl font-semibold">{money(totals.itemsTotal)}</dd>
          </dl>
          {blocked ? (
            <p className="mt-5 rounded-full bg-muted px-4 py-3 text-center text-sm text-ink-soft">{t("fixToContinue")}</p>
          ) : (
            <Link href="/checkout" className="mt-5 flex h-12 items-center justify-center rounded-full bg-ink font-semibold text-white hover:bg-brand">
              {t("checkout")}
            </Link>
          )}
          <Link href="/" className="mt-3 block text-center text-sm text-ink-soft hover:text-ink hover:underline">{t("continue")}</Link>
        </div>
      </aside>
    </div>
  );
}
