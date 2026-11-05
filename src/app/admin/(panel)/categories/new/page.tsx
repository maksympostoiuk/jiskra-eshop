import { getLocale, getTranslations } from "next-intl/server";
import { CategoryEditor } from "@/components/admin/category-editor";
import { PageHeader } from "@/components/admin/page-header";
import { getCategoryOptions } from "@/server/admin/queries";

export default async function NewCategoryPage({ searchParams }: { searchParams: Promise<{ parent?: string }> }) {
  const { parent } = await searchParams;
  const t = await getTranslations("admin.categories");
  const parents = await getCategoryOptions(await getLocale());
  const empty = { name: "", slug: "", description: "", seoTitle: "", seoDescription: "" };
  return (
    <>
      <PageHeader title={t("new")} back={{ href: "/admin/categories", label: t("title") }} />
      <CategoryEditor
        categoryId={null}
        parents={parents}
        initial={{ parentId: parent ?? null, icon: "package", sortOrder: 0, isActive: true, translations: { cs: { ...empty }, en: { ...empty } } }}
      />
    </>
  );
}
