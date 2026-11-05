import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { pickTranslation } from "@/lib/i18n-content";
import { formatMoney } from "@/lib/money";
import { normalizeText } from "@/lib/text";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/routing";
import { getCategoryTree, searchScope } from "@/server/catalog";
import { getCurrency } from "@/server/currency";

/** Search suggestions: matching categories and products for the header dropdown. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const term = normalizeText(q);
  if (term.length < 2) return NextResponse.json({ categories: [], products: [] });
  const currency = await getCurrency();

  const { flat } = await getCategoryTree(locale);
  const categories = flat
    .filter((c) => normalizeText(c.name).includes(term) && c.productCount > 0)
    .slice(0, 4)
    .map((c) => ({ name: c.name, slug: c.slug, count: c.productCount }));

  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED", ...searchScope(q, locale) },
    orderBy: { soldCount: "desc" },
    take: 6,
    include: { translations: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  return NextResponse.json({
    categories,
    products: products.map((p) => {
      const tr = pickTranslation(p.translations, locale);
      return {
        name: tr?.name ?? "",
        slug: tr?.slug ?? p.id,
        imageUrl: p.images[0]?.url ?? null,
        price: formatMoney(currency === "CZK" ? p.minPriceCzk : p.minPriceUsd, currency, locale),
      };
    }),
  });
}
