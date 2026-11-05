import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductEditor } from "@/components/admin/product-editor";
import { productToForm } from "@/components/admin/product-form-model";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { pickTranslation } from "@/lib/i18n-content";
import { getProductEditorData } from "@/server/admin/product-editor-data";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.products");
  const tc = await getTranslations("admin.common");
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      translations: true,
      badges: { select: { id: true } },
      variants: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
      images: { orderBy: { sortOrder: "asc" }, include: { variant: { include: { options: true } } } },
      specValues: true,
    },
  });
  if (!product) notFound();
  const data = await getProductEditorData(locale);
  const tr = pickTranslation(product.translations, locale);
  return (
    <>
      <PageHeader
        title={tr?.name ?? t("edit")}
        back={{ href: "/admin/products", label: t("title") }}
        actions={
          product.status === "PUBLISHED" && tr ? (
            <a href={`/${locale}/product/${tr.slug}`} target="_blank" rel="noreferrer" className={buttonClasses("outline", "sm")}>
              <ExternalLink className="size-4" aria-hidden="true" />
              {t("viewInShop")}
            </a>
          ) : undefined
        }
      />
      {saved && (
        <Alert tone="success" className="mb-4">
          {tc("saved")}
        </Alert>
      )}
      <ProductEditor key={product.updatedAt.toISOString()} productId={product.id} initial={productToForm(product)} {...data} />
    </>
  );
}
