"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, fieldAria } from "@/components/ui/form";
import { ADMIN_ROLES } from "@/lib/domain";
import { formatRate, parseMajorToMinor, parseRate, USD_ROUNDING_MODES, type UsdRoundingMode } from "@/lib/money";
import { adminUserSchema, type AdminUserInput, type SettingsInput } from "@/lib/validation/admin";
import { deleteShippingMethod, recalculateAllUsdPrices, saveAdminUser, saveSettings, saveShippingMethod } from "@/server/admin/system";
import { ConfirmButton } from "./confirm-button";
import { EditorFooter } from "./editor-footer";
import { MoneyPair } from "./money-pair";
import { type ShippingRow } from "./shipping-model";
import { useAction } from "./use-action";
import { useEditor } from "./use-editor";

export function AdminUserEditor({ userId, initial }: { userId: string | null; initial: AdminUserInput }) {
  const t = useTranslations("admin.users");
  const { form, patch, submit, pending, errors, message } = useEditor({ schema: adminUserSchema, save: saveAdminUser.bind(null, userId), entityId: userId, basePath: "/admin/users", initial });
  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} noValidate className="pb-24">
      {message && <Alert tone={message.tone} className="mb-4">{message.text}</Alert>}
      <Card className="grid max-w-3xl gap-4 p-5 md:grid-cols-2">
        <Field id="name" label={t("name")} error={errors.name} required>
          <Input {...fieldAria("name", errors.name)} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field id="email" label={t("email")} error={errors.email} required>
          <Input {...fieldAria("email", errors.email)} type="email" autoComplete="off" value={form.email} onChange={(e) => patch({ email: e.target.value })} />
        </Field>
        <Field id="role" label={t("role")} hint={t("roleHint")}>
          <Select id="role" value={form.role} onChange={(e) => patch({ role: e.target.value as AdminUserInput["role"] })}>
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>{t(`roles.${r}`)}</option>
            ))}
          </Select>
        </Field>
        <Field id="password" label={userId ? t("newPassword") : t("password")} error={errors.password} hint={userId ? t("passwordKeep") : t("passwordHint")} required={!userId}>
          <Input {...fieldAria("password", errors.password)} type="password" autoComplete="new-password" value={form.password} onChange={(e) => patch({ password: e.target.value })} />
        </Field>
        <Checkbox label={t("active")} checked={form.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
      </Card>
      <EditorFooter pending={pending} />
    </form>
  );
}

type SettingsForm = Omit<SettingsInput, "usdRate" | "lowStockThreshold"> & { usdRate: string; lowStockThreshold: string };

