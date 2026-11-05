"use client";

import { useCallback, useState, useTransition } from "react";
import type { FieldErrors } from "@/lib/validation/i18n";

type Result = { ok: true; message?: string; data?: unknown } | { ok: false; errors?: FieldErrors; message?: string };

/** Runs a server action from a client form, tracking pending state, field errors and a message. */
export function useAction<TInput, TResult extends Result>(action: (input: TInput) => Promise<TResult>) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const run = useCallback(
    (input: TInput, onSuccess?: (result: TResult) => void) => {
      startTransition(async () => {
        const result = await action(input);
        if (result.ok) {
          setErrors({});
          setMessage(result.message ? { tone: "success", text: result.message } : null);
          onSuccess?.(result);
        } else {
          setErrors(result.errors ?? {});
          setMessage(result.message ? { tone: "error", text: result.message } : null);
        }
      });
    },
    [action],
  );

  return { pending, errors, setErrors, message, setMessage, run };
}
