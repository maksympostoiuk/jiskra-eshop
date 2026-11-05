import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { persistProduct } from "@/lib/catalog/save-product";
import type { ProductInput } from "@/lib/validation/admin";

const db = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });
let categoryId = "";
let specId = "";
let foreignSpecId = "";

const tr = (name: string, slug: string) => ({ name, slug, shortDescription: "", description: "", seoTitle: "", seoDescription: "" });
const color = (value: string, cs: string, en: string) => ({ name: "color" as const, value, labelCs: cs, labelEn: en, colorHex: "#000000" });

function input(over: Partial<ProductInput> = {}): ProductInput {
  return {
    categoryId,
    brandId: null,
    status: "PUBLISHED",
    isFeatured: false,
    badgeIds: [],
    translations: { cs: tr("Myš SP", "mys-sp"), en: tr("Mouse SP", "mouse-sp") },
    variants: [
      { sku: "SP-A", priceCzk: 100000, priceUsd: 4399, oldPriceCzk: null, oldPriceUsd: null, stock: 2, options: [color("black", "Černá", "Black")] },
      { sku: "SP-B", priceCzk: 120000, priceUsd: 5299, oldPriceCzk: null, oldPriceUsd: null, stock: 0, options: [color("white", "Bílá", "White")] },
    ],
    images: [
      { url: "/ph/mouse/ffffff/1.svg", altCs: "", altEn: "", colorValue: "white" },
      { url: "/ph/mouse/000000/1.svg", altCs: "", altEn: "", colorValue: null },
    ],
    specValues: [
      { specDefinitionId: "", numberValue: 8000, boolValue: null, textCs: null, textEn: null },
      { specDefinitionId: "", numberValue: 5, boolValue: null, textCs: null, textEn: null },
    ],
    ...over,
  };
}

beforeAll(async () => {
  const cat = await db.category.create({ data: { translations: { create: [{ locale: "cs", name: "SP", slug: "sp-cat" }] } } });
  const other = await db.category.create({ data: { translations: { create: [{ locale: "cs", name: "SP2", slug: "sp-cat-2" }] } } });
  categoryId = cat.id;
  specId = (await db.specDefinition.create({ data: { categoryId, key: "dpi", type: "NUMBER" } })).id;
  foreignSpecId = (await db.specDefinition.create({ data: { categoryId: other.id, key: "weight", type: "NUMBER" } })).id;
});
afterAll(() => db.$disconnect());

describe("persistProduct (integration)", () => {
  it("creates a product with variants, colour-linked images, allowed specs and aggregates", async () => {
    const data = input();
    data.specValues[0].specDefinitionId = specId;
    data.specValues[1].specDefinitionId = foreignSpecId;
    const id = await persistProduct(db, null, data, new Set([specId]));
    const p = await db.product.findUniqueOrThrow({ where: { id }, include: { variants: true, images: { orderBy: { sortOrder: "asc" }, include: { variant: true } }, specValues: true } });
    expect(p).toMatchObject({ minPriceCzk: 100000, minPriceUsd: 4399, inStock: true });
    expect(p.publishedAt).not.toBeNull();
    expect(p.images[0].variant?.sku).toBe("SP-B");
    expect(p.images[1].variantId).toBeNull();
    expect(p.specValues.map((s) => s.specDefinitionId)).toEqual([specId]);
  });

  it("swaps SKUs between existing variants without unique-constraint errors", async () => {
    const product = await db.product.findFirstOrThrow({ where: { translations: { some: { slug: "mys-sp" } } }, include: { variants: { orderBy: { sortOrder: "asc" } } } });
    const [a, b] = product.variants;
    const data = input();
    data.variants = [
      { ...data.variants[0], id: a.id, sku: "SP-B" },
      { ...data.variants[1], id: b.id, sku: "SP-A" },
    ];
    await persistProduct(db, { id: product.id, publishedAt: product.publishedAt }, data, new Set());
    const after = await db.productVariant.findMany({ where: { productId: product.id }, orderBy: { sortOrder: "asc" } });
    expect(after.map((v) => [v.id, v.sku])).toEqual([
      [a.id, "SP-B"],
      [b.id, "SP-A"],
    ]);
  });

  it("ignores variant ids that belong to another product and deletes removed variants", async () => {
    const product = await db.product.findFirstOrThrow({ where: { translations: { some: { slug: "mys-sp" } } }, include: { variants: true } });
    const other = await persistProduct(db, null, input({ translations: { cs: tr("Jiná", "jina-sp"), en: tr("Other", "other-sp") }, variants: [{ ...input().variants[0], sku: "SP-OTHER" }], images: [], specValues: [] }), new Set());
    const otherVariant = await db.productVariant.findFirstOrThrow({ where: { productId: other } });
    const data = input({ variants: [{ ...input().variants[0], id: otherVariant.id, sku: "SP-NEW" }], images: [], specValues: [] });
    await persistProduct(db, { id: product.id, publishedAt: product.publishedAt }, data, new Set());
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: otherVariant.id } })).sku).toBe("SP-OTHER");
    expect((await db.productVariant.findMany({ where: { productId: product.id } })).map((v) => v.sku)).toEqual(["SP-NEW"]);
  });
});
