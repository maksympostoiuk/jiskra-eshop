import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Server-rendered pagination preserving the other query parameters. */
export async function AdminPagination({
  page,
  pageCount,
  total,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const t = await getTranslations("admin.common");
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const linkClass = "inline-flex h-9 items-center gap-1 rounded-full border border-line bg-surface px-3 text-sm hover:border-ink";
  return (
    <nav aria-label={t("pagination")} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
      <p>{t("totalItems", { count: total })}</p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link className={linkClass} href={href(page - 1)} rel="prev">
              <ChevronLeft className="size-4" aria-hidden="true" />
              {t("prev")}
            </Link>
          ) : (
            <span className={cn(linkClass, "opacity-40")} aria-hidden="true">
              <ChevronLeft className="size-4" />
              {t("prev")}
            </span>
          )}
          <span aria-current="page">{t("pageOf", { page, pageCount })}</span>
          {page < pageCount ? (
            <Link className={linkClass} href={href(page + 1)} rel="next">
              {t("next")}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className={cn(linkClass, "opacity-40")} aria-hidden="true">
              {t("next")}
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}

export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
