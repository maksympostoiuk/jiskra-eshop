"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Heart, Scale, ShoppingBag, User } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { cartCount } from "@/lib/cart";
import { CURRENCIES } from "@/lib/money";
import { LOCALES } from "@/i18n/routing";
import { setCurrency } from "@/server/store-actions";
import { cartStore, compareStore, favoritesStore, useStoreValue } from "./client-store";

function Counter({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-sale px-1 text-[0.7rem] font-bold text-white" aria-hidden="true">
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** Compare / favorites / cart icons with live counters (from localStorage). */
export function HeaderActions({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("common.header");
  const compare = useStoreValue(compareStore).length;
  const favorites = useStoreValue(favoritesStore).length;
  const cart = cartCount(useStoreValue(cartStore));
  const items = [
    { href: "/compare", label: t("compare"), count: compare, Icon: Scale, aria: t("compareCount", { count: compare }) },
    { href: "/favorites", label: t("favorites"), count: favorites, Icon: Heart, aria: t("favoritesCount", { count: favorites }) },
    { href: "/cart", label: t("cart"), count: cart, Icon: ShoppingBag, aria: t("cartCount", { count: cart }) },
    { href: signedIn ? "/account" : "/account/login", label: signedIn ? t("account") : t("signIn"), count: 0, Icon: User, aria: signedIn ? t("account") : t("signIn") },
  ];
  return (
    <nav aria-label={t("actions")} className="flex items-center gap-0.5 sm:gap-1">
      {items.map(({ href, label, count, Icon, aria }) => (
        <Link key={href} href={href} aria-label={aria} className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-ink-soft hover:bg-muted hover:text-ink sm:px-3">
          <span className="relative">
            <Icon className="size-6" strokeWidth={1.6} aria-hidden="true" />
            <Counter value={count} />
          </span>
          <span className="hidden text-xs md:block">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Language links (keep the current path) and currency toggle (cookie). Independent choices. */
export function LocaleCurrencySwitcher({ currency, className }: { currency: string; className?: string }) {
  const t = useTranslations("common.header");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, start] = useTransition();
  // Filters (including spec facets, which use locale-independent keys) survive a language switch.
  const query = Object.fromEntries(searchParams.entries());
  return (
    <div className={cn("flex items-center gap-3 text-xs font-semibold", className)}>
      <div role="group" aria-label={t("language")} className="flex items-center rounded-full border border-line bg-surface p-0.5">
        {LOCALES.map((l) => (
          <Link
            key={l}
            href={{ pathname, query }}
            locale={l}
            hrefLang={l}
            aria-current={l === locale ? "true" : undefined}
            className={cn("rounded-full px-2.5 py-1 uppercase", l === locale ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}
          >
            {l}
          </Link>
        ))}
      </div>
      <CurrencyToggle current={currency} pending={pending} onChange={(c) => start(async () => { await setCurrency(c); router.refresh(); })} />
    </div>
  );
}

function CurrencyToggle({ current, pending, onChange }: { current: string; pending: boolean; onChange: (c: string) => void }) {
  const t = useTranslations("common.header");
  return (
    <div role="group" aria-label={t("currency")} className={cn("flex items-center rounded-full border border-line bg-surface p-0.5", pending && "opacity-60")}>
      {CURRENCIES.map((c) => (
        <button key={c} type="button" aria-pressed={c === current} disabled={pending} onClick={() => c !== current && onChange(c)} className={cn("rounded-full px-2.5 py-1", c === current ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}>
          {c}
        </button>
      ))}
    </div>
  );
}
