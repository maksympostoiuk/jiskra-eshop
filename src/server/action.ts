import "server-only";
import { Prisma } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import type * as z from "zod";
import { validateWith, type FieldErrors, type ValidationResult } from "@/lib/validation/i18n";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; errors?: FieldErrors; message?: string };

/** Validate input with Zod, producing messages in the current UI language. */
export async function validateInput<S extends z.ZodType>(schema: S, input: unknown): Promise<ValidationResult<z.output<S>>> {
  const locale = await getLocale();
  const t = await getTranslations("validation");
  return validateWith(schema, input, locale, (key, values) => t(key, values));
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2003" || error.code === "P2014");
}
