import { PoolClient } from "@neondatabase/serverless";
import { sql, withTransaction } from "@/lib/earn/db";
import { getRoomByCode } from "@/lib/blackjack/rooms";
import {
  createShoe,
  secureShuffle,
  drawCard,
  handValue,
  isBust,
  isBlackjack,
  dealerShouldHit,
  resolveHand,
  pickCommentary,
  type Card,
} from "@/lib/blackjack/engine";

async function getPlayerInRoom(client: PoolClient, roomId: string, userId: string) {
  const res = await client.query(
    `select * from blackjack_players where room_id = $1 and user_id = $2 and left_at is null`,
    [roomId, userId]
  );
  return res.rows[0] || null;
}

async function getActiveRound(client: PoolClient, roomId: string) {
  const res = await client.query(
    `select * from blackjack_rounds where room_id = $1 and status != 'resolved' order by created_at desc limit 1 for update`,
    [roomId]
  );
  return res.rows[0] || null;
}

export async function startBettingRound(roomCode: string, userId: string) {
  return withTransaction(async (client) => {
    const roomRes = await client.query(
      `select * from blackjack_rooms where code = $1 for update`,
      [roomCode.toUpperCase()]
    );
    const room = roomRes.rows[0];
    if (!room) throw new Error("Room not found");
    if (room.host_user_id !== userId) throw new Error("Only the host can start a round");

    const existing = await getActiveRound(client, room.id);
    if (existing) throw new Error("A round is already in progress");

    const deck = secureShuffle(createShoe());
    const round = await client.query(
      `insert into blackjack_rounds (room_id, status, deck, dealer_message)
       values ($1, 'betting', $2, $3) returning *`,
      [room.id, JSON.stringify(deck), pickCommentary("roundStart")]
    );
    await client.query(`update blackjack_rooms set status = 'in_round' where id = $1`, [room.id]);
    return round.rows[0];
  });
}

export async function placeBet(roomCode: string, userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid bet");

  return withTransaction(async (client) => {
    const room = (await client.query(`select * from blackjack_rooms where code = $1`, [roomCode.toUpperCase()])).rows[0];
    if (!room) throw new Error("Room not found");

    const player = await getPlayerInRoom(client, room.id, userId);
    if (!player) throw new Error("You're not seated at this table");

    const round = await getActiveRound(client, room.id);
    if (!round || round.status !== "betting") throw new Error("Betting is closed for this round");

    // Refund any previous bet this player placed this round before
    // charging the new one — lets someone change their bet before
    // the deal without losing points to a stale hold.
    const existingHand = await client.query(
      `select * from blackjack_hands where round_id = $1 and player_id = $2 for update`,
      [round.id, player.id]
    );
    if (existingHand.rows.length > 0) {
      await client.query(`update users set balance = balance + $1 where id = $2`, [
        existingHand.rows[0].bet,
        userId,
      ]);
    }

    const userRes = await client.query(`select balance from users where id = $1 for update`, [userId]);
    if (userRes.rows[0].balance < amount) throw new Error("Not enough points");

    await client.query(`update users set balance = balance - $1 where id = $2`, [amount, userId]);

    if (existingHand.rows.length > 0) {
      await client.query(`update blackjack_hands set bet = $1 where id = $2`, [amount, existingHand.rows[0].id]);
    } else {
      await client.query(
        `insert into blackjack_hands (round_id, player_id, bet, cards, status) values ($1, $2, $3, '[]', 'active')`,
        [round.id, player.id, amount]
      );
    }
  });
}

export async function dealCards(roomCode: string, userId: string) {
  return withTransaction(async (client) => {
    const room = (await client.query(`select * from blackjack_rooms where code = $1 for update`, [roomCode.toUpperCase()])).rows[0];
    if (!room) throw new Error("Room not found");
    if (room.host_user_id !== userId) throw new Error("Only the host can deal");

    const round = await getActiveRound(client, room.id);
    if (!round || round.status !== "betting") throw new Error("Not in betting phase");

    const hands = await client.query(
      `select h.*, p.seat_index from blackjack_hands h
       join blackjack_players p on p.id = h.player_id
       where h.round_id = $1 order by p.seat_index`,
      [round.id]
    );
    if (hands.rows.length === 0) throw new Error("Nobody has placed a bet yet");

    let deck: Card[] = round.deck;

    // Two cards each, in the usual round-robin deal order, dealer last.
    const dealtCards: Record<string, Card[]> = {};
    for (const h of hands.rows) dealtCards[h.id] = [];
    for (let pass = 0; pass < 2; pass++) {
      for (const h of hands.rows) {
        const { card, remaining } = drawCard(deck);
        deck = remaining;
        dealtCards[h.id].push(card);
      }
    }
    let dealerHand: Card[] = [];
    for (let i = 0; i < 2; i++) {
      const { card, remaining } = drawCard(deck);
      deck = remaining;
      dealerHand.push(card);
    }

    for (const h of hands.rows) {
      const cards = dealtCards[h.id];
      const status = isBlackjack(cards) ? "blackjack" : "active";
      await client.query(`update blackjack_hands set cards = $1, status = $2 where id = $3`, [
        JSON.stringify(cards),
        status,
        h.id,
      ]);
    }

    // First seat with a hand that isn't an instant blackjack gets the turn.
    const firstToAct = hands.rows.find((h: any) => !isBlackjack(dealtCards[h.id]));

    await client.query(
      `update blackjack_rounds
       set status = $1, deck = $2, dealer_hand = $3, turn_seat_index = $4
       where id = $5`,
      [
        firstToAct ? "player_turns" : "dealer_turn",
        JSON.stringify(deck),
        JSON.stringify(dealerHand),
        firstToAct ? firstToAct.seat_index : null,
        round.id,
      ]
    );

    if (!firstToAct) {
      await resolveDealerAndHands(client, round.id, room.id);
    }
  });
}

