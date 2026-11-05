"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, fieldAria } from "@/components/ui/form";
import { BANNER_PLACEMENTS, SPEC_TYPES } from "@/lib/domain";
import { slugify } from "@/lib/text";
import {
  badgeSchema,
  bannerSchema,
  brandSchema,
  specDefinitionSchema,
  type BadgeInput,
  type BannerInput,
  type BrandInput,
  type SpecDefinitionInput,
} from "@/lib/validation/admin";
import { saveBadge, saveBanner, saveBrand, saveSpecDefinition } from "@/server/admin/merch";
import { EditorFooter } from "./editor-footer";
import { LocaleTabs, localesWithErrors } from "./locale-tabs";
import { SingleImageField } from "./single-image-field";
import { useEditor } from "./use-editor";

function Message({ message }: { message: { tone: "success" | "error"; text: string } | null }) {
  return message ? <Alert tone={message.tone} className="mb-4">{message.text}</Alert> : null;
}

function ColorField({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field id={id} label={label} error={error}>
      <div className="flex gap-2">
        <input type="color" aria-label={label} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-line" />
        <Input {...fieldAria(id, error)} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
    </Field>
  );
}

// ── Brand ───────────────────────────────────────────────────────────────────

export function BrandEditor({ brandId, initial }: { brandId: string | null; initial: BrandInput }) {
  const t = useTranslations("admin.brands");
  const { form, patch, submit, pending, errors, message } = useEditor({ schema: brandSchema, save: saveBrand.bind(null, brandId), entityId: brandId, basePath: "/admin/brands", initial });
  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} noValidate className="pb-24">
      <Message message={message} />
      <Card className="grid max-w-3xl gap-4 p-5 md:grid-cols-2">
        <Field id="name" label={t("name")} error={errors.name} required>
          <Input {...fieldAria("name", errors.name)} value={form.name} onChange={(e) => patch({ name: e.target.value, slug: !form.slug || form.slug === slugify(form.name) ? slugify(e.target.value) : form.slug })} />
        </Field>
        <Field id="slug" label={t("slug")} error={errors.slug} required>
          <Input {...fieldAria("slug", errors.slug)} value={form.slug} onChange={(e) => patch({ slug: e.target.value })} />
        </Field>
        <Field id="website" label={t("website")} error={errors.website}>
          <Input {...fieldAria("website", errors.website)} type="url" placeholder="https://" value={form.website} onChange={(e) => patch({ website: e.target.value })} />
        </Field>
        <Field id="sortOrder" label={t("sortOrder")} error={errors.sortOrder}>
          <Input {...fieldAria("sortOrder", errors.sortOrder)} type="number" value={form.sortOrder} onChange={(e) => patch({ sortOrder: Number(e.target.value) || 0 })} />
        </Field>
        <div className="md:col-span-2">
          <SingleImageField id="logo" label={t("logo")} value={form.logoUrl ?? ""} onChange={(url) => patch({ logoUrl: url || null })} />
        </div>
        <Checkbox label={t("active")} checked={form.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
      </Card>
      <EditorFooter pending={pending} />
    </form>
  );
}

// ── Spec definition ─────────────────────────────────────────────────────────

