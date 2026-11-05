import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { isOneOf } from "@/lib/domain";
import { USD_ROUNDING_MODES, type UsdRoundingMode } from "@/lib/money";

/** The singleton Settings row (created with defaults on first access). */
export const getSettings = cache(async () => {
  const settings = await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  const usdRounding: UsdRoundingMode = isOneOf(USD_ROUNDING_MODES, settings.usdRounding) ? settings.usdRounding : "CENT";
  return { ...settings, usdRounding };
});
