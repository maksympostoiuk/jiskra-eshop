import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { CircleCheck, Landmark } from "lucide-react";
import { timingSafeEqual } from "node:crypto";
import { ShopImage } from "@/components/store/shop-image";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { ORDER_STATUSES, PAYMENT_STATUSES, isOneOf } from "@/lib/domain";
import { formatMoney, isCurrency } from "@/lib/money";
import { retrieveStripeSession, sessionSettlesOrder } from "@/lib/payments/stripe";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { robots: { index: false, follow: false } };

function tokenMatches(expected: string, given: string | undefined): boolean {
  if (!given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ locale: string; number: string }>; searchParams: Promise<{ token?: string; session_id?: string }> }) {
  const { locale, number } = await params;
  const { token, session_id } = await searchParams;
  setRequestLocale(locale);
  let order = await prisma.order.findUnique({ where: { number }, include: { items: true } });
  // Without the secret token the order does not exist for the visitor (no enumeration of order numbers).
  if (!order || !tokenMatches(order.accessToken, token) || !isCurrency(order.currency)) notFound();

  // Returning from Stripe Checkout: confirm the payment server-side.
  if (session_id && order.paymentMethod === "stripe" && order.paymentStatus !== "PAID") {
    const session = await retrieveStripeSession(session_id);
    if (session && sessionSettlesOrder(session, order)) {
      order = await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", paymentReference: session_id }, include: { items: true } });
    }
  }

  const t = await getTranslations("checkout.confirmation");
  const tStatus = await getTranslations("common.orderStatus");
  const tPayStatus = await getTranslations("common.paymentStatus");
  const tPay = await getTranslations("common.paymentMethod");
  const format = await getFormatter();
  const settings = await getSettings();
  const currency = order.currency as "CZK" | "USD";
  const money = (n: number) => formatMoney(n, currency, locale);

  return (
    <div className="container-shop max-w-4xl pt-10">
      <div className="flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-full bg-success-soft text-success">
          <CircleCheck className="size-8" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="mt-2 text-ink-soft">{t("subtitle", { number: order.number, email: order.email })}</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs text-ink-faint uppercase">{t("number")}</p>
          <p className="font-mono text-lg font-semibold">{order.number}</p>
        </div>
        <div className="rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs text-ink-faint uppercase">{t("status")}</p>
          <p className="text-lg font-semibold">{isOneOf(ORDER_STATUSES, order.status) ? tStatus(order.status) : order.status}</p>
        </div>
        <div className="rounded-xl bg-surface p-4 shadow-card">
          <p className="text-xs text-ink-faint uppercase">{t("payment")}</p>
          <p className="text-lg font-semibold">{isOneOf(PAYMENT_STATUSES, order.paymentStatus) ? tPayStatus(order.paymentStatus) : order.paymentStatus}</p>
          <p className="text-xs text-ink-soft">{["bank_transfer", "cod", "stripe"].includes(order.paymentMethod) ? tPay(order.paymentMethod as "cod") : order.paymentMethod}</p>
        </div>
      </div>

      {order.paymentMethod === "bank_transfer" && order.paymentStatus !== "PAID" && (
        <section aria-labelledby="bank-title" className="mt-6 rounded-2xl border border-brand/30 bg-brand-soft p-6">
          <h2 id="bank-title" className="flex items-center gap-2 text-2xl">
            <Landmark className="size-6 text-brand" aria-hidden="true" />
            {t("bankTitle")}
          </h2>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-ink-soft">{t("bankAccount")}</dt><dd className="font-mono text-base font-semibold">{settings.bankAccount}</dd></div>
            <div><dt className="text-ink-soft">IBAN</dt><dd className="font-mono text-base font-semibold">{settings.iban}</dd></div>
            <div><dt className="text-ink-soft">{t("variableSymbol")}</dt><dd className="font-mono text-base font-semibold">{order.paymentReference ?? order.number}</dd></div>
            <div><dt className="text-ink-soft">{t("amount")}</dt><dd className="text-base font-semibold">{money(order.total)}</dd></div>
          </dl>
          <p className="mt-3 text-sm text-ink-soft">{t("bankNote")}</p>
        </section>
      )}
      {order.paymentMethod === "cod" && <p className="mt-6 rounded-2xl bg-surface p-5 text-sm shadow-card">{t("codNote", { amount: money(order.total) })}</p>}
      {order.paymentMethod === "stripe" && order.paymentStatus !== "PAID" && <p className="mt-6 rounded-2xl bg-warning-soft p-5 text-sm text-warning">{t("stripePending")}</p>}

      <section aria-labelledby="items-title" className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
        <h2 id="items-title" className="text-2xl">{t("items")}</h2>
        <ul className="mt-4 divide-y divide-line/70">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-canvas">{i.imageUrl && <ShopImage src={i.imageUrl} alt="" fill sizes="56px" className="object-contain" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{i.productName}</span>
                <span className="block text-xs text-ink-faint">{i.variantName} · {i.quantity} × {money(i.unitPrice)}</span>
              </span>
              <span className="font-semibold">{money(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 ml-auto grid max-w-xs grid-cols-2 gap-y-1 text-sm">
          <dt className="text-ink-soft">{t("itemsTotal")}</dt>
          <dd className="text-right">{money(order.itemsTotal)}</dd>
          <dt className="text-ink-soft">{order.shippingMethodName}</dt>
          <dd className="text-right">{money(order.shippingPrice)}</dd>
          <dt className="border-t border-line pt-2 font-semibold">{t("total")}</dt>
          <dd className="border-t border-line pt-2 text-right font-display text-2xl font-semibold">{money(order.total)}</dd>
        </dl>
      </section>

      <section aria-labelledby="addr-title" className="mt-6 rounded-2xl bg-surface p-6 text-sm shadow-card">
        <h2 id="addr-title" className="text-2xl">{t("delivery")}</h2>
        <p className="mt-3">{order.firstName} {order.lastName}{order.company ? `, ${order.company}` : ""}</p>
        <p>{order.street}, {order.zip} {order.city}, {order.country}</p>
        <p className="text-ink-soft">{order.email} · {order.phone}</p>
        <p className="mt-2 text-xs text-ink-faint">{t("placedAt", { date: format.dateTime(order.createdAt, { dateStyle: "long", timeStyle: "short" }) })}</p>
      </section>

      <div className="mt-8 text-center">
        <Link href="/" className="inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-brand">{t("continue")}</Link>
      </div>
    </div>
  );
}
