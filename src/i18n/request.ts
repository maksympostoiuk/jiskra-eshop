import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { loadMessages } from "./messages";
import { DEFAULT_LOCALE, isLocale } from "./routing";

export const ADMIN_LOCALE_COOKIE = "ADMIN_LOCALE";

export default getRequestConfig(async ({ requestLocale }) => {
  let requested = await requestLocale;
  if (!requested) {
    // Non-localized routes (the /admin CMS) pick the language from a cookie.
    const store = await cookies();
    requested = store.get(ADMIN_LOCALE_COOKIE)?.value ?? store.get("NEXT_LOCALE")?.value;
  }
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: "Europe/Prague",
  };
});
