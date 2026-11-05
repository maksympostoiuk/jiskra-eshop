import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Internal paths go through the localized Link; absolute URLs are plain anchors.
 * The accessible name comes from the visible content (title, subtitle, CTA).
 */
export function BannerLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (!href) return <div className={className}>{children}</div>;
  if (/^https?:\/\//.test(href))
    return (
      <a href={href} className={className} rel="noopener">
        {children}
      </a>
    );
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
