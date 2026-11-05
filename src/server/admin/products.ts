"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { refreshProductAggregates } from "@/lib/catalog/aggregates";
import { ancestorIds } from "@/lib/catalog/category-tree";
import { LOCALES } from "@/i18n/routing";
import { getStorage, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import { productSchema, type ProductInput } from "@/lib/validation/admin";
import { validateInput, type ActionResult } from "../action";

export async function saveProduct(productId: string | null, input: ProductInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const t = await getTranslations("admin.common");
  const tv = await getTranslations("validation");

  const parsed = await validateInput(productSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors, message: t("fixErrors") };
  const data = parsed.data;

  const existing = productId ? await prisma.product.findUnique({ where: { id: productId }, include: { variants: { select: { id: true } }, images: { select: { id: true } } } }) : null;
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
  if (Object.keys(errors).length) return { ok: false, errors, message: t("fixErrors") };

  const allowedSpecIds = new Set(
    (
      await prisma.specDefinition.findMany({
        where: { categoryId: { in: ancestorIds(categories, data.categoryId) } },
        select: { id: true },
      })
    ).map((s) => s.id),
  );

  const id = await prisma.$transaction(async (tx) => {
    const base = {
      categoryId: data.categoryId,
      brandId: data.brandId || null,
      status: data.status,
      isFeatured: data.isFeatured,
      publishedAt: data.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : null,
    };
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data: { ...base, badges: { set: data.badgeIds.map((b) => ({ id: b })) } } })
      : await tx.product.create({ data: { ...base, badges: { connect: data.badgeIds.map((b) => ({ id: b })) } } });

    for (const locale of LOCALES) {
      const tr = data.translations[locale];
      const fields = {
        name: tr.name,
        slug: tr.slug,
        shortDescription: tr.shortDescription,
        description: tr.description,
        seoTitle: tr.seoTitle || null,
        seoDescription: tr.seoDescription || null,
      };
      await tx.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale } },
        create: { productId: product.id, locale, ...fields },
        update: fields,
      });
    }

    // Variants: update kept ones, create new ones, delete removed ones.
    const keepIds = new Set(data.variants.map((v) => v.id).filter(Boolean) as string[]);
    const existingVariantIds = new Set(existing?.variants.map((v) => v.id) ?? []);
    const removed = [...existingVariantIds].filter((vid) => !keepIds.has(vid));
    if (removed.length) await tx.productVariant.deleteMany({ where: { id: { in: removed } } });

    const colorToVariant = new Map<string, string>();
    for (const [i, v] of data.variants.entries()) {
      const fields = {
        sku: v.sku,
        priceCzk: v.priceCzk,
        priceUsd: v.priceUsd,
        oldPriceCzk: v.oldPriceCzk,
        oldPriceUsd: v.oldPriceUsd,
        stock: v.stock,
        sortOrder: i,
      };
      const options = v.options.map((o, j) => ({ ...o, sortOrder: j }));
      let variantId: string;
      if (v.id && existingVariantIds.has(v.id)) {
        await tx.variantOption.deleteMany({ where: { variantId: v.id } });
        await tx.productVariant.update({ where: { id: v.id }, data: { ...fields, options: { create: options } } });
        variantId = v.id;
      } else {
        variantId = (await tx.productVariant.create({ data: { ...fields, productId: product.id, options: { create: options } } })).id;
      }
      const color = v.options.find((o) => o.name === "color")?.value;
      if (color && !colorToVariant.has(color)) colorToVariant.set(color, variantId);
    }

    // Images: keep order of the editor; link to the first variant of the selected colour.
    const keepImageIds = new Set(data.images.map((im) => im.id).filter(Boolean) as string[]);
    const existingImageIds = new Set(existing?.images.map((im) => im.id) ?? []);
    await tx.productImage.deleteMany({ where: { productId: product.id, id: { notIn: [...keepImageIds] } } });
    for (const [i, im] of data.images.entries()) {
      const fields = {
        url: im.url,
        altCs: im.altCs,
        altEn: im.altEn,
        sortOrder: i,
        variantId: im.colorValue ? (colorToVariant.get(im.colorValue) ?? null) : null,
      };
      if (im.id && existingImageIds.has(im.id)) await tx.productImage.update({ where: { id: im.id }, data: fields });
      else await tx.productImage.create({ data: { ...fields, productId: product.id } });
    }

    // Spec values: replace with the non-empty values for applicable definitions.
    await tx.productSpecValue.deleteMany({ where: { productId: product.id } });
    const values = data.specValues.filter(
      (s) => allowedSpecIds.has(s.specDefinitionId) && (s.numberValue !== null || s.boolValue !== null || s.textCs || s.textEn),
    );
    if (values.length) {
      await tx.productSpecValue.createMany({
        data: values.map((s) => ({
          productId: product.id,
          specDefinitionId: s.specDefinitionId,
          numberValue: s.numberValue,
          boolValue: s.boolValue,
          textCs: s.textCs || s.textEn || null,
          textEn: s.textEn || s.textCs || null,
        })),
      });
    }

    await refreshProductAggregates(tx, product.id);
    return product.id;
  });

  revalidatePath("/admin/products");
  return { ok: true, data: { id }, message: t("saved") };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.product.delete({ where: { id: productId } }).catch(() => null);
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function setProductStatus(productId: string, status: "DRAFT" | "PUBLISHED"): Promise<ActionResult> {
  await requireAdmin();
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { publishedAt: true } });
  if (!product) return { ok: false };
  await prisma.product.update({
    where: { id: productId },
    data: { status, publishedAt: status === "PUBLISHED" ? (product.publishedAt ?? new Date()) : product.publishedAt },
  });
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
    if (!ALLOWED_IMAGE_TYPES[file.type]) return { ok: false, message: t("badType", { name: file.name }) };
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: t("tooLarge", { name: file.name, mb: MAX_UPLOAD_BYTES / 1024 / 1024 }) };
    const stored = await storage.save({ filename: file.name, contentType: file.type, data: new Uint8Array(await file.arrayBuffer()) });
    urls.push(stored.url);
  }
  return { ok: true, data: { urls } };
}
