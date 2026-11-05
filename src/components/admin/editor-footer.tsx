"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Sticky save bar at the bottom of editor forms. */
export function EditorFooter({ pending, children }: { pending: boolean; children?: ReactNode }) {
  const t = useTranslations("admin.common");
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur lg:left-64">
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6">
        <div className="mr-auto text-sm text-ink-soft">{children}</div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
