import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyRow, Table, Td, Th, Tr } from "@/components/admin/table";
import { buttonClasses } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { pickTranslation } from "@/lib/i18n-content";
import { deleteBadge } from "@/server/admin/merch";

export default async function BadgesPage() {
  const t = await getTranslations("admin.badges");
  const tc = await getTranslations("admin.common");
  const locale = await getLocale();
  const badges = await prisma.badge.findMany({ orderBy: { sortOrder: "asc" }, include: { translations: true, _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<Link href="/admin/badges/new" className={buttonClasses("primary")}><Plus className="size-4" aria-hidden="true" />{t("new")}</Link>} />
      <Table>
        <thead>
          <tr>
            <Th>{t("label")}</Th>
            <Th>{t("code")}</Th>
            <Th>{t("translations")}</Th>
            <Th className="text-right">{t("products")}</Th>
            <Th className="text-right">{tc("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {badges.map((b) => {
            const label = pickTranslation(b.translations, locale)?.label ?? b.code;
            return (
              <Tr key={b.id}>
                <Td>
                  <Link href={`/admin/badges/${b.id}`} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: b.bgColor, color: b.textColor }}>{label}</Link>
                </Td>
                <Td className="font-mono text-xs">{b.code}</Td>
                <Td className="text-ink-soft">{b.translations.map((tr) => `${tr.locale.toUpperCase()}: ${tr.label}`).join(" · ")}</Td>
                <Td className="text-right">{b._count.products}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/badges/${b.id}`} className={buttonClasses("ghost", "sm")} aria-label={`${tc("edit")}: ${label}`}><Pencil className="size-4" aria-hidden="true" /></Link>
                    <ConfirmButton action={deleteBadge.bind(null, b.id)} title={t("deleteTitle")} description={t("deleteText", { name: label })} ariaLabel={`${tc("delete")}: ${label}`} className="text-danger">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </ConfirmButton>
                  </div>
                </Td>
              </Tr>
            );
          })}
          {badges.length === 0 && <EmptyRow colSpan={5}>{tc("empty")}</EmptyRow>}
        </tbody>
      </Table>
    </>
  );
}