export type PlayerAction = "hit" | "stand" | "double";

export async function playAction(roomCode: string, userId: string, action: PlayerAction) {
  return withTransaction(async (client) => {
    const room = (await client.query(`select * from blackjack_rooms where code = $1`, [roomCode.toUpperCase()])).rows[0];
    if (!room) throw new Error("Room not found");

    const player = await getPlayerInRoom(client, room.id, userId);
    if (!player) throw new Error("You're not seated at this table");

    const round = await getActiveRound(client, room.id);
    if (!round || round.status !== "player_turns") throw new Error("It's not the player-action phase");
    if (round.turn_seat_index !== player.seat_index) throw new Error("It's not your turn");

    const handRes = await client.query(
      `select * from blackjack_hands where round_id = $1 and player_id = $2 for update`,
      [round.id, player.id]
    );
    const hand = handRes.rows[0];
    if (!hand || hand.status !== "active") throw new Error("No active hand to act on");

    let deck: Card[] = round.deck;
    let cards: Card[] = hand.cards;
    let newStatus = hand.status;
    let newBet = hand.bet;
    let doubled = hand.doubled;

    if (action === "hit") {
      const { card, remaining } = drawCard(deck);
      deck = remaining;
      cards = [...cards, card];
      if (isBust(cards)) newStatus = "bust";
    } else if (action === "stand") {
      newStatus = "stood";
    } else if (action === "double") {
      if (cards.length !== 2) throw new Error("Can only double on your first two cards");
      const userRes = await client.query(`select balance from users where id = $1 for update`, [userId]);
      if (userRes.rows[0].balance < hand.bet) throw new Error("Not enough points to double");
      await client.query(`update users set balance = balance - $1 where id = $2`, [hand.bet, userId]);
      newBet = hand.bet * 2;
      doubled = true;
      const { card, remaining } = drawCard(deck);
      deck = remaining;
      cards = [...cards, card];
      newStatus = isBust(cards) ? "bust" : "stood"; // double forces exactly one card, then done
    }

    await client.query(
      `update blackjack_hands set cards = $1, status = $2, bet = $3, doubled = $4 where id = $5`,
      [JSON.stringify(cards), newStatus, newBet, doubled, hand.id]
    );

    // Find the next seat (in order) with a still-active hand.
    const remainingHands = await client.query(
      `select h.status, p.seat_index from blackjack_hands h
       join blackjack_players p on p.id = h.player_id
       where h.round_id = $1 and h.status = 'active'
       order by p.seat_index`,
      [round.id]
    );
    const next = remainingHands.rows.find((h: any) => h.seat_index > player.seat_index) || remainingHands.rows[0];

    if (next) {
      await client.query(`update blackjack_rounds set deck = $1, turn_seat_index = $2 where id = $3`, [
        JSON.stringify(deck),
        next.seat_index,
        round.id,
      ]);
    } else {
      await client.query(`update blackjack_rounds set deck = $1, turn_seat_index = null, status = 'dealer_turn' where id = $2`, [
        JSON.stringify(deck),
        round.id,
      ]);
      await resolveDealerAndHands(client, round.id, room.id);
    }
  });
}

