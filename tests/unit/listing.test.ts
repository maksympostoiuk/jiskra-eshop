import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { parseFilters } from "@/lib/catalog/filters";
import { specTextKey } from "@/lib/catalog/spec-format";
import { buildListingWhere, getFacets, listProducts, type SpecDef } from "@/server/catalog";

const yesNo = { yes: "Ano", no: "Ne" };
let scope = {};
let defs: SpecDef[] = [];

async function product(slug: string, brandId: string, os: [string, string], ram: number, priceCzk: number, stock: number) {
  const [osDef, ramDef] = defs;
  await prisma.product.create({
    data: {
      categoryId: (scope as { categoryId: string }).categoryId,
      brandId,
      status: "PUBLISHED",
      minPriceCzk: priceCzk,
      minPriceUsd: Math.round(priceCzk / 23),
      inStock: stock > 0,
      translations: { create: [{ locale: "cs", name: slug, slug: `lt-${slug}` }] },
      specValues: {
        create: [
          { specDefinitionId: osDef.id, textCs: os[0], textEn: os[1], textKey: specTextKey(os[0], os[1]) },
          { specDefinitionId: ramDef.id, numberValue: ram },
        ],
      },
    },
  });
}

beforeAll(async () => {
  const cat = await prisma.category.create({ data: { translations: { create: [{ locale: "cs", name: "LT", slug: "lt-cat" }] } } });
  scope = { categoryId: cat.id };
  const os = await prisma.specDefinition.create({ data: { categoryId: cat.id, key: "os", type: "TEXT", isFilterable: true } });
  const ram = await prisma.specDefinition.create({ data: { categoryId: cat.id, key: "ram", type: "NUMBER", isFilterable: true } });
  const base = { categoryId: cat.id, isKey: false, sortOrder: 0 };
  defs = [
    { ...base, id: os.id, key: "os", type: "TEXT", label: "OS", unit: "", isFilterable: true },
    { ...base, id: ram.id, key: "ram", type: "NUMBER", label: "RAM", unit: "GB", isFilterable: true },
  ];
  const a = await prisma.brand.create({ data: { name: "Alfa LT", slug: "alfa-lt" } });
  const b = await prisma.brand.create({ data: { name: "Beta LT", slug: "beta-lt" } });
  await product("a1", a.id, ["Vlastní systém", "Own system"], 8, 500000, 3);
  await product("a2", a.id, ["Vlastní systém", "Own system"], 12, 900000, 0);
  await product("b1", b.id, ["Android", "Android"], 8, 300000, 5);
});

describe("listing filters and disjunctive facets (integration)", () => {
  it("filters TEXT specs by locale-independent keys", async () => {
    const filters = parseFilters({ f_os: "vlastni-system" }, defs);
    const result = await listProducts(buildListingWhere(scope, filters, defs, "CZK"), filters, { locale: "en", currency: "CZK", yesNo });
    expect(result.items.map((p) => p.slug).sort()).toEqual(["lt-a1", "lt-a2"]);
  });

  it("counts each facet with the other filters applied and keeps selected options", async () => {
    const filters = parseFilters({ brand: "beta-lt", f_ram: "12" }, defs);
    const facets = await getFacets(scope, defs, filters, "CZK", "en", yesNo);
    // Brand counts ignore the brand filter but respect RAM=12 → only Alfa has a 12 GB product.
    expect(facets.brands).toEqual([
      { slug: "alfa-lt", name: "Alfa LT", count: 1 },
      { slug: "beta-lt", name: "Beta LT", count: 0 },
    ]);
    // RAM counts ignore the RAM filter but respect brand=beta → 8 GB: 1, the selected 12 GB stays visible with 0.
    const ram = facets.specs.find((s) => s.key === "ram")!;
    expect(ram.values.map((v) => [v.value, v.count])).toEqual([["8", 1], ["12", 0]]);
    // OS labels follow the locale, values are keys.
    const os = facets.specs.find((s) => s.key === "os")!;
    expect(os.values.map((v) => [v.value, v.label])).toEqual([["android", "Android"], ["vlastni-system", "Own system"]]);
    expect(facets.price).toEqual({ min: 300000, max: 900000 });
  });

  it("in-stock count respects other filters", async () => {
    const facets = await getFacets(scope, defs, parseFilters({ brand: "alfa-lt" }, defs), "CZK", "cs", yesNo);
    expect(facets.inStockCount).toBe(1);
  });
});
