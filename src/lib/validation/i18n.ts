import * as z from "zod";

export type Translate = (key: string, values?: Record<string, string | number>) => string;
export type FieldErrors = Record<string, string>;

/** Zod's built-in localized messages for the given UI locale. */
export function zodErrorMap(locale: string) {
  return (locale === "cs" ? z.locales.cs() : z.locales.en()).localeError;
}

/**
 * Converts Zod issues to `{ "path.to.field": "message" }`. Custom messages are i18n keys prefixed with
 * "v." (translated with the `validation` namespace); everything else is already localized by Zod.
 */
export function toFieldErrors(error: z.ZodError, t: Translate): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".") || "_form";
    if (out[path]) continue;
    out[path] = issue.message.startsWith("v.") ? t(issue.message.slice(2)) : issue.message;
  }
  return out;
}

export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: FieldErrors };

export function validateWith<S extends z.ZodType>(
  schema: S,
  input: unknown,
  locale: string,
  t: Translate,
): ValidationResult<z.output<S>> {
  const result = schema.safeParse(input, { error: zodErrorMap(locale) });
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: toFieldErrors(result.error, t) };
}
