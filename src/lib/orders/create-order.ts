import type { PrismaClient } from "@prisma/client";
import { refreshProductAggregates } from "@/lib/catalog/aggregates";
import type { CartLine } from "@/lib/cart";
import { pickLocalized, pickTranslation } from "@/lib/i18n-content";
import type { Currency } from "@/lib/money";
import { randomToken } from "@/lib/random";
import { orderSearchText } from "@/lib/text";
import { planOrder, type OrderPlan, type VariantForOrder } from "./plan";

export type OrderContact = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  company: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  note: string;
};

export type CreateOrderInput = {
  lines: CartLine[];
  currency: Currency;
  locale: string;
  contact: OrderContact;
  shippingMethodId: string;
  paymentMethod: string;
  /** total the customer saw; the order is refused if server-side pricing differs (prices changed meanwhile) */
  expectedTotal?: number;
  /** logged-in customer account, if any */
  customerId?: string | null;
};

export class OrderError extends Error {
  constructor(
    readonly code: "EMPTY" | "UNAVAILABLE" | "STOCK" | "SHIPPING" | "PRICE_CHANGED",
    readonly details: Extract<OrderPlan, { ok: false }> | null = null,
  ) {
    super(code);
  }
}

async function nextOrderNumber(tx: Pick<PrismaClient, "counter">): Promise<string> {
  const counter = await tx.counter.upsert({ where: { key: "order" }, create: { key: "order", value: 1 }, update: { value: { increment: 1 } } });
  return `${new Date().getFullYear()}${String(counter.value).padStart(5, "0")}`;
}

/**
 * Creates an order in one transaction: re-prices lines from the DB, checks and decrements stock
 * (conditional update, so concurrent orders cannot oversell), snapshots names/prices, upserts the customer
 * and writes the first status-history entry.
 */
export async function createOrder(db: PrismaClient, input: CreateOrderInput) {
  return db.$transaction(async (tx) => {
    const shipping = await tx.shippingMethod.findFirst({ where: { id: input.shippingMethodId, isActive: true }, include: { translations: true } });
    if (!shipping) throw new OrderError("SHIPPING");

    const variants = await tx.productVariant.findMany({
      where: { id: { in: input.lines.map((l) => l.variantId) } },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
        product: { include: { translations: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
      },
    });
    const forOrder: VariantForOrder[] = variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      sku: v.sku,
      priceCzk: v.priceCzk,
      priceUsd: v.priceUsd,
      stock: v.stock,
      published: v.product.status === "PUBLISHED",
      productName: pickTranslation(v.product.translations, input.locale)?.name ?? v.sku,
      variantName: v.options.map((o) => pickLocalized(o.labelCs, o.labelEn, input.locale)).join(", "),
      imageUrl: v.product.images[0]?.url ?? null,
    }));
    const rule = {
      price: input.currency === "CZK" ? shipping.priceCzk : shipping.priceUsd,
      freeFrom: input.currency === "CZK" ? shipping.freeFromCzk : shipping.freeFromUsd,
    };
    const plan = planOrder(input.lines, forOrder, input.currency, rule);
    if (!plan.ok) throw new OrderError(plan.reason, plan);
    if (input.expectedTotal !== undefined && input.expectedTotal !== plan.total) throw new OrderError("PRICE_CHANGED");

    // Decrement stock only where enough is left (guards against races between concurrent checkouts).
    for (const item of plan.items) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) {
        const current = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { stock: true } });
        throw new OrderError("STOCK", { ok: false, reason: "STOCK", missing: [], stock: [{ variantId: item.variantId, requested: item.quantity, available: current?.stock ?? 0 }] });
      }
    }

    const { contact } = input;
    // Signed-in customers keep their account; guests are matched by e-mail. A guest checkout never
    // overwrites the profile of a registered account (anyone can type someone else's e-mail).
    let customerId = input.customerId ?? null;
    if (!customerId) {
      const existing = await tx.customer.findUnique({ where: { email: contact.email } });
      if (!existing) {
        customerId = (await tx.customer.create({ data: { email: contact.email, firstName: contact.firstName, lastName: contact.lastName, phone: contact.phone } })).id;
      } else {
        if (!existing.passwordHash) {
          await tx.customer.update({ where: { id: existing.id }, data: { firstName: contact.firstName, lastName: contact.lastName, phone: contact.phone } });
        }
        customerId = existing.id;
      }
    }

    const number = await nextOrderNumber(tx);
    const order = await tx.order.create({
      data: {
        number,
        searchText: orderSearchText({ number, ...contact }),
        accessToken: randomToken(24),
        customerId,
        status: "NEW",
        locale: input.locale,
        currency: input.currency,
        email: contact.email,
        phone: contact.phone,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company || null,
        street: contact.street,
        city: contact.city,
        zip: contact.zip,
        country: contact.country,
        note: contact.note || null,
        shippingMethodId: shipping.id,
        shippingMethodName: pickTranslation(shipping.translations, input.locale)?.name ?? shipping.code,
        shippingPrice: plan.shippingPrice,
        paymentMethod: input.paymentMethod,
        paymentStatus: "PENDING",
        itemsTotal: plan.itemsTotal,
        total: plan.total,
        items: { create: plan.items },
        history: { create: { fromStatus: null, toStatus: "NEW" } },
      },
      include: { items: true },
    });

    const productIds = [...new Set(plan.items.map((i) => i.productId))];
    for (const productId of productIds) {
      const qty = plan.items.filter((i) => i.productId === productId).reduce((n, i) => n + i.quantity, 0);
      await tx.product.update({ where: { id: productId }, data: { soldCount: { increment: qty } } });
      await refreshProductAggregates(tx, productId);
    }
    return order;
  });
}
