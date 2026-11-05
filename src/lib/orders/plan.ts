import { computeTotals, findStockIssues, type CartLine, type ShippingRule, type StockIssue } from "@/lib/cart";
import type { Currency } from "@/lib/money";

export type VariantForOrder = {
  id: string;
  productId: string;
  sku: string;
  priceCzk: number;
  priceUsd: number;
  stock: number;
  published: boolean;
  productName: string;
  variantName: string;
  imageUrl: string | null;
};

export type PlannedItem = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  currency: Currency;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderPlan =
  | { ok: true; items: PlannedItem[]; itemsTotal: number; shippingPrice: number; total: number }
  | { ok: false; reason: "EMPTY" | "UNAVAILABLE" | "STOCK"; missing: string[]; stock: StockIssue[] };

/**
 * Turn cart lines into order items with server-side prices (never trusts client prices) and check stock.
 */
export function planOrder(lines: CartLine[], variants: VariantForOrder[], currency: Currency, shipping: ShippingRule): OrderPlan {
  if (!lines.length) return { ok: false, reason: "EMPTY", missing: [], stock: [] };
  const byId = new Map(variants.map((v) => [v.id, v]));
  const missing = lines.filter((l) => !byId.get(l.variantId)?.published).map((l) => l.variantId);
  if (missing.length) return { ok: false, reason: "UNAVAILABLE", missing, stock: [] };

  const priced = lines.map((l) => {
    const v = byId.get(l.variantId)!;
    return { variantId: v.id, qty: l.qty, unitPrice: currency === "CZK" ? v.priceCzk : v.priceUsd, stock: v.stock };
  });
  const stock = findStockIssues(priced);
  if (stock.length) return { ok: false, reason: "STOCK", missing: [], stock };

  const totals = computeTotals(priced, shipping);
  const items = priced.map((p) => {
    const v = byId.get(p.variantId)!;
    return {
      productId: v.productId,
      variantId: v.id,
      productName: v.productName,
      variantName: v.variantName,
      sku: v.sku,
      imageUrl: v.imageUrl,
      currency,
      unitPrice: p.unitPrice,
      quantity: p.qty,
      lineTotal: p.unitPrice * p.qty,
    };
  });
  return { ok: true, items, itemsTotal: totals.itemsTotal, shippingPrice: totals.shipping, total: totals.total };
}
