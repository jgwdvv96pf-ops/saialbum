import { sql, withTransaction } from "@/lib/earn/db";

// Excludes visually ambiguous characters (0/O, 1/I) since this code
// gets shared and typed into URLs by hand sometimes.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_PLAYERS = 6;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function createRoom(hostUserId: string, hostDisplayName: string) {
  // Retry on the (very unlikely) chance of a code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      return await withTransaction(async (client) => {
        const room = await client.query(
          `insert into blackjack_rooms (code, host_user_id) values ($1, $2) returning *`,
          [code, hostUserId]
        );
        await client.query(
          `insert into blackjack_players (room_id, user_id, display_name, seat_index) values ($1, $2, $3, 0)`,
          [room.rows[0].id, hostUserId, hostDisplayName]
        );
        return room.rows[0];
      });
    } catch (err: any) {
      if (err?.code === "23505") continue; // unique_violation on code — retry with a new one
      throw err;
    }
  }
  throw new Error("Failed to create room — try again");
}

export async function getRoomByCode(code: string) {
  const rows = await sql`select * from blackjack_rooms where code = ${code.toUpperCase()}`;
  return rows[0] || null;
}

// Locks the room row so two people clicking "join" at the same
// instant can't both grab the same seat index.
export async function joinRoom(code: string, userId: string, displayName: string) {
  return withTransaction(async (client) => {
    const roomRes = await client.query(
      `select * from blackjack_rooms where code = $1 for update`,
      [code.toUpperCase()]
    );
    const room = roomRes.rows[0];
    if (!room) throw new Error("Room not found");
    if (room.status === "closed") throw new Error("This room has closed");

    const existing = await client.query(
      `select * from blackjack_players where room_id = $1 and user_id = $2`,
      [room.id, userId]
    );
    if (existing.rows.length > 0) {
      // Already seated (e.g. reopening the link) — just re-confirm, don't double-seat.
      return { room, player: existing.rows[0] };
    }

    const seated = await client.query(
      `select seat_index from blackjack_players where room_id = $1 and left_at is null order by seat_index`,
      [room.id]
    );
    if (seated.rows.length >= MAX_PLAYERS) {
      throw new Error("Room is full");
    }
    const takenSeats = new Set(seated.rows.map((r: any) => r.seat_index));
    let seatIndex = 0;
    while (takenSeats.has(seatIndex)) seatIndex++;

    const player = await client.query(
      `insert into blackjack_players (room_id, user_id, display_name, seat_index) values ($1, $2, $3, $4) returning *`,
      [room.id, userId, displayName, seatIndex]
    );

    return { room, player: player.rows[0] };
  });
}

export async function getPlayers(roomId: string) {
  return sql`
    select * from blackjack_players where room_id = ${roomId} and left_at is null order by seat_index
  `;
}
