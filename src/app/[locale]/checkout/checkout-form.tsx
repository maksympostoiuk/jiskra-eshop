"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, CreditCard, Landmark, Lock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select, Textarea, fieldAria } from "@/components/ui/form";
import { cartStore } from "@/components/store/client-store";
import { ShopImage } from "@/components/store/shop-image";
import { useCartQuote } from "@/components/store/use-cart-quote";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { computeTotals } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { checkoutSchema, COUNTRIES } from "@/lib/validation/store";
import { validateWith, type FieldErrors } from "@/lib/validation/i18n";
import { placeOrder } from "@/server/checkout";

export type ShippingOption = { id: string; name: string; description: string; allowsCod: boolean; CZK: { price: number; freeFrom: number | null }; USD: { price: number; freeFrom: number | null } };

const PAYMENT_ICONS = { bank_transfer: Landmark, cod: Banknote, stripe: CreditCard } as const;
const DRAFT_KEY = "jiskra:checkout-draft";

export function CheckoutForm({ currency: pageCurrency, prefill, shippingOptions, paymentMethods }: { currency: string; prefill: { email: string; firstName: string; lastName: string; phone: string } | null; shippingOptions: ShippingOption[]; paymentMethods: Array<"bank_transfer" | "cod" | "stripe"> }) {
  const t = useTranslations("checkout");
  const tPay = useTranslations("common.paymentMethod");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const { quoted, currency, loading } = useCartQuote(pageCurrency);
  const [contact, setContact] = useState({ email: "", phone: "", firstName: "", lastName: "", company: "", street: "", city: "", zip: "", country: "CZ" as (typeof COUNTRIES)[number], note: "" });
  const [shippingMethodId, setShippingMethodId] = useState(shippingOptions[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethods[0] ?? "");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Remember the contact details as a per-browser convenience (never the payment choice).
  useEffect(() => {
    try {
      const draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null");
      // Account details win over the browser draft for the identity fields.
      const fromAccount = prefill ? Object.fromEntries(Object.entries(prefill).filter(([, v]) => v)) : {};
      setContact((c) => ({ ...c, ...(draft && typeof draft === "object" ? draft : {}), ...fromAccount }));
    } catch {
      /* ignore */
    }
    // Run once on mount; `prefill` comes from the server render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...contact, note: "" }));
    } catch {
      /* ignore */
    }
  }, [contact]);

  const shipping = shippingOptions.find((s) => s.id === shippingMethodId);
  useEffect(() => {
    if (paymentMethod === "cod" && shipping && !shipping.allowsCod) setPaymentMethod(paymentMethods.find((p) => p !== "cod") ?? "");
  }, [shipping, paymentMethod, paymentMethods]);

  if (loading) return <p className="mt-8 text-ink-soft" aria-busy="true">{t("loading")}</p>;
  if (!quoted.length || !currency)
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-10 text-center">
        <p className="font-display text-2xl">{t("emptyTitle")}</p>
        <Link href="/" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">{t("backToShop")}</Link>
      </div>
    );

  const money = (n: number) => formatMoney(n, currency, locale);
  const lines = quoted.filter((l) => l.available);
  const rule = shipping ? shipping[currency] : null;
  const totals = computeTotals(lines.map((l) => ({ unitPrice: l.unitPrice, qty: l.qty })), rule);
  const clearError = (key: string) => setErrors((prev) => (key in prev ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)) : prev));
  const set = (key: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setContact({ ...contact, [key]: e.target.value });
    clearError(key);
  };

  const submit = () => {
    const input = { ...contact, shippingMethodId, paymentMethod, consent, expectedTotal: totals.total, lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })) };
    const local = validateWith(checkoutSchema, input, locale, (k, v) => tv(k, v));
    if (!local.success) {
      setErrors(local.errors);
      setMessage(t("errors.form"));
      document.getElementById(Object.keys(local.errors)[0])?.focus();
      return;
    }
    setMessage(null);
    start(async () => {
      const result = await placeOrder(local.data);
      if (result.ok && result.data) {
        cartStore.set([]);
        window.location.assign(result.data.redirectUrl);
      } else if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? t("errors.form"));
      }
    });
  };

  const text = (key: keyof typeof contact, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, required = true) => (
    <Field id={key} label={label} error={errors[key]} required={required}>
      <Input {...fieldAria(key, errors[key])} value={contact[key]} onChange={set(key)} {...props} />
    </Field>
  );

  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} noValidate className="mt-6 grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="flex flex-col gap-6">
        {message && <Alert tone="error">{message}</Alert>}

        <fieldset className="rounded-2xl border border-line/70 bg-surface p-6 shadow-card">
          <legend className="float-left mb-4 w-full font-display text-2xl">{t("contact")}</legend>
          <div className="clear-both grid gap-4 sm:grid-cols-2">
            {text("email", t("email"), { type: "email", autoComplete: "email" })}
            {text("phone", t("phone"), { type: "tel", autoComplete: "tel" })}
            {text("firstName", t("firstName"), { autoComplete: "given-name" })}
            {text("lastName", t("lastName"), { autoComplete: "family-name" })}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-line/70 bg-surface p-6 shadow-card">
          <legend className="float-left mb-4 w-full font-display text-2xl">{t("address")}</legend>
          <div className="clear-both grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-6">{text("company", t("company"), { autoComplete: "organization" }, false)}</div>
            <div className="sm:col-span-6">{text("street", t("street"), { autoComplete: "street-address" })}</div>
            <div className="sm:col-span-3">{text("city", t("city"), { autoComplete: "address-level2" })}</div>
            <div className="sm:col-span-1">{text("zip", t("zip"), { autoComplete: "postal-code", inputMode: "numeric" })}</div>
            <Field id="country" label={t("country")} className="sm:col-span-2" required>
              <Select id="country" autoComplete="country" value={contact.country} onChange={set("country")}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{t(`countries.${c}`)}</option>
                ))}
              </Select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-line/70 bg-surface p-6 shadow-card" aria-describedby={errors.shippingMethodId ? "shipping-error" : undefined}>
          <legend className="float-left mb-4 w-full font-display text-2xl">{t("shipping")}</legend>
          <div className="clear-both flex flex-col gap-2">
            {shippingOptions.map((s) => {
              const price = s[currency];
              const free = price.freeFrom !== null && totals.itemsTotal >= price.freeFrom;
              return (
                <label key={s.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors", shippingMethodId === s.id ? "border-ink bg-canvas" : "border-line hover:border-line-strong")}>
                  <input type="radio" name="shipping" value={s.id} checked={shippingMethodId === s.id} onChange={() => setShippingMethodId(s.id)} className="size-4 accent-brand" />
                  <span className="flex-1">
                    <span className="block font-medium">{s.name}</span>
                    {s.description && <span className="block text-sm text-ink-soft">{s.description}</span>}
                    {price.freeFrom !== null && price.price > 0 && !free && <span className="block text-xs text-ink-faint">{t("freeFrom", { amount: money(price.freeFrom) })}</span>}
                  </span>
                  <span className="font-semibold">{price.price === 0 || free ? t("free") : money(price.price)}</span>
                </label>
              );
            })}
          </div>
          {errors.shippingMethodId && <p id="shipping-error" role="alert" className="mt-2 text-xs font-medium text-danger">{errors.shippingMethodId}</p>}
        </fieldset>

        <fieldset className="rounded-2xl border border-line/70 bg-surface p-6 shadow-card">
          <legend className="float-left mb-4 w-full font-display text-2xl">{t("payment")}</legend>
          <div className="clear-both flex flex-col gap-2">
            {paymentMethods.map((p) => {
              const Icon = PAYMENT_ICONS[p];
              const disabled = p === "cod" && !!shipping && !shipping.allowsCod;
              return (
                <label key={p} className={cn("flex items-center gap-3 rounded-xl border p-4 transition-colors", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer", paymentMethod === p ? "border-ink bg-canvas" : "border-line hover:border-line-strong")}>
                  <input type="radio" name="payment" value={p} checked={paymentMethod === p} disabled={disabled} onChange={() => setPaymentMethod(p)} className="size-4 accent-brand" />
                  <Icon className="size-5 text-brand" aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block font-medium">{tPay(p)}</span>
                    <span className="block text-sm text-ink-soft">{t(`paymentHint.${p}`)}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.paymentMethod && <p role="alert" className="mt-2 text-xs font-medium text-danger">{errors.paymentMethod}</p>}
        </fieldset>

        <div className="rounded-2xl border border-line/70 bg-surface p-6 shadow-card">
          <Field id="note" label={t("note")} error={errors.note}>
            <Textarea {...fieldAria("note", errors.note)} rows={3} value={contact.note} onChange={set("note")} />
          </Field>
        </div>
      </div>

      <aside aria-labelledby="checkout-summary" className="lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-2xl border border-line/70 bg-surface p-6 shadow-card">
          <h2 id="checkout-summary" className="text-2xl">{t("summary")}</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {lines.map((l) => (
              <li key={l.variantId} className="flex items-center gap-3 text-sm">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
                  {l.imageUrl && <ShopImage src={l.imageUrl} alt={l.imageAlt} fill sizes="56px" className="object-contain" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-medium">{l.name}</span>
                  <span className="block text-xs text-ink-faint">
                    {l.qty}× {l.variantLabel}
                  </span>
                </span>
                <span className="font-medium whitespace-nowrap">{money(l.unitPrice * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid grid-cols-2 gap-y-2 border-t border-line pt-4 text-sm">
            <dt className="text-ink-soft">{t("itemsTotal")}</dt>
            <dd className="text-right">{money(totals.itemsTotal)}</dd>
            <dt className="text-ink-soft">{t("shippingPrice")}</dt>
            <dd className="text-right">{totals.shipping === 0 ? t("free") : money(totals.shipping)}</dd>
            <dt className="border-t border-line pt-3 font-semibold">{t("total")}</dt>
            <dd className="border-t border-line pt-3 text-right font-display text-2xl font-semibold">{money(totals.total)}</dd>
          </dl>
          <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm">
            <input id="consent" type="checkbox" checked={consent} onChange={(e) => (setConsent(e.target.checked), clearError("consent"))} aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? "consent-error" : undefined} className="mt-0.5 size-4 accent-brand" />
            <span>{t("consent")}</span>
          </label>
          {errors.consent && <p id="consent-error" role="alert" className="mt-1 text-xs font-medium text-danger">{errors.consent}</p>}
          <button type="submit" disabled={pending} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink font-semibold text-white hover:bg-brand disabled:opacity-60">
            <Lock className="size-4" aria-hidden="true" />
            {pending ? t("placing") : paymentMethod === "stripe" ? t("payNow") : t("placeOrder")}
          </button>
          <p className="mt-3 text-center text-xs text-ink-faint">{t("payLater")}</p>
        </div>
      </aside>
    </form>
  );
}
