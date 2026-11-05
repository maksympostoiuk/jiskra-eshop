import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/cn";

const STYLES = {
  success: { box: "bg-success-soft text-success", Icon: CircleCheck },
  error: { box: "bg-danger-soft text-danger", Icon: CircleAlert },
  info: { box: "bg-brand-soft text-brand-strong", Icon: Info },
  warning: { box: "bg-warning-soft text-warning", Icon: CircleAlert },
};

export function Alert({ tone = "info", children, className }: { tone?: keyof typeof STYLES; children: ReactNode; className?: string }) {
  const { box, Icon } = STYLES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
