import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { SpecEditor } from "@/components/admin/simple-editors";
import { Alert } from "@/components/ui/alert";
import { prisma } from "@/lib/db";
import { isOneOf, SPEC_TYPES } from "@/lib/domain";
import { pickTranslation, translationsByLocale } from "@/lib/i18n-content";
import { getCategoryOptions } from "@/server/admin/queries";

export default async function EditSpecPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.specs");
  const tc = await getTranslations("admin.common");
  const spec = await prisma.specDefinition.findUnique({ where: { id }, include: { translations: true } });
  if (!spec) notFound();
  const categories = await getCategoryOptions(locale);
  return (
    <>
      <PageHeader title={pickTranslation(spec.translations, locale)?.label ?? spec.key} back={{ href: "/admin/specs", label: t("title") }} />
      {saved && <Alert tone="success" className="mb-4">{tc("saved")}</Alert>}
      <SpecEditor
        key={spec.updatedAt.toISOString()}
        specId={id}
        categories={categories}
        initial={{
          categoryId: spec.categoryId,
          key: spec.key,
          type: isOneOf(SPEC_TYPES, spec.type) ? spec.type : "TEXT",
          isFilterable: spec.isFilterable,
          isKey: spec.isKey,
          sortOrder: spec.sortOrder,
          translations: translationsByLocale(spec.translations, (tr) => ({ label: tr?.label ?? "", unit: tr?.unit ?? "" })),
        }}
      />
    </>
  );
}
