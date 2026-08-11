import { withTransaction } from "@/lib/earn/db";
import { pickPrize } from "@/lib/earn/spin";
import type { Prize } from "@/lib/earn/prizes";

// Grants one spin credit for a (currently simulated) completed ad
// view. Locks the user row so two rapid-fire requests can't both
// read the same starting value and each add 1 when only one should
// count — not that it matters much for a simple increment, but the
// same lock pattern is what actually matters in spendCredit below.
export async function grantSpinCredit(userId: string): Promise<number> {
  return withTransaction(async (client) => {
    await client.query("select id from users where id = $1 for update", [userId]);
    const res = await client.query(
      "update users set spin_credits = spin_credits + 1 where id = $1 returning spin_credits",
      [userId]
    );
    // Record the ad view too, so there's an audit trail once the
    // real network's postback replaces this placeholder.
    await client.query(
      "insert into ad_views (user_id, verified) values ($1, true)",
      [userId]
    );
    return res.rows[0].spin_credits as number;
  });
}

export type SpinResult = {
  prize: Prize;
  index: number;
  balance: number;
  spinCredits: number;
};

// The real anti-cheat/anti-double-spend logic lives here: lock the
// row, verify there's actually a credit to spend, and only then pick
// a prize and update balance — all inside one transaction so a
// second concurrent request can't sneak in and spend the same credit
// before the first one commits.
export async function spendCreditAndSpin(userId: string): Promise<SpinResult> {
  return withTransaction(async (client) => {
    const locked = await client.query(
      "select spin_credits, balance from users where id = $1 for update",
      [userId]
    );
    if (locked.rows.length === 0) {
      throw new Error("User not found");
    }
    if (locked.rows[0].spin_credits <= 0) {
      throw new Error("No spin credits");
    }

    const { prize, index } = pickPrize();

    const updated = await client.query(
      `update users
       set spin_credits = spin_credits - 1, balance = balance + $1
       where id = $2
       returning balance, spin_credits`,
      [prize.points, userId]
    );

    await client.query(
      `insert into spins (user_id, prize_id, prize_label, points)
       values ($1, $2, $3, $4)`,
      [userId, prize.id, prize.label, prize.points]
    );

    return {
      prize,
      index,
      balance: updated.rows[0].balance,
      spinCredits: updated.rows[0].spin_credits,
    };
  });
}
