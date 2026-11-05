"use client";

import { useLocale, useTranslations } from "next-intl";
import { Heart, Scale, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/cn";
import { addLine } from "@/lib/cart";
import { cartStore, compareStore, favoritesStore, toggleId, useStoreValue } from "./client-store";
import { showToast } from "./toast";

export function FavoriteButton({ productId, className, withLabel = false }: { productId: string; className?: string; withLabel?: boolean }) {
  const t = useTranslations("catalog.card");
  const favorites = useStoreValue(favoritesStore);
  const active = favorites.includes(productId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? t("removeFavorite") : t("addFavorite")}
      title={active ? t("removeFavorite") : t("addFavorite")}
      onClick={() => favoritesStore.set((list) => toggleId(list, productId))}
      className={cn("inline-flex items-center justify-center gap-2 rounded-full transition-colors", active ? "text-sale" : "text-ink-soft hover:text-ink", className)}
    >
      <Heart className={cn("size-5", active && "fill-current")} aria-hidden="true" />
      {withLabel && <span className="text-sm font-medium">{active ? t("inFavorites") : t("favorite")}</span>}
    </button>
  );
}

export function CompareButton({ productId, className, withLabel = false }: { productId: string; className?: string; withLabel?: boolean }) {
  const t = useTranslations("catalog.card");
  const locale = useLocale();
  const list = useStoreValue(compareStore);
  const active = list.includes(productId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? t("removeCompare") : t("addCompare")}
      title={active ? t("removeCompare") : t("addCompare")}
      onClick={() => {
        compareStore.set((l) => toggleId(l, productId));
        if (!active) showToast(t("addedCompare"), { href: `/${locale}/compare`, label: t("openCompare") });
      }}
      className={cn("inline-flex items-center justify-center gap-2 rounded-full transition-colors", active ? "text-brand" : "text-ink-soft hover:text-ink", className)}
    >
      <Scale className="size-5" aria-hidden="true" />
      {withLabel && <span className="text-sm font-medium">{active ? t("inCompare") : t("compare")}</span>}
    </button>
  );
}

/** Adds a variant to the cart (localStorage) and shows a toast. */
export function useAddToCart() {
  const t = useTranslations("catalog.card");
  const locale = useLocale();
  return (variantId: string, qty = 1) => {
    cartStore.set((lines) => addLine(lines, variantId, qty));
    showToast(t("addedToCart"), { href: `/${locale}/cart`, label: t("openCart") });
  };
}

export function QuickAddButton({ variantId, name }: { variantId: string | null; name: string }) {
  const t = useTranslations("catalog.card");
  const add = useAddToCart();
  return (
    <button
      type="button"
      disabled={!variantId}
      onClick={() => variantId && add(variantId)}
      aria-label={variantId ? t("addToCartNamed", { name }) : t("soldOut")}
      title={variantId ? t("addToCart") : t("soldOut")}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white transition-colors hover:bg-brand disabled:bg-muted-strong disabled:text-ink-faint"
    >
      <ShoppingCart className="size-5" aria-hidden="true" />
    </button>
  );
}
