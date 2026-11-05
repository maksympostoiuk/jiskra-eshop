/**
 * Money helpers. All amounts are integers in minor units (haléře for CZK, cents for USD).
 * Never use floats to store or sum money — only for display via Intl.NumberFormat.
 */

export const CURRENCIES = ["CZK", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = "CZK";
export const CURRENCY_COOKIE = "CURRENCY";

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/** Number of minor units in one major unit. Both supported currencies use 100. */
export const MINOR_PER_MAJOR = 100;

const INTL_LOCALE: Record<string, string> = { cs: "cs-CZ", en: "en-US" };

export function intlLocale(locale: string): string {
  return INTL_LOCALE[locale] ?? locale;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: Currency, fractionDigits: number) {
  const key = `${locale}|${currency}|${fractionDigits}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Format an integer minor-unit amount. CZK prices are shown without decimals when the amount is
 * whole crowns (the usual Czech convention, e.g. "24 990 Kč"); USD always shows cents.
 */
export function formatMoney(minor: number, currency: Currency, locale: string): string {
  assertMinor(minor);
  const wholeOnly = currency === "CZK" && minor % MINOR_PER_MAJOR === 0;
  return getFormatter(locale, currency, wholeOnly ? 0 : 2).format(minor / MINOR_PER_MAJOR);
}

export function assertMinor(minor: number): void {
  if (!Number.isSafeInteger(minor)) {
    throw new TypeError(`Money amount must be an integer number of minor units, got ${minor}`);
  }
}

/**
 * Parse a user-typed major-unit amount ("1 234,50", "1234.5", "12") into minor units.
 * Returns null for anything that is not a valid non-negative amount with at most 2 decimals.
 */
export function parseMajorToMinor(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    return parseMajorToMinor(String(input));
  }
  const cleaned = input.replace(/[\s  ]/g, "").replace(/(Kč|CZK|USD|\$)/gi, "");
  if (cleaned === "") return null;
  // Accept "," or "." as decimal separator (but only one separator, max 2 decimals).
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  const minor = whole * MINOR_PER_MAJOR + fraction;
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Minor units → plain major-unit string for form inputs ("1234.5" → "1234.50"). */
export function minorToMajorString(minor: number): string {
  assertMinor(minor);
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / MINOR_PER_MAJOR);
  const fraction = abs % MINOR_PER_MAJOR;
  return fraction === 0 ? `${sign}${whole}` : `${sign}${whole}.${String(fraction).padStart(2, "0")}`;
}

/**
 * Exchange rates are stored as an integer: CZK per 1 USD multiplied by RATE_SCALE
 * (e.g. 23.45 CZK/USD → 234500). This keeps conversion exact and float-free.
 */
export const RATE_SCALE = 10_000;

export const USD_ROUNDING_MODES = ["CENT", "WHOLE", "NINETY_NINE"] as const;
export type UsdRoundingMode = (typeof USD_ROUNDING_MODES)[number];

/** Integer division rounding half away from zero, for non-negative bigint operands. */
function divRound(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

/**
 * Convert a CZK amount (haléře) to USD (cents) using a scaled integer rate.
 * - CENT: round to the nearest cent
 * - WHOLE: round to the nearest whole dollar
 * - NINETY_NINE: round to the nearest whole dollar, then subtract one cent (e.g. $42.99)
 */
export function convertCzkToUsd(
  czkMinor: number,
  rateScaled: number,
  mode: UsdRoundingMode = "CENT",
): number {
  assertMinor(czkMinor);
  if (czkMinor < 0) throw new RangeError("Amount must not be negative");
  if (!Number.isSafeInteger(rateScaled) || rateScaled <= 0) {
    throw new RangeError("Exchange rate must be a positive integer (scaled by RATE_SCALE)");
  }
  // usdCents = czkHalere / (rate / RATE_SCALE)
  const cents = divRound(BigInt(czkMinor) * BigInt(RATE_SCALE), BigInt(rateScaled));
  if (mode === "CENT") return Number(cents);
  const dollars = divRound(cents, 100n);
  if (mode === "WHOLE") return Number(dollars * 100n);
  if (dollars === 0n) return Number(cents);
  return Number(dollars * 100n - 1n);
}

/** "23.45" / "23,45" → 234500. Returns null for invalid input. */
export function parseRate(input: string): number | null {
  const cleaned = input.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(cleaned);
  if (!match) return null;
  const value = Number(match[1]) * RATE_SCALE + Number((match[2] ?? "").padEnd(4, "0") || 0);
  return value > 0 && Number.isSafeInteger(value) ? value : null;
}

export function formatRate(rateScaled: number): string {
  const whole = Math.floor(rateScaled / RATE_SCALE);
  const fraction = String(rateScaled % RATE_SCALE).padStart(4, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

/** Discount percentage (rounded down) between an old and a current price; 0 if not discounted. */
export function discountPercent(price: number, oldPrice: number | null | undefined): number {
  if (!oldPrice || oldPrice <= price || oldPrice <= 0) return 0;
  return Math.floor(((oldPrice - price) * 100) / oldPrice);
}

/** Pick the price for the requested currency from a record with both prices. */
export function pickPrice<T extends { priceCzk: number; priceUsd: number }>(
  item: T,
  currency: Currency,
): number {
  return currency === "CZK" ? item.priceCzk : item.priceUsd;
}

export function pickOldPrice<
  T extends { oldPriceCzk: number | null; oldPriceUsd: number | null },
>(item: T, currency: Currency): number | null {
  return currency === "CZK" ? item.oldPriceCzk : item.oldPriceUsd;
}
