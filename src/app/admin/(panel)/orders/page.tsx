import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { AdminPagination, parsePage } from "@/components/admin/pagination";
import { OrderStatusPill, StatusPill } from "@/components/admin/status-pills";
import { EmptyRow, FilterBar, Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { prisma } from "@/lib/db";
import { ORDER_STATUSES, PAYMENT_STATUSES, isOneOf } from "@/lib/domain";
import { formatMoney, isCurrency, CURRENCIES } from "@/lib/money";

const PER_PAGE = 20;
type Search = { q?: string; status?: string; currency?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const t = await getTranslations("admin.orders");
  const tc = await getTranslations("admin.common");
  const tStatus = await getTranslations("common.orderStatus");
  const tPay = await getTranslations("common.paymentStatus");
  const locale = await getLocale();
  const format = await getFormatter();
  const page = parsePage(params.page);
  const q = params.q?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(isOneOf(ORDER_STATUSES, params.status) ? { status: params.status } : {}),
    ...(isCurrency(params.currency) ? { currency: params.currency } : {}),
    ...(q
      ? { OR: [{ number: { contains: q } }, { email: { contains: q.toLowerCase() } }, { lastName: { contains: q } }, { firstName: { contains: q } }] }
      : {}),
  };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { items: true } } } }),
  ]);
  return (
    <>
      <PageHeader title={t("title")} />
      <FilterBar action="/admin/orders">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-ink-soft">
          {tc("search")}
          <Input name="q" defaultValue={params.q} placeholder={t("searchPlaceholder")} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          {t("status")}
          <Select name="status" defaultValue={params.status ?? ""}>
            <option value="">{tc("all")}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{tStatus(s)}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          {t("currency")}
          <Select name="currency" defaultValue={params.currency ?? ""}>
            <option value="">{tc("all")}</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </label>
        <button type="submit" className={buttonClasses("outline")}>{tc("filter")}</button>
      </FilterBar>
      <Table>
        <thead>
          <tr>
            <Th>{t("number")}</Th>
            <Th>{t("date")}</Th>
            <Th>{t("customer")}</Th>
            <Th>{t("status")}</Th>
            <Th>{t("payment")}</Th>
            <Th className="text-right">{t("total")}</Th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <Tr key={o.id}>
              <Td>
                <Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold hover:underline">#{o.number}</Link>
                <div className="text-xs text-ink-faint">{t("itemsCount", { count: o._count.items })}</div>
              </Td>
              <Td className="whitespace-nowrap text-ink-soft">{format.dateTime(o.createdAt, { dateStyle: "short", timeStyle: "short" })}</Td>
              <Td>
                {o.firstName} {o.lastName}
                <div className="text-xs text-ink-faint">{o.email}</div>
              </Td>
              <Td><OrderStatusPill status={o.status} label={isOneOf(ORDER_STATUSES, o.status) ? tStatus(o.status) : o.status} /></Td>
              <Td><StatusPill status={o.paymentStatus} label={isOneOf(PAYMENT_STATUSES, o.paymentStatus) ? tPay(o.paymentStatus) : o.paymentStatus} /></Td>
              <Td className="text-right font-semibold whitespace-nowrap">{isCurrency(o.currency) ? formatMoney(o.total, o.currency, locale) : o.total}</Td>
            </Tr>
          ))}
          {orders.length === 0 && <EmptyRow colSpan={6}>{tc("empty")}</EmptyRow>}
        </tbody>
      </Table>
      <AdminPagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} basePath="/admin/orders" params={params} />
    </>
  );
}
