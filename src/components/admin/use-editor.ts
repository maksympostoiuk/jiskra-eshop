"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type * as z from "zod";
import { validateWith, type FieldErrors } from "@/lib/validation/i18n";
import { useAction } from "./use-action";

type SaveResult = { ok: true; data?: { id: string }; message?: string } | { ok: false; errors?: FieldErrors; message?: string };

/**
 * Form state + client-side Zod validation (same schema as the server) + save via server action.
 * After creating a new record it navigates to `${basePath}/${id}?saved=1`.
 */
export function useEditor<T>({
  schema,
  save,
  entityId,
  basePath,
  initial,
}: {
  schema: z.ZodType;
  save: (input: T) => Promise<SaveResult>;
  entityId: string | null;
  basePath: string;
  initial: T;
}) {
  const tc = useTranslations("admin.common");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const [form, setForm] = useState<T>(initial);
  const action = useAction(save);

  const submit = () => {
    const local = validateWith(schema, form, locale, (k, v) => tv(k, v));
    if (!local.success) {
      action.setErrors(local.errors);
      action.setMessage({ tone: "error", text: tc("fixErrors") });
      return;
    }
    action.run(form, (r) => {
      const id = r.ok ? r.data?.id : undefined;
      if (!entityId && id) router.replace(`${basePath}/${id}?saved=1`);
      else router.refresh();
    });
  };

  const patch = (p: Partial<T>) => setForm((f) => ({ ...f, ...p }));
  return { form, setForm, patch, submit, pending: action.pending, errors: action.errors, message: action.message };
}
