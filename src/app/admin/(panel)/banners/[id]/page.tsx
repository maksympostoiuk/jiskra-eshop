import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { BannerEditor } from "@/components/admin/simple-editors";
import { Alert } from "@/components/ui/alert";
import { prisma } from "@/lib/db";
import { toDateTimeLocal } from "@/lib/dates";
import { BANNER_PLACEMENTS, isOneOf } from "@/lib/domain";
import { pickTranslation, translationsByLocale } from "@/lib/i18n-content";

export default async function EditBannerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const t = await getTranslations("admin.banners");
  const tc = await getTranslations("admin.common");
  const banner = await prisma.banner.findUnique({ where: { id }, include: { translations: true } });
  if (!banner) notFound();
  return (
    <>
      <PageHeader title={pickTranslation(banner.translations, await getLocale())?.title ?? t("edit")} back={{ href: "/admin/banners", label: t("title") }} />
      {saved && <Alert tone="success" className="mb-4">{tc("saved")}</Alert>}
      <BannerEditor
        key={banner.updatedAt.toISOString()}
        bannerId={id}
        initial={{
          placement: isOneOf(BANNER_PLACEMENTS, banner.placement) ? banner.placement : "PROMO",
          imageUrl: banner.imageUrl,
          bgColor: banner.bgColor,
          textColor: banner.textColor,
          sortOrder: banner.sortOrder,
          isActive: banner.isActive,
          startsAt: toDateTimeLocal(banner.startsAt),
          endsAt: toDateTimeLocal(banner.endsAt),
          translations: translationsByLocale(banner.translations, (tr) => ({
            title: tr?.title ?? "",
            subtitle: tr?.subtitle ?? "",
            ctaLabel: tr?.ctaLabel ?? "",
            linkUrl: tr?.linkUrl ?? "",
            imageAlt: tr?.imageAlt ?? "",
          })),
        }}
      />
    </>
  );
}
