import { Pill } from "@/components/ui/card";

const ORDER: Record<string, string> = {
  NEW: "bg-spark-soft text-warning",
  CONFIRMED: "bg-brand-soft text-brand-strong",
  PROCESSING: "bg-brand-soft text-brand-strong",
  SHIPPED: "bg-muted-strong text-ink",
  DELIVERED: "bg-success-soft text-success",
  CANCELLED: "bg-danger-soft text-danger",
};
const GENERIC: Record<string, string> = {
  PUBLISHED: "bg-success-soft text-success",
  DRAFT: "bg-muted-strong text-ink-soft",
  PENDING: "bg-spark-soft text-warning",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
  PAID: "bg-success-soft text-success",
  FAILED: "bg-danger-soft text-danger",
  REFUNDED: "bg-muted-strong text-ink",
  ACTIVE: "bg-success-soft text-success",
  INACTIVE: "bg-muted-strong text-ink-soft",
};

export function OrderStatusPill({ status, label }: { status: string; label: string }) {
  return <Pill className={ORDER[status] ?? "bg-muted text-ink"}>{label}</Pill>;
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  return <Pill className={GENERIC[status] ?? "bg-muted text-ink"}>{label}</Pill>;
}
