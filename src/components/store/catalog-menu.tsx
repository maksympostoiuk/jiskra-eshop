"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, LayoutGrid, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { CategoryIcon } from "@/lib/category-icons";

export type MenuCategory = { id: string; name: string; slug: string; icon: string; count: number; children: MenuCategory[] };

/**
 * DNS-style mega-menu: top-level categories with icons on the left, subcategories with counts on the right.
 * On small screens it becomes a full-height drawer with expandable groups.
 */
export function CatalogMenu({ categories }: { categories: MenuCategory[] }) {
  const t = useTranslations("common.catalog");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const current = categories[active];

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="catalog-menu"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors sm:px-5",
          open ? "bg-brand-strong text-white" : "bg-brand text-white hover:bg-brand-strong",
        )}
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <LayoutGrid className="size-5" aria-hidden="true" />}
        <span className="hidden sm:inline">{t("button")}</span>
        <span className="sr-only sm:hidden">{t("button")}</span>
        <ChevronDown className={cn("hidden size-4 transition-transform sm:block", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div ref={panel} id="catalog-menu" className="absolute inset-x-0 top-full z-40 border-t border-line bg-surface shadow-pop">
          {/* Desktop */}
          <div className="container-shop hidden max-h-[calc(100dvh-9rem)] grid-cols-[18rem_1fr] gap-8 overflow-y-auto py-6 lg:grid">
            <ul className="flex flex-col gap-0.5" aria-label={t("button")}>
              {categories.map((c, i) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className={cn("flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors", i === active ? "bg-muted font-semibold text-ink" : "text-ink-soft hover:text-ink")}
                  >
                    <CategoryIcon name={c.icon} className="size-5 text-brand" />
                    <span className="flex-1">{c.name}</span>
                    <ChevronRight className="size-4 text-ink-faint" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            {current && (
              <div>
                <div className="mb-5 flex items-baseline gap-3">
                  <h2 className="text-2xl">{current.name}</h2>
                  <Link href={`/category/${current.slug}`} className="text-sm font-medium text-brand hover:underline">
                    {t("showAll", { count: current.count })}
                  </Link>
                </div>
                <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {current.children.map((s) => (
                    <li key={s.id}>
                      <Link href={`/category/${s.slug}`} className="flex items-center gap-3 rounded-xl border border-line/70 p-3 hover:border-ink">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                          <CategoryIcon name={s.icon} className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{s.name}</span>
                          <span className="text-xs text-ink-faint">{t("products", { count: s.count })}</span>
                        </span>
                      </Link>
                      {s.children.length > 0 && (
                        <ul className="mt-2 ml-14 flex flex-col gap-1 text-sm">
                          {s.children.map((g) => (
                            <li key={g.id}>
                              <Link href={`/category/${g.slug}`} className="text-ink-soft hover:text-ink">
                                {g.name} <span className="text-ink-faint">{g.count}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Mobile */}
          <nav aria-label={t("button")} className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-4 py-3 lg:hidden">
            <ul className="divide-y divide-line/70">
              {categories.map((c) => (
                <li key={c.id}>
                  <div className="flex items-center">
                    <Link href={`/category/${c.slug}`} className="flex flex-1 items-center gap-3 py-3 font-medium">
                      <CategoryIcon name={c.icon} className="size-5 text-brand" />
                      {c.name}
                    </Link>
                    {c.children.length > 0 && (
                      <button
                        type="button"
                        aria-expanded={expanded === c.id}
                        aria-label={t("toggle", { name: c.name })}
                        onClick={() => setExpanded((e) => (e === c.id ? null : c.id))}
                        className="grid size-11 place-items-center rounded-full hover:bg-muted"
                      >
                        <ChevronDown className={cn("size-5 transition-transform", expanded === c.id && "rotate-180")} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {expanded === c.id && (
                    <ul className="mb-3 ml-8 flex flex-col gap-1">
                      {c.children.map((s) => (
                        <li key={s.id}>
                          <Link href={`/category/${s.slug}`} className="flex justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted">
                            {s.name}
                            <span className="text-ink-faint">{s.count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
