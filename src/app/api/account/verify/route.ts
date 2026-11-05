import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyEmail } from "@/lib/auth/customer-accounts";
import { createCustomerSession } from "@/lib/auth/customer-session";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/routing";

/** E-mail verification link: confirms the address, signs the customer in and opens the account page. */
export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const customerId = await verifyEmail(prisma, request.nextUrl.searchParams.get("token") ?? "");
  const target = new URL(`/${locale}/account/login`, request.nextUrl.origin);
  if (!customerId) {
    target.searchParams.set("verify", "invalid");
    return NextResponse.redirect(target);
  }
  await createCustomerSession(customerId);
  return NextResponse.redirect(new URL(`/${locale}/account?verified=1`, request.nextUrl.origin));
}
