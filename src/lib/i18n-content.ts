import { DEFAULT_LOCALE } from "@/i18n/routing";

/** Pick the translation row for a locale, falling back to the default locale, then to any row. */
export function pickTranslation<T extends { locale: string }>(rows: T[] | undefined, locale: string): T | undefined {
  if (!rows?.length) return undefined;
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === DEFAULT_LOCALE) ?? rows[0];
}

/** Localized inline column pair (`labelCs` / `labelEn`). */
export function pickLocalized(cs: string | null | undefined, en: string | null | undefined, locale: string): string {
  return (locale === "en" ? en || cs : cs || en) ?? "";
}

/** Group translation rows into `{ cs: …, en: … }` with defaults for missing locales. */
export function translationsByLocale<T extends { locale: string }, D>(
  rows: T[],
  pick: (row: T | undefined) => D,
): { cs: D; en: D } {
  return { cs: pick(rows.find((r) => r.locale === "cs")), en: pick(rows.find((r) => r.locale === "en")) };
}
