import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { discountPercent, formatMoney, type Currency } from "@/lib/money";

/** Current price with optional crossed-out old price and discount percentage. */
export function Price({
  price,
  oldPrice,
  currency,
  locale,
  size = "md",
  className,
  discountLabel,
}: {
  price: number;
  oldPrice?: number | null;
  currency: Currency;
  locale: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  discountLabel?: string;
}) {
  const pct = discountPercent(price, oldPrice);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      {pct > 0 && oldPrice && (
        <span className="w-full text-sm text-ink-faint">
          <s aria-label={discountLabel}>{formatMoney(oldPrice, currency, locale)}</s>
          <span className="ml-2 rounded-full bg-sale-soft px-1.5 py-0.5 text-xs font-semibold text-sale">−{formatPercent(pct, locale)}</span>
        </span>
      )}
      <span
        className={cn(
          "font-semibold tracking-tight whitespace-nowrap",
          pct > 0 ? "text-sale" : "text-ink",
          size === "lg" ? "font-display text-4xl" : size === "md" ? "text-xl" : "text-base",
        )}
      >
        {formatMoney(price, currency, locale)}
      </span>
    </div>
  );
}