async function resolveDealerAndHands(client: PoolClient, roundId: string, roomId: string) {
  const round = (await client.query(`select * from blackjack_rounds where id = $1 for update`, [roundId])).rows[0];
  let deck: Card[] = round.deck;
  let dealerHand: Card[] = round.dealer_hand;

  const hands = (
    await client.query(
      `select h.*, p.seat_index from blackjack_hands h
       join blackjack_players p on p.id = h.player_id
       where h.round_id = $1 order by p.seat_index`,
      [roundId]
    )
  ).rows;

  // If every hand already busted, the dealer doesn't need to draw
  // further (standard rule — no reason to risk/reveal more than needed,
  // though the hole card still reveals for transparency).
  const anyoneStillIn = hands.some((h: any) => h.status !== "bust");
  if (anyoneStillIn) {
    while (dealerShouldHit(dealerHand)) {
      const { card, remaining } = drawCard(deck);
      deck = remaining;
      dealerHand = [...dealerHand, card];
    }
  }

  const dealerBJ = isBlackjack(dealerHand);
  const dealerBust = isBust(dealerHand);

  for (const h of hands) {
    if (h.status === "bust") {
      await client.query(`update blackjack_hands set result = 'lose', payout = 0 where id = $1`, [h.id]);
      continue;
    }
    const { result, payout } = resolveHand(h.cards, dealerHand, h.bet);
    if (payout > 0) {
      const owner = await client.query(`select user_id from blackjack_players where id = $1`, [h.player_id]);
      await client.query(`update users set balance = balance + $1 where id = $2`, [
        payout,
        owner.rows[0].user_id,
      ]);
    }
    await client.query(`update blackjack_hands set result = $1, payout = $2 where id = $3`, [result, payout, h.id]);
  }

  const message = dealerBust
    ? pickCommentary("dealerBust")
    : dealerBJ
    ? pickCommentary("dealerBlackjack")
    : pickCommentary("roundEnd");

  await client.query(
    `update blackjack_rounds
     set status = 'resolved', dealer_hand = $1, deck = $2, dealer_hole_revealed = true, dealer_message = $3, resolved_at = now()
     where id = $4`,
    [JSON.stringify(dealerHand), JSON.stringify(deck), message, roundId]
  );
  await client.query(`update blackjack_rooms set status = 'waiting' where id = $1`, [roomId]);
}

export type RoomState = {
  code: string;
  hostUserId: string;
  status: string;
  players: {
    id: string;
    userId: string;
    displayName: string;
    seatIndex: number;
    balance: number;
  }[];
  round: {
    id: string;
    status: string;
    turnSeatIndex: number | null;
    dealerHand: Card[]; // hole card omitted (not nulled — omitted) pre-reveal
    dealerHoleRevealed: boolean;
    dealerTotal: number | null; // null while hole card is hidden
    dealerMessage: string | null;
    hands: {
      playerId: string;
      seatIndex: number;
      cards: Card[];
      bet: number;
      doubled: boolean;
      status: string;
      total: number;
      result: string | null;
      payout: number | null;
    }[];
  } | null;
};

// This is the one function every poll hits — it's the boundary where
// "server truth" becomes "what the client is allowed to see". The
// deck NEVER appears here under any circumstance, and the dealer's
// second card is withheld entirely (not just flagged) until
// dealer_hole_revealed flips true.
export async function getRoomState(code: string): Promise<RoomState | null> {
  const room = await getRoomByCode(code);
  if (!room) return null;

  const players = await sql`
    select p.*, u.balance from blackjack_players p
    join users u on u.id = p.user_id
    where p.room_id = ${room.id} and p.left_at is null
    order by p.seat_index
  `;

  const roundRows = await sql`
    select * from blackjack_rounds where room_id = ${room.id} order by created_at desc limit 1
  `;
  const round = roundRows[0] as any;

  let roundState: RoomState["round"] = null;
  if (round && round.status !== "betting") {
    const handRows = await sql`
      select h.*, p.seat_index from blackjack_hands h
      join blackjack_players p on p.id = h.player_id
      where h.round_id = ${round.id}
      order by p.seat_index
    `;

    const dealerHandFull: Card[] = round.dealer_hand;
    const dealerHand = round.dealer_hole_revealed ? dealerHandFull : dealerHandFull.slice(0, 1);

    roundState = {
      id: round.id,
      status: round.status,
      turnSeatIndex: round.turn_seat_index,
      dealerHand,
      dealerHoleRevealed: round.dealer_hole_revealed,
      dealerTotal: round.dealer_hole_revealed ? handValue(dealerHandFull).total : null,
      dealerMessage: round.dealer_message,
      hands: (handRows as any[]).map((h) => ({
        playerId: h.player_id,
        seatIndex: h.seat_index,
        cards: h.cards,
        bet: h.bet,
        doubled: h.doubled,
        status: h.status,
        total: handValue(h.cards).total,
        result: h.result,
        payout: h.payout,
      })),
    };
  } else if (round && round.status === "betting") {
    // Betting phase — show that a round is open (so the UI can render
    // bet inputs) but there's nothing to reveal yet.
    const handRows = await sql`
      select h.*, p.seat_index from blackjack_hands h
      join blackjack_players p on p.id = h.player_id
      where h.round_id = ${round.id}
      order by p.seat_index
    `;
    roundState = {
      id: round.id,
      status: round.status,
      turnSeatIndex: null,
      dealerHand: [],
      dealerHoleRevealed: false,
      dealerTotal: null,
      dealerMessage: round.dealer_message,
      hands: (handRows as any[]).map((h) => ({
        playerId: h.player_id,
        seatIndex: h.seat_index,
        cards: [],
        bet: h.bet,
        doubled: h.doubled,
        status: h.status,
        total: 0,
        result: null,
        payout: null,
      })),
    };
  }

  return {
    code: room.code,
    hostUserId: room.host_user_id,
    status: room.status,
    players: (players as any[]).map((p) => ({
      id: p.id,
      userId: p.user_id,
      displayName: p.display_name,
      seatIndex: p.seat_index,
      balance: p.balance,
    })),
    round: roundState,
  };
}
