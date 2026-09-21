import { NextRequest, NextResponse } from "next/server";
import { completeAuthorization } from "@/lib/drive/tokens";

// No passcode check here — same reasoning as the mail OAuth callback:
// Google's ?code=... is single-use, short-lived, and only issued
// after authorizing on Google's own screen against this app's
// client_id/secret. A passcode gate here would redirect to /login on
// a cold session and silently drop the code before it's ever used.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/drive/connect?error=${error}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/drive/connect?error=missing_code", req.url));
  }

  try {
    await completeAuthorization(code);
    return NextResponse.redirect(new URL("/drive", req.url));
  } catch (err) {
    console.error("[drive oauth callback error]", err);
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/drive/connect?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}
