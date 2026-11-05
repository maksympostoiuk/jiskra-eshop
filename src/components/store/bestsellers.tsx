"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ProductCardData } from "@/server/catalog";
import { ProductCard } from "./product-card";

/** "Bestsellers" with category chips (ALLO-style). Groups are pre-rendered on the server. */
export function Bestsellers({ groups, label }: { groups: Array<{ key: string; label: string; products: ProductCardData[] }>; label: string }) {
  const [active, setActive] = useState(groups[0]?.key);
  const current = groups.find((g) => g.key === active) ?? groups[0];
  return (
    <div>
      <div role="tablist" aria-label={label} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {groups.map((g) => (
          <button
            key={g.key}
            role="tab"
            type="button"
            id={`tab-${g.key}`}
            aria-selected={g.key === current?.key}
            aria-controls="bestsellers-panel"
            onClick={() => setActive(g.key)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              g.key === current?.key ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:border-ink",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div id="bestsellers-panel" role="tabpanel" aria-labelledby={current ? `tab-${current.key}` : undefined} className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {current?.products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
