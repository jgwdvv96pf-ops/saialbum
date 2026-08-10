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
