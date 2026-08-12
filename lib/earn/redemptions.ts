import { sql, withTransaction } from "@/lib/earn/db";
import { editRedemptionMessage } from "@/lib/earn/discord-redemptions";

export type RedemptionKind = "cash" | "item";
export type RedemptionStatus = "pending" | "approved" | "rejected" | "paid";

export type Redemption = {
  id: string;
  user_id: string;
  kind: RedemptionKind;
  points_cost: number;
  payout_php: number | null;
  item_label: string | null;
  gcash_number: string | null;
  status: RedemptionStatus;
  discord_message_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  // joined for display, not a real column
  buyer_email?: string | null;
};

const ACTIVE_STATUSES: RedemptionStatus[] = ["pending", "approved", "paid"];

// Creates the redemption AND deducts the points in one transaction —
// the hold happens immediately on request, not on approval. This is
// what stops someone from requesting the same points twice before
// you've had a chance to act on the first request.
export async function createRedemption(params: {
  userId: string;
  kind: RedemptionKind;
  pointsCost: number;
  payoutPhp?: number;
  itemLabel?: string;
  gcashNumber?: string;
  note?: string;
}): Promise<Redemption> {
  return withTransaction(async (client) => {
    const locked = await client.query(
      "select balance from users where id = $1 for update",
      [params.userId]
    );
    if (locked.rows.length === 0) throw new Error("User not found");
    if (locked.rows[0].balance < params.pointsCost) {
      throw new Error("Not enough points");
    }

    await client.query("update users set balance = balance - $1 where id = $2", [
      params.pointsCost,
      params.userId,
    ]);

    const inserted = await client.query(
      `insert into redemptions (user_id, kind, points_cost, payout_php, item_label, gcash_number, note)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        params.userId,
        params.kind,
        params.pointsCost,
        params.payoutPhp ?? null,
        params.itemLabel ?? null,
        params.gcashNumber ?? null,
        params.note ?? null,
      ]
    );

    return inserted.rows[0] as Redemption;
  });
}

export async function getRedemption(id: string): Promise<Redemption | null> {
  const rows = await sql`select * from redemptions where id = ${id}`;
  return (rows[0] as Redemption) || null;
}

export async function listRedemptions(): Promise<Redemption[]> {
  const rows = await sql`
    select r.*, u.email as buyer_email
    from redemptions r
    join users u on u.id = r.user_id
    order by r.created_at desc
  `;
  return rows as Redemption[];
}

export async function listRedemptionsForUser(userId: string): Promise<Redemption[]> {
  const rows = await sql`
    select * from redemptions where user_id = ${userId} order by created_at desc
  `;
  return rows as Redemption[];
}

// Rejecting refunds the held points. Approving/paying doesn't change
// the balance further — it was already deducted at request time.
export async function updateRedemptionStatus(
  id: string,
  status: RedemptionStatus,
  opts: { skipDiscordSync?: boolean } = {}
): Promise<Redemption | null> {
  const updated = await withTransaction(async (client) => {
    const current = await client.query("select * from redemptions where id = $1 for update", [id]);
    if (current.rows.length === 0) return null;
    const redemption = current.rows[0] as Redemption;

    const wasActive = ACTIVE_STATUSES.includes(redemption.status);

    // Only refund on a genuine active -> rejected transition, so
    // clicking reject twice (or rejecting an already-rejected one)
    // never double-refunds.
    if (wasActive && status === "rejected" && redemption.status !== "rejected") {
      await client.query("update users set balance = balance + $1 where id = $2", [
        redemption.points_cost,
        redemption.user_id,
      ]);
    }

    const result = await client.query(
      "update redemptions set status = $1, updated_at = now() where id = $2 returning *",
      [status, id]
    );
    return result.rows[0] as Redemption;
  });

  if (updated && !opts.skipDiscordSync) {
    const emailRows = await sql`select email from users where id = ${updated.user_id}`;
    const email = (emailRows[0] as { email: string | null } | undefined)?.email ?? null;
    await editRedemptionMessage(updated, email);
  }

  return updated;
}

export async function setRedemptionDiscordMessageId(
  id: string,
  discordMessageId: string
): Promise<void> {
  await sql`update redemptions set discord_message_id = ${discordMessageId} where id = ${id}`;
}
