"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Textarea, fieldAria } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { reviewSchema } from "@/lib/validation/store";
import { validateWith, type FieldErrors } from "@/lib/validation/i18n";
import { submitReview } from "@/server/store-actions";

export function ReviewForm({ productId }: { productId: string }) {
  const t = useTranslations("product.reviews");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const [form, setForm] = useState({ authorName: "", authorEmail: "", rating: 0, text: "", website: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [hover, setHover] = useState(0);
  const [pending, start] = useTransition();

  const submit = () => {
    const input = { ...form, productId };
    const local = validateWith(reviewSchema, input, locale, (k, v) => tv(k, v));
    if (!local.success) return setErrors(local.errors);
    start(async () => {
      const result = await submitReview(input);
      if (result.ok) {
        setForm({ authorName: "", authorEmail: "", rating: 0, text: "", website: "" });
        setErrors({});
        setMessage({ tone: "success", text: result.message ?? t("thanks") });
      } else {
        setErrors(result.errors ?? {});
        setMessage(result.message ? { tone: "error", text: result.message } : null);
      }
    });
  };

  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())} noValidate className="flex flex-col gap-4">
      <h3 className="text-2xl">{t("formTitle")}</h3>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">
          {t("yourRating")} <span className="text-danger" aria-hidden="true">*</span>
        </legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} checked={form.rating === n} onChange={() => setForm({ ...form, rating: n })} className="peer sr-only" />
              <span className="sr-only">{t("stars", { count: n })}</span>
              <Star className={cn("size-8 rounded peer-focus-visible:outline-2 peer-focus-visible:outline-brand", n <= (hover || form.rating) ? "fill-spark text-spark" : "text-line-strong")} aria-hidden="true" />
            </label>
          ))}
        </div>
        {errors.rating && <p role="alert" className="mt-1 text-xs font-medium text-danger">{errors.rating}</p>}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="review-name" label={t("name")} error={errors.authorName} required>
          <Input {...fieldAria("review-name", errors.authorName)} autoComplete="name" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
        </Field>
        <Field id="review-email" label={t("email")} error={errors.authorEmail} hint={t("emailHint")}>
          <Input {...fieldAria("review-email", errors.authorEmail)} type="email" autoComplete="email" value={form.authorEmail} onChange={(e) => setForm({ ...form, authorEmail: e.target.value })} />
        </Field>
      </div>
      <Field id="review-text" label={t("text")} error={errors.text} required>
        <Textarea {...fieldAria("review-text", errors.text)} rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
      </Field>
      <div aria-hidden="true" className="hidden">
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} name="website" />
      </div>
      <p className="text-xs text-ink-faint">{t("moderationNote")}</p>
      <button type="submit" disabled={pending} className="h-11 w-fit rounded-full border border-ink px-6 text-sm font-semibold hover:bg-ink hover:text-white disabled:opacity-50">
        {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
