"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { LOCALES, type Locale } from "@/i18n/routing";

/** Language tabs for translatable fields. Shows a dot on tabs that contain validation errors. */
export function LocaleTabs({
  children,
  errorLocales = [],
}: {
  children: (locale: Locale) => ReactNode;
  errorLocales?: Locale[];
}) {
  const t = useTranslations("admin.common");
  const [active, setActive] = useState<Locale>("cs");
  const baseId = useId();
  return (
    <div>
      <div role="tablist" aria-label={t("languages")} className="flex gap-1 border-b border-line">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            role="tab"
            id={`${baseId}-tab-${locale}`}
            aria-selected={active === locale}
            aria-controls={`${baseId}-panel-${locale}`}
            onClick={() => setActive(locale)}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium",
              active === locale ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {t(`locale.${locale}`)}
            {errorLocales.includes(locale) && <span className="size-2 rounded-full bg-danger" aria-label={t("hasErrors")} />}
          </button>
        ))}
      </div>
      {LOCALES.map((locale) => (
        <div
          key={locale}
          role="tabpanel"
          id={`${baseId}-panel-${locale}`}
          aria-labelledby={`${baseId}-tab-${locale}`}
          hidden={active !== locale}
          className="pt-5"
        >
          {children(locale)}
        </div>
      ))}
    </div>
  );
}

/** Which locales have errors under `translations.<locale>.*`. */
export function localesWithErrors(errors: Record<string, string>, prefix = "translations"): Locale[] {
  return LOCALES.filter((l) => Object.keys(errors).some((k) => k.startsWith(`${prefix}.${l}.`)));
}
