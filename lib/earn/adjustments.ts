import { sql, withTransaction } from "@/lib/earn/db";

export type AdminUserLookup = {
  id: string;
  external_id: string;
  email: string | null;
  balance: number;
  spin_credits: number;
};

export type PointAdjustment = {
  id: string;
  user_id: string;
  points: number;
  reason: string | null;
  created_at: string;
  email?: string | null;
};

export async function findUserByEmail(email: string): Promise<AdminUserLookup | null> {
  const rows = await sql`
    select id, external_id, email, balance, spin_credits from users where email = ${email}
  `;
  return (rows[0] as AdminUserLookup) || null;
}

// Positive points = giveaway/credit, negative = correction/deduction.
// Locks the row so this can never race with a spin or redemption
// touching the same balance concurrently.
export async function adjustPoints(
  userId: string,
  points: number,
  reason?: string
): Promise<{ balance: number }> {
  return withTransaction(async (client) => {
    const locked = await client.query("select balance from users where id = $1 for update", [
      userId,
    ]);
    if (locked.rows.length === 0) throw new Error("User not found");

    const newBalance = locked.rows[0].balance + points;
    if (newBalance < 0) {
      throw new Error("That would take the balance below zero");
    }

    const updated = await client.query(
      "update users set balance = $1 where id = $2 returning balance",
      [newBalance, userId]
    );

    await client.query(
      "insert into point_adjustments (user_id, points, reason) values ($1, $2, $3)",
      [userId, points, reason || null]
    );

    return { balance: updated.rows[0].balance };
  });
}

export async function listRecentAdjustments(limit = 50): Promise<PointAdjustment[]> {
  const rows = await sql`
    select a.*, u.email
    from point_adjustments a
    join users u on u.id = a.user_id
    order by a.created_at desc
    limit ${limit}
  `;
  return rows as PointAdjustment[];
}
