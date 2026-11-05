import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { BrandEditor } from "@/components/admin/simple-editors";

export default async function NewBrandPage() {
  const t = await getTranslations("admin.brands");
  return (
    <>
      <PageHeader title={t("new")} back={{ href: "/admin/brands", label: t("title") }} />
      <BrandEditor brandId={null} initial={{ name: "", slug: "", logoUrl: null, website: "", sortOrder: 0, isActive: true }} />
    </>
  );
}
