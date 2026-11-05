import { intlLocale } from "@/lib/money";

export type SpecValueLike = { numberValue: number | null; boolValue: boolean | null; textCs: string | null; textEn: string | null };

const TIGHT_UNITS = new Set(["″", "%", "°"]);

export function formatNumberWithUnit(value: number, unit: string, locale: string): string {
  const n = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 }).format(value);
  if (!unit) return n;
  return TIGHT_UNITS.has(unit) ? `${n}${unit}` : `${n} ${unit}`;
}

/** Human-readable spec value in the given locale; `yesNo` supplies translated booleans. */
export function formatSpecValue(
  value: SpecValueLike,
  def: { type: string; unit: string },
  locale: string,
  yesNo: { yes: string; no: string },
): string | null {
  if (def.type === "NUMBER") return value.numberValue === null ? null : formatNumberWithUnit(value.numberValue, def.unit, locale);
  if (def.type === "BOOLEAN") return value.boolValue === null ? null : value.boolValue ? yesNo.yes : yesNo.no;
  const text = locale === "en" ? (value.textEn ?? value.textCs) : (value.textCs ?? value.textEn);
  return text || null;
}
