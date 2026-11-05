"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "lucide-react";

type Action = () => Promise<unknown>;

/** Up/down reorder buttons bound to server actions. */
export function MoveButtons({ up, down, name }: { up?: Action; down?: Action; name: string }) {
  const t = useTranslations("admin.common");
  const [pending, start] = useTransition();
  const cls = "grid size-8 place-items-center rounded-full text-ink-soft hover:bg-muted disabled:opacity-25";
  return (
    <span className="inline-flex">
      <button type="button" className={cls} disabled={!up || pending} onClick={() => up && start(async () => void (await up()))} aria-label={`${t("moveUp")}: ${name}`} title={t("moveUp")}>
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
      <button type="button" className={cls} disabled={!down || pending} onClick={() => down && start(async () => void (await down()))} aria-label={`${t("moveDown")}: ${name}`} title={t("moveDown")}>
        <ArrowDown className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}
