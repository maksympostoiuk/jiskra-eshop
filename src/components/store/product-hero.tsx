"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Store, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { defaultVariant, optionState, selectOption } from "@/lib/catalog/variants";
import { formatMoney, type Currency } from "@/lib/money";
import type { OptionGroupView, ProductImageView, ProductVariantView } from "@/server/product-page";
import { Price } from "./price";
import { CompareButton, FavoriteButton, useAddToCart } from "./product-actions";
import { Badges } from "./product-card";
import { Stars } from "./rating";
import { ShopImage } from "./shop-image";

// The currently selected variant is shared with the sticky sub-navigation.
let selected: ProductVariantView | null = null;
const listeners = new Set<() => void>();
const selectedStore = {
  set(v: ProductVariantView) {
    selected = v;
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => (listeners.add(l), () => listeners.delete(l)),
  get: () => selected,
};
export function useSelectedVariant(fallback: ProductVariantView): ProductVariantView {
  return useSyncExternalStore(selectedStore.subscribe, () => selectedStore.get() ?? fallback, () => fallback);
}

const LOW_STOCK = 5;

export function StockLine({ stock }: { stock: number }) {
  const t = useTranslations("product.buy");
  if (stock <= 0) return <span className="font-medium text-ink-faint">{t("soldOut")}</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", stock <= LOW_STOCK ? "text-warning" : "text-success")}>
      <Check className="size-4" aria-hidden="true" />
      {stock <= LOW_STOCK ? t("lowStock", { count: stock }) : t("inStock")}
    </span>
  );
}

