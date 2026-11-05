"use client";

import { useSyncExternalStore } from "react";
import { CircleCheck } from "lucide-react";

type Toast = { id: number; text: string; href?: string; linkLabel?: string };
let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(text: string, link?: { href: string; label: string }) {
  const toast = { id: ++seq, text, href: link?.href, linkLabel: link?.label };
  toasts = [...toasts.slice(-2), toast];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id);
    emit();
  }, 3500);
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => toasts,
    () => toasts,
  );
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {list.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm text-white shadow-pop">
          <CircleCheck className="size-4 text-spark" aria-hidden="true" />
          <span>{t.text}</span>
          {t.href && (
            <a href={t.href} className="font-semibold underline underline-offset-2">
              {t.linkLabel}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
