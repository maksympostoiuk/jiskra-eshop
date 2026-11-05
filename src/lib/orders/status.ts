import { ORDER_STATUSES, ORDER_TRANSITIONS, isOneOf, type OrderStatus } from "@/lib/domain";

export function canTransition(from: string, to: string): boolean {
  if (!isOneOf(ORDER_STATUSES, from) || !isOneOf(ORDER_STATUSES, to)) return false;
  return ORDER_TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: string): OrderStatus[] {
  return isOneOf(ORDER_STATUSES, from) ? ORDER_TRANSITIONS[from] : [];
}
