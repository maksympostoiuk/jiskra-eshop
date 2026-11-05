import type { PrismaClient } from "@prisma/client";
import { refreshProductAggregates } from "@/lib/catalog/aggregates";
import { LOCALES } from "@/i18n/routing";
import { specTextKey } from "@/lib/catalog/spec-format";
import type { ProductInput } from "@/lib/validation/admin";

/**
 * Writes a validated product (translations, variants + options, images, spec values, badges) in one
 * transaction and refreshes its aggregates. Cross-record checks (unique slugs/SKUs) happen before this.
 */
export async function persistProduct(
  db: PrismaClient,
  existing: { id: string; publishedAt: Date | null } | null,
  data: ProductInput,
  allowedSpecIds: Set<string>,
): Promise<string> {
  return db.$transaction(async (tx) => {
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
    const current = existing
      ? await tx.product.findUnique({ where: { id: existing.id }, select: { variants: { select: { id: true, sku: true } }, images: { select: { id: true } } } })
      : null;
    const keepIds = new Set(data.variants.map((v) => v.id).filter(Boolean) as string[]);
    const existingVariantIds = new Set(current?.variants.map((v) => v.id) ?? []);
    const removed = [...existingVariantIds].filter((vid) => !keepIds.has(vid));
    if (removed.length) await tx.productVariant.deleteMany({ where: { id: { in: removed } } });

    // Two-phase SKU update: kept variants whose SKU changes first get a temporary unique SKU, so swapping
    // SKUs between variants never hits the unique constraint. "~" is not allowed in real SKUs.
    const oldSku = new Map(current?.variants.map((v) => [v.id, v.sku]) ?? []);
    for (const v of data.variants) {
      if (v.id && existingVariantIds.has(v.id) && oldSku.get(v.id) !== v.sku) {
        await tx.productVariant.update({ where: { id: v.id }, data: { sku: `~${v.id}` } });
      }
    }

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
    const existingImageIds = new Set(current?.images.map((im) => im.id) ?? []);
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
          textKey: specTextKey(s.textCs, s.textEn),
        })),
      });
    }

    await refreshProductAggregates(tx, product.id);
    return product.id;
  });
}
