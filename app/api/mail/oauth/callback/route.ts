import { NextRequest, NextResponse } from "next/server";
import { completeAuthorization } from "@/lib/mail/tokens";
import { isAuthed } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.redirect(new URL("/login?next=/mail/connect", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/mail/connect?error=${error}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/mail/connect?error=missing_code", req.url));
  }

  try {
    await completeAuthorization(code);
    return NextResponse.redirect(new URL("/mail", req.url));
  } catch (err) {
    console.error("[zoho oauth callback error]", err);
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/mail/connect?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}
