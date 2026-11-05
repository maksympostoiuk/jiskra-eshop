import type { Locale } from "./routing";

/** Message namespaces; each lives in messages/<locale>/<namespace>.json. */
export const NAMESPACES = [
  "common",
  "home",
  "catalog",
  "product",
  "cart",
  "checkout",
  "account",
  "admin",
  "validation",
  "email",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Namespaces needed by client components on the storefront (keeps the client payload small). */
export const STOREFRONT_CLIENT_NAMESPACES: Namespace[] = [
  "common",
  "catalog",
  "product",
  "cart",
  "checkout",
  "account",
  "validation",
];
export const ADMIN_CLIENT_NAMESPACES: Namespace[] = ["common", "admin", "validation"];

export async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    NAMESPACES.map(
      async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<Namespace, Record<string, unknown>>;
}

export function pickNamespaces(
  messages: Record<string, unknown>,
  namespaces: readonly Namespace[],
): Record<string, unknown> {
  return Object.fromEntries(namespaces.map((ns) => [ns, messages[ns]]));
}
