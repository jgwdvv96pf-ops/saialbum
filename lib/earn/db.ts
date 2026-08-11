import { neon, Pool, type PoolClient } from "@neondatabase/serverless";

// Lightweight one-shot queries (reads) — lower latency, no connection
// management needed. Don't use this for anything that needs to be
// atomic across multiple statements.
export const sql = neon(process.env.DATABASE_URL as string);

// For anything that touches balance/spin_credits: acquire a client,
// wrap in BEGIN/COMMIT, and use `SELECT ... FOR UPDATE` to lock the
// row before reading it. This is what actually prevents two
// concurrent spins from double-spending the same credit.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
