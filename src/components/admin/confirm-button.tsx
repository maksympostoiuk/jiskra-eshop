"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

type Result = { ok: boolean; message?: string } | void;

/** Button that asks for confirmation in a modal <dialog> before running a (server) action. */
export function ConfirmButton({
  action,
  children,
  title,
  description,
  confirmLabel,
  variant = "ghost",
  size = "sm",
  className,
  ariaLabel,
}: {
  action: () => Promise<Result>;
  children: ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  ariaLabel?: string;
}) {
  const t = useTranslations("admin.common");
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () =>
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) {
        setError(result.message ?? t("error"));
        return;
      }
      dialog.current?.close();
    });

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        aria-label={ariaLabel}
        onClick={() => {
          setError(null);
          dialog.current?.showModal();
        }}
      >
        {children}
      </Button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(92vw,26rem)] rounded-xl border border-line bg-surface p-6 text-ink shadow-pop backdrop:bg-ink/40"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title" className="text-xl">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => dialog.current?.close()} disabled={pending} autoFocus>
            {t("cancel")}
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? t("working") : (confirmLabel ?? t("delete"))}
          </Button>
        </div>
      </dialog>
    </>
  );
}
