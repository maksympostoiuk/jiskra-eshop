"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition, type ReactNode } from "react";
import { useModal } from "@/lib/hooks/use-modal";
import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  Boxes,
  ExternalLink,
  FolderTree,
  Gauge,
  Image as ImageIcon,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { logout, setAdminLocale } from "@/server/admin/auth";

const NAV = [
  { href: "/admin", key: "dashboard", Icon: Gauge, exact: true },
  { href: "/admin/orders", key: "orders", Icon: ShoppingBag },
  { href: "/admin/products", key: "products", Icon: Package },
  { href: "/admin/categories", key: "categories", Icon: FolderTree },
  { href: "/admin/brands", key: "brands", Icon: Boxes },
  { href: "/admin/specs", key: "specs", Icon: SlidersHorizontal },
  { href: "/admin/banners", key: "banners", Icon: ImageIcon },
  { href: "/admin/badges", key: "badges", Icon: Award },
  { href: "/admin/reviews", key: "reviews", Icon: MessageSquare },
  { href: "/admin/users", key: "users", Icon: Users, adminOnly: true },
  { href: "/admin/settings", key: "settings", Icon: Settings, adminOnly: true },
] as const;

export function AdminShell({
  admin,
  pendingReviews,
  children,
}: {
  admin: { name: string; email: string; role: "ADMIN" | "EDITOR" };
  pendingReviews: number;
  children: ReactNode;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useModal(open, close, drawerRef);
  const [, startTransition] = useTransition();

  const nav = (
    <nav aria-label={t("nav.label")} className="flex flex-col gap-0.5">
      {NAV.filter((item) => !("adminOnly" in item) || admin.role === "ADMIN").map(({ href, key, Icon, ...rest }) => {
        const active = "exact" in rest ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-ink text-white" : "text-ink-soft hover:bg-muted hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{t(`nav.${key}`)}</span>
            {key === "reviews" && pendingReviews > 0 && (
              <span className={cn("rounded-full px-2 text-xs", active ? "bg-white/20" : "bg-spark-soft text-warning")}>
                {pendingReviews}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        {t("nav.skip")}
      </a>
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-3 py-5 lg:flex">
        <Link href="/admin" className="flex items-baseline gap-2 px-4">
          <Logo className="text-2xl" />
          <span className="text-xs font-semibold tracking-widest text-ink-faint uppercase">CMS</span>
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div ref={drawerRef} className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.label")}>
          <div className="absolute inset-0 bg-ink/40" aria-hidden="true" onClick={close} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 overflow-y-auto bg-surface px-3 py-5">
            <div className="flex items-center justify-between px-4">
              <Logo className="text-2xl" />
              <button className="grid size-9 place-items-center rounded-full hover:bg-muted" onClick={() => setOpen(false)} aria-label={t("nav.close")}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur sm:px-6">
          <button className="grid size-10 place-items-center rounded-full hover:bg-muted lg:hidden" onClick={() => setOpen(true)} aria-label={t("nav.open")}>
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center rounded-full border border-line bg-surface p-0.5 text-xs font-semibold" role="group" aria-label={t("common.languages")}>
            {(["cs", "en"] as const).map((l) => (
              <button
                key={l}
                aria-pressed={locale === l}
                onClick={() =>
                  startTransition(async () => {
                    await setAdminLocale(l);
                    router.refresh();
                  })
                }
                className={cn("rounded-full px-2.5 py-1 uppercase", locale === l ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}
              >
                {l}
              </button>
            ))}
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-muted hover:text-ink sm:inline-flex">
            <ExternalLink className="size-4" aria-hidden="true" />
            {t("nav.viewShop")}
          </a>
          <div className="hidden text-right text-xs leading-tight md:block">
            <div className="font-semibold text-ink">{admin.name}</div>
            <div className="text-ink-faint">{t(`roles.${admin.role}`)}</div>
          </div>
          <form action={logout}>
            <button type="submit" className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-muted hover:text-ink" aria-label={t("nav.logout")} title={t("nav.logout")}>
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </form>
        </header>
        <main id="admin-main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
