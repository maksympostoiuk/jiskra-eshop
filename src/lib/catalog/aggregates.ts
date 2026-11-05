import type { Prisma, PrismaClient } from "@prisma/client";
import { buildSearchText } from "@/lib/text";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Recompute denormalized product fields: min prices, stock flag, rating and search text.
 * Call after changing variants, approving/rejecting reviews or creating orders.
 */
export async function refreshProductAggregates(db: Db, productId: string): Promise<void> {
  const [variants, rating, product] = await Promise.all([
    db.productVariant.findMany({
      where: { productId },
      select: { priceCzk: true, priceUsd: true, stock: true, sku: true },
    }),
    db.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    db.product.findUnique({
      where: { id: productId },
      select: { brand: { select: { name: true } }, translations: { select: { id: true, name: true } } },
    }),
  ]);
  if (!product) return;

  const minPriceCzk = variants.length ? Math.min(...variants.map((v) => v.priceCzk)) : 0;
  const minPriceUsd = variants.length ? Math.min(...variants.map((v) => v.priceUsd)) : 0;
  const ratingAvg = rating._avg.rating ? Math.round(rating._avg.rating * 10) / 10 : 0;

  await db.product.update({
    where: { id: productId },
    data: {
      minPriceCzk,
      minPriceUsd,
      inStock: variants.some((v) => v.stock > 0),
      ratingAvg,
      ratingCount: rating._count._all,
    },
  });

  const skus = variants.map((v) => v.sku);
  await Promise.all(
    product.translations.map((tr) =>
      db.productTranslation.update({
        where: { id: tr.id },
        data: { searchText: buildSearchText([tr.name, product.brand?.name, ...skus]) },
      }),
    ),
  );
}
