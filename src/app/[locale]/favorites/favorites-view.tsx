"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { favoritesStore, useStoreValue } from "@/components/store/client-store";
import { ProductCard } from "@/components/store/product-card";
import { Link } from "@/i18n/navigation";
import type { ProductCardData } from "@/server/catalog";
import { getCardsForIds } from "@/server/store-actions";

export function FavoritesView() {
  const t = useTranslations("catalog.favorites");
  const ids = useStoreValue(favoritesStore);
  const [cards, setCards] = useState<ProductCardData[] | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    let cancelled = false;
    getCardsForIds(key ? key.split(",") : []).then((c) => !cancelled && setCards(c));
    return () => {
      cancelled = true;
    };
  }, [key]);
  const visible = cards?.filter((c) => ids.includes(c.id)) ?? null;

  if (visible === null) return <p className="mt-8 text-ink-soft" aria-busy="true">{t("loading")}</p>;
  if (!visible.length)
    return (
      <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
        <Heart className="size-10 text-ink-faint" aria-hidden="true" />
        <p className="mt-3 font-display text-2xl">{t("emptyTitle")}</p>
        <p className="mt-1 text-sm text-ink-soft">{t("emptyText")}</p>
        <Link href="/" className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand">{t("browse")}</Link>
      </div>
    );
  return (
    <>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-ink-soft">{t("count", { count: visible.length })}</p>
        <button type="button" onClick={() => favoritesStore.set([])} className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          {t("clear")}
        </button>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {visible.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </>
  );
}
