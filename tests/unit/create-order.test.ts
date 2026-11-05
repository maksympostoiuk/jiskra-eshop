import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createOrder, OrderError } from "@/lib/orders/create-order";

const db = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });
let variantId = "";
let productId = "";
let shippingId = "";

const contact = { email: "jana@example.com", phone: "+420 777 000 111", firstName: "Jana", lastName: "Nováková", company: "", street: "Dlouhá 1", city: "Praha", zip: "110 00", country: "CZ", note: "" };

beforeAll(async () => {
  const category = await db.category.create({ data: { translations: { create: [{ locale: "cs", name: "Test", slug: "test-co" }] } } });
  const product = await db.product.create({
    data: {
      categoryId: category.id,
      status: "PUBLISHED",
      translations: { create: [{ locale: "cs", name: "Testovací sluchátka", slug: "testovaci-sluchatka-co" }, { locale: "en", name: "Test headphones", slug: "test-headphones-co" }] },
      variants: { create: [{ sku: "CO-TEST-1", priceCzk: 199000, priceUsd: 8699, stock: 3, options: { create: [{ name: "color", value: "black", labelCs: "Černá", labelEn: "Black" }] } }] },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0].id;
  shippingId = (
    await db.shippingMethod.create({
      data: { code: "co-test", priceCzk: 12900, priceUsd: 599, freeFromCzk: 500000, freeFromUsd: 21900, translations: { create: [{ locale: "cs", name: "Kurýr" }, { locale: "en", name: "Courier" }] } },
    })
  ).id;
});

afterAll(() => db.$disconnect());

describe("createOrder (integration)", () => {
  it("creates an order with snapshots, totals and decremented stock", async () => {
    const order = await createOrder(db, { lines: [{ variantId, qty: 2 }], currency: "CZK", locale: "cs", contact, shippingMethodId: shippingId, paymentMethod: "bank_transfer" });
    expect(order).toMatchObject({ status: "NEW", currency: "CZK", itemsTotal: 398000, shippingPrice: 12900, total: 410900, shippingMethodName: "Kurýr" });
    expect(order.number).toMatch(/^\d{9}$/);
    expect(order.items[0]).toMatchObject({ productName: "Testovací sluchátka", variantName: "Černá", sku: "CO-TEST-1", unitPrice: 199000, quantity: 2, lineTotal: 398000, currency: "CZK" });
    expect((await db.productVariant.findUnique({ where: { id: variantId } }))?.stock).toBe(1);
    expect((await db.product.findUnique({ where: { id: productId } }))?.soldCount).toBe(2);
    expect(await db.orderStatusChange.count({ where: { orderId: order.id } })).toBe(1);
    expect(await db.customer.count({ where: { email: contact.email } })).toBe(1);
  });

  it("snapshots USD prices and English names for an English USD order", async () => {
    const order = await createOrder(db, { lines: [{ variantId, qty: 1 }], currency: "USD", locale: "en", contact, shippingMethodId: shippingId, paymentMethod: "cod" });
    expect(order).toMatchObject({ currency: "USD", itemsTotal: 8699, shippingPrice: 599, total: 9298, shippingMethodName: "Courier" });
    expect(order.items[0]).toMatchObject({ productName: "Test headphones", variantName: "Black", unitPrice: 8699 });
  });

  it("refuses to oversell and leaves stock untouched", async () => {
    await expect(createOrder(db, { lines: [{ variantId, qty: 1 }], currency: "CZK", locale: "cs", contact, shippingMethodId: shippingId, paymentMethod: "cod" })).rejects.toMatchObject({ code: "STOCK" });
    expect((await db.productVariant.findUnique({ where: { id: variantId } }))?.stock).toBe(0);
    expect(await db.order.count()).toBe(2);
  });

  it("rejects unknown shipping methods and unknown variants", async () => {
    await expect(createOrder(db, { lines: [{ variantId, qty: 1 }], currency: "CZK", locale: "cs", contact, shippingMethodId: "nope", paymentMethod: "cod" })).rejects.toBeInstanceOf(OrderError);
    await expect(createOrder(db, { lines: [{ variantId: "missing", qty: 1 }], currency: "CZK", locale: "cs", contact, shippingMethodId: shippingId, paymentMethod: "cod" })).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});
