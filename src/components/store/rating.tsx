import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Five stars filled to the rating (rounded to halves). `label` is the accessible description. */
export function Stars({ rating, label, className, size = "sm" }: { rating: number; label: string; className?: string; size?: "sm" | "md" }) {
  const rounded = Math.round(rating * 2) / 2;
  const cls = size === "md" ? "size-5" : "size-3.5";
  return (
    <span role="img" aria-label={label} className={cn("inline-flex items-center gap-0.5 text-spark", className)}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = rounded - i;
        return (
          <span key={i} className={cn("relative", cls)} aria-hidden="true">
            <Star className={cn("absolute inset-0 text-line-strong", cls)} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: fill >= 1 ? "100%" : "50%" }}>
                <Star className={cn("fill-current", cls)} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
