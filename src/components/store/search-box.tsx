"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Suggestions = {
  categories: Array<{ name: string; slug: string; count: number }>;
  products: Array<{ name: string; slug: string; imageUrl: string | null; price: string }>;
};
type Item = { href: string; key: string };

/** Wide search field with a combobox suggestions dropdown (categories + products). */
export function SearchBox({ initialQuery = "", className }: { initialQuery?: string; className?: string }) {
  const t = useTranslations("common.search");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState(initialQuery);
  const [data, setData] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?locale=${locale}&q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (res.ok) {
          setData(await res.json());
          setActive(-1);
        }
      } catch {
        /* aborted */
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, locale]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items: Item[] = [
    ...(data?.categories ?? []).map((c) => ({ href: `/category/${c.slug}`, key: `c-${c.slug}` })),
    ...(data?.products ?? []).map((p) => ({ href: `/product/${p.slug}`, key: `p-${p.slug}` })),
  ];
  const showList = open && q.trim().length >= 2 && data !== null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div ref={box} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && items[active]) return go(items[active].href);
          if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="flex h-12 items-center rounded-full border border-line-strong bg-surface pr-1.5 pl-5 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10"
      >
        <label htmlFor={`${id}-input`} className="sr-only">
          {t("label")}
        </label>
        <input
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && items[active] ? `${id}-${items[active].key}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          value={q}
          placeholder={t("placeholder")}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === "Escape") setOpen(false);
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label={t("clear")} className="grid size-9 place-items-center rounded-full text-ink-faint hover:text-ink">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
        <button type="submit" aria-label={t("submit")} className="grid size-9 place-items-center rounded-full bg-ink text-white hover:bg-brand">
          <Search className="size-4" aria-hidden="true" />
        </button>
      </form>

      {showList && (
        <div id={`${id}-list`} role="listbox" aria-label={t("suggestions")} className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          {items.length === 0 && <p className="px-5 py-4 text-sm text-ink-soft">{t("noResults", { q: q.trim() })}</p>}
          {data!.categories.length > 0 && (
            <div className="border-b border-line/70 py-2">
              <p className="px-5 pb-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">{t("categories")}</p>
              {data!.categories.map((c) => {
                const index = items.findIndex((i) => i.key === `c-${c.slug}`);
                return (
                  <div
                    key={c.slug}
                    id={`${id}-c-${c.slug}`}
                    role="option"
                    aria-selected={active === index}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(`/category/${c.slug}`)}
                    className={cn("flex cursor-pointer items-center justify-between px-5 py-2 text-sm", active === index ? "bg-muted" : "hover:bg-canvas")}
                  >
                    <span>{c.name}</span>
                    <span className="text-xs text-ink-faint">{c.count}</span>
                  </div>
                );
              })}
            </div>
          )}
          {data!.products.length > 0 && (
            <div className="py-2">
              <p className="px-5 pb-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">{t("products")}</p>
              {data!.products.map((p) => {
                const index = items.findIndex((i) => i.key === `p-${p.slug}`);
                return (
                  <div
                    key={p.slug}
                    id={`${id}-p-${p.slug}`}
                    role="option"
                    aria-selected={active === index}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(`/product/${p.slug}`)}
                    className={cn("flex cursor-pointer items-center gap-3 px-5 py-2", active === index ? "bg-muted" : "hover:bg-canvas")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- tiny suggestion thumbnail */}
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="size-10 rounded-md bg-canvas object-contain" /> : <span className="size-10" />}
                    <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                    <span className="text-sm font-semibold whitespace-nowrap">{p.price}</span>
                  </div>
                );
              })}
            </div>
          )}
          {items.length > 0 && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)} className="w-full border-t border-line/70 px-5 py-3 text-left text-sm font-medium text-brand hover:bg-canvas">
              {t("showAll", { q: q.trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
