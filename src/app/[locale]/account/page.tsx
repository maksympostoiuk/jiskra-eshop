import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Package } from "lucide-react";
import { OrderStatusPill } from "@/components/admin/status-pills";
import { ProfileForm } from "@/components/store/account-forms";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Link, redirect } from "@/i18n/navigation";
import { getCustomer } from "@/lib/auth/customer-session";
import { prisma } from "@/lib/db";
import { ORDER_STATUSES, isOneOf } from "@/lib/domain";
import { formatMoney, isCurrency } from "@/lib/money";
import { logoutAccount } from "@/server/account";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title"), robots: { index: false } };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const customer = await getCustomer();
  if (!customer) return redirect({ href: { pathname: "/account/login", query: { next: "/account" } }, locale });
  const t = await getTranslations("account");
  const tStatus = await getTranslations("common.orderStatus");
  const format = await getFormatter();
  const orders = await prisma.order.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { items: true } } } });

  return (
    <div className="container-shop pt-6">
      <Breadcrumbs locale={locale} items={[{ name: t("title"), href: "/account" }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">{t("greeting", { name: customer.firstName })}</h1>
          <p className="mt-1 text-ink-soft">{customer.email}</p>
        </div>
        <form action={async () => { "use server"; await logoutAccount(); redirect({ href: "/", locale }); }}>
          <button type="submit" className="rounded-full border border-ink px-5 py-2 text-sm font-semibold hover:bg-ink hover:text-white">{t("logout")}</button>
        </form>
      </div>
      
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="orders-title">
          <h2 id="orders-title" className="mb-4 text-2xl">{t("orders.title")}</h2>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
              <Package className="size-8 text-ink-faint" aria-hidden="true" />
              <p className="mt-2 text-ink-soft">{t("orders.empty")}</p>
              <Link href="/" className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand">{t("orders.shop")}</Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.number}?token=${o.accessToken}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line/70 bg-surface p-4 shadow-card hover:border-ink">
                    <span className="font-mono font-semibold">#{o.number}</span>
                    <span className="text-sm text-ink-soft">{format.dateTime(o.createdAt, { dateStyle: "medium" })}</span>
                    <span className="text-sm text-ink-faint">{t("orders.items", { count: o._count.items })}</span>
                    <span className="flex-1" />
                    <OrderStatusPill status={o.status} label={isOneOf(ORDER_STATUSES, o.status) ? tStatus(o.status) : o.status} />
                    <span className="w-28 text-right font-semibold">{isCurrency(o.currency) ? formatMoney(o.total, o.currency, locale) : o.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="profile-title" className="rounded-2xl border border-line/70 bg-surface p-6 shadow-card lg:self-start">
          <h2 id="profile-title" className="mb-4 text-2xl">{t("profile.title")}</h2>
          <ProfileForm initial={{ firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone ?? "" }} />
        </section>
      </div>
    </div>
  );
}
