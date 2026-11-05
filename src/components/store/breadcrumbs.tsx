import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { siteUrl } from "@/lib/site";
import { JsonLd } from "./json-ld";

export type Crumb = { name: string; href: string };

/** Breadcrumb trail + schema.org BreadcrumbList. `href` is a locale-less path. */
export async function Breadcrumbs({ items, locale }: { items: Crumb[]; locale: string }) {
  const t = await getTranslations("common");
  const all = [{ name: t("breadcrumbs.home"), href: "/" }, ...items];
  return (
    <>
      <nav aria-label={t("breadcrumbs.label")} className="text-sm text-ink-soft">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((c, i) => (
            <li key={c.href} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 text-ink-faint" aria-hidden="true" />}
              {i === all.length - 1 ? (
                <span aria-current="page" className="text-ink">{c.name}</span>
              ) : (
                <Link href={c.href} className="hover:text-ink hover:underline">{c.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${siteUrl()}/${locale}${c.href === "/" ? "" : c.href}` })),
        }}
      />
    </>
  );
}
