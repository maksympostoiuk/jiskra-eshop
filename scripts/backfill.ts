/*
 * Recomputes derived columns for existing data (safe to run repeatedly, never deletes anything):
 * order/review searchText, spec value textKey and product aggregates. Run with `npm run db:backfill`.
 */
import { PrismaClient } from "@prisma/client";
import { refreshProductAggregates } from "../src/lib/catalog/aggregates";
import { specTextKey } from "../src/lib/catalog/spec-format";
import { orderSearchText, reviewSearchText } from "../src/lib/text";

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany();
  for (const o of orders) await prisma.order.update({ where: { id: o.id }, data: { searchText: orderSearchText(o) } });
  const reviews = await prisma.review.findMany();
  for (const r of reviews) await prisma.review.update({ where: { id: r.id }, data: { searchText: reviewSearchText(r) } });
  const values = await prisma.productSpecValue.findMany({ where: { OR: [{ textCs: { not: null } }, { textEn: { not: null } }] } });
  for (const v of values) await prisma.productSpecValue.update({ where: { id: v.id }, data: { textKey: specTextKey(v.textCs, v.textEn) } });
  const products = await prisma.product.findMany({ select: { id: true } });
  for (const p of products) await refreshProductAggregates(prisma, p.id);
  console.log(`Backfilled ${orders.length} orders, ${reviews.length} reviews, ${values.length} spec values, ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