export function SettingsEditor({ initial }: { initial: SettingsInput }) {
  const t = useTranslations("admin.settings");
  const [form, setForm] = useState<SettingsForm>({ ...initial, usdRate: formatRate(initial.usdRate), lowStockThreshold: String(initial.lowStockThreshold) });
  const { pending, errors, message, run } = useAction(saveSettings);
  const recalc = useAction(recalculateAllUsdPrices);
  const patch = (p: Partial<SettingsForm>) => setForm((f) => ({ ...f, ...p }));
  const text = (key: keyof SettingsForm, label: string, type = "text") => (
    <Field id={key} label={label} error={errors[key]}>
      <Input {...fieldAria(key, errors[key])} type={type} value={String(form[key])} onChange={(e) => patch({ [key]: e.target.value })} />
    </Field>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run({ ...form, usdRate: parseRate(form.usdRate) ?? -1, lowStockThreshold: Number.parseInt(form.lowStockThreshold, 10) });
      }}
      noValidate
      className="pb-24"
    >
      {message && <Alert tone={message.tone} className="mb-4">{message.text}</Alert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-xl">{t("currency")}</h2>
          <Field id="usdRate" label={t("usdRate")} error={errors.usdRate} hint={t("usdRateHint")}>
            <Input {...fieldAria("usdRate", errors.usdRate)} inputMode="decimal" value={form.usdRate} onChange={(e) => patch({ usdRate: e.target.value })} />
          </Field>
          <Field id="usdRounding" label={t("usdRounding")}>
            <Select id="usdRounding" value={form.usdRounding} onChange={(e) => patch({ usdRounding: e.target.value as UsdRoundingMode })}>
              {USD_ROUNDING_MODES.map((m) => (
                <option key={m} value={m}>{t(`rounding.${m}`)}</option>
              ))}
            </Select>
          </Field>
          <div className="rounded-lg bg-canvas p-3 text-sm">
            <p className="text-ink-soft">{t("recalcHint")}</p>
            {recalc.message && <Alert tone={recalc.message.tone} className="mt-2">{recalc.message.text}</Alert>}
            <Button variant="outline" size="sm" className="mt-2" disabled={recalc.pending} onClick={() => recalc.run(undefined)}>
              <RefreshCw className="size-4" aria-hidden="true" />
              {t("recalc")}
            </Button>
          </div>
          {text("lowStockThreshold", t("lowStockThreshold"), "number")}
        </Card>
        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <h2 className="text-xl md:col-span-2">{t("shop")}</h2>
          {text("shopName", t("shopName"))}
          {text("contactEmail", t("contactEmail"), "email")}
          {text("contactPhone", t("contactPhone"))}
          {text("companyId", t("companyId"))}
          <div className="md:col-span-2">{text("address", t("address"))}</div>
          {text("bankAccount", t("bankAccount"))}
          {text("iban", t("iban"))}
        </Card>
      </div>
      <EditorFooter pending={pending} />
    </form>
  );
}

