"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Copy, Plus, Trash2, Wand2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea, fieldAria } from "@/components/ui/form";
import { VARIANT_OPTION_NAMES, type VariantOptionName } from "@/lib/domain";
import { slugify } from "@/lib/text";
import { productSchema } from "@/lib/validation/admin";
import { validateWith } from "@/lib/validation/i18n";
import { saveProduct } from "@/server/admin/products";
import { ImageManager } from "./image-manager";
import { LocaleTabs, localesWithErrors } from "./locale-tabs";
import { MoneyPair, usdFromCzk, type RateConfig } from "./money-pair";
import { emptyVariant, optionValue, toProductInput, uid, type OptionForm, type ProductForm, type SpecForm, type VariantForm } from "./product-form-model";
import { useAction } from "./use-action";

const EMPTY_SPEC: SpecForm = { number: "", bool: "", textCs: "", textEn: "" };

export type SpecDefOption = { id: string; categoryId: string; key: string; type: string; label: string; unit: string };

export function ProductEditor({
  productId,
  initial,
  categories,
  brands,
  badges,
  specDefinitions,
  categoryAncestors,
  rate,
}: {
  productId: string | null;
  initial: ProductForm;
  categories: Array<{ id: string; label: string }>;
  brands: Array<{ id: string; name: string }>;
  badges: Array<{ id: string; label: string; bgColor: string; textColor: string }>;
  specDefinitions: SpecDefOption[];
  categoryAncestors: Record<string, string[]>;
  rate: RateConfig;
}) {
  const t = useTranslations("admin.products");
  const tc = useTranslations("admin.common");
  const tOpt = useTranslations("common.optionName");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>(initial);
  const { pending, errors, setErrors, message, setMessage, run } = useAction(saveProduct.bind(null, productId));

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const err = (path: string) => errors[path];

  const applicableSpecs = useMemo(() => {
    const chain = categoryAncestors[form.categoryId] ?? [];
    return specDefinitions
      .filter((s) => chain.includes(s.categoryId))
      .sort((a, b) => chain.indexOf(a.categoryId) - chain.indexOf(b.categoryId));
  }, [form.categoryId, categoryAncestors, specDefinitions]);

  const colorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of form.variants) {
      const c = v.options.color;
      if (c && (c.labelCs || c.labelEn)) seen.set(optionValue(c), locale === "en" ? c.labelEn || c.labelCs : c.labelCs || c.labelEn);
    }
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [form.variants, locale]);

  const updateVariant = (index: number, patch: Partial<VariantForm>) =>
    set("variants", form.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));

  const updateOption = (index: number, name: VariantOptionName, patch: Partial<OptionForm>) => {
    const v = form.variants[index];
    const current = v.options[name] ?? { value: "", labelCs: "", labelEn: "", colorHex: "" };
    updateVariant(index, { options: { ...v.options, [name]: { ...current, ...patch } } });
  };

  const toggleOptionName = (name: VariantOptionName, on: boolean) => {
    const optionNames = on ? VARIANT_OPTION_NAMES.filter((n) => n === name || form.optionNames.includes(n)) : form.optionNames.filter((n) => n !== name);
    setForm((f) => ({
      ...f,
      optionNames,
      variants: f.variants.map((v) => ({
        ...v,
        options: on && !v.options[name] ? { ...v.options, [name]: { value: "", labelCs: "", labelEn: "", colorHex: name === "color" ? "#1f2125" : "" } } : v.options,
      })),
    }));
  };

  const setSpec = (id: string, patch: Partial<SpecForm>) =>
    set("specs", { ...form.specs, [id]: { ...(form.specs[id] ?? EMPTY_SPEC), ...patch } });

  const fillAllUsd = () =>
    set(
      "variants",
      form.variants.map((v) => ({
        ...v,
        priceUsd: usdFromCzk(v.priceCzk, rate) ?? v.priceUsd,
        oldPriceUsd: v.oldPriceCzk.trim() ? (usdFromCzk(v.oldPriceCzk, rate) ?? v.oldPriceUsd) : "",
      })),
    );

  const onNameChange = (loc: "cs" | "en", name: string) => {
    const tr = form.translations[loc];
    // Auto-slug only for new products (or an empty slug) so renaming never breaks existing URLs.
    const autoSlug = !tr.slug || (!productId && tr.slug === slugify(tr.name));
    set("translations", { ...form.translations, [loc]: { ...tr, name, slug: autoSlug ? slugify(name) : tr.slug } });
  };

  const submit = () => {
    const input = toProductInput(form);
    const local = validateWith(productSchema, input, locale, (k, v) => tv(k, v));
    if (!local.success) {
      setErrors(local.errors);
      setMessage({ tone: "error", text: tc("fixErrors") });
      return;
    }
    run(input, (result) => {
      const id = result.ok ? result.data?.id : undefined;
      if (!productId && id) router.replace(`/admin/products/${id}?saved=1`);
      else router.refresh();
    });
  };

  const variantErrorCount = Object.keys(errors).filter((k) => k.startsWith("variants")).length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
      className="pb-24"
    >
      {message && (
        <Alert tone={message.tone} className="mb-4">
          {message.text}
          {message.tone === "error" && Object.keys(errors).length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {Object.entries(errors)
                .slice(0, 8)
                .map(([path, msg]) => (
                  <li key={path}>
                    <code>{path}</code>: {msg}
                  </li>
                ))}
            </ul>
          )}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Translations */}
          <Card className="p-5">
            <h2 className="mb-3 text-xl">{t("content")}</h2>
            <LocaleTabs errorLocales={localesWithErrors(errors)}>
              {(loc) => {
                const tr = form.translations[loc];
                const setTr = (patch: Partial<typeof tr>) => set("translations", { ...form.translations, [loc]: { ...tr, ...patch } });
                const p = `translations.${loc}`;
                return (
                  <div className="grid gap-4">
                    <Field id={`${p}.name`} label={t("name")} error={err(`${p}.name`)} required>
                      <Input {...fieldAria(`${p}.name`, err(`${p}.name`))} value={tr.name} onChange={(e) => onNameChange(loc, e.target.value)} />
                    </Field>
                    <Field id={`${p}.slug`} label={t("slug")} error={err(`${p}.slug`)} hint={t("slugHint")} required>
                      <Input {...fieldAria(`${p}.slug`, err(`${p}.slug`))} value={tr.slug} onChange={(e) => setTr({ slug: e.target.value })} />
                    </Field>
                    <Field id={`${p}.short`} label={t("shortDescription")} error={err(`${p}.shortDescription`)}>
                      <Textarea {...fieldAria(`${p}.short`, err(`${p}.shortDescription`))} rows={2} value={tr.shortDescription} onChange={(e) => setTr({ shortDescription: e.target.value })} />
                    </Field>
                    <Field id={`${p}.description`} label={t("description")} error={err(`${p}.description`)} hint={t("descriptionHint")}>
                      <Textarea {...fieldAria(`${p}.description`, err(`${p}.description`))} rows={8} value={tr.description} onChange={(e) => setTr({ description: e.target.value })} />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field id={`${p}.seoTitle`} label={t("seoTitle")} error={err(`${p}.seoTitle`)} hint={t("seoTitleHint")}>
                        <Input {...fieldAria(`${p}.seoTitle`, err(`${p}.seoTitle`))} value={tr.seoTitle} onChange={(e) => setTr({ seoTitle: e.target.value })} />
                      </Field>
                      <Field id={`${p}.seoDescription`} label={t("seoDescription")} error={err(`${p}.seoDescription`)}>
                        <Textarea {...fieldAria(`${p}.seoDescription`, err(`${p}.seoDescription`))} rows={2} value={tr.seoDescription} onChange={(e) => setTr({ seoDescription: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                );
              }}
            </LocaleTabs>
          </Card>

          {/* Variants */}
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl">
                {t("variants")}
                {variantErrorCount > 0 && <span className="ml-2 align-middle text-xs font-sans text-danger">({variantErrorCount})</span>}
              </h2>
              <Button variant="soft" size="sm" onClick={fillAllUsd}>
                <Wand2 className="size-4" aria-hidden="true" />
                {t("fillAllUsd")}
              </Button>
            </div>
            <fieldset className="mb-4">
              <legend className="mb-2 text-sm font-medium">{t("variantAttributes")}</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {VARIANT_OPTION_NAMES.map((name) => (
                  <Checkbox key={name} label={tOpt(name)} checked={form.optionNames.includes(name)} onChange={(e) => toggleOptionName(name, e.target.checked)} />
                ))}
              </div>
            </fieldset>
            {err("variants") && <p className="mb-3 text-sm text-danger">{err("variants")}</p>}
            <ol className="flex flex-col gap-3">
              {form.variants.map((v, i) => {
                const p = `variants.${i}`;
                return (
                  <li key={v.key} className="rounded-xl border border-line bg-canvas/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{t("variantN", { n: i + 1 })}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("duplicateVariant")}
                          title={t("duplicateVariant")}
                          onClick={() => set("variants", [...form.variants.slice(0, i + 1), { ...v, key: uid(), id: undefined, sku: `${v.sku}-2` }, ...form.variants.slice(i + 1)])}
                        >
                          <Copy className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          aria-label={t("removeVariant")}
                          title={t("removeVariant")}
                          disabled={form.variants.length === 1}
                          onClick={() => set("variants", form.variants.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    {form.optionNames.length > 0 && (
                      <div className="mb-3 grid gap-3 md:grid-cols-2">
                        {form.optionNames.map((name) => {
                          const o = v.options[name] ?? { value: "", labelCs: "", labelEn: "", colorHex: "" };
                          const op = `${p}.options`;
                          return (
                            <fieldset key={name} className="rounded-lg border border-line bg-surface p-3">
                              <legend className="px-1 text-xs font-semibold text-ink-soft">{tOpt(name)}</legend>
                              <div className="flex items-center gap-2">
                                {name === "color" && (
                                  <input
                                    type="color"
                                    aria-label={t("swatch")}
                                    value={o.colorHex || "#000000"}
                                    onChange={(e) => updateOption(i, name, { colorHex: e.target.value })}
                                    className="h-8 w-9 shrink-0 cursor-pointer rounded border border-line bg-transparent"
                                  />
                                )}
                                <Input className="h-8" aria-label={`${tOpt(name)} – ${tc("locale.cs")}`} placeholder={tc("locale.cs")} value={o.labelCs} onChange={(e) => updateOption(i, name, { labelCs: e.target.value })} />
                                <Input className="h-8" aria-label={`${tOpt(name)} – ${tc("locale.en")}`} placeholder={tc("locale.en")} value={o.labelEn} onChange={(e) => updateOption(i, name, { labelEn: e.target.value })} />
                              </div>
                              {Object.entries(errors)
                                .filter(([k]) => k.startsWith(op))
                                .slice(0, 1)
                                .map(([k, m]) => (
                                  <p key={k} className="mt-1 text-xs text-danger">
                                    {m}
                                  </p>
                                ))}
                            </fieldset>
                          );
                        })}
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr] lg:grid-cols-[10rem_1fr_1fr_6rem]">
                      <Field id={`${p}.sku`} label={t("sku")} error={err(`${p}.sku`)} required>
                        <Input {...fieldAria(`${p}.sku`, err(`${p}.sku`))} className="h-10 font-mono" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value.toUpperCase() })} />
                      </Field>
                      <MoneyPair
                        idPrefix={`${p}.price`}
                        label={t("price")}
                        required
                        rate={rate}
                        czk={v.priceCzk}
                        usd={v.priceUsd}
                        errors={{ czk: err(`${p}.priceCzk`), usd: err(`${p}.priceUsd`) }}
                        onChange={({ czk, usd }) => updateVariant(i, { priceCzk: czk, priceUsd: usd })}
                      />
                      <MoneyPair
                        idPrefix={`${p}.old`}
                        label={t("oldPrice")}
                        rate={rate}
                        czk={v.oldPriceCzk}
                        usd={v.oldPriceUsd}
                        errors={{ czk: err(`${p}.oldPriceCzk`), usd: err(`${p}.oldPriceUsd`) }}
                        onChange={({ czk, usd }) => updateVariant(i, { oldPriceCzk: czk, oldPriceUsd: usd })}
                      />
                      <Field id={`${p}.stock`} label={t("stock")} error={err(`${p}.stock`)}>
                        <Input {...fieldAria(`${p}.stock`, err(`${p}.stock`))} inputMode="numeric" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} />
                      </Field>
                    </div>
                  </li>
                );
              })}
            </ol>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => set("variants", [...form.variants, emptyVariant(form.optionNames)])}>
              <Plus className="size-4" aria-hidden="true" />
              {t("addVariant")}
            </Button>
          </Card>

          {/* Specs */}
          <Card className="p-5">
            <h2 className="mb-1 text-xl">{t("specs")}</h2>
            <p className="mb-4 text-sm text-ink-soft">{form.categoryId ? t("specsHint") : t("specsPickCategory")}</p>
            <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
              {applicableSpecs.map((s) => {
                const value = form.specs[s.id] ?? { number: "", bool: "", textCs: "", textEn: "" };
                const id = `spec-${s.id}`;
                const label = `${s.label}${s.unit ? ` (${s.unit})` : ""}`;
                if (s.type === "NUMBER")
                  return (
                    <Field key={s.id} id={id} label={label}>
                      <Input id={id} inputMode="decimal" value={value.number} onChange={(e) => setSpec(s.id, { number: e.target.value })} />
                    </Field>
                  );
                if (s.type === "BOOLEAN")
                  return (
                    <Field key={s.id} id={id} label={label}>
                      <Select id={id} value={value.bool} onChange={(e) => setSpec(s.id, { bool: e.target.value as SpecForm["bool"] })}>
                        <option value="">{t("notSet")}</option>
                        <option value="true">{tc("yes")}</option>
                        <option value="false">{tc("no")}</option>
                      </Select>
                    </Field>
                  );
                return (
                  <fieldset key={s.id} className="flex flex-col gap-1.5">
                    <legend className="mb-1.5 text-sm font-medium">{label}</legend>
                    <div className="flex gap-2">
                      <Input aria-label={`${label} – ${tc("locale.cs")}`} placeholder={tc("locale.cs")} value={value.textCs} onChange={(e) => setSpec(s.id, { textCs: e.target.value })} />
                      <Input aria-label={`${label} – ${tc("locale.en")}`} placeholder={tc("locale.en")} value={value.textEn} onChange={(e) => setSpec(s.id, { textEn: e.target.value })} />
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </Card>

          {/* Images */}
          <Card className="p-5">
            <h2 className="mb-1 text-xl">{t("images")}</h2>
            <p className="mb-4 text-sm text-ink-soft">{t("imagesHint")}</p>
            <ImageManager images={form.images} onChange={(images) => set("images", images)} colorOptions={colorOptions} />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-5">
            <Field id="status" label={t("status")}>
              <Select id="status" value={form.status} onChange={(e) => set("status", e.target.value as ProductForm["status"])}>
                <option value="DRAFT">{tc("status.DRAFT")}</option>
                <option value="PUBLISHED">{tc("status.PUBLISHED")}</option>
              </Select>
            </Field>
            <Checkbox label={t("featured")} checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
          </Card>
          <Card className="flex flex-col gap-4 p-5">
            <Field id="categoryId" label={t("category")} error={err("categoryId")} required>
              <Select {...fieldAria("categoryId", err("categoryId"))} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">{tc("choose")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="brandId" label={t("brand")}>
              <Select id="brandId" value={form.brandId} onChange={(e) => set("brandId", e.target.value)}>
                <option value="">{t("noBrand")}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>
          <Card className="p-5">
            <fieldset>
              <legend className="mb-3 text-sm font-medium">{t("badges")}</legend>
              <div className="flex flex-col gap-2">
                {badges.map((b) => (
                  <Checkbox
                    key={b.id}
                    checked={form.badgeIds.includes(b.id)}
                    onChange={(e) => set("badgeIds", e.target.checked ? [...form.badgeIds, b.id] : form.badgeIds.filter((x) => x !== b.id))}
                    label={
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: b.bgColor, color: b.textColor }}>
                        {b.label}
                      </span>
                    }
                  />
                ))}
              </div>
            </fieldset>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6">
          <span className="mr-auto text-sm text-ink-soft">{form.status === "PUBLISHED" ? tc("status.PUBLISHED") : tc("status.DRAFT")}</span>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? tc("saving") : tc("save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
