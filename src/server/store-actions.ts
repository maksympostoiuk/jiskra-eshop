"use server";

import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/auth/rate-limit";
import { reviewSearchText } from "@/lib/text";
import { CURRENCY_COOKIE, isCurrency } from "@/lib/money";
import { reviewSchema, type ReviewInput } from "@/lib/validation/store";
import { formatSpecValue } from "@/lib/catalog/spec-format";
import { getCardsByIds, getCategoryTree, getSpecDefsForCategory, type ProductCardData, type SpecDef } from "@/server/catalog";
import { getCurrency } from "@/server/currency";
import { validateInput, type ActionResult } from "./action";
import { clientIp } from "./request";

export async function setCurrency(currency: string): Promise<void> {
  if (!isCurrency(currency)) return;
  (await cookies()).set(CURRENCY_COOKIE, currency, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/** Customer review → stored as PENDING until approved in the CMS. */
export async function submitReview(input: ReviewInput): Promise<ActionResult> {
  const t = await getTranslations("product.reviews");
  const parsed = await validateInput(reviewSchema, input);
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  const ip = await clientIp();
  if (!(await rateLimit(`review:${ip}`, 5, 60 * 60 * 1000)).ok || !(await rateLimit(`review-product:${parsed.data.productId}`, 30, 60 * 60 * 1000)).ok) {
    return { ok: false, message: t("tooMany") };
  }
  const product = await prisma.product.findFirst({ where: { id: parsed.data.productId, status: "PUBLISHED" }, select: { id: true } });
  if (!product) return { ok: false, message: t("error") };
  await prisma.review.create({
    data: {
      productId: product.id,
      authorName: parsed.data.authorName,
      authorEmail: parsed.data.authorEmail || null,
      rating: parsed.data.rating,
      text: parsed.data.text,
      locale: await getLocale(),
      status: "PENDING",
      searchText: reviewSearchText({ authorName: parsed.data.authorName, authorEmail: parsed.data.authorEmail, text: parsed.data.text }),
    },
  });
  return { ok: true, message: t("thanks") };
}

/** Product cards for ids kept in localStorage (favorites). */
export async function getCardsForIds(ids: string[]): Promise<ProductCardData[]> {
  if (!Array.isArray(ids)) return [];
  const clean = ids.filter((id) => typeof id === "string" && id.length <= 64).slice(0, 100);
  if (!clean.length) return [];
  const locale = await getLocale();
  const tc = await getTranslations("common");
  return getCardsByIds(clean, { locale, currency: await getCurrency(), yesNo: { yes: tc("yes"), no: tc("no") } });
}

export type CompareProduct = ProductCardData & { categoryName: string; specs: Record<string, string> };
export type CompareGroup = { categoryId: string; categoryName: string; specLabels: Array<{ key: string; label: string }>; products: CompareProduct[] };

/** Products for the compare page, grouped by category with a common spec table. */
export async function getCompareData(ids: string[]): Promise<CompareGroup[]> {
  if (!Array.isArray(ids)) return [];
  const cards = await getCardsForIds(ids.slice(0, 12));
  if (!cards.length) return [];
  const locale = await getLocale();
  const tc = await getTranslations("common");
  const yesNo = { yes: tc("yes"), no: tc("no") };
  const { byId } = await getCategoryTree(locale);
  const values = await prisma.productSpecValue.findMany({ where: { productId: { in: cards.map((c) => c.id) } } });
  const defsByCategory = new Map<string, SpecDef[]>();
  const groups = new Map<string, CompareGroup>();
  for (const card of cards) {
    let defs = defsByCategory.get(card.categoryId);
    if (!defs) {
      defs = await getSpecDefsForCategory(locale, card.categoryId);
      defsByCategory.set(card.categoryId, defs);
    }
    const group = groups.get(card.categoryId) ?? {
      categoryId: card.categoryId,
      categoryName: byId.get(card.categoryId)?.name ?? "",
      specLabels: defs.map((d) => ({ key: d.id, label: d.label })),
      products: [],
    };
    groups.set(card.categoryId, group);
    const specs: Record<string, string> = {};
    for (const def of defs) {
      const v = values.find((x) => x.productId === card.id && x.specDefinitionId === def.id);
      const formatted = v ? formatSpecValue(v, def, locale, yesNo) : null;
      if (formatted) specs[def.id] = formatted;
    }
    group.products.push({ ...card, categoryName: group.categoryName, specs });
  }
  // Only rows where at least one product has a value.
  return [...groups.values()].map((g) => ({ ...g, specLabels: g.specLabels.filter((l) => g.products.some((p) => p.specs[l.key])) }));
}
