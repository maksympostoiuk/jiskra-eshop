import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/product-listing";
import { Link, redirect } from "@/i18n/navigation";
import { CategoryIcon } from "@/lib/category-icons";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/cn";
import { categoryScope, findCategoryBySlug, getCategoryPath, getSpecDefsForCategory } from "@/server/catalog";
import { alternates } from "@/server/seo";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function slugsByLocale(categoryId: string) {
  const rows = await prisma.categoryTranslation.findMany({ where: { categoryId }, select: { locale: true, slug: true } });
  return Object.fromEntries(rows.map((r) => [r.locale, `/category/${r.slug}`]));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const { category } = await findCategoryBySlug(locale, slug);
  if (!category) return {};
  const t = await getTranslations({ locale, namespace: "catalog" });
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return {
    title: category.seoTitle || category.name,
    description: category.seoDescription || category.description || t("metaDescription", { name: category.name }),
    alternates: alternates(locale, await slugsByLocale(category.id)),
    // Filtered combinations are not worth indexing; pagination and the plain category are.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { category, redirectSlug } = await findCategoryBySlug(locale, slug);
  if (redirectSlug) redirect({ href: `/category/${redirectSlug}`, locale });
  if (!category) notFound();
  const t = await getTranslations("catalog");
  const [path, specDefs, scope, sp] = await Promise.all([getCategoryPath(locale, category.id), getSpecDefsForCategory(locale, category.id), categoryScope(locale, category.id), searchParams]);
  const parent = path.length > 1 ? path[path.length - 2] : null;
  const chips = category.children.length ? category.children : (parent?.children ?? []);

  return (
    <div className="container-shop pt-6">
      <Breadcrumbs locale={locale} items={path.map((c) => ({ name: c.name, href: `/category/${c.slug}` }))} />
      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-4xl sm:text-5xl">{category.name}</h1>
        <span className="text-ink-soft">{t("productCount", { count: category.productCount })}</span>
      </div>
      {category.description && <p className="mt-2 max-w-2xl text-ink-soft">{category.description}</p>}

      {chips.length > 0 && (
        <nav aria-label={t("subcategories")} className="mt-5">
          <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {chips.map((c) => (
              <li key={c.id} className="shrink-0">
                <Link
                  href={`/category/${c.slug}`}
                  aria-current={c.id === category.id ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border py-2 pr-4 pl-2 text-sm transition-colors",
                    c.id === category.id ? "border-ink bg-ink text-white" : "border-line/70 bg-surface hover:border-ink",
                  )}
                >
                  <span className={cn("grid size-10 place-items-center rounded-lg", c.id === category.id ? "bg-white/15" : "bg-brand-soft text-brand")}>
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  <span className="font-medium">{c.name}</span>
                  <span className={c.id === category.id ? "text-white/70" : "text-ink-faint"}>{c.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <ProductListing scope={scope} specDefs={specDefs} searchParams={sp} basePath={`/category/${category.slug}`} locale={locale} />
    </div>
  );
}
