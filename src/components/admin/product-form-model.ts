import type { ProductInput } from "@/lib/validation/admin";
import { minorToMajorString, parseMajorToMinor } from "@/lib/money";
import { slugify } from "@/lib/text";
import type { VariantOptionName } from "@/lib/domain";

/** Editor state for the product form (strings for inputs, money in major units). */

/** `value` is the stable machine value; empty for new options (derived from the label on save). */
export type OptionForm = { value: string; labelCs: string; labelEn: string; colorHex: string };
export type VariantForm = {
  key: string;
  id?: string;
  sku: string;
  priceCzk: string;
  priceUsd: string;
  oldPriceCzk: string;
  oldPriceUsd: string;
  stock: string;
  options: Partial<Record<VariantOptionName, OptionForm>>;
};
export type ImageForm = { key: string; id?: string; url: string; altCs: string; altEn: string; colorValue: string };
export type SpecForm = { number: string; bool: "" | "true" | "false"; textCs: string; textEn: string };
export type TranslationForm = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
};

export type ProductForm = {
  categoryId: string;
  brandId: string;
  status: "DRAFT" | "PUBLISHED";
  isFeatured: boolean;
  badgeIds: string[];
  translations: { cs: TranslationForm; en: TranslationForm };
  optionNames: VariantOptionName[];
  variants: VariantForm[];
  images: ImageForm[];
  specs: Record<string, SpecForm>;
};

let counter = 0;
export const uid = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`;

export const emptyTranslation = (): TranslationForm => ({
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
});

export const emptyVariant = (optionNames: VariantOptionName[]): VariantForm => ({
  key: uid(),
  sku: "",
  priceCzk: "",
  priceUsd: "",
  oldPriceCzk: "",
  oldPriceUsd: "",
  stock: "0",
  options: Object.fromEntries(optionNames.map((n) => [n, { value: "", labelCs: "", labelEn: "", colorHex: n === "color" ? "#1f2125" : "" }])),
});

export function emptyProductForm(): ProductForm {
  return {
    categoryId: "",
    brandId: "",
    status: "DRAFT",
    isFeatured: false,
    badgeIds: [],
    translations: { cs: emptyTranslation(), en: emptyTranslation() },
    optionNames: ["color"],
    variants: [emptyVariant(["color"])],
    images: [],
    specs: {},
  };
}

export const optionValue = (o: OptionForm) => o.value || slugify(o.labelEn || o.labelCs);

/** -1 / NaN make Zod report a localized "invalid amount" error for unparsable input. */
function money(value: string): number {
  return parseMajorToMinor(value) ?? -1;
}
function optionalMoney(value: string): number | null {
  return value.trim() === "" ? null : money(value);
}

export function toProductInput(form: ProductForm): ProductInput {
  const tr = (t: TranslationForm) => ({ ...t, slug: t.slug.trim() });
  return {
    categoryId: form.categoryId,
    brandId: form.brandId || null,
    status: form.status,
    isFeatured: form.isFeatured,
    badgeIds: form.badgeIds,
    translations: { cs: tr(form.translations.cs), en: tr(form.translations.en) },
    variants: form.variants.map((v) => ({
      id: v.id,
      sku: v.sku.trim(),
      priceCzk: money(v.priceCzk),
      priceUsd: money(v.priceUsd),
      oldPriceCzk: optionalMoney(v.oldPriceCzk),
      oldPriceUsd: optionalMoney(v.oldPriceUsd),
      stock: v.stock.trim() === "" ? Number.NaN : Number(v.stock),
      options: form.optionNames.map((name) => {
        const o = v.options[name] ?? { value: "", labelCs: "", labelEn: "", colorHex: "" };
        return {
          name,
          value: optionValue(o),
          labelCs: o.labelCs.trim(),
          labelEn: o.labelEn.trim(),
          colorHex: name === "color" ? o.colorHex || null : null,
        };
      }),
    })),
    images: form.images.map((im) => ({ id: im.id, url: im.url, altCs: im.altCs, altEn: im.altEn, colorValue: im.colorValue || null })),
    specValues: Object.entries(form.specs).map(([specDefinitionId, s]) => ({
      specDefinitionId,
      numberValue: s.number.trim() === "" ? null : Number(s.number.replace(",", ".")),
      boolValue: s.bool === "" ? null : s.bool === "true",
      textCs: s.textCs.trim() || null,
      textEn: s.textEn.trim() || null,
    })),
  };
}

/** Shape of the product loaded from Prisma (with includes) needed to build the form. */
export type ProductForForm = {
  categoryId: string;
  brandId: string | null;
  status: string;
  isFeatured: boolean;
  badges: { id: string }[];
  translations: Array<{ locale: string } & Omit<TranslationForm, "seoTitle" | "seoDescription"> & { seoTitle: string | null; seoDescription: string | null }>;
  variants: Array<{
    id: string;
    sku: string;
    priceCzk: number;
    priceUsd: number;
    oldPriceCzk: number | null;
    oldPriceUsd: number | null;
    stock: number;
    options: Array<{ name: string; value: string; labelCs: string; labelEn: string; colorHex: string | null }>;
  }>;
  images: Array<{ id: string; url: string; altCs: string; altEn: string; variant: { options: Array<{ name: string; value: string }> } | null }>;
  specValues: Array<{ specDefinitionId: string; numberValue: number | null; boolValue: boolean | null; textCs: string | null; textEn: string | null }>;
};

export function productToForm(p: ProductForForm): ProductForm {
  const tr = (locale: string): TranslationForm => {
    const t = p.translations.find((x) => x.locale === locale);
    return t
      ? { name: t.name, slug: t.slug, shortDescription: t.shortDescription, description: t.description, seoTitle: t.seoTitle ?? "", seoDescription: t.seoDescription ?? "" }
      : emptyTranslation();
  };
  const optionNames = [...new Set(p.variants.flatMap((v) => v.options.map((o) => o.name)))] as VariantOptionName[];
  return {
    categoryId: p.categoryId,
    brandId: p.brandId ?? "",
    status: p.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    isFeatured: p.isFeatured,
    badgeIds: p.badges.map((b) => b.id),
    translations: { cs: tr("cs"), en: tr("en") },
    optionNames,
    variants: p.variants.map((v) => ({
      key: uid(),
      id: v.id,
      sku: v.sku,
      priceCzk: minorToMajorString(v.priceCzk),
      priceUsd: minorToMajorString(v.priceUsd),
      oldPriceCzk: v.oldPriceCzk === null ? "" : minorToMajorString(v.oldPriceCzk),
      oldPriceUsd: v.oldPriceUsd === null ? "" : minorToMajorString(v.oldPriceUsd),
      stock: String(v.stock),
      options: Object.fromEntries(v.options.map((o) => [o.name, { value: o.value, labelCs: o.labelCs, labelEn: o.labelEn, colorHex: o.colorHex ?? "" }])),
    })),
    images: p.images.map((im) => ({
      key: uid(),
      id: im.id,
      url: im.url,
      altCs: im.altCs,
      altEn: im.altEn,
      colorValue: im.variant?.options.find((o) => o.name === "color")?.value ?? "",
    })),
    specs: Object.fromEntries(
      p.specValues.map((s) => [
        s.specDefinitionId,
        {
          number: s.numberValue === null ? "" : String(s.numberValue),
          bool: s.boolValue === null ? "" : s.boolValue ? "true" : "false",
          textCs: s.textCs ?? "",
          textEn: s.textEn ?? "",
        },
      ]),
    ),
  };
}
