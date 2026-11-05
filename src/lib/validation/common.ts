import * as z from "zod";
import { SLUG_PATTERN } from "@/lib/text";

export const required = (max = 200) => z.string().trim().min(1, { error: "v.required" }).max(max);
export const optionalText = (max = 500) => z.string().trim().max(max);
export const slug = z.string().trim().min(1, { error: "v.required" }).max(96).regex(SLUG_PATTERN, { error: "v.slug" });
export const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, { error: "v.hexColor" });
export const minor = z.number({ error: "v.amount" }).int({ error: "v.amount" }).min(0, { error: "v.amount" }).max(100_000_000_000);
export const optionalMinor = minor.nullable();
export const id = z.string().min(1).max(64);
export const sortOrder = z.number().int().min(-100000).max(100000);
export const email = z.email({ error: "v.email" }).trim().toLowerCase().max(200);

/** Internal path ("/category/x") or absolute http(s) URL. */
export const link = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), { error: "v.link" });

/** `{ cs: T, en: T }` */
export function localized<T extends z.ZodType>(schema: T) {
  return z.object({ cs: schema, en: schema });
}
