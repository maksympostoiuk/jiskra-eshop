"use client";

import { useEffect, useState } from "react";
import { quoteCart, type QuotedLine } from "@/server/checkout";
import { cartStore, useStoreValue } from "./client-store";

/**
 * Cart lines from localStorage, priced on the server in the visitor's currency.
 * `currency` comes from the server page so a currency switch (router.refresh) triggers a re-quote.
 */
export function useCartQuote(currency: string) {
  const lines = useStoreValue(cartStore);
  const [quote, setQuote] = useState<{ currency: "CZK" | "USD"; lines: QuotedLine[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const key = `${currency}|${lines.map((l) => l.variantId).sort().join(",")}`;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    quoteCart(cartStore.get()).then((q) => {
      if (!cancelled) {
        setQuote(q);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  // Quantities come from the store (instant), prices/stock from the last quote.
  const merged = quote ? lines.map((l) => ({ ...(quote.lines.find((q) => q.variantId === l.variantId) ?? null), qty: l.qty, variantId: l.variantId })).filter((l): l is QuotedLine => "available" in l) : [];
  return { lines, quoted: merged, currency: quote?.currency ?? null, loading: loading && !quote };
}
