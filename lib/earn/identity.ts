import { cookies } from "next/headers";
import { sql } from "@/lib/earn/db";

const COOKIE_NAME = "earn_uid";

// PLACEHOLDER identity: a random id in a cookie, standing in for a
// real Firebase UID. `users.external_id` doesn't care where the
// string comes from — once Firebase Auth is wired in, swap this
// function's internals to read a verified Firebase token instead,
// and everything downstream (ledger, spins, redemptions) is unaffected.
export async function getOrCreateExternalId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}

export type EarnUser = {
  id: string;
  external_id: string;
  balance: number;
  spin_credits: number;
};

export async function getOrCreateUser(externalId: string): Promise<EarnUser> {
  const existing = await sql`
    select id, external_id, balance, spin_credits from users where external_id = ${externalId}
  `;
  if (existing.length > 0) return existing[0] as EarnUser;

  const created = await sql`
    insert into users (external_id) values (${externalId})
    on conflict (external_id) do update set external_id = excluded.external_id
    returning id, external_id, balance, spin_credits
  `;
  return created[0] as EarnUser;
}
