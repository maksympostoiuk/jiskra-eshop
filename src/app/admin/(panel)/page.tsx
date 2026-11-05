import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, MessageSquare, Package, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, Pill } from "@/components/ui/card";
import { OrderStatusPill } from "@/components/admin/status-pills";
import { prisma } from "@/lib/db";
import { ORDER_STATUSES, isOneOf } from "@/lib/domain";
import { pickTranslation } from "@/lib/i18n-content";
import { formatMoney, isCurrency } from "@/lib/money";
import { getSettings } from "@/server/settings";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  const { forbidden } = await searchParams;
  const t = await getTranslations("admin.dashboard");
  const tStatus = await getTranslations("common.orderStatus");
  const locale = await getLocale();
  const format = await getFormatter();
  const settings = await getSettings();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [byStatus, revenueAll, revenue30, lowStock, latest, pendingReviews, productCount] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.groupBy({ by: ["currency"], where: { status: { not: "CANCELLED" } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["currency"], where: { status: { not: "CANCELLED" }, createdAt: { gte: since } }, _sum: { total: true } }),
    prisma.productVariant.findMany({
      where: { stock: { lte: settings.lowStockThreshold } },
      orderBy: [{ stock: "asc" }, { sku: "asc" }],
      take: 10,
      include: { product: { include: { translations: true } }, options: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "PUBLISHED" } }),
  ]);

  const statusCount = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
  const totalOrders = byStatus.reduce((sum, s) => sum + s._count._all, 0);
  const open = (statusCount.NEW ?? 0) + (statusCount.CONFIRMED ?? 0) + (statusCount.PROCESSING ?? 0);

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {forbidden && (
        <Alert tone="warning" className="mb-6">
          {t("forbidden")}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<ShoppingBag className="size-5" />} label={t("ordersTotal")} value={format.number(totalOrders)} hint={t("ordersOpen", { count: open })} href="/admin/orders" />
        {(["CZK", "USD"] as const).map((currency) => {
          const all = revenueAll.find((r) => r.currency === currency);
          const recent = revenue30.find((r) => r.currency === currency);
          return (
            <Stat
              key={currency}
              icon={<span className="text-sm font-bold">{currency === "CZK" ? "Kč" : "$"}</span>}
              label={t("revenue", { currency })}
              value={formatMoney(all?._sum.total ?? 0, currency, locale)}
              hint={t("revenue30", { amount: formatMoney(recent?._sum.total ?? 0, currency, locale) })}
            />
          );
        })}
        <Stat icon={<MessageSquare className="size-5" />} label={t("pendingReviews")} value={format.number(pendingReviews)} hint={t("publishedProducts", { count: productCount })} href="/admin/reviews" />
      </div>

      <section aria-labelledby="by-status" className="mt-6">
        <h2 id="by-status" className="sr-only">
          {t("byStatus")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <Link key={s} href={`/admin/orders?status=${s}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:border-ink">
              {tStatus(s)} <span className="ml-1 font-semibold">{statusCount[s] ?? 0}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl">{t("latestOrders")}</h2>
            <Link href="/admin/orders" className="text-sm text-brand hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          <ul className="divide-y divide-line/70">
            {latest.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-canvas">
                  <span className="font-mono text-sm font-semibold">#{o.number}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                    {o.firstName} {o.lastName}
                  </span>
                  <OrderStatusPill status={o.status} label={isOneOf(ORDER_STATUSES, o.status) ? tStatus(o.status) : o.status} />
                  <span className="w-28 text-right text-sm font-semibold">{isCurrency(o.currency) ? formatMoney(o.total, o.currency, locale) : o.total}</span>
                  <span className="w-24 text-right text-xs text-ink-faint">{format.dateTime(o.createdAt, { dateStyle: "short" })}</span>
                </Link>
              </li>
            ))}
            {latest.length === 0 && <li className="py-6 text-center text-sm text-ink-soft">{t("noOrders")}</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 text-xl">
            <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
            {t("lowStock")}
          </h2>
          <p className="mb-4 text-sm text-ink-soft">{t("lowStockHint", { threshold: settings.lowStockThreshold })}</p>
          <ul className="divide-y divide-line/70">
            {lowStock.map((v) => (
              <li key={v.id}>
                <Link href={`/admin/products/${v.productId}`} className="flex items-center gap-3 py-2.5 hover:bg-canvas">
                  <Package className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{pickTranslation(v.product.translations, locale)?.name}</span>
                    <span className="block truncate text-xs text-ink-faint">
                      {v.sku} · {v.options.map((o) => (locale === "en" ? o.labelEn : o.labelCs)).join(", ")}
                    </span>
                  </span>
                  <Pill className={v.stock === 0 ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}>{t("pieces", { count: v.stock })}</Pill>
                </Link>
              </li>
            ))}
            {lowStock.length === 0 && <li className="py-6 text-center text-sm text-ink-soft">{t("stockOk")}</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Stat({ icon, label, value, hint, href }: { icon: React.ReactNode; label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <Card className="flex h-full items-start gap-4 p-5 transition-colors hover:border-line-strong">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="mt-0.5 truncate font-display text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
      </div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
