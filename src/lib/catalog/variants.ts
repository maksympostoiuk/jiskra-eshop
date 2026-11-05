/** Pure variant-selection logic for the product page (colour swatches, memory buttons, …). */

export type VariantLite = { id: string; stock: number; options: Record<string, string> };

/**
 * Pick the variant after the user selects `name = value`:
 * exact match keeping the other selected options, otherwise the variant with that value that shares
 * the most other options (preferring ones in stock).
 */
export function selectOption<T extends VariantLite>(variants: T[], current: T, name: string, value: string): T {
  const candidates = variants.filter((v) => v.options[name] === value);
  if (!candidates.length) return current;
  const score = (v: T) =>
    Object.entries(current.options).reduce((n, [k, val]) => n + (k !== name && v.options[k] === val ? 2 : 0), 0) + (v.stock > 0 ? 1 : 0);
  return candidates.reduce((best, v) => (score(v) > score(best) ? v : best), candidates[0]);
}

export type OptionState = "selected" | "available" | "soldOut" | "otherCombination";

/** How an option button should look given the current variant. */
export function optionState(variants: VariantLite[], current: VariantLite, name: string, value: string): OptionState {
  if (current.options[name] === value) return "selected";
  const exact = variants.find((v) => v.options[name] === value && Object.entries(current.options).every(([k, val]) => k === name || v.options[k] === val));
  if (!exact) return "otherCombination";
  return exact.stock > 0 ? "available" : "soldOut";
}

/** Default variant: first in stock, otherwise first. */
export function defaultVariant<T extends VariantLite>(variants: T[]): T | undefined {
  return variants.find((v) => v.stock > 0) ?? variants[0];
}
