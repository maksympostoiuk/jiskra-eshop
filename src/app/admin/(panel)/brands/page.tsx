import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { AdminPagination, parsePage } from "@/components/admin/pagination";
import { StatusPill } from "@/components/admin/status-pills";
import { EmptyRow, FilterBar, Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/text";
import { deleteBrand } from "@/server/admin/merch";

const PER_PAGE = 20;

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations("admin.brands");
  const tc = await getTranslations("admin.common");
  const page = parsePage(params.page);
  // The slug is the normalized name, so matching the slugified query is case- and accent-insensitive everywhere.
  const q = params.q?.trim();
  const where: Prisma.BrandWhereInput = q ? { OR: [{ slug: { contains: slugify(q) } }, { name: { contains: q } }] } : {};
  const [total, brands] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.findMany({ where, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { products: true } } } }),
  ]);
  return (
    <>
      <PageHeader title={t("title")} actions={<Link href="/admin/brands/new" className={buttonClasses("primary")}><Plus className="size-4" aria-hidden="true" />{t("new")}</Link>} />
      <FilterBar action="/admin/brands">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-ink-soft">
          {tc("search")}
          <Input name="q" defaultValue={params.q} />
        </label>
        <button type="submit" className={buttonClasses("outline")}>{tc("filter")}</button>
      </FilterBar>
      <Table>
        <thead>
          <tr>
            <Th>{t("name")}</Th>
            <Th>{t("slug")}</Th>
            <Th className="text-right">{t("products")}</Th>
            <Th>{t("state")}</Th>
            <Th className="text-right">{tc("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {brands.map((b) => (
            <Tr key={b.id}>
              <Td><Link href={`/admin/brands/${b.id}`} className="font-medium hover:underline">{b.name}</Link></Td>
              <Td className="font-mono text-xs text-ink-soft">{b.slug}</Td>
              <Td className="text-right">{b._count.products}</Td>
              <Td><StatusPill status={b.isActive ? "ACTIVE" : "INACTIVE"} label={b.isActive ? tc("active") : tc("inactive")} /></Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <Link href={`/admin/brands/${b.id}`} className={buttonClasses("ghost", "sm")} aria-label={`${tc("edit")}: ${b.name}`}><Pencil className="size-4" aria-hidden="true" /></Link>
                  <ConfirmButton action={deleteBrand.bind(null, b.id)} title={t("deleteTitle")} description={t("deleteText", { name: b.name, count: b._count.products })} ariaLabel={`${tc("delete")}: ${b.name}`} className="text-danger">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </ConfirmButton>
                </div>
              </Td>
            </Tr>
          ))}
          {brands.length === 0 && <EmptyRow colSpan={5}>{tc("empty")}</EmptyRow>}
        </tbody>
      </Table>
      <AdminPagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} basePath="/admin/brands" params={params} />
    </>
  );
}
