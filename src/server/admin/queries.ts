import "server-only";
import { prisma } from "@/lib/db";
import { buildTree, flattenTree } from "@/lib/catalog/category-tree";
import { pickTranslation } from "@/lib/i18n-content";

export type CategoryOption = { id: string; label: string; depth: number; name: string };

/** All categories as a depth-first list with indented labels (for selects). */
export async function getCategoryOptions(locale: string): Promise<CategoryOption[]> {
  const rows = await prisma.category.findMany({ include: { translations: true } });
  const flat = flattenTree(
    buildTree(rows.map((c) => ({ id: c.id, parentId: c.parentId, sortOrder: c.sortOrder, name: pickTranslation(c.translations, locale)?.name ?? c.id }))),
  );
  return flat.map((c) => ({ id: c.id, depth: c.depth, name: c.name, label: `${"— ".repeat(c.depth)}${c.name}` }));
}

export async function getBrandOptions() {
  return prisma.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });
}

export async function getBadgeOptions(locale: string) {
  const badges = await prisma.badge.findMany({ orderBy: { sortOrder: "asc" }, include: { translations: true } });
  return badges.map((b) => ({ id: b.id, code: b.code, bgColor: b.bgColor, textColor: b.textColor, label: pickTranslation(b.translations, locale)?.label ?? b.code }));
}
