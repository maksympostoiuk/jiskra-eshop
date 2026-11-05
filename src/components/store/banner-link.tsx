import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/** Internal paths go through the localized Link; absolute URLs are plain anchors. */
export function BannerLink({ href, className, children, label }: { href: string; className?: string; children: ReactNode; label?: string }) {
  if (!href) return <div className={className}>{children}</div>;
  if (/^https?:\/\//.test(href))
    return (
      <a href={href} className={className} aria-label={label} rel="noopener">
        {children}
      </a>
    );
  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}
