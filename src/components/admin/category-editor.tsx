"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea, fieldAria } from "@/components/ui/form";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/lib/category-icons";
import { slugify } from "@/lib/text";
import { cn } from "@/lib/cn";
import { categorySchema, type CategoryInput } from "@/lib/validation/admin";
import { validateWith } from "@/lib/validation/i18n";
import { saveCategory } from "@/server/admin/categories";
import { EditorFooter } from "./editor-footer";
import { LocaleTabs, localesWithErrors } from "./locale-tabs";
import { useAction } from "./use-action";

export function CategoryEditor({
  categoryId,
  initial,
  parents,
}: {
  categoryId: string | null;
  initial: CategoryInput;
  parents: Array<{ id: string; label: string }>;
}) {
  const t = useTranslations("admin.categories");
  const tc = useTranslations("admin.common");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const { pending, errors, setErrors, message, setMessage, run } = useAction(saveCategory.bind(null, categoryId));

  const submit = () => {
    const local = validateWith(categorySchema, form, locale, (k, v) => tv(k, v));
    if (!local.success) {
      setErrors(local.errors);
      setMessage({ tone: "error", text: tc("fixErrors") });
      return;
    }
    run(form, (r) => {
      const id = r.ok ? r.data?.id : undefined;
      if (!categoryId && id) router.replace(`/admin/categories/${id}?saved=1`);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} noValidate className="pb-24">
      {message && <Alert tone={message.tone} className="mb-4">{message.text}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Card className="p-5">
          <LocaleTabs errorLocales={localesWithErrors(errors)}>
            {(loc) => {
              const tr = form.translations[loc];
              const p = `translations.${loc}`;
              const setTr = (patch: Partial<typeof tr>) => setForm((f) => ({ ...f, translations: { ...f.translations, [loc]: { ...f.translations[loc], ...patch } } }));
              return (
                <div className="grid gap-4">
                  <Field id={`${p}.name`} label={t("name")} error={errors[`${p}.name`]} required>
                    <Input
                      {...fieldAria(`${p}.name`, errors[`${p}.name`])}
                      value={tr.name}
                      onChange={(e) => setTr({ name: e.target.value, slug: !tr.slug || (!categoryId && tr.slug === slugify(tr.name)) ? slugify(e.target.value) : tr.slug })}
                    />
                  </Field>
                  <Field id={`${p}.slug`} label={t("slug")} error={errors[`${p}.slug`]} required>
                    <Input {...fieldAria(`${p}.slug`, errors[`${p}.slug`])} value={tr.slug} onChange={(e) => setTr({ slug: e.target.value })} />
                  </Field>
                  <Field id={`${p}.description`} label={t("description")} error={errors[`${p}.description`]}>
                    <Textarea {...fieldAria(`${p}.description`, errors[`${p}.description`])} rows={3} value={tr.description} onChange={(e) => setTr({ description: e.target.value })} />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field id={`${p}.seoTitle`} label={t("seoTitle")} error={errors[`${p}.seoTitle`]}>
                      <Input {...fieldAria(`${p}.seoTitle`, errors[`${p}.seoTitle`])} value={tr.seoTitle} onChange={(e) => setTr({ seoTitle: e.target.value })} />
                    </Field>
                    <Field id={`${p}.seoDescription`} label={t("seoDescription")} error={errors[`${p}.seoDescription`]}>
                      <Textarea {...fieldAria(`${p}.seoDescription`, errors[`${p}.seoDescription`])} rows={2} value={tr.seoDescription} onChange={(e) => setTr({ seoDescription: e.target.value })} />
                    </Field>
                  </div>
                </div>
              );
            }}
          </LocaleTabs>
        </Card>
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-5">
            <Field id="parentId" label={t("parent")} error={errors.parentId}>
              <Select {...fieldAria("parentId", errors.parentId)} value={form.parentId ?? ""} onChange={(e) => setForm({ ...form, parentId: e.target.value || null })}>
                <option value="">{t("root")}</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === categoryId}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="sortOrder" label={t("sortOrder")} error={errors.sortOrder}>
              <Input {...fieldAria("sortOrder", errors.sortOrder)} type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} />
            </Field>
            <Checkbox label={t("active")} checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          </Card>
          <Card className="p-5">
            <fieldset>
              <legend className="mb-3 text-sm font-medium">{t("icon")}</legend>
              <div className="grid grid-cols-5 gap-2" role="radiogroup">
                {CATEGORY_ICON_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={form.icon === name}
                    aria-label={name}
                    title={name}
                    onClick={() => setForm({ ...form, icon: name })}
                    className={cn("grid aspect-square place-items-center rounded-lg border", form.icon === name ? "border-brand bg-brand-soft text-brand" : "border-line hover:border-ink")}
                  >
                    <CategoryIcon name={name} className="size-5" />
                  </button>
                ))}
              </div>
              {errors.icon && <p className="mt-2 text-xs text-danger">{errors.icon}</p>}
            </fieldset>
          </Card>
        </div>
      </div>
      <EditorFooter pending={pending} />
    </form>
  );
}
