import { minorToMajorString } from "@/lib/money";
import type { ShippingMethodInput } from "@/lib/validation/admin";

/** Editor row for a shipping method (money as major-unit strings). Shared by server page and client editor. */
export type ShippingRow = { id: string | null; code: string; priceCzk: string; priceUsd: string; freeCzk: string; freeUsd: string; allowsCod: boolean; isActive: boolean; sortOrder: number; translations: ShippingMethodInput["translations"] };

export function toShippingRow(m: ShippingMethodInput & { id: string | null }): ShippingRow {
  return {
    id: m.id,
    code: m.code,
    priceCzk: minorToMajorString(m.priceCzk),
    priceUsd: minorToMajorString(m.priceUsd),
    freeCzk: m.freeFromCzk === null ? "" : minorToMajorString(m.freeFromCzk),
    freeUsd: m.freeFromUsd === null ? "" : minorToMajorString(m.freeFromUsd),
    allowsCod: m.allowsCod,
    isActive: m.isActive,
    sortOrder: m.sortOrder,
    translations: m.translations,
  };
}

