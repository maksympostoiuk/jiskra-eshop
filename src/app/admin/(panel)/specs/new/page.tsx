import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { SpecEditor } from "@/components/admin/simple-editors";
import { getCategoryOptions } from "@/server/admin/queries";

export default async function NewSpecPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const t = await getTranslations("admin.specs");
  const categories = await getCategoryOptions(await getLocale());
  return (
    <>
      <PageHeader title={t("new")} back={{ href: "/admin/specs", label: t("title") }} />
      <SpecEditor
        specId={null}
        categories={categories}
        initial={{ categoryId: category ?? "", key: "", type: "TEXT", isFilterable: false, isKey: false, sortOrder: 0, translations: { cs: { label: "", unit: "" }, en: { label: "", unit: "" } } }}
      />
    </>
  );
}
