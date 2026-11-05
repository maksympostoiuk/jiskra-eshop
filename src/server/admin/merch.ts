"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { LOCALES } from "@/i18n/routing";
import {
  badgeSchema,
  bannerSchema,
  brandSchema,
  specDefinitionSchema,
  type BadgeInput,
  type BannerInput,
  type BrandInput,
  type SpecDefinitionInput,
} from "@/lib/validation/admin";
import { isUniqueViolation, validateInput, type ActionResult } from "../action";

async function fail(errors: Record<string, string>) {
  const t = await getTranslations("admin.common");
  return { ok: false as const, errors, message: t("fixErrors") };
}
async function saved<T>(path: string, data?: T) {
  const t = await getTranslations("admin.common");
  revalidatePath(path);
  return { ok: true as const, data, message: t("saved") };
}

// ── Brands ──────────────────────────────────────────────────────────────────

export async function saveBrand(brandId: string | null, input: BrandInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = await validateInput(brandSchema, input);
  if (!parsed.success) return fail(parsed.errors);
  const { website, ...rest } = parsed.data;
  const data = { ...rest, website: website || null };
  try {
    const brand = brandId ? await prisma.brand.update({ where: { id: brandId }, data }) : await prisma.brand.create({ data });
    return saved("/admin/brands", { id: brand.id });
  } catch (error) {
    if (isUniqueViolation(error)) return fail({ slug: (await getTranslations("validation"))("slugTaken") });
    throw error;
  }
}

export async function deleteBrand(brandId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.brand.delete({ where: { id: brandId } }).catch(() => null); // products keep brandId = null (SetNull)
  revalidatePath("/admin/brands");
  return { ok: true };
}

// ── Spec definitions ────────────────────────────────────────────────────────

export async function saveSpecDefinition(specId: string | null, input: SpecDefinitionInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = await validateInput(specDefinitionSchema, input);
  if (!parsed.success) return fail(parsed.errors);
  const { translations, ...base } = parsed.data;
  const tv = await getTranslations("validation");
  const clash = await prisma.specDefinition.findFirst({ where: { categoryId: base.categoryId, key: base.key, ...(specId ? { NOT: { id: specId } } : {}) } });
  if (clash) return fail({ key: tv("specKeyTaken") });
  if (specId) {
    const current = await prisma.specDefinition.findUnique({ where: { id: specId } });
    // Changing the type would make stored values meaningless — clear them explicitly.
    if (current && current.type !== base.type) await prisma.productSpecValue.deleteMany({ where: { specDefinitionId: specId } });
  }
  const id = await prisma.$transaction(async (tx) => {
    const spec = specId ? await tx.specDefinition.update({ where: { id: specId }, data: base }) : await tx.specDefinition.create({ data: base });
    for (const locale of LOCALES) {
      const fields = translations[locale];
      await tx.specDefinitionTranslation.upsert({
        where: { specDefinitionId_locale: { specDefinitionId: spec.id, locale } },
        create: { specDefinitionId: spec.id, locale, ...fields },
        update: fields,
      });
    }
    return spec.id;
  });
  return saved("/admin/specs", { id });
}

export async function deleteSpecDefinition(specId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.specDefinition.delete({ where: { id: specId } }).catch(() => null);
  revalidatePath("/admin/specs");
  return { ok: true };
}

// ── Badges ──────────────────────────────────────────────────────────────────

export async function saveBadge(badgeId: string | null, input: BadgeInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = await validateInput(badgeSchema, input);
  if (!parsed.success) return fail(parsed.errors);
  const { translations, ...base } = parsed.data;
  try {
    const id = await prisma.$transaction(async (tx) => {
      const badge = badgeId ? await tx.badge.update({ where: { id: badgeId }, data: base }) : await tx.badge.create({ data: base });
      for (const locale of LOCALES) {
        await tx.badgeTranslation.upsert({
          where: { badgeId_locale: { badgeId: badge.id, locale } },
          create: { badgeId: badge.id, locale, label: translations[locale].label },
          update: { label: translations[locale].label },
        });
      }
      return badge.id;
    });
    return saved("/admin/badges", { id });
  } catch (error) {
    if (isUniqueViolation(error)) return fail({ code: (await getTranslations("validation"))("codeTaken") });
    throw error;
  }
}

export async function deleteBadge(badgeId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.badge.delete({ where: { id: badgeId } }).catch(() => null);
  revalidatePath("/admin/badges");
  return { ok: true };
}

// ── Banners ─────────────────────────────────────────────────────────────────

export async function saveBanner(bannerId: string | null, input: BannerInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = await validateInput(bannerSchema, input);
  if (!parsed.success) return fail(parsed.errors);
  const { translations, startsAt, endsAt, ...rest } = parsed.data;
  const base = { ...rest, imageUrl: rest.imageUrl || null, startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null };
  const id = await prisma.$transaction(async (tx) => {
    const banner = bannerId ? await tx.banner.update({ where: { id: bannerId }, data: base }) : await tx.banner.create({ data: base });
    for (const locale of LOCALES) {
      const fields = translations[locale];
      await tx.bannerTranslation.upsert({
        where: { bannerId_locale: { bannerId: banner.id, locale } },
        create: { bannerId: banner.id, locale, ...fields },
        update: fields,
      });
    }
    return banner.id;
  });
  return saved("/admin/banners", { id });
}

export async function deleteBanner(bannerId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.banner.delete({ where: { id: bannerId } }).catch(() => null);
  revalidatePath("/admin/banners");
  return { ok: true };
}

export async function toggleBanner(bannerId: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.banner.update({ where: { id: bannerId }, data: { isActive } });
  revalidatePath("/admin/banners");
  return { ok: true };
}
