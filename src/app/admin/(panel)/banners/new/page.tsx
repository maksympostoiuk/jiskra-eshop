import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { BannerEditor } from "@/components/admin/simple-editors";

export default async function NewBannerPage() {
  const t = await getTranslations("admin.banners");
  const empty = { title: "", subtitle: "", ctaLabel: "", linkUrl: "", imageAlt: "" };
  return (
    <>
      <PageHeader title={t("new")} back={{ href: "/admin/banners", label: t("title") }} />
      <BannerEditor
        bannerId={null}
        initial={{ placement: "PROMO", imageUrl: null, bgColor: "#e1eeeb", textColor: "#25212b", sortOrder: 0, isActive: true, startsAt: "", endsAt: "", translations: { cs: { ...empty }, en: { ...empty } } }}
      />
    </>
  );
}
