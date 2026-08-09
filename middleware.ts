import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidPasscode } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = !!cookie && isValidPasscode(cookie);

  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/upload", "/shop/upload", "/shop/admin"],
};
