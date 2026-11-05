import type { ReactNode } from "react";
import "./globals.css";

// The <html> element is rendered by `[locale]/layout.tsx` (storefront) and `admin/layout.tsx` (CMS).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
