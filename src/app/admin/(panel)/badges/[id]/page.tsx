import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { BadgeEditor } from "@/components/admin/simple-editors";
import { Alert } from "@/components/ui/alert";
import { prisma } from "@/lib/db";
import { pickTranslation, translationsByLocale } from "@/lib/i18n-content";

export default async function EditBadgePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const t = await getTranslations("admin.badges");
  const tc = await getTranslations("admin.common");
  const badge = await prisma.badge.findUnique({ where: { id }, include: { translations: true } });
  if (!badge) notFound();
  return (
    <>
      <PageHeader title={pickTranslation(badge.translations, await getLocale())?.label ?? badge.code} back={{ href: "/admin/badges", label: t("title") }} />
      {saved && <Alert tone="success" className="mb-4">{tc("saved")}</Alert>}
      <BadgeEditor
        key={badge.updatedAt.toISOString()}
        badgeId={id}
        initial={{ code: badge.code, bgColor: badge.bgColor, textColor: badge.textColor, sortOrder: badge.sortOrder, translations: translationsByLocale(badge.translations, (tr) => ({ label: tr?.label ?? "" })) }}
      />
    </>
  );
}
