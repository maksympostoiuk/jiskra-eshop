"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/session";
import { convertCzkToUsd } from "@/lib/money";
import { LOCALES } from "@/i18n/routing";
import {
  adminUserSchema,
  settingsSchema,
  shippingMethodSchema,
  type AdminUserInput,
  type SettingsInput,
  type ShippingMethodInput,
} from "@/lib/validation/admin";
import { refreshProductAggregates } from "@/lib/catalog/aggregates";
import { isUniqueViolation, validateInput, type ActionResult } from "../action";

async function fixErrors(errors: Record<string, string>) {
  return { ok: false as const, errors, message: (await getTranslations("admin.common"))("fixErrors") };
}

// ── Admin users (ADMIN only) ────────────────────────────────────────────────

export async function saveAdminUser(userId: string | null, input: AdminUserInput): Promise<ActionResult<{ id: string }>> {
  const me = await requireAdmin({ role: "ADMIN" });
  const tv = await getTranslations("validation");
  const t = await getTranslations("admin.users");
  const parsed = await validateInput(adminUserSchema, input);
  if (!parsed.success) return fixErrors(parsed.errors);
  const { password, ...data } = parsed.data;
  if (!userId && !password) return fixErrors({ password: tv("required") });
  if (userId === me.id && (data.role !== "ADMIN" || !data.isActive)) return { ok: false, message: t("cannotDemoteSelf") };
  try {
    const passwordHash = password ? await hashPassword(password) : undefined;
    const user = userId
      ? await prisma.adminUser.update({ where: { id: userId }, data: { ...data, ...(passwordHash ? { passwordHash } : {}) } })
      : await prisma.adminUser.create({ data: { ...data, passwordHash: passwordHash! } });
    // Deactivated users or changed passwords lose their sessions.
    if (userId && (!data.isActive || passwordHash)) await prisma.adminSession.deleteMany({ where: { adminUserId: userId } });
    revalidatePath("/admin/users");
    return { ok: true, data: { id: user.id }, message: (await getTranslations("admin.common"))("saved") };
  } catch (error) {
    if (isUniqueViolation(error)) return fixErrors({ email: tv("emailTaken") });
    throw error;
  }
}

export async function deleteAdminUser(userId: string): Promise<ActionResult> {
  const me = await requireAdmin({ role: "ADMIN" });
  if (userId === me.id) return { ok: false, message: (await getTranslations("admin.users"))("cannotDeleteSelf") };
  await prisma.adminUser.delete({ where: { id: userId } }).catch(() => null);
  revalidatePath("/admin/users");
  return { ok: true };
}

// ── Settings (ADMIN only) ───────────────────────────────────────────────────

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  await requireAdmin({ role: "ADMIN" });
  const parsed = await validateInput(settingsSchema, input);
  if (!parsed.success) return fixErrors(parsed.errors);
  await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, ...parsed.data }, update: parsed.data });
  revalidatePath("/admin/settings");
  return { ok: true, message: (await getTranslations("admin.common"))("saved") };
}

/** Bulk: recompute every variant's USD price (and old price) from CZK with the current rate. */
export async function recalculateAllUsdPrices(): Promise<ActionResult> {
  await requireAdmin({ role: "ADMIN" });
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) return { ok: false };
  const rounding = settings.usdRounding === "CENT" || settings.usdRounding === "WHOLE" ? settings.usdRounding : "NINETY_NINE";
  const variants = await prisma.productVariant.findMany({ select: { id: true, productId: true, priceCzk: true, oldPriceCzk: true } });
  await prisma.$transaction(
    variants.map((v) =>
      prisma.productVariant.update({
        where: { id: v.id },
        data: {
          priceUsd: convertCzkToUsd(v.priceCzk, settings.usdRate, rounding),
          oldPriceUsd: v.oldPriceCzk === null ? null : convertCzkToUsd(v.oldPriceCzk, settings.usdRate, rounding),
        },
      }),
    ),
  );
  for (const productId of new Set(variants.map((v) => v.productId))) await refreshProductAggregates(prisma, productId);
  return { ok: true, message: (await getTranslations("admin.settings"))("recalculated", { count: variants.length }) };
}

export async function saveShippingMethod(methodId: string | null, input: ShippingMethodInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin({ role: "ADMIN" });
  const parsed = await validateInput(shippingMethodSchema, input);
  if (!parsed.success) return fixErrors(parsed.errors);
  const { translations, ...base } = parsed.data;
  try {
    const id = await prisma.$transaction(async (tx) => {
      const m = methodId ? await tx.shippingMethod.update({ where: { id: methodId }, data: base }) : await tx.shippingMethod.create({ data: base });
      for (const locale of LOCALES) {
        await tx.shippingMethodTranslation.upsert({
          where: { shippingMethodId_locale: { shippingMethodId: m.id, locale } },
          create: { shippingMethodId: m.id, locale, ...translations[locale] },
          update: translations[locale],
        });
      }
      return m.id;
    });
    revalidatePath("/admin/settings");
    return { ok: true, data: { id }, message: (await getTranslations("admin.common"))("saved") };
  } catch (error) {
    if (isUniqueViolation(error)) return fixErrors({ code: (await getTranslations("validation"))("codeTaken") });
    throw error;
  }
}

export async function deleteShippingMethod(methodId: string): Promise<ActionResult> {
  await requireAdmin({ role: "ADMIN" });
  await prisma.shippingMethod.delete({ where: { id: methodId } }).catch(() => null);
  revalidatePath("/admin/settings");
  return { ok: true };
}
