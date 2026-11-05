"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { ancestorIds } from "@/lib/catalog/category-tree";
import { LOCALES } from "@/i18n/routing";
import { getStorage, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import { sniffImageType } from "@/lib/storage/sniff";
import { productSchema, type ProductInput } from "@/lib/validation/admin";
import { persistProduct } from "@/lib/catalog/save-product";
import { cleanupUploads } from "../uploads";
import { isUniqueViolation, validateInput, type ActionResult } from "../action";

export async function saveProduct(productId: string | null, input: ProductInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const t = await getTranslations("admin.common");
  const tv = await getTranslations("validation");

  const parsed = await validateInput(productSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors, message: t("fixErrors") };
  const data = parsed.data;

  const existing = productId ? await prisma.product.findUnique({ where: { id: productId }, select: { id: true, publishedAt: true } }) : null;
  if (productId && !existing) return { ok: false, message: t("notFound") };

  // Cross-record checks: unique slugs per locale and unique SKUs across products.
  const errors: Record<string, string> = {};
  for (const locale of LOCALES) {
    const clash = await prisma.productTranslation.findFirst({
      where: { locale, slug: data.translations[locale].slug, ...(productId ? { NOT: { productId } } : {}) },
      select: { id: true },
    });
    if (clash) errors[`translations.${locale}.slug`] = tv("slugTaken");
  }
  const skuClashes = await prisma.productVariant.findMany({
    where: { sku: { in: data.variants.map((v) => v.sku) }, ...(productId ? { NOT: { productId } } : {}) },
    select: { sku: true },
  });
  data.variants.forEach((v, i) => {
    if (skuClashes.some((c) => c.sku === v.sku)) errors[`variants.${i}.sku`] = tv("skuTaken");
  });

  const categories = await prisma.category.findMany({ select: { id: true, parentId: true, sortOrder: true } });
  if (!categories.some((c) => c.id === data.categoryId)) errors.categoryId = tv("required");
  if (data.brandId && !(await prisma.brand.findUnique({ where: { id: data.brandId }, select: { id: true } }))) errors.brandId = tv("required");
  if (data.badgeIds.length && (await prisma.badge.count({ where: { id: { in: data.badgeIds } } })) !== new Set(data.badgeIds).size) errors.badgeIds = tv("required");
  if (Object.keys(errors).length) return { ok: false, errors, message: t("fixErrors") };

  const allowedSpecIds = new Set(
    (
      await prisma.specDefinition.findMany({
        where: { categoryId: { in: ancestorIds(categories, data.categoryId) } },
        select: { id: true },
      })
    ).map((s) => s.id),
  );

  const previousImages = productId ? (await prisma.productImage.findMany({ where: { productId }, select: { url: true } })).map((i) => i.url) : [];
  let id: string;
  try {
    id = await persistProduct(prisma, existing, data, allowedSpecIds);
  } catch (error) {
    // Concurrent edits can still collide on unique slugs/SKUs; report instead of crashing.
    if (isUniqueViolation(error)) return { ok: false, message: tv("skuOrSlugTaken") };
    throw error;
  }

  await cleanupUploads(previousImages);
  revalidatePath("/admin/products");
  return { ok: true, data: { id }, message: t("saved") };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  await requireAdmin();
  const images = await prisma.productImage.findMany({ where: { productId }, select: { url: true } });
  await prisma.product.delete({ where: { id: productId } }).catch(() => null);
  await cleanupUploads(images.map((i) => i.url));
  revalidatePath("/admin/products");
  return { ok: true };
}

/** Uploads images through the Storage interface; returns their public URLs. */
export async function uploadImages(formData: FormData): Promise<ActionResult<{ urls: string[] }>> {
  await requireAdmin();
  const t = await getTranslations("admin.images");
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, message: t("noFiles") };
  const storage = getStorage();
  const urls: string[] = [];
  for (const file of files.slice(0, 20)) {
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: t("tooLarge", { name: file.name, mb: MAX_UPLOAD_BYTES / 1024 / 1024 }) };
    const data = new Uint8Array(await file.arrayBuffer());
    const contentType = sniffImageType(data);
    if (!contentType || !ALLOWED_IMAGE_TYPES[contentType]) return { ok: false, message: t("badType", { name: file.name }) };
    const stored = await storage.save({ filename: file.name, contentType, data });
    urls.push(stored.url);
  }
  return { ok: true, data: { urls } };
}