export function SpecEditor({ specId, initial, categories }: { specId: string | null; initial: SpecDefinitionInput; categories: Array<{ id: string; label: string }> }) {
  const t = useTranslations("admin.specs");
  const { form, patch, setForm, submit, pending, errors, message } = useEditor({ schema: specDefinitionSchema, save: saveSpecDefinition.bind(null, specId), entityId: specId, basePath: "/admin/specs", initial });
  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} noValidate className="pb-24">
      <Message message={message} />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <Field id="categoryId" label={t("category")} error={errors.categoryId} hint={t("categoryHint")} required>
            <Select {...fieldAria("categoryId", errors.categoryId)} value={form.categoryId} onChange={(e) => patch({ categoryId: e.target.value })}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="key" label={t("key")} error={errors.key} hint={t("keyHint")} required>
            <Input {...fieldAria("key", errors.key)} className="font-mono" value={form.key} onChange={(e) => patch({ key: e.target.value })} />
          </Field>
          <Field id="type" label={t("type")} error={errors.type} hint={specId ? t("typeWarning") : undefined}>
            <Select id="type" value={form.type} onChange={(e) => patch({ type: e.target.value as SpecDefinitionInput["type"] })}>
              {SPEC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="sortOrder" label={t("sortOrder")} error={errors.sortOrder}>
            <Input {...fieldAria("sortOrder", errors.sortOrder)} type="number" value={form.sortOrder} onChange={(e) => patch({ sortOrder: Number(e.target.value) || 0 })} />
          </Field>
          <Checkbox label={t("filterable")} checked={form.isFilterable} onChange={(e) => patch({ isFilterable: e.target.checked })} />
          <Checkbox label={t("isKey")} checked={form.isKey} onChange={(e) => patch({ isKey: e.target.checked })} />
        </Card>
        <Card className="p-5">
          <LocaleTabs errorLocales={localesWithErrors(errors)}>
            {(loc) => {
              const p = `translations.${loc}`;
              const tr = form.translations[loc];
              const setTr = (x: Partial<typeof tr>) => setForm((f) => ({ ...f, translations: { ...f.translations, [loc]: { ...f.translations[loc], ...x } } }));
              return (
                <div className="flex flex-col gap-4">
                  <Field id={`${p}.label`} label={t("label")} error={errors[`${p}.label`]} required>
                    <Input {...fieldAria(`${p}.label`, errors[`${p}.label`])} value={tr.label} onChange={(e) => setTr({ label: e.target.value })} />
                  </Field>
                  <Field id={`${p}.unit`} label={t("unit")} error={errors[`${p}.unit`]} hint={t("unitHint")}>
                    <Input {...fieldAria(`${p}.unit`, errors[`${p}.unit`])} value={tr.unit} onChange={(e) => setTr({ unit: e.target.value })} />
                  </Field>
                </div>
              );
            }}
          </LocaleTabs>
        </Card>
      </div>
      <EditorFooter pending={pending} />
    </form>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────────

export function BadgeEditor({ badgeId, initial }: { badgeId: string | null; initial: BadgeInput }) {
  const t = useTranslations("admin.badges");
  const { form, patch, setForm, submit, pending, errors, message } = useEditor({ schema: badgeSchema, save: saveBadge.bind(null, badgeId), entityId: badgeId, basePath: "/admin/badges", initial });
  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} noValidate className="pb-24">
      <Message message={message} />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <Field id="code" label={t("code")} error={errors.code} hint={t("codeHint")} required>
            <Input {...fieldAria("code", errors.code)} className="font-mono" value={form.code} onChange={(e) => patch({ code: e.target.value })} />
          </Field>
          <ColorField id="bgColor" label={t("bgColor")} value={form.bgColor} error={errors.bgColor} onChange={(bgColor) => patch({ bgColor })} />
          <ColorField id="textColor" label={t("textColor")} value={form.textColor} error={errors.textColor} onChange={(textColor) => patch({ textColor })} />
          <Field id="sortOrder" label={t("sortOrder")} error={errors.sortOrder}>
            <Input {...fieldAria("sortOrder", errors.sortOrder)} type="number" value={form.sortOrder} onChange={(e) => patch({ sortOrder: Number(e.target.value) || 0 })} />
          </Field>
        </Card>
        <Card className="p-5">
          <LocaleTabs errorLocales={localesWithErrors(errors)}>
            {(loc) => (
              <Field id={`translations.${loc}.label`} label={t("label")} error={errors[`translations.${loc}.label`]} required>
                <Input
                  {...fieldAria(`translations.${loc}.label`, errors[`translations.${loc}.label`])}
                  value={form.translations[loc].label}
                  onChange={(e) => setForm((f) => ({ ...f, translations: { ...f.translations, [loc]: { label: e.target.value } } }))}
                />
              </Field>
            )}
          </LocaleTabs>
          <p className="mt-6 text-sm text-ink-soft">{t("preview")}</p>
          <div className="mt-2 flex gap-2">
            {(["cs", "en"] as const).map((l) => (
              <span key={l} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: form.bgColor, color: form.textColor }}>
                {form.translations[l].label || "…"}
              </span>
            ))}
          </div>
        </Card>
      </div>
      <EditorFooter pending={pending} />
    </form>
  );
}

// ── Banner ──────────────────────────────────────────────────────────────────

