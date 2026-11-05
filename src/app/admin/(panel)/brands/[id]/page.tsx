import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { BrandEditor } from "@/components/admin/simple-editors";
import { Alert } from "@/components/ui/alert";
import { prisma } from "@/lib/db";

export default async function EditBrandPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const t = await getTranslations("admin.brands");
  const tc = await getTranslations("admin.common");
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();
  return (
    <>
      <PageHeader title={brand.name} back={{ href: "/admin/brands", label: t("title") }} />
      {saved && <Alert tone="success" className="mb-4">{tc("saved")}</Alert>}
      <BrandEditor
        key={brand.updatedAt.toISOString()}
        brandId={id}
        initial={{ name: brand.name, slug: brand.slug, logoUrl: brand.logoUrl, website: brand.website ?? "", sortOrder: brand.sortOrder, isActive: brand.isActive }}
      />
    </>
  );
}
