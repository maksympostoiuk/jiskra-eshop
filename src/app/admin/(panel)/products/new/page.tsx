import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { ProductEditor } from "@/components/admin/product-editor";
import { emptyProductForm } from "@/components/admin/product-form-model";
import { getProductEditorData } from "@/server/admin/product-editor-data";

export default async function NewProductPage() {
  const t = await getTranslations("admin.products");
  const data = await getProductEditorData(await getLocale());
  return (
    <>
      <PageHeader title={t("new")} back={{ href: "/admin/products", label: t("title") }} />
      <ProductEditor productId={null} initial={emptyProductForm()} {...data} />
    </>
  );
}
