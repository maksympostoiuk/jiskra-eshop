import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { BadgeEditor } from "@/components/admin/simple-editors";

export default async function NewBadgePage() {
  const t = await getTranslations("admin.badges");
  return (
    <>
      <PageHeader title={t("new")} back={{ href: "/admin/badges", label: t("title") }} />
      <BadgeEditor badgeId={null} initial={{ code: "", bgColor: "#1d5c55", textColor: "#ffffff", sortOrder: 0, translations: { cs: { label: "" }, en: { label: "" } } }} />
    </>
  );
}
