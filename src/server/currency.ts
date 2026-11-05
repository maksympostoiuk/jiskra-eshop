import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, isCurrency, type Currency } from "@/lib/money";

/** The visitor's currency (cookie), independent of the language. */
export const getCurrency = cache(async (): Promise<Currency> => {
  const value = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
});
