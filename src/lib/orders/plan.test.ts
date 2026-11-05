import { describe, expect, it } from "vitest";
import { planOrder, type VariantForOrder } from "./plan";

const variant = (id: string, priceCzk: number, stock: number, published = true): VariantForOrder => ({
  id,
  productId: `p-${id}`,
  sku: id.toUpperCase(),
  priceCzk,
  priceUsd: Math.round(priceCzk / 23),
  stock,
  published,
  productName: `Product ${id}`,
  variantName: "Black",
  imageUrl: null,
});

describe("planOrder", () => {
  const variants = [variant("a", 129900, 5), variant("b", 9900, 1), variant("c", 5000, 3, false)];
  const shipping = { price: 7900, freeFrom: 200000 };

  it("prices lines from the database and adds shipping", () => {
    const plan = planOrder([{ variantId: "a", qty: 1 }, { variantId: "b", qty: 1 }], variants, "CZK", shipping);
    expect(plan).toMatchObject({ ok: true, itemsTotal: 139800, shippingPrice: 7900, total: 147700 });
    if (plan.ok) expect(plan.items[0]).toMatchObject({ unitPrice: 129900, quantity: 1, lineTotal: 129900, sku: "A", currency: "CZK" });
  });
  it("uses USD prices for USD orders and free shipping above the threshold", () => {
    const plan = planOrder([{ variantId: "a", qty: 2 }], variants, "USD", { price: 349, freeFrom: 8900 });
    expect(plan).toMatchObject({ ok: true, itemsTotal: 11296, shippingPrice: 0, total: 11296 });
  });
  it("rejects empty carts, unknown/unpublished variants and insufficient stock", () => {
    expect(planOrder([], variants, "CZK", shipping)).toMatchObject({ ok: false, reason: "EMPTY" });
    expect(planOrder([{ variantId: "c", qty: 1 }, { variantId: "x", qty: 1 }], variants, "CZK", shipping)).toMatchObject({ ok: false, reason: "UNAVAILABLE", missing: ["c", "x"] });
    expect(planOrder([{ variantId: "b", qty: 2 }], variants, "CZK", shipping)).toMatchObject({ ok: false, reason: "STOCK", stock: [{ variantId: "b", requested: 2, available: 1 }] });
  });
});
