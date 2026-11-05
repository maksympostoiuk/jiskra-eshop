"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { wouldCreateCycle } from "@/lib/catalog/category-tree";
import { CATEGORY_ICON_NAMES } from "@/lib/category-icons";
import { LOCALES } from "@/i18n/routing";
import { categorySchema, type CategoryInput } from "@/lib/validation/admin";
import { validateInput, type ActionResult } from "../action";

export async function saveCategory(categoryId: string | null, input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const t = await getTranslations("admin.common");
  const tv = await getTranslations("validation");
  const parsed = await validateInput(categorySchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors, message: t("fixErrors") };
  const data = parsed.data;

  const errors: Record<string, string> = {};
  if (!CATEGORY_ICON_NAMES.includes(data.icon)) errors.icon = tv("required");
  const all = await prisma.category.findMany({ select: { id: true, parentId: true, sortOrder: true } });
  if (data.parentId && !all.some((c) => c.id === data.parentId)) errors.parentId = tv("required");
  if (categoryId && (data.parentId === categoryId || wouldCreateCycle(all, categoryId, data.parentId))) errors.parentId = tv("categoryCycle");
  for (const locale of LOCALES) {
    const clash = await prisma.categoryTranslation.findFirst({
      where: { locale, slug: data.translations[locale].slug, ...(categoryId ? { NOT: { categoryId } } : {}) },
    });
    if (clash) errors[`translations.${locale}.slug`] = tv("slugTaken");
  }
  if (Object.keys(errors).length) return { ok: false, errors, message: t("fixErrors") };

  const id = await prisma.$transaction(async (tx) => {
    const base = { parentId: data.parentId, icon: data.icon, sortOrder: data.sortOrder, isActive: data.isActive };
    const category = categoryId ? await tx.category.update({ where: { id: categoryId }, data: base }) : await tx.category.create({ data: base });
    for (const locale of LOCALES) {
      const tr = data.translations[locale];
      const fields = { name: tr.name, slug: tr.slug, description: tr.description, seoTitle: tr.seoTitle || null, seoDescription: tr.seoDescription || null };
      await tx.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: category.id, locale } },
        create: { categoryId: category.id, locale, ...fields },
        update: fields,
      });
    }
    return category.id;
  });
  revalidatePath("/admin/categories");
  return { ok: true, data: { id }, message: t("saved") };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("admin.categories");
  const [children, products] = await Promise.all([
    prisma.category.count({ where: { parentId: categoryId } }),
    prisma.product.count({ where: { categoryId } }),
  ]);
  if (children > 0 || products > 0) return { ok: false, message: t("deleteBlocked", { children, products }) };
  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/admin/categories");
  return { ok: true };
}

/** Swap the category with its previous/next sibling and renumber siblings 0..n. */
export async function moveCategory(categoryId: string, direction: "up" | "down"): Promise<ActionResult> {
  await requireAdmin();
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return { ok: false };
  const siblings = await prisma.category.findMany({
    where: { parentId: category.parentId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const index = siblings.findIndex((s) => s.id === categoryId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return { ok: true };
  const order = siblings.map((s) => s.id);
  [order[index], order[target]] = [order[target], order[index]];
  await prisma.$transaction(order.map((id, i) => prisma.category.update({ where: { id }, data: { sortOrder: i } })));
  revalidatePath("/admin/categories");
  return { ok: true };
}
