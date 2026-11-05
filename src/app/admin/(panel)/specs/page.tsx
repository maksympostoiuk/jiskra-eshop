import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyRow, FilterBar, Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { prisma } from "@/lib/db";
import { pickTranslation } from "@/lib/i18n-content";
import { deleteSpecDefinition } from "@/server/admin/merch";
import { getCategoryOptions } from "@/server/admin/queries";

export default async function SpecsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations("admin.specs");
  const tc = await getTranslations("admin.common");
  const locale = await getLocale();
  const categories = await getCategoryOptions(locale);
  const specs = await prisma.specDefinition.findMany({
    where: params.category ? { categoryId: params.category } : {},
    include: { translations: true, _count: { select: { values: true } } },
  });
  const catOrder = new Map(categories.map((c, i) => [c.id, i]));
  specs.sort((a, b) => (catOrder.get(a.categoryId) ?? 0) - (catOrder.get(b.categoryId) ?? 0) || a.sortOrder - b.sortOrder);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={<Link href={`/admin/specs/new${params.category ? `?category=${params.category}` : ""}`} className={buttonClasses("primary")}><Plus className="size-4" aria-hidden="true" />{t("new")}</Link>}
      />
      <FilterBar action="/admin/specs">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          {t("category")}
          <Select name="category" defaultValue={params.category ?? ""}>
            <option value="">{tc("all")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </label>
        <button type="submit" className={buttonClasses("outline")}>{tc("filter")}</button>
      </FilterBar>
      <Table>
        <thead>
          <tr>
            <Th>{t("label")}</Th>
            <Th>{t("key")}</Th>
            <Th>{t("category")}</Th>
            <Th>{t("type")}</Th>
            <Th className="text-center">{t("filterableShort")}</Th>
            <Th className="text-center">{t("isKeyShort")}</Th>
            <Th className="text-right">{t("values")}</Th>
            <Th className="text-right">{tc("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {specs.map((s) => {
            const tr = pickTranslation(s.translations, locale);
            return (
              <Tr key={s.id}>
                <Td>
                  <Link href={`/admin/specs/${s.id}`} className="font-medium hover:underline">{tr?.label}</Link>
                  {tr?.unit && <span className="ml-1 text-ink-faint">({tr.unit})</span>}
                </Td>
                <Td className="font-mono text-xs">{s.key}</Td>
                <Td className="text-ink-soft">{catName.get(s.categoryId)}</Td>
                <Td>{t(`types.${s.type === "NUMBER" || s.type === "BOOLEAN" ? s.type : "TEXT"}`)}</Td>
                <Td className="text-center">{s.isFilterable && <Check className="mx-auto size-4 text-success" aria-label={tc("yes")} />}</Td>
                <Td className="text-center">{s.isKey && <Check className="mx-auto size-4 text-success" aria-label={tc("yes")} />}</Td>
                <Td className="text-right">{s._count.values}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/specs/${s.id}`} className={buttonClasses("ghost", "sm")} aria-label={`${tc("edit")}: ${tr?.label}`}><Pencil className="size-4" aria-hidden="true" /></Link>
                    <ConfirmButton action={deleteSpecDefinition.bind(null, s.id)} title={t("deleteTitle")} description={t("deleteText", { name: tr?.label ?? s.key, count: s._count.values })} ariaLabel={`${tc("delete")}: ${tr?.label}`} className="text-danger">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </ConfirmButton>
                  </div>
                </Td>
              </Tr>
            );
          })}
          {specs.length === 0 && <EmptyRow colSpan={8}>{tc("empty")}</EmptyRow>}
        </tbody>
      </Table>
    </>
  );
}
