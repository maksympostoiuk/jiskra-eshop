import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Check, Star, Trash2, X } from "lucide-react";
import { ActionButton } from "@/components/admin/action-button";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { AdminPagination, parsePage } from "@/components/admin/pagination";
import { StatusPill } from "@/components/admin/status-pills";
import { FilterBar } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { prisma } from "@/lib/db";
import { REVIEW_STATUSES, isOneOf } from "@/lib/domain";
import { pickTranslation } from "@/lib/i18n-content";
import { normalizeText } from "@/lib/text";
import { deleteReview, moderateReview } from "@/server/admin/orders";

const PER_PAGE = 15;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations("admin.reviews");
  const tc = await getTranslations("admin.common");
  const locale = await getLocale();
  const format = await getFormatter();
  const page = parsePage(params.page);
  const status = params.status === "ALL" ? undefined : isOneOf(REVIEW_STATUSES, params.status) ? params.status : "PENDING";
  const where: Prisma.ReviewWhereInput = { ...(status ? { status } : {}), ...(params.q?.trim() ? { AND: normalizeText(params.q).split(" ").map((term) => ({ searchText: { contains: term } })) } : {}) };
  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { product: { include: { translations: true } } } }),
  ]);
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <FilterBar action="/admin/reviews">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          {t("status")}
          <Select name="status" defaultValue={status ?? "ALL"}>
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>{tc(`status.${s}`)}</option>
            ))}
            <option value="ALL">{tc("all")}</option>
          </Select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-ink-soft">
          {tc("search")}
          <Input name="q" defaultValue={params.q} />
        </label>
        <button type="submit" className={buttonClasses("outline")}>{tc("filter")}</button>
      </FilterBar>
      <ul className="flex flex-col gap-3">
        {reviews.map((r) => {
          const productName = pickTranslation(r.product.translations, locale)?.name;
          return (
            <li key={r.id}>
              <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-0.5 text-spark" aria-label={t("rating", { rating: r.rating })}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`size-4 ${i < r.rating ? "fill-current" : "text-line-strong"}`} aria-hidden="true" />
                      ))}
                    </span>
                    <span className="font-semibold">{r.authorName}</span>
                    <span className="text-ink-faint">{format.dateTime(r.createdAt, { dateStyle: "medium" })}</span>
                    <span className="rounded bg-muted px-1.5 text-xs uppercase">{r.locale}</span>
                    <StatusPill status={r.status} label={isOneOf(REVIEW_STATUSES, r.status) ? tc(`status.${r.status}`) : r.status} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{r.text}</p>
                  <Link href={`/admin/products/${r.productId}`} className="mt-1 inline-block text-xs text-brand hover:underline">{productName}</Link>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status !== "APPROVED" && (
                    <ActionButton action={moderateReview.bind(null, r.id, "APPROVED")} variant="brand">
                      <Check className="size-4" aria-hidden="true" />
                      {t("approve")}
                    </ActionButton>
                  )}
                  {r.status !== "REJECTED" && (
                    <ActionButton action={moderateReview.bind(null, r.id, "REJECTED")} variant="soft">
                      <X className="size-4" aria-hidden="true" />
                      {t("reject")}
                    </ActionButton>
                  )}
                  <ConfirmButton action={deleteReview.bind(null, r.id)} title={t("deleteTitle")} description={t("deleteText")} ariaLabel={tc("delete")} className="text-danger">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </ConfirmButton>
                </div>
              </Card>
            </li>
          );
        })}
        {reviews.length === 0 && <Card className="p-10 text-center text-ink-soft">{tc("empty")}</Card>}
      </ul>
      <AdminPagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} basePath="/admin/reviews" params={{ ...params, status: status ?? "ALL" }} />
    </>
  );
}
