import type { ReactNode } from "react";

/** Narrow centred card used by the sign-in / registration pages. */
export function AuthCard({ title, intro, children, footer }: { title: string; intro?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-shop flex justify-center pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-center text-4xl">{title}</h1>
        {intro && <p className="mt-2 text-center text-ink-soft">{intro}</p>}
        <div className="mt-6 rounded-2xl border border-line/70 bg-surface p-6 shadow-card">{children}</div>
        {footer && <div className="mt-4 text-center text-sm text-ink-soft">{footer}</div>}
      </div>
    </div>
  );
}