export function ShippingMethodsEditor({ initial, rate }: { initial: ShippingRow[]; rate: { usdRate: number; usdRounding: UsdRoundingMode } }) {
  const t = useTranslations("admin.settings");
  const [rows, setRows] = useState(initial);
  const empty: ShippingRow = { id: null, code: "", priceCzk: "0", priceUsd: "0", freeCzk: "", freeUsd: "", allowsCod: true, isActive: true, sortOrder: rows.length, translations: { cs: { name: "", description: "" }, en: { name: "", description: "" } } };
  return (
    <Card className="mt-6 mb-24 p-5">
      <h2 className="mb-1 text-xl">{t("shipping")}</h2>
      <p className="mb-4 text-sm text-ink-soft">{t("shippingHint")}</p>
      <div className="flex flex-col gap-4">
        {rows.map((row, i) => (
          <ShippingRowForm key={row.id ?? `new-${i}`} row={row} rate={rate} onSaved={(id) => setRows((r) => r.map((x, j) => (j === i ? { ...x, id } : x)))} onRemoved={() => setRows((r) => r.filter((_, j) => j !== i))} />
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => setRows([...rows, empty])}>
        <Plus className="size-4" aria-hidden="true" />
        {t("addShipping")}
      </Button>
    </Card>
  );
}

function ShippingRowForm({ row, rate, onSaved, onRemoved }: { row: ShippingRow; rate: { usdRate: number; usdRounding: UsdRoundingMode }; onSaved: (id: string) => void; onRemoved: () => void }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("admin.common");
  const [r, setR] = useState(row);
  const { pending, errors, message, run } = useAction(saveShippingMethod.bind(null, r.id));
  const money = (v: string) => parseMajorToMinor(v) ?? -1;
  const optional = (v: string) => (v.trim() === "" ? null : money(v));
  const save = () =>
    run(
      {
        code: r.code,
        priceCzk: money(r.priceCzk),
        priceUsd: money(r.priceUsd),
        freeFromCzk: optional(r.freeCzk),
        freeFromUsd: optional(r.freeUsd),
        allowsCod: r.allowsCod,
        isActive: r.isActive,
        sortOrder: r.sortOrder,
        translations: r.translations,
      },
      (res) => res.ok && res.data && onSaved(res.data.id),
    );
  const setTr = (loc: "cs" | "en", p: Partial<{ name: string; description: string }>) => setR({ ...r, translations: { ...r.translations, [loc]: { ...r.translations[loc], ...p } } });
  const pre = r.id ?? "new";
  return (
    <div className="rounded-xl border border-line bg-canvas/60 p-4">
      {message && <Alert tone={message.tone} className="mb-3">{message.text}</Alert>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field id={`${pre}-code`} label={t("code")} error={errors.code}>
          <Input {...fieldAria(`${pre}-code`, errors.code)} className="font-mono" value={r.code} onChange={(e) => setR({ ...r, code: e.target.value })} />
        </Field>
        <Field id={`${pre}-name-cs`} label={`${t("methodName")} (CS)`} error={errors["translations.cs.name"]}>
          <Input {...fieldAria(`${pre}-name-cs`, errors["translations.cs.name"])} value={r.translations.cs.name} onChange={(e) => setTr("cs", { name: e.target.value })} />
        </Field>
        <Field id={`${pre}-name-en`} label={`${t("methodName")} (EN)`} error={errors["translations.en.name"]}>
          <Input {...fieldAria(`${pre}-name-en`, errors["translations.en.name"])} value={r.translations.en.name} onChange={(e) => setTr("en", { name: e.target.value })} />
        </Field>
        <Field id={`${pre}-sort`} label={t("sortOrder")}>
          <Input id={`${pre}-sort`} type="number" value={r.sortOrder} onChange={(e) => setR({ ...r, sortOrder: Number(e.target.value) || 0 })} />
        </Field>
        <Field id={`${pre}-desc-cs`} label={`${t("methodDescription")} (CS)`} className="xl:col-span-2">
          <Input id={`${pre}-desc-cs`} value={r.translations.cs.description} onChange={(e) => setTr("cs", { description: e.target.value })} />
        </Field>
        <Field id={`${pre}-desc-en`} label={`${t("methodDescription")} (EN)`} className="xl:col-span-2">
          <Input id={`${pre}-desc-en`} value={r.translations.en.description} onChange={(e) => setTr("en", { description: e.target.value })} />
        </Field>
        <div className="xl:col-span-2">
          <MoneyPair idPrefix={`${pre}-price`} label={t("price")} rate={rate} czk={r.priceCzk} usd={r.priceUsd} errors={{ czk: errors.priceCzk, usd: errors.priceUsd }} onChange={({ czk, usd }) => setR({ ...r, priceCzk: czk, priceUsd: usd })} />
        </div>
        <div className="xl:col-span-2">
          <MoneyPair idPrefix={`${pre}-free`} label={t("freeFrom")} rate={rate} czk={r.freeCzk} usd={r.freeUsd} errors={{ czk: errors.freeFromCzk, usd: errors.freeFromUsd }} onChange={({ czk, usd }) => setR({ ...r, freeCzk: czk, freeUsd: usd })} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Checkbox label={t("allowsCod")} checked={r.allowsCod} onChange={(e) => setR({ ...r, allowsCod: e.target.checked })} />
        <Checkbox label={tc("active")} checked={r.isActive} onChange={(e) => setR({ ...r, isActive: e.target.checked })} />
        <span className="flex-1" />
        {r.id ? (
          <ConfirmButton action={async () => { const res = await deleteShippingMethod(r.id!); if (res.ok) onRemoved(); return res; }} title={t("deleteShippingTitle")} ariaLabel={tc("delete")} className="text-danger">
            <Trash2 className="size-4" aria-hidden="true" />
          </ConfirmButton>
        ) : (
          <Button variant="ghost" size="sm" onClick={onRemoved}>{tc("cancel")}</Button>
        )}
        <Button size="sm" onClick={save} disabled={pending}>{pending ? tc("saving") : tc("save")}</Button>
      </div>
    </div>
  );
}