export function BannerEditor({ bannerId, initial }: { bannerId: string | null; initial: BannerInput }) {
  const t = useTranslations("admin.banners");
  const { form, patch, setForm, submit, pending, errors, message } = useEditor({ schema: bannerSchema, save: saveBanner.bind(null, bannerId), entityId: bannerId, basePath: "/admin/banners", initial });
  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} noValidate className="pb-24">
      <Message message={message} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <LocaleTabs errorLocales={localesWithErrors(errors)}>
              {(loc) => {
                const p = `translations.${loc}`;
                const tr = form.translations[loc];
                const setTr = (x: Partial<typeof tr>) => setForm((f) => ({ ...f, translations: { ...f.translations, [loc]: { ...f.translations[loc], ...x } } }));
                return (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field id={`${p}.title`} label={t("titleField")} error={errors[`${p}.title`]} required className="md:col-span-2">
                      <Input {...fieldAria(`${p}.title`, errors[`${p}.title`])} value={tr.title} onChange={(e) => setTr({ title: e.target.value })} />
                    </Field>
                    <Field id={`${p}.subtitle`} label={t("subtitleField")} error={errors[`${p}.subtitle`]} className="md:col-span-2">
                      <Input {...fieldAria(`${p}.subtitle`, errors[`${p}.subtitle`])} value={tr.subtitle} onChange={(e) => setTr({ subtitle: e.target.value })} />
                    </Field>
                    <Field id={`${p}.ctaLabel`} label={t("ctaLabel")} error={errors[`${p}.ctaLabel`]}>
                      <Input {...fieldAria(`${p}.ctaLabel`, errors[`${p}.ctaLabel`])} value={tr.ctaLabel} onChange={(e) => setTr({ ctaLabel: e.target.value })} />
                    </Field>
                    <Field id={`${p}.linkUrl`} label={t("linkUrl")} error={errors[`${p}.linkUrl`]} hint={t("linkHint")}>
                      <Input {...fieldAria(`${p}.linkUrl`, errors[`${p}.linkUrl`])} value={tr.linkUrl} onChange={(e) => setTr({ linkUrl: e.target.value })} />
                    </Field>
                    <Field id={`${p}.imageAlt`} label={t("imageAlt")} error={errors[`${p}.imageAlt`]} className="md:col-span-2">
                      <Input {...fieldAria(`${p}.imageAlt`, errors[`${p}.imageAlt`])} value={tr.imageAlt} onChange={(e) => setTr({ imageAlt: e.target.value })} />
                    </Field>
                  </div>
                );
              }}
            </LocaleTabs>
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-sm font-medium">{t("preview")}</p>
            <div className="flex min-h-40 items-center gap-4 overflow-hidden rounded-xl p-6" style={{ background: form.bgColor, color: form.textColor }}>
              <div className="flex-1">
                <p className="font-display text-2xl">{form.translations.cs.title || "…"}</p>
                <p className="mt-1 text-sm opacity-80">{form.translations.cs.subtitle}</p>
                {form.translations.cs.ctaLabel && <span className="mt-3 inline-block rounded-full bg-ink px-4 py-1.5 text-sm text-white">{form.translations.cs.ctaLabel}</span>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
              {form.imageUrl && <img src={form.imageUrl} alt="" className="size-32 object-contain" />}
            </div>
          </Card>
        </div>
        <Card className="flex flex-col gap-4 p-5">
          <Field id="placement" label={t("placement")}>
            <Select id="placement" value={form.placement} onChange={(e) => patch({ placement: e.target.value as BannerInput["placement"] })}>
              {BANNER_PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {t(`placements.${p}`)}
                </option>
              ))}
            </Select>
          </Field>
          <SingleImageField id="imageUrl" label={t("image")} value={form.imageUrl ?? ""} onChange={(url) => patch({ imageUrl: url || null })} />
          <ColorField id="bgColor" label={t("bgColor")} value={form.bgColor} error={errors.bgColor} onChange={(bgColor) => patch({ bgColor })} />
          <ColorField id="textColor" label={t("textColor")} value={form.textColor} error={errors.textColor} onChange={(textColor) => patch({ textColor })} />
          <Field id="startsAt" label={t("startsAt")} error={errors.startsAt}>
            <Input {...fieldAria("startsAt", errors.startsAt)} type="datetime-local" value={form.startsAt} onChange={(e) => patch({ startsAt: e.target.value })} />
          </Field>
          <Field id="endsAt" label={t("endsAt")} error={errors.endsAt}>
            <Input {...fieldAria("endsAt", errors.endsAt)} type="datetime-local" value={form.endsAt} onChange={(e) => patch({ endsAt: e.target.value })} />
          </Field>
          <Field id="sortOrder" label={t("sortOrder")} error={errors.sortOrder}>
            <Input {...fieldAria("sortOrder", errors.sortOrder)} type="number" value={form.sortOrder} onChange={(e) => patch({ sortOrder: Number(e.target.value) || 0 })} />
          </Field>
          <Checkbox label={t("active")} checked={form.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
        </Card>
      </div>
      <EditorFooter pending={pending} />
    </form>
  );
}
