/** Enum-like domain values stored as strings in the database (portable across SQLite / PostgreSQL). */

export const PRODUCT_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const SPEC_TYPES = ["NUMBER", "TEXT", "BOOLEAN"] as const;
export type SpecType = (typeof SPEC_TYPES)[number];

export const VARIANT_OPTION_NAMES = ["color", "storage", "memory", "size", "connectivity", "edition"] as const;
export type VariantOptionName = (typeof VARIANT_OPTION_NAMES)[number];

export const BANNER_PLACEMENTS = ["HERO", "HERO_SIDE", "PROMO"] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed manual transitions in the CMS. Cancelling restocks items. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "PROCESSING", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const ADMIN_ROLES = ["ADMIN", "EDITOR"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}
