import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const ADMIN_SESSION_COOKIE = "admin_session";
const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Cheap presence check only; the admin layout and every server action validate the session in the DB.
    if (pathname !== "/admin/login" && !request.cookies.has(ADMIN_SESSION_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // Skip API routes, Next internals, generated placeholders, uploads and files with an extension.
  matcher: ["/((?!api|_next|_vercel|ph|uploads|.*\\..*).*)"],
};
