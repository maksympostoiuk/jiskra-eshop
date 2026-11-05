/** Lowercase and strip diacritics: "Chytré Telefony" → "chytre telefony". */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** URL slug: "Nordvik Aurora 8 Pro (256 GB)" → "nordvik-aurora-8-pro-256-gb". */
export function slugify(input: string): string {
  return normalizeText(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Text used for the portable `contains` product search. */
export function buildSearchText(parts: Array<string | null | undefined>): string {
  return normalizeText(parts.filter(Boolean).join(" "));
}

export function truncate(input: string, max: number): string {
  return input.length <= max ? input : `${input.slice(0, max - 1).trimEnd()}…`;
}
