import { describe, expect, it } from "vitest";
import { addLine, cartCount, computeTotals, findStockIssues, remainingForFreeShipping, removeLine, sanitizeLines, setLineQty, shippingPrice } from "./cart";

describe("cart lines", () => {
  it("adds, merges, updates and removes", () => {
    let lines = addLine([], "a", 2);
    lines = addLine(lines, "a", 1);
    lines = addLine(lines, "b");
    expect(lines).toEqual([{ variantId: "a", qty: 3 }, { variantId: "b", qty: 1 }]);
    expect(cartCount(lines)).toBe(4);
    lines = setLineQty(lines, "a", 150);
    expect(lines[0].qty).toBe(99);
    lines = setLineQty(lines, "b", 0);
    expect(lines).toHaveLength(1);
    expect(removeLine(lines, "a")).toEqual([]);
  });
  it("sanitizes untrusted data", () => {
    expect(sanitizeLines([{ variantId: "a", qty: 2 }, { variantId: "a", qty: 1.7 }, { variantId: 5, qty: 1 }, null, { variantId: "b", qty: -1 }])).toEqual([{ variantId: "a", qty: 3 }]);
    expect(sanitizeLines("nope")).toEqual([]);
  });
});

describe("totals", () => {
  const lines = [
    { unitPrice: 129900, qty: 2 },
    { unitPrice: 9900, qty: 1 },
  ];
  it("sums items and adds shipping", () => {
    expect(computeTotals(lines, { price: 7900, freeFrom: 500000 })).toEqual({ itemsTotal: 269700, shipping: 7900, total: 277600, itemCount: 3 });
  });
  it("applies free shipping from the threshold", () => {
    expect(computeTotals(lines, { price: 7900, freeFrom: 269700 }).shipping).toBe(0);
    expect(shippingPrice(100, { price: 500, freeFrom: null })).toBe(500);
    expect(remainingForFreeShipping(150000, { price: 7900, freeFrom: 200000 })).toBe(50000);
    expect(remainingForFreeShipping(150000, { price: 0, freeFrom: 200000 })).toBe(0);
  });
  it("charges no shipping for an empty cart", () => {
    expect(computeTotals([], { price: 7900, freeFrom: null }).total).toBe(0);
  });
  it("rejects float prices", () => {
    expect(() => computeTotals([{ unitPrice: 12.5, qty: 1 }])).toThrow(TypeError);
  });
});

describe("stock checks", () => {
  it("reports lines exceeding stock", () => {
    expect(
      findStockIssues([
        { variantId: "a", qty: 2, unitPrice: 1, stock: 5 },
        { variantId: "b", qty: 3, unitPrice: 1, stock: 1 },
        { variantId: "c", qty: 1, unitPrice: 1, stock: 0 },
      ]),
    ).toEqual([
      { variantId: "b", requested: 3, available: 1 },
      { variantId: "c", requested: 1, available: 0 },
    ]);
  });
});
