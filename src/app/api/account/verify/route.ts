import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyEmail } from "@/lib/auth/customer-accounts";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/routing";

/**
 * E-mail verification link: confirms the address and sends the customer to sign in. It deliberately does
 * not create a session — otherwise anyone could e-mail a victim the link for their own account and silently
 * sign the victim into it (login CSRF), linking the victim's next order to the attacker's account.
 */
export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const customerId = await verifyEmail(prisma, request.nextUrl.searchParams.get("token") ?? "");
  const target = new URL(`/${locale}/account/login`, request.nextUrl.origin);
  if (!customerId) {
    target.searchParams.set("verify", "invalid");
    return NextResponse.redirect(target);
  }
  target.searchParams.set("verify", "ok");
  return NextResponse.redirect(target);
}
