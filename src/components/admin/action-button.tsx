"use client";

import { useTransition, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/** Runs a bound server action on click (no confirmation). */
export function ActionButton({
  action,
  children,
  variant = "soft",
  size = "sm",
  className,
  ariaLabel,
}: {
  action: () => Promise<unknown>;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  ariaLabel?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button variant={variant} size={size} className={className} aria-label={ariaLabel} disabled={pending} onClick={() => start(async () => void (await action()))}>
      {children}
    </Button>
  );
}
