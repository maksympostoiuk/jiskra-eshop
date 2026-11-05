import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { OrderStatusForm, PaymentStatusForm } from "@/components/admin/order-forms";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusPill } from "@/components/admin/status-pills";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { ORDER_STATUSES, PAYMENT_STATUSES, isOneOf } from "@/lib/domain";
import { formatMoney, isCurrency } from "@/lib/money";
import { nextStatuses } from "@/lib/orders/status";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("admin.orders");
  const tStatus = await getTranslations("common.orderStatus");
  const tPayMethod = await getTranslations("common.paymentMethod");
  const locale = await getLocale();
  const format = await getFormatter();
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, history: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true } } } } },
  });
  if (!order || !isCurrency(order.currency)) notFound();
  const currency = order.currency;
  const money = (n: number) => formatMoney(n, currency, locale);
  const statusLabel = (s: string) => (isOneOf(ORDER_STATUSES, s) ? tStatus(s) : s);

  return (
    <>
      <PageHeader
        title={<span className="font-mono">#{order.number}</span>}
        description={format.dateTime(order.createdAt, { dateStyle: "long", timeStyle: "short" })}
        back={{ href: "/admin/orders", label: t("title") }}
        actions={<OrderStatusPill status={order.status} label={statusLabel(order.status)} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="mb-4 text-xl">{t("items")}</h2>
            <ul className="divide-y divide-line/70">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- snapshot thumbnail */}
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-14 rounded-md border border-line bg-canvas object-contain" /> : <span className="size-14" />}
                  <div className="min-w-0 flex-1">
                    {item.productId ? (
                      <Link href={`/admin/products/${item.productId}`} className="font-medium hover:underline">{item.productName}</Link>
                    ) : (
                      <span className="font-medium">{item.productName}</span>
                    )}
                    <div className="text-xs text-ink-faint">
                      {item.variantName && `${item.variantName} · `}
                      <span className="font-mono">{item.sku}</span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>
                      {item.quantity} × {money(item.unitPrice)}
                    </div>
                    <div className="font-semibold">{money(item.lineTotal)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 ml-auto grid max-w-xs grid-cols-2 gap-y-1 text-sm">
              <dt className="text-ink-soft">{t("itemsTotal")}</dt>
              <dd className="text-right">{money(order.itemsTotal)}</dd>
              <dt className="text-ink-soft">{order.shippingMethodName}</dt>
              <dd className="text-right">{money(order.shippingPrice)}</dd>
              <dt className="border-t border-line pt-2 font-semibold">{t("total")}</dt>
              <dd className="border-t border-line pt-2 text-right font-display text-xl font-semibold">{money(order.total)}</dd>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-xl">{t("history")}</h2>
            <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
              {order.history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand" aria-hidden="true" />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {h.fromStatus && (
                      <>
                        <span className="text-ink-soft">{statusLabel(h.fromStatus)}</span>
                        <span aria-hidden="true">→</span>
                      </>
                    )}
                    <span className="font-semibold">{statusLabel(h.toStatus)}</span>
                    <span className="text-xs text-ink-faint">
                      {format.dateTime(h.createdAt, { dateStyle: "short", timeStyle: "short" })}
                      {h.changedBy && ` · ${h.changedBy.name}`}
                    </span>
                  </div>
                  {h.note && <p className="mt-1 text-sm text-ink-soft">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="mb-3 text-lg">{t("changeStatus")}</h2>
            <OrderStatusForm orderId={order.id} options={nextStatuses(order.status).map((s) => ({ value: s, label: tStatus(s) }))} />
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="mb-3 text-lg">{t("customer")}</h2>
            <p className="font-medium">
              {order.firstName} {order.lastName}
            </p>
            {order.company && <p>{order.company}</p>}
            <p>
              <a href={`mailto:${order.email}`} className="text-brand hover:underline">{order.email}</a>
            </p>
            <p>{order.phone}</p>
            <h3 className="mt-4 mb-1 font-semibold">{t("address")}</h3>
            <p>{order.street}</p>
            <p>
              {order.zip} {order.city}
            </p>
            <p>{order.country}</p>
            {order.note && (
              <>
                <h3 className="mt-4 mb-1 font-semibold">{t("note")}</h3>
                <p className="whitespace-pre-line text-ink-soft">{order.note}</p>
              </>
            )}
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="mb-3 text-lg">{t("payment")}</h2>
            <p>
              {["bank_transfer", "cod", "stripe"].includes(order.paymentMethod) ? tPayMethod(order.paymentMethod as "cod") : order.paymentMethod}
              {order.paymentReference && <span className="block font-mono text-xs text-ink-faint">{order.paymentReference}</span>}
            </p>
            <div className="mt-3">
              <PaymentStatusForm orderId={order.id} current={isOneOf(PAYMENT_STATUSES, order.paymentStatus) ? order.paymentStatus : "PENDING"} />
            </div>
            <p className="mt-4 text-ink-soft">
              {t("locale")}: {order.locale.toUpperCase()} · {t("currency")}: {order.currency}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
