import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { AdminPagination, parsePage } from "@/components/admin/pagination";
import { StatusPill } from "@/components/admin/status-pills";
import { EmptyRow, FilterBar, Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { prisma } from "@/lib/db";
import { descendantIds } from "@/lib/catalog/category-tree";
import { pickTranslation } from "@/lib/i18n-content";
import { formatMoney } from "@/lib/money";
import { normalizeText } from "@/lib/text";
import { deleteProduct } from "@/server/admin/products";
import { getBrandOptions, getCategoryOptions } from "@/server/admin/queries";

const PER_PAGE = 20;
type Search = { q?: string; category?: string; brand?: string; status?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const t = await getTranslations("admin.products");
  const tc = await getTranslations("admin.common");
  const locale = await getLocale();
  const page = parsePage(params.page);
  const [categories, brands, allCats] = await Promise.all([
    getCategoryOptions(locale),
    getBrandOptions(),
    prisma.category.findMany({ select: { id: true, parentId: true, sortOrder: true } }),
  ]);

  const where: Prisma.ProductWhereInput = {};
  if (params.q?.trim()) {
    const q = normalizeText(params.q);
    where.OR = [{ translations: { some: { searchText: { contains: q } } } }, { variants: { some: { sku: { contains: params.q.trim().toUpperCase() } } } }];
  }
  if (params.category) where.categoryId = { in: descendantIds(allCats, params.category) };
  if (params.brand) where.brandId = params.brand;
  if (params.status === "DRAFT" || params.status === "PUBLISHED") where.status = params.status;

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        translations: true,
        brand: { select: { name: true } },
        category: { include: { translations: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { stock: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <Link href="/admin/products/new" className={buttonClasses("primary")}>
            <Plus className="size-4" aria-hidden="true" />
            {t("new")}
          </Link>
        }
      />
      <FilterBar action="/admin/products">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-ink-soft">
          {tc("search")}
          <Input name="q" defaultValue={params.q} placeholder={t("searchPlaceholder")} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          {t("category")}
          <Select name="category" defaultValue={params.category ?? ""}>
            <option value="">{tc("all")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          {t("brand")}
          <Select name="brand" defaultValue={params.brand ?? ""}>
            <option value="">{tc("all")}</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          {t("status")}
          <Select name="status" defaultValue={params.status ?? ""}>
            <option value="">{tc("all")}</option>
            <option value="PUBLISHED">{tc("status.PUBLISHED")}</option>
            <option value="DRAFT">{tc("status.DRAFT")}</option>
          </Select>
        </label>
        <button type="submit" className={buttonClasses("outline")}>
          {tc("filter")}
        </button>
      </FilterBar>

      <Table>
        <thead>
          <tr>
            <Th className="w-16">
              <span className="sr-only">{t("image")}</span>
            </Th>
            <Th>{t("name")}</Th>
            <Th>{t("category")}</Th>
            <Th>{t("status")}</Th>
            <Th className="text-right">{t("priceFrom")}</Th>
            <Th className="text-right">{t("stock")}</Th>
            <Th className="text-right">{tc("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const name = pickTranslation(p.translations, locale)?.name ?? p.id;
            const stock = p.variants.reduce((s, v) => s + v.stock, 0);
            return (
              <Tr key={p.id}>
                <Td>
                  {p.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                    <img src={p.images[0].url} alt="" className="size-11 max-w-none rounded-md border border-line bg-canvas object-contain" />
                  )}
                </Td>
                <Td>
                  <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                    {name}
                  </Link>
                  <div className="text-xs text-ink-faint">{p.brand?.name ?? "—"} · {t("variantCount", { count: p.variants.length })}</div>
                </Td>
                <Td className="text-ink-soft">{pickTranslation(p.category.translations, locale)?.name}</Td>
                <Td>
                  <StatusPill status={p.status} label={tc(`status.${p.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"}`)} />
                </Td>
                <Td className="text-right whitespace-nowrap">
                  {formatMoney(p.minPriceCzk, "CZK", locale)}
                  <div className="text-xs text-ink-faint">{formatMoney(p.minPriceUsd, "USD", locale)}</div>
                </Td>
                <Td className={stock === 0 ? "text-right font-semibold text-danger" : "text-right"}>{stock}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/products/${p.id}`} className={buttonClasses("ghost", "sm")} aria-label={`${tc("edit")}: ${name}`}>
                      <Pencil className="size-4" aria-hidden="true" />
                    </Link>
                    <ConfirmButton
                      action={deleteProduct.bind(null, p.id)}
                      title={t("deleteTitle")}
                      description={t("deleteText", { name })}
                      ariaLabel={`${tc("delete")}: ${name}`}
                      className="text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </ConfirmButton>
                  </div>
                </Td>
              </Tr>
            );
          })}
          {products.length === 0 && <EmptyRow colSpan={7}>{tc("empty")}</EmptyRow>}
        </tbody>
      </Table>
      <AdminPagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} basePath="/admin/products" params={params} />
    </>
  );
}
