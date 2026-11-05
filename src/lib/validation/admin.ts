import * as z from "zod";
import {
  ADMIN_ROLES,
  BANNER_PLACEMENTS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PRODUCT_STATUSES,
  REVIEW_STATUSES,
  SPEC_TYPES,
  VARIANT_OPTION_NAMES,
} from "@/lib/domain";
import { USD_ROUNDING_MODES } from "@/lib/money";
import { email, hexColor, id, imagePath, link, localized, minor, optionalMinor, optionalText, required, slug, sortOrder } from "./common";

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "v.required" }).max(200),
});

// ── Products ────────────────────────────────────────────────────────────────

export const productTranslationSchema = z.object({
  name: required(200),
  slug,
  shortDescription: optionalText(500),
  description: optionalText(20000),
  seoTitle: optionalText(120),
  seoDescription: optionalText(300),
});

export const variantOptionSchema = z.object({
  name: z.enum(VARIANT_OPTION_NAMES),
  value: z.string().trim().min(1, { error: "v.required" }).max(60),
  labelCs: required(60),
  labelEn: required(60),
  colorHex: hexColor.nullable(),
});

export const variantSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string().trim().min(1, { error: "v.required" }).max(64).regex(/^[A-Za-z0-9._-]+$/, { error: "v.sku" }),
    priceCzk: minor.min(1, { error: "v.pricePositive" }),
    priceUsd: minor.min(1, { error: "v.pricePositive" }),
    oldPriceCzk: optionalMinor,
    oldPriceUsd: optionalMinor,
    stock: z.number({ error: "v.integer" }).int({ error: "v.integer" }).min(0, { error: "v.nonNegative" }).max(1_000_000),
    options: z.array(variantOptionSchema).max(6),
  })
  .superRefine((v, ctx) => {
    if (v.oldPriceCzk !== null && v.oldPriceCzk <= v.priceCzk)
      ctx.addIssue({ code: "custom", path: ["oldPriceCzk"], message: "v.oldPrice" });
    if (v.oldPriceUsd !== null && v.oldPriceUsd <= v.priceUsd)
      ctx.addIssue({ code: "custom", path: ["oldPriceUsd"], message: "v.oldPrice" });
  });

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: imagePath,
  altCs: optionalText(200),
  altEn: optionalText(200),
  /** colour option value the image belongs to (null = all variants) */
  colorValue: z.string().max(60).nullable(),
});

export const specValueInputSchema = z.object({
  specDefinitionId: id,
  numberValue: z.number().finite().nullable(),
  boolValue: z.boolean().nullable(),
  textCs: z.string().trim().max(200).nullable(),
  textEn: z.string().trim().max(200).nullable(),
});

export const productSchema = z
  .object({
    categoryId: z.string().min(1, { error: "v.required" }),
    brandId: z.string().nullable(),
    status: z.enum(PRODUCT_STATUSES),
    isFeatured: z.boolean(),
    badgeIds: z.array(id).max(20),
    translations: localized(productTranslationSchema),
    variants: z.array(variantSchema).min(1, { error: "v.variantsMin" }).max(200),
    images: z.array(productImageSchema).max(40),
    specValues: z.array(specValueInputSchema).max(200),
  })
  .superRefine((p, ctx) => {
    const skus = new Map<string, number>();
    const combos = new Map<string, number>();
    p.variants.forEach((v, i) => {
      const sku = v.sku.toUpperCase();
      if (skus.has(sku)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "v.skuDuplicate" });
      skus.set(sku, i);
      const combo = v.options
        .map((o) => `${o.name}=${o.value}`)
        .sort()
        .join("&");
      if (combos.has(combo)) ctx.addIssue({ code: "custom", path: ["variants", i, "options"], message: "v.variantDuplicate" });
      combos.set(combo, i);
    });
  });
export type ProductInput = z.infer<typeof productSchema>;

// ── Categories, brands, specs ───────────────────────────────────────────────

export const categoryTranslationSchema = z.object({
  name: required(120),
  slug,
  description: optionalText(2000),
  seoTitle: optionalText(120),
  seoDescription: optionalText(300),
});