export function ProductHero({
  product,
  variants,
  optionGroups,
  images,
  keySpecs,
  currency,
  shippingNote,
}: {
  product: { id: string; name: string; brand: string | null; ratingAvg: number; ratingCount: number; badges: Array<{ code: string; label: string; bgColor: string; textColor: string }> };
  variants: ProductVariantView[];
  optionGroups: OptionGroupView[];
  images: ProductImageView[];
  keySpecs: Array<{ label: string; value: string }>;
  currency: Currency;
  shippingNote: string | null;
}) {
  const t = useTranslations("product");
  const tOpt = useTranslations("common.optionName");
  const locale = useLocale();
  const add = useAddToCart();
  const [variant, setVariant] = useState(() => defaultVariant(variants)!);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => selectedStore.set(variant), [variant]);

  // Gallery: images for the selected colour plus colour-independent ones; falls back to all images.
  const gallery = useMemo(() => {
    const color = variant.options.color;
    const own = images.filter((im) => im.color === color || im.color === null);
    return own.length ? own : images;
  }, [images, variant.options.color]);
  useEffect(() => setImageIndex(0), [variant.options.color]);
  const current = gallery[Math.min(imageIndex, gallery.length - 1)];

  const choose = (name: string, value: string) => {
    setVariant(selectOption(variants, variant, name, value));
    setQty(1);
  };
  const maxQty = Math.max(1, Math.min(variant.stock, 99));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      {/* Gallery with vertical thumbnails */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row lg:sticky lg:top-40 lg:self-start">
        {gallery.length > 1 && (
          <ul className="scrollbar-none flex gap-2 overflow-x-auto sm:max-h-[34rem] sm:flex-col sm:overflow-y-auto" aria-label={t("gallery.thumbnails")}>
            {gallery.map((im, i) => (
              <li key={`${im.url}-${i}`} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={t("gallery.show", { n: i + 1 })}
                  aria-current={i === imageIndex ? "true" : undefined}
                  className={cn("relative block size-16 overflow-hidden rounded-lg border-2 bg-surface sm:size-20", i === imageIndex ? "border-ink" : "border-transparent hover:border-line-strong")}
                >
                  <ShopImage src={im.url} alt="" fill sizes="80px" className="object-contain" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="relative aspect-square flex-1 overflow-hidden rounded-2xl bg-surface shadow-card">
          {current && <ShopImage src={current.url} alt={current.alt} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-contain" />}
          <Badges badges={product.badges} className="absolute top-4 left-4" />
          <div className="absolute top-3 right-3">
            <FavoriteButton productId={product.id} className="size-11 bg-surface/90 shadow-card" />
          </div>
          {gallery.length > 1 && (
            <>
              <button type="button" onClick={() => setImageIndex((i) => (i - 1 + gallery.length) % gallery.length)} aria-label={t("gallery.prev")} className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-card hover:bg-surface">
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setImageIndex((i) => (i + 1) % gallery.length)} aria-label={t("gallery.next")} className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-card hover:bg-surface">
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Buy box */}
      <div id="buy" className="flex scroll-mt-40 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {product.ratingCount > 0 ? (
            <a href="#reviews" className="inline-flex items-center gap-1.5 hover:underline">
              <Stars rating={product.ratingAvg} label={t("ratingLabel", { rating: product.ratingAvg.toFixed(1) })} />
              <span className="font-semibold">{product.ratingAvg.toFixed(1)}</span>
              <span className="text-ink-soft">{t("reviewsCount", { count: product.ratingCount })}</span>
            </a>
          ) : (
            <a href="#reviews" className="text-ink-soft hover:underline">{t("firstReview")}</a>
          )}
          <span className="text-ink-faint">
            {t("sku")}: <span className="font-mono">{variant.sku}</span>
          </span>
        </div>

        {keySpecs.length > 0 && (
          <dl className="grid gap-1 text-sm">
            {keySpecs.map((s) => (
              <div key={s.label} className="flex gap-2">
                <dt className="text-ink-faint">{s.label}:</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
            <div>
              <a href="#specs" className="text-sm font-medium text-brand hover:underline">{t("allSpecs")}</a>
            </div>
          </dl>
        )}

        {optionGroups.map((group) => {
          const selectedValue = group.values.find((v) => v.value === variant.options[group.name]);
          return (
            <fieldset key={group.name}>
              <legend className="mb-2 text-sm">
                <span className="font-semibold">{tOpt.has(group.name) ? tOpt(group.name) : group.name}:</span> <span className="text-ink-soft">{selectedValue?.label}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {group.values.map((v) => {
                  const state = optionState(variants, variant, group.name, v.value);
                  const isSelected = state === "selected";
                  const hint = state === "soldOut" ? t("buy.optionSoldOut") : state === "otherCombination" ? t("buy.optionOther") : "";
                  if (group.name === "color" && v.hex)
                    return (
                      <button
                        key={v.value}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${v.label}${hint ? ` (${hint})` : ""}`}
                        title={v.label}
                        onClick={() => choose(group.name, v.value)}
                        className={cn("grid size-11 place-items-center rounded-full border-2 transition-colors", isSelected ? "border-ink" : "border-transparent hover:border-line-strong")}
                      >
                        <span className={cn("size-8 rounded-full border border-ink/15", state === "soldOut" && "opacity-50")} style={{ background: v.hex }} />
                      </button>
                    );
                  return (
                    <button
                      key={v.value}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${v.label}${hint ? ` (${hint})` : ""}`}
                      onClick={() => choose(group.name, v.value)}
                      className={cn(
                        "h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                        isSelected ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink",
                        state === "soldOut" && !isSelected && "text-ink-faint line-through decoration-1",
                        state === "otherCombination" && !isSelected && "border-dashed text-ink-soft",
                      )}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="rounded-2xl border border-line/70 bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Price price={variant.price} oldPrice={variant.oldPrice} currency={currency} locale={locale} size="lg" discountLabel={t("buy.oldPrice")} />
            <StockLine stock={variant.stock} />
          </div>
          {variant.oldPrice && variant.oldPrice > variant.price && (
            <p className="mt-1 text-sm font-medium text-sale">{t("buy.youSave", { amount: formatMoney(variant.oldPrice - variant.price, currency, locale) })}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex h-12 items-center rounded-full border border-line-strong" role="group" aria-label={t("buy.quantity")}>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={t("buy.decrease")} className="grid size-11 place-items-center rounded-full disabled:opacity-30">
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <output className="w-8 text-center font-semibold" aria-live="polite">{qty}</output>
              <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label={t("buy.increase")} className="grid size-11 place-items-center rounded-full disabled:opacity-30">
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              disabled={variant.stock <= 0}
              onClick={() => add(variant.id, qty)}
              className="inline-flex h-12 min-w-48 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition-colors hover:bg-brand disabled:bg-muted-strong disabled:text-ink-faint"
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              {variant.stock > 0 ? t("buy.addToCart") : t("buy.soldOut")}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <FavoriteButton productId={product.id} withLabel className="h-10 px-3 hover:bg-muted" />
            <CompareButton productId={product.id} withLabel className="h-10 px-3 hover:bg-muted" />
          </div>
        </div>

        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          {[
            { Icon: Truck, title: t("delivery.courier"), text: shippingNote ?? t("delivery.courierText") },
            { Icon: Store, title: t("delivery.pickup"), text: t("delivery.pickupText") },
            { Icon: RotateCcw, title: t("delivery.returns"), text: t("delivery.returnsText") },
          ].map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-2.5 rounded-xl bg-surface p-3 shadow-card">
              <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-xs text-ink-soft">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="inline-flex items-center gap-2 text-xs text-ink-soft">
          <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
          {t("delivery.warranty")}
        </p>
      </div>
    </div>
  );
}

/** Sticky sub-navigation (Description / Specifications / Reviews) with mini price + buy. */
export function ProductSubnav({ name, sections, fallback, currency }: { name: string; sections: Array<{ id: string; label: string }>; fallback: ProductVariantView; currency: Currency }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const variant = useSelectedVariant(fallback);
  const add = useAddToCart();
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-160px 0px -55% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="sticky top-0 z-30 -mx-4 mt-10 border-y border-line/70 bg-canvas/95 px-4 backdrop-blur md:top-[7.2rem]">
      <div className="flex items-center gap-4">
        <nav aria-label={t("subnav.label")} className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              className={cn("shrink-0 border-b-2 px-3 py-3.5 text-sm font-medium whitespace-nowrap", active === s.id ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink")}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <span className="max-w-56 truncate text-sm text-ink-soft">{name}</span>
          <span className="font-semibold">{formatMoney(variant.price, currency, locale)}</span>
          <button type="button" disabled={variant.stock <= 0} onClick={() => add(variant.id)} className="h-9 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-brand disabled:bg-muted-strong disabled:text-ink-faint">
            {t("buy.buy")}
          </button>
        </div>
      </div>
    </div>
  );
}
