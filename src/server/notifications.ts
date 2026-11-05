import "server-only";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getMailer } from "@/lib/mailer";
import { formatMoney, isCurrency } from "@/lib/money";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";

async function loadOrder(orderId: string) {
  return prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
}

export async function sendOrderConfirmationEmail(orderId: string, paymentInstructions?: string) {
  const order = await loadOrder(orderId);
  if (!order || !isCurrency(order.currency)) return;
  const locale = isLocale(order.locale) ? order.locale : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "email" });
  const money = (n: number) => formatMoney(n, order.currency as "CZK" | "USD", locale);
  const lines = order.items.map((i) => `• ${i.quantity}× ${i.productName}${i.variantName ? ` (${i.variantName})` : ""} — ${money(i.lineTotal)}`);
  const text = [
    t("greeting", { name: order.firstName }),
    "",
    t("confirmation.intro", { number: order.number }),
    "",
    ...lines,
    "",
    `${t("shipping")}: ${order.shippingMethodName} — ${money(order.shippingPrice)}`,
    `${t("total")}: ${money(order.total)}`,
    "",
    ...(paymentInstructions ? [paymentInstructions, ""] : []),
    t("confirmation.link"),
    `${siteUrl()}/${locale}/order/${order.number}?token=${order.accessToken}`,
    "",
    t("signature"),
  ].join("\n");
  await getMailer().send({ to: order.email, subject: t("confirmation.subject", { number: order.number }), text });
}

export async function sendOrderStatusEmail(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order) return;
  const locale = isLocale(order.locale) ? order.locale : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "email" });
  const tStatus = await getTranslations({ locale, namespace: "common.orderStatus" });
  const status = tStatus(order.status as "NEW");
  const text = [
    t("greeting", { name: order.firstName }),
    "",
    t("status.intro", { number: order.number, status }),
    "",
    t("confirmation.link"),
    `${siteUrl()}/${locale}/order/${order.number}?token=${order.accessToken}`,
    "",
    t("signature"),
  ].join("\n");
  await getMailer().send({ to: order.email, subject: t("status.subject", { number: order.number, status }), text });
}

async function accountEmail(to: string, locale: string, key: "verify" | "exists" | "reset", values: Record<string, string>) {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const t = await getTranslations({ locale: loc, namespace: "email.account" });
  const tc = await getTranslations({ locale: loc, namespace: "email" });
  const text = [t(`${key}.body`, values), "", values.url ?? "", "", t("ignore"), "", tc("signature")].join("\n");
  await getMailer().send({ to, subject: t(`${key}.subject`), text });
}

export async function sendVerificationEmail(to: string, name: string, locale: string, token: string) {
  await accountEmail(to, locale, "verify", { name, url: `${siteUrl()}/api/account/verify?locale=${locale}&token=${encodeURIComponent(token)}` });
}

export async function sendAccountExistsEmail(to: string, locale: string) {
  await accountEmail(to, locale, "exists", { url: `${siteUrl()}/${locale}/account/forgot` });
}

export async function sendPasswordResetEmail(to: string, locale: string, token: string) {
  await accountEmail(to, locale, "reset", { url: `${siteUrl()}/${locale}/account/reset?token=${encodeURIComponent(token)}` });
}
