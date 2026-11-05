import { intlLocale } from "@/lib/money";

/** Average rating with one decimal in the locale's notation ("4,5" in Czech, "4.5" in English). */
export function formatRating(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

/** Whole-number percentage in the locale's notation ("15 %" in Czech, "15%" in English). */
export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 0 }).format(value / 100);
}
