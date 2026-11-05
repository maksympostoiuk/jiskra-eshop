import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { MoveButtons } from "@/components/admin/move-buttons";
import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pills";
import { EmptyRow, Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { buildTree, flattenTree } from "@/lib/catalog/category-tree";
import { CategoryIcon } from "@/lib/category-icons";
import { pickTranslation } from "@/lib/i18n-content";
import { deleteCategory, moveCategory } from "@/server/admin/categories";

export default async function CategoriesPage() {
  const t = await getTranslations("admin.categories");
  const tc = await getTranslations("admin.common");
  const locale = await getLocale();
  const rows = await prisma.category.findMany({
    include: { translations: true, _count: { select: { products: true, specDefinitions: true } } },
  });
  const flat = flattenTree(buildTree(rows));
  const siblingsOf = (parentId: string | null) => flat.filter((c) => c.parentId === parentId);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link href="/admin/categories/new" className={buttonClasses("primary")}>
            <Plus className="size-4" aria-hidden="true" />
            {t("new")}
          </Link>
        }
      />
      <Table>
        <thead>
          <tr>
            <Th>{t("name")}</Th>
            <Th>{t("slug")}</Th>
            <Th className="text-right">{t("products")}</Th>
            <Th className="text-right">{t("specs")}</Th>
            <Th>{t("state")}</Th>
            <Th className="text-right">{tc("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {flat.map((c) => {
            const tr = pickTranslation(c.translations, locale);
            const siblings = siblingsOf(c.parentId);
            const index = siblings.findIndex((s) => s.id === c.id);
            return (
              <Tr key={c.id}>
                <Td>
                  <div className="flex items-center gap-2" style={{ paddingLeft: `${c.depth * 1.75}rem` }}>
                    {c.depth > 0 && <span className="text-ink-faint" aria-hidden="true">└</span>}
                    <span className="grid size-8 place-items-center rounded-full bg-muted text-ink-soft">
                      <CategoryIcon name={c.icon} className="size-4" />
                    </span>
                    <Link href={`/admin/categories/${c.id}`} className={c.depth === 0 ? "font-semibold hover:underline" : "hover:underline"}>
                      {tr?.name}
                    </Link>
                  </div>
                </Td>
                <Td className="font-mono text-xs text-ink-soft">{tr?.slug}</Td>
                <Td className="text-right">{c._count.products}</Td>
                <Td className="text-right">{c._count.specDefinitions}</Td>
                <Td>
                  <StatusPill status={c.isActive ? "ACTIVE" : "INACTIVE"} label={c.isActive ? tc("active") : tc("inactive")} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <MoveButtons
                      up={index > 0 ? moveCategory.bind(null, c.id, "up") : undefined}
                      down={index < siblings.length - 1 ? moveCategory.bind(null, c.id, "down") : undefined}
                      name={tr?.name ?? ""}
                    />
                    <Link href={`/admin/categories/${c.id}`} className={buttonClasses("ghost", "sm")} aria-label={`${tc("edit")}: ${tr?.name}`}>
                      <Pencil className="size-4" aria-hidden="true" />
                    </Link>
                    <ConfirmButton action={deleteCategory.bind(null, c.id)} title={t("deleteTitle")} description={t("deleteText", { name: tr?.name ?? "" })} ariaLabel={`${tc("delete")}: ${tr?.name}`} className="text-danger">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </ConfirmButton>
                  </div>
                </Td>
              </Tr>
            );
          })}
          {flat.length === 0 && <EmptyRow colSpan={6}>{tc("empty")}</EmptyRow>}
        </tbody>
      </Table>
    </>
  );
}
