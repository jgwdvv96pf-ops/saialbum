import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE = "earn_session";
const EXPIRES_IN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// Called right after a successful Firebase client-side sign-in. The
// ID token is short-lived (~1hr) and only proves identity at that
// instant — exchanging it for a session cookie here is what lets
// server-side API routes recognize the user on every subsequent
// request without the client re-authenticating each time.
export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    // Verifying first (rather than trusting createSessionCookie alone)
    // rejects malformed/expired tokens with a clear error instead of
    // a confusing failure downstream.
    await adminAuth.verifyIdToken(idToken);

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: EXPIRES_IN_MS,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: EXPIRES_IN_MS / 1000,
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
