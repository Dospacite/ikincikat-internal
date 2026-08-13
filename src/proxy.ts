import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic =
    pathname === "/giris" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname === "/favicon.svg" ||
    pathname === "/robots.txt";
  if (!isPublic && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/giris", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
