import { describe, expect, it } from "vitest";
import { emptyProductForm, productToForm, toProductInput } from "./product-form-model";

describe("product form model", () => {
  const product = {
    categoryId: "c1",
    brandId: null,
    status: "PUBLISHED",
    isFeatured: false,
    badges: [{ id: "b1" }],
    translations: [{ locale: "cs", name: "Myš", slug: "mys", shortDescription: "", description: "", seoTitle: null, seoDescription: null }],
    variants: [
      { id: "v1", sku: "M-1", priceCzk: 99000, priceUsd: 4299, oldPriceCzk: null, oldPriceUsd: null, stock: 3, options: [{ name: "color", value: "lilac", labelCs: "Levandulová", labelEn: "Lavender", colorHex: "#b7a6c9" }] },
    ],
    images: [{ id: "i1", url: "/x.svg", altCs: "", altEn: "", variant: { options: [{ name: "color", value: "lilac" }] } }],
    specValues: [{ specDefinitionId: "s1", numberValue: 8000, boolValue: null, textCs: null, textEn: null }],
  };

  it("round-trips without changing stored option values or prices", () => {
    const input = toProductInput(productToForm(product));
    expect(input.variants[0].options[0].value).toBe("lilac");
    expect(input.images[0].colorValue).toBe("lilac");
    expect(input.variants[0]).toMatchObject({ id: "v1", priceCzk: 99000, priceUsd: 4299, oldPriceCzk: null, stock: 3 });
    expect(input.specValues[0]).toMatchObject({ numberValue: 8000, boolValue: null });
    expect(input.translations.en.name).toBe("");
  });

  it("derives values for new options and flags invalid money", () => {
    const form = emptyProductForm();
    form.variants[0].options.color = { value: "", labelCs: "Černá", labelEn: "Jet Black", colorHex: "#000000" };
    form.variants[0].priceCzk = "12,5x";
    form.variants[0].oldPriceCzk = "";
    const input = toProductInput(form);
    expect(input.variants[0].options[0].value).toBe("jet-black");
    expect(input.variants[0].priceCzk).toBe(-1);
    expect(input.variants[0].oldPriceCzk).toBeNull();
  });
});
