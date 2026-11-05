import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ADMIN_CLIENT_NAMESPACES, pickNamespaces } from "@/i18n/messages";

export const metadata: Metadata = {
  title: { default: "Jiskra CMS", template: "%s · Jiskra CMS" },
  robots: { index: false, follow: false },
};

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-canvas">
        <NextIntlClientProvider messages={pickNamespaces(messages, ADMIN_CLIENT_NAMESPACES)}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
