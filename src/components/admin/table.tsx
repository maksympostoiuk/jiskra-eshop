import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-line/70 bg-surface shadow-card", className)}>
      <table className="w-full min-w-[40rem] text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("border-b border-line bg-muted/50 px-4 py-2.5 text-xs font-semibold tracking-wide text-ink-soft uppercase", className)} {...props} />;
}
export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-line/60 px-4 py-3 align-middle", className)} {...props} />;
}
export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-canvas", className)} {...props} />;
}
export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-ink-soft">
        {children}
      </td>
    </tr>
  );
}

/** GET filter bar; works without JavaScript. */
export function FilterBar({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form action={action} method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line/70 bg-surface p-3 shadow-card">
      {children}
    </form>
  );
}