export const categorySchema = z.object({
  parentId: z.string().nullable(),
  icon: z.string().trim().min(1).max(40),
  sortOrder,
  isActive: z.boolean(),
  translations: localized(categoryTranslationSchema),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const brandSchema = z.object({
  name: required(80),
  slug,
  logoUrl: imagePath.nullable(),
  website: z.union([z.literal(""), z.url({ error: "v.url" }).max(300)]),
  sortOrder,
  isActive: z.boolean(),
});
export type BrandInput = z.infer<typeof brandSchema>;

export const specDefinitionSchema = z.object({
  categoryId: z.string().min(1, { error: "v.required" }),
  key: z.string().trim().min(1, { error: "v.required" }).max(40).regex(/^[a-z][a-z0-9_]*$/, { error: "v.specKey" }),
  type: z.enum(SPEC_TYPES),
  isFilterable: z.boolean(),
  isKey: z.boolean(),
  sortOrder,
  translations: localized(z.object({ label: required(80), unit: optionalText(20) })),
});
export type SpecDefinitionInput = z.infer<typeof specDefinitionSchema>;

// ── Merchandising ───────────────────────────────────────────────────────────

export const badgeSchema = z.object({
  code: z.string().trim().min(1, { error: "v.required" }).max(40).regex(/^[a-z0-9-]+$/, { error: "v.code" }),
  bgColor: hexColor,
  textColor: hexColor,
  sortOrder,
  translations: localized(z.object({ label: required(40) })),
});
export type BadgeInput = z.infer<typeof badgeSchema>;

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), { error: "v.date" });

export const bannerSchema = z
  .object({
    placement: z.enum(BANNER_PLACEMENTS),
    imageUrl: imagePath.nullable(),
    bgColor: hexColor,
    textColor: hexColor,
    sortOrder,
    isActive: z.boolean(),
    startsAt: optionalDate,
    endsAt: optionalDate,
    translations: localized(
      z.object({
        title: required(120),
        subtitle: optionalText(200),
        ctaLabel: optionalText(40),
        linkUrl: link,
        imageAlt: optionalText(200),
      }),
    ),
  })
  .refine((b) => !b.startsAt || !b.endsAt || Date.parse(b.startsAt) < Date.parse(b.endsAt), {
    path: ["endsAt"],
    error: "v.dateRange",
  });
export type BannerInput = z.infer<typeof bannerSchema>;

// ── Orders, reviews ─────────────────────────────────────────────────────────

export const orderStatusChangeSchema = z.object({
  orderId: id,
  toStatus: z.enum(ORDER_STATUSES),
  note: optionalText(500),
});

export const paymentStatusChangeSchema = z.object({
  orderId: id,
  paymentStatus: z.enum(PAYMENT_STATUSES),
});

export const reviewModerationSchema = z.object({
  reviewId: id,
  status: z.enum(REVIEW_STATUSES),
});

// ── Admin users, settings ───────────────────────────────────────────────────

export const adminUserSchema = z.object({
  email,
  name: required(80),
  role: z.enum(ADMIN_ROLES),
  isActive: z.boolean(),
  /** required when creating; empty = keep current password when editing */
  password: z.union([z.literal(""), z.string().min(10, { error: "v.passwordLength" }).max(200)]),
});
export type AdminUserInput = z.infer<typeof adminUserSchema>;

export const settingsSchema = z.object({
  usdRate: z.number({ error: "v.rate" }).int().min(1, { error: "v.rate" }).max(100_000_000),
  usdRounding: z.enum(USD_ROUNDING_MODES),
  shopName: required(80),
  contactEmail: z.union([z.literal(""), email]),
  contactPhone: optionalText(40),
  address: optionalText(200),
  companyId: optionalText(20),
  bankAccount: optionalText(40),
  iban: optionalText(40),
  lowStockThreshold: z.number().int().min(0).max(10000),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const shippingMethodSchema = z.object({
  code: z.string().trim().min(1, { error: "v.required" }).max(40).regex(/^[a-z0-9-]+$/, { error: "v.code" }),
  priceCzk: minor,
  priceUsd: minor,
  freeFromCzk: optionalMinor,
  freeFromUsd: optionalMinor,
  allowsCod: z.boolean(),
  isActive: z.boolean(),
  sortOrder,
  translations: localized(z.object({ name: required(80), description: optionalText(200) })),
});
export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;
