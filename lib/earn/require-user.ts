import { NextResponse } from "next/server";
import { getSignedInUser, getOrCreateUser, type EarnUser } from "@/lib/earn/identity";

// Every earn API route needs the same "are you signed in" check —
// centralized here so each route just calls this once instead of
// repeating the 401 branch three times.
export async function requireEarnUser(): Promise<
  { user: EarnUser } | { error: NextResponse }
> {
  const signedIn = await getSignedInUser();
  if (!signedIn) {
    return {
      error: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    };
  }
  const user = await getOrCreateUser(signedIn.uid, signedIn.email);
  return { user };
}

// Wraps a route handler so any thrown error (bad env var, DB
// connection failure, etc.) comes back as {error: message} instead of
// a bare 500 with no body — that's what was making /earn hang on
// "loading..." with an unhelpful "Request failed (500)". Logs the
// full error server-side (visible in Vercel's function logs) either way.
export function withErrorHandling(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  return handler().catch((err) => {
    console.error("[earn API error]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  });
}
