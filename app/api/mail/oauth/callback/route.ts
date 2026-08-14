import { NextRequest, NextResponse } from "next/server";
import { completeAuthorization } from "@/lib/mail/tokens";

// Deliberately no passcode check here — Zoho's ?code=... is
// single-use, short-lived, and only ever issued after authorizing on
// Zoho's own screen against this app's client_id/secret, so it's not
// forgeable. A passcode gate here previously redirected to /login on
// a cold session, which dropped the code entirely and silently broke
// the whole connect flow.
export async function GET(req: NextRequest) {
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
