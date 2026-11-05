import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CategoryEditor } from "@/components/admin/category-editor";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/alert";
import { prisma } from "@/lib/db";
import { descendantIds } from "@/lib/catalog/category-tree";
import { pickTranslation, translationsByLocale } from "@/lib/i18n-content";
import { getCategoryOptions } from "@/server/admin/queries";

export default async function EditCategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.categories");
  const tc = await getTranslations("admin.common");
  const category = await prisma.category.findUnique({ where: { id }, include: { translations: true } });
  if (!category) notFound();
  const all = await prisma.category.findMany({ select: { id: true, parentId: true, sortOrder: true } });
  const blocked = new Set(descendantIds(all, id));
  const parents = (await getCategoryOptions(locale)).filter((c) => !blocked.has(c.id));
  return (
    <>
      <PageHeader title={pickTranslation(category.translations, locale)?.name ?? t("edit")} back={{ href: "/admin/categories", label: t("title") }} />
      {saved && <Alert tone="success" className="mb-4">{tc("saved")}</Alert>}
      <CategoryEditor
        key={category.updatedAt.toISOString()}
        categoryId={id}
        parents={parents}
        initial={{
          parentId: category.parentId,
          icon: category.icon,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          translations: translationsByLocale(category.translations, (tr) => ({
            name: tr?.name ?? "",
            slug: tr?.slug ?? "",
            description: tr?.description ?? "",
            seoTitle: tr?.seoTitle ?? "",
            seoDescription: tr?.seoDescription ?? "",
          })),
        }}
      />
    </>
  );
}
