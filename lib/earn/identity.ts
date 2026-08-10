import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { sql } from "@/lib/earn/db";

const SESSION_COOKIE = "earn_session";

export type EarnUser = {
  id: string;
  external_id: string;
  email: string | null;
  balance: number;
  spin_credits: number;
};

// Returns the signed-in Firebase user's uid + email, or null if
// nobody's signed in / the session cookie is invalid or expired.
// `users.external_id` is intentionally provider-agnostic — same
// column that would hold any other provider's user id.
export async function getSignedInUser(): Promise<{ uid: string; email: string | null } | null> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  if (!session) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

export async function getOrCreateUser(
  externalId: string,
  email: string | null
): Promise<EarnUser> {
  const existing = await sql`
    select id, external_id, email, balance, spin_credits from users where external_id = ${externalId}
  `;
  if (existing.length > 0) return existing[0] as EarnUser;

  const created = await sql`
    insert into users (external_id, email) values (${externalId}, ${email})
    on conflict (external_id) do update set external_id = excluded.external_id
    returning id, external_id, email, balance, spin_credits
  `;
  return created[0] as EarnUser;
}
