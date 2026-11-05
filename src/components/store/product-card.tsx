"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { ProductCardData } from "@/server/catalog";
import { Price } from "./price";
import { CompareButton, FavoriteButton, QuickAddButton } from "./product-actions";
import { Stars } from "./rating";
import { ShopImage } from "./shop-image";

export function Badges({ badges, className }: { badges: ProductCardData["badges"]; className?: string }) {
  if (!badges.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1", className)}>
      {badges.map((b) => (
        <li key={b.code} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: b.bgColor, color: b.textColor }}>
          {b.label}
        </li>
      ))}
    </ul>
  );
}

function Availability({ inStock }: { inStock: boolean }) {
  const t = useTranslations("catalog.card");
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", inStock ? "text-success" : "text-ink-faint")}>
      <span className={cn("size-1.5 rounded-full", inStock ? "bg-success" : "bg-ink-faint")} aria-hidden="true" />
      {inStock ? t("inStock") : t("soldOut")}
    </span>
  );
}

/** Product card (grid) or row (list) — ALLO-style badges, colour dots, old/new price and quick add. */
export function ProductCard({ product, view = "grid", priority = false }: { product: ProductCardData; view?: "grid" | "list"; priority?: boolean }) {
  const t = useTranslations("catalog.card");
  const locale = useLocale();
  const ratingLabel = t("ratingLabel", { rating: product.ratingAvg.toFixed(1), count: product.ratingCount });
  const link = `/product/${product.slug}`;

  const image = (
    <Link href={link} className="relative block aspect-square overflow-hidden rounded-lg bg-canvas" tabIndex={-1} aria-hidden="true">
      {product.imageUrl && (
        <ShopImage
          src={product.imageUrl}
          alt=""
          fill
          priority={priority}
          sizes={view === "list" ? "200px" : "(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"}
          className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
        />
      )}
    </Link>
  );

  const colorDots =
    product.colors.length > 1 ? (
      <ul className="flex items-center gap-1.5" aria-label={t("colors", { count: product.colors.length })}>
        {product.colors.slice(0, 5).map((c) => (
          <li key={c.hex} title={c.label} className="size-3.5 rounded-full border border-ink/15" style={{ background: c.hex }}>
            <span className="sr-only">{c.label}</span>
          </li>
        ))}
      </ul>
    ) : null;

  const rating =
    product.ratingCount > 0 ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
        <Stars rating={product.ratingAvg} label={ratingLabel} />
        <span aria-hidden="true">
          {product.ratingAvg.toFixed(1)} ({product.ratingCount})
        </span>
      </span>
    ) : (
      <span className="text-xs text-ink-faint">{t("noReviews")}</span>
    );

  const title = (
    <h3 className={cn("font-sans font-medium text-ink", view === "list" ? "text-lg" : "line-clamp-2 text-[0.95rem] leading-snug")}>
      <Link href={link} className="after:absolute after:inset-0 hover:underline focus-visible:outline-none">
        {product.name}
      </Link>
    </h3>
  );

  if (view === "list") {
    return (
      <article className="group relative grid grid-cols-[7rem_1fr] gap-4 rounded-xl border border-line/70 bg-surface p-4 shadow-card sm:grid-cols-[11rem_1fr_13rem]">
        <div className="relative">
          {image}
          <Badges badges={product.badges} className="absolute top-1 left-1" />
        </div>
        <div className="min-w-0">
          {title}
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {rating}
            {colorDots}
          </div>
          {product.keySpecs.length > 0 && (
            <dl className="mt-3 grid gap-0.5 text-sm">
              {product.keySpecs.map((s) => (
                <div key={s.label} className="flex gap-1.5">
                  <dt className="text-ink-faint">{s.label}:</dt>
                  <dd className="text-ink-soft">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="relative z-10 mt-3 flex gap-1">
            <CompareButton productId={product.id} className="h-9 px-2" withLabel />
          </div>
        </div>
        <div className="relative z-10 col-span-2 flex items-center justify-between gap-3 border-t border-line/70 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start sm:border-t-0 sm:pt-0">
          <Price price={product.price} oldPrice={product.oldPrice} currency={product.currency} locale={locale} className="sm:justify-end sm:text-right" discountLabel={t("oldPrice")} />
          <Availability inStock={product.inStock} />
          <div className="flex items-center gap-2">
            <FavoriteButton productId={product.id} className="size-11 border border-line hover:border-ink" />
            <QuickAddButton variantId={product.defaultVariantId} name={product.name} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-line/70 bg-surface p-3 shadow-card transition-shadow hover:shadow-pop sm:p-4">
      <div className="relative">
        {image}
        <Badges badges={product.badges} className="absolute top-1.5 right-11 left-1.5" />
        <div className="absolute top-1 right-1 z-10 flex flex-col gap-1">
          <FavoriteButton productId={product.id} className="size-9 bg-surface/90 shadow-card" />
          <CompareButton productId={product.id} className="size-9 bg-surface/90 shadow-card" />
        </div>
      </div>
      <div className="mt-3 flex min-h-5 items-center justify-between gap-2">{colorDots}</div>
      <div className="mt-1 flex flex-1 flex-col gap-1.5">
        {product.brand && <p className="text-xs tracking-wide text-ink-faint uppercase">{product.brand}</p>}
        {title}
        {rating}
      </div>
      <div className="relative z-10 mt-3 flex items-end justify-between gap-2">
        <div>
          <Price price={product.price} oldPrice={product.oldPrice} currency={product.currency} locale={locale} size="md" discountLabel={t("oldPrice")} />
          <Availability inStock={product.inStock} />
        </div>
        <QuickAddButton variantId={product.defaultVariantId} name={product.name} />
      </div>
    </article>
  );
}
