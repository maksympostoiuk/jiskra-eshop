/** Pure cart logic shared by the client cart and the server checkout. Amounts are integer minor units. */

export type CartLine = { variantId: string; qty: number };
export const MAX_LINE_QTY = 99;
export const MAX_LINES = 50;

export function clampQty(qty: number, max = MAX_LINE_QTY): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.max(1, Math.min(Math.floor(qty), max));
}

export function addLine(lines: CartLine[], variantId: string, qty = 1): CartLine[] {
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) return lines.map((l) => (l.variantId === variantId ? { ...l, qty: clampQty(l.qty + qty) } : l));
  if (lines.length >= MAX_LINES) return lines;
  return [...lines, { variantId, qty: clampQty(qty) }];
}

export function setLineQty(lines: CartLine[], variantId: string, qty: number): CartLine[] {
  if (qty <= 0) return removeLine(lines, variantId);
  return lines.map((l) => (l.variantId === variantId ? { ...l, qty: clampQty(qty) } : l));
}

export function removeLine(lines: CartLine[], variantId: string): CartLine[] {
  return lines.filter((l) => l.variantId !== variantId);
}

/** Validate untrusted (localStorage / request) cart data. Merges duplicates. */
export function sanitizeLines(input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  let lines: CartLine[] = [];
  for (const raw of input.slice(0, MAX_LINES * 2)) {
    if (!raw || typeof raw !== "object") continue;
    const { variantId, qty } = raw as Record<string, unknown>;
    if (typeof variantId !== "string" || variantId.length > 64 || typeof qty !== "number" || qty < 1) continue;
    lines = addLine(lines, variantId, qty);
  }
  return lines;
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

export type PricedLine = { variantId: string; qty: number; unitPrice: number; stock: number };

export type StockIssue = { variantId: string; requested: number; available: number };

/** Lines whose requested quantity exceeds available stock (or are unavailable). */
export function findStockIssues(lines: PricedLine[]): StockIssue[] {
  return lines.filter((l) => l.qty > l.stock).map((l) => ({ variantId: l.variantId, requested: l.qty, available: Math.max(0, l.stock) }));
}

export type ShippingRule = { price: number; freeFrom: number | null };

/** Shipping price for an items total; free when the threshold is reached. */
export function shippingPrice(itemsTotal: number, rule: ShippingRule | null): number {
  if (!rule) return 0;
  return rule.freeFrom !== null && itemsTotal >= rule.freeFrom ? 0 : rule.price;
}

export type CartTotals = { itemsTotal: number; shipping: number; total: number; itemCount: number };

export function computeTotals(lines: Array<{ unitPrice: number; qty: number }>, shipping: ShippingRule | null = null): CartTotals {
  for (const l of lines) {
    if (!Number.isSafeInteger(l.unitPrice) || l.unitPrice < 0) throw new TypeError("unitPrice must be a non-negative integer (minor units)");
  }
  const itemsTotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const ship = lines.length ? shippingPrice(itemsTotal, shipping) : 0;
  return { itemsTotal, shipping: ship, total: itemsTotal + ship, itemCount: lines.reduce((n, l) => n + l.qty, 0) };
}

/** How much more to spend to get free shipping (0 when already free or not applicable). */
export function remainingForFreeShipping(itemsTotal: number, rule: ShippingRule | null): number {
  if (!rule || rule.freeFrom === null || rule.price === 0) return 0;
  return Math.max(0, rule.freeFrom - itemsTotal);
}
