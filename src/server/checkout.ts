"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/auth/rate-limit";
import { sanitizeLines, type CartLine } from "@/lib/cart";
import { pickLocalized, pickTranslation } from "@/lib/i18n-content";
import { visibleCategoryIds } from "@/lib/catalog/category-tree";
import { formatMoney } from "@/lib/money";
import { createOrder, OrderError } from "@/lib/orders/create-order";
import { getPaymentProvider } from "@/lib/payments";
import { siteUrl } from "@/lib/site";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/store";
import { getCurrency } from "@/server/currency";
import { getCustomer } from "@/lib/auth/customer-session";
import { sendOrderConfirmationEmail } from "@/server/notifications";
import { getSettings } from "@/server/settings";
import { validateInput, type ActionResult } from "./action";
import { clientIp } from "./request";

export type QuotedLine = {
  variantId: string;
  qty: number;
  available: boolean;
  stock: number;
  unitPrice: number;
  oldPrice: number | null;
  name: string;
  variantLabel: string;
  slug: string;
  sku: string;
  imageUrl: string | null;
  imageAlt: string;
};

/** Current prices, stock and names for cart lines (prices in the visitor's currency). */
export async function quoteCart(rawLines: CartLine[]): Promise<{ currency: "CZK" | "USD"; lines: QuotedLine[] }> {
  const lines = sanitizeLines(rawLines);
  const locale = await getLocale();
  const currency = await getCurrency();
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      product: { include: { translations: true, images: { orderBy: { sortOrder: "asc" }, include: { variant: { select: { id: true } } } } } },
    },
  });
  const visible = visibleCategoryIds(await prisma.category.findMany({ select: { id: true, parentId: true, sortOrder: true, isActive: true } }));
  return {
    currency,
    lines: lines.map((l) => {
      const v = variants.find((x) => x.id === l.variantId);
      if (!v) return { variantId: l.variantId, qty: l.qty, available: false, stock: 0, unitPrice: 0, oldPrice: null, name: "", variantLabel: "", slug: "", sku: "", imageUrl: null, imageAlt: "" };
      const tr = pickTranslation(v.product.translations, locale);
      const image = v.product.images.find((im) => im.variantId === v.id) ?? v.product.images[0];
      return {
        variantId: v.id,
        qty: l.qty,
        available: v.product.status === "PUBLISHED" && visible.has(v.product.categoryId),
        stock: v.stock,
        unitPrice: currency === "CZK" ? v.priceCzk : v.priceUsd,
        oldPrice: currency === "CZK" ? v.oldPriceCzk : v.oldPriceUsd,
        name: tr?.name ?? v.sku,
        variantLabel: v.options.map((o) => pickLocalized(o.labelCs, o.labelEn, locale)).join(", "),
        slug: tr?.slug ?? "",
        sku: v.sku,
        imageUrl: image?.url ?? null,
        imageAlt: image ? pickLocalized(image.altCs, image.altEn, locale) : "",
      };
    }),
  };
}

/** Validate checkout, create the order (transaction + stock), start the payment and send the confirmation e-mail. */
export async function placeOrder(input: CheckoutInput): Promise<ActionResult<{ redirectUrl: string }>> {
  const t = await getTranslations("checkout");
  const parsed = await validateInput(checkoutSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors, message: t("errors.form") };
  const data = parsed.data;

  if (!(await rateLimit(`checkout:${await clientIp()}`, 10, 10 * 60 * 1000)).ok) return { ok: false, message: t("errors.tooMany") };

  const locale = await getLocale();
  const currency = await getCurrency();
  const provider = getPaymentProvider(data.paymentMethod);
  const shipping = await prisma.shippingMethod.findFirst({ where: { id: data.shippingMethodId, isActive: true } });
  if (!shipping) return { ok: false, errors: { shippingMethodId: t("errors.shipping") } };
  if (!provider || !provider.supportsShipping(shipping)) return { ok: false, errors: { paymentMethod: t("errors.payment") } };

  let order;
  try {
    order = await createOrder(prisma, {
      lines: sanitizeLines(data.lines),
      currency,
      locale,
      contact: { ...data, email: data.email.toLowerCase() },
      shippingMethodId: shipping.id,
      paymentMethod: provider.id,
      expectedTotal: data.expectedTotal,
      customerId: (await getCustomer())?.id ?? null,
    });
  } catch (error) {
    if (error instanceof OrderError) {
      if (error.code === "STOCK") return { ok: false, message: t("errors.stock") };
      if (error.code === "UNAVAILABLE") return { ok: false, message: t("errors.unavailable") };
      if (error.code === "EMPTY") return { ok: false, message: t("errors.empty") };
      if (error.code === "PRICE_CHANGED") return { ok: false, message: t("errors.priceChanged") };
      return { ok: false, errors: { shippingMethodId: t("errors.shipping") } };
    }
    throw error;
  }

  const settings = await getSettings();
  const confirmationUrl = `${siteUrl()}/${locale}/order/${order.number}?token=${order.accessToken}`;
  let redirectUrl = `/${locale}/order/${order.number}?token=${order.accessToken}`;
  let instructions: string | undefined;
  try {
    const payment = await provider.initiate(
      { id: order.id, number: order.number, accessToken: order.accessToken, total: order.total, currency, email: order.email, locale },
      { bank: { account: settings.bankAccount, iban: settings.iban }, returnUrl: `${confirmationUrl}&session_id={CHECKOUT_SESSION_ID}`, cancelUrl: confirmationUrl },
    );
    await prisma.order.update({ where: { id: order.id }, data: { paymentReference: payment.reference ?? null, paymentStatus: payment.status } });
    if (payment.redirectUrl) redirectUrl = payment.redirectUrl;
    if (payment.bankTransfer) {
      const te = await getTranslations({ locale, namespace: "email" });
      instructions = te("bankTransfer", {
        account: payment.bankTransfer.account,
        iban: payment.bankTransfer.iban,
        vs: payment.bankTransfer.variableSymbol,
        amount: formatMoney(payment.bankTransfer.amount, currency, locale),
      });
    }
  } catch (error) {
    // The order exists; the customer can pay later (the confirmation page shows the state).
    console.error("Payment initiation failed", error);
  }

  await sendOrderConfirmationEmail(order.id, instructions).catch((error) => console.error("Confirmation e-mail failed", error));
  return { ok: true, data: { redirectUrl } };
}
