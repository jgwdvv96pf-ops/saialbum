import { randomInt } from "crypto";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Card = { rank: Rank; suit: Suit };

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Two decks combined (104 cards) — a 6-player table hitting freely
// could plausibly exhaust a single 52-card deck mid-round; this
// keeps real margin without the complexity of a proper multi-deck
// shoe + cut card + reshuffle-mid-round.
const DECK_COUNT = 2;

export function createShoe(): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < DECK_COUNT; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit });
      }
    }
  }
  return shoe;
}

// Fisher-Yates using crypto.randomInt (cryptographically secure) —
// Math.random() is explicitly not okay for shuffling anything that
// resolves real balance changes, per the "secure server-side
// randomness for shuffling/dealing" requirement.
export function secureShuffle<T>(deck: T[]): T[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawCard(deck: Card[]): { card: Card; remaining: Card[] } {
  if (deck.length === 0) {
    // Reshuffle a fresh shoe if the deck is somehow exhausted —
    // shouldn't happen at 104 cards for a 6-player table, but never
    // crash a live round over it.
    const fresh = secureShuffle(createShoe());
    return { card: fresh[0], remaining: fresh.slice(1) };
  }
  return { card: deck[0], remaining: deck.slice(1) };
}

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces += 1;
      total += 11;
    } else if (c.rank === "K" || c.rank === "Q" || c.rank === "J") {
      total += 10;
    } else {
      total += Number(c.rank);
    }
  }
  let soft = aces > 0;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
    if (aces === 0) soft = false;
  }
  return { total, soft };
}

export function isBust(cards: Card[]): boolean {
  return handValue(cards).total > 21;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

// Dealer stands on all 17s (including soft 17) — the simpler of the
// two common standard variants (the other being "hits soft 17").
// Picked for implementation clarity; flag if you'd rather it hit
// soft 17, it's a one-line change here.
export function dealerShouldHit(dealerHand: Card[]): boolean {
  return handValue(dealerHand).total < 17;
}

export type HandResult = "win" | "lose" | "push" | "blackjack_win";

// Payout is the TOTAL credited back to balance (not net) — 0 for a
// loss, the bet back for a push, 2x for a regular win, 2.5x for
// blackjack. Floored to keep balances integer; a fractional half-unit
// on an odd blackjack bet is lost to rounding, not to the house
// deliberately — negligible at play-money stakes.
export function resolveHand(
  playerCards: Card[],
  dealerCards: Card[],
  bet: number
): { result: HandResult; payout: number } {
  const playerBJ = isBlackjack(playerCards);
  const dealerBJ = isBlackjack(dealerCards);
  const playerBust = isBust(playerCards);
  const dealerBust = isBust(dealerCards);
  const playerTotal = handValue(playerCards).total;
  const dealerTotal = handValue(dealerCards).total;

  if (playerBust) return { result: "lose", payout: 0 };
  if (playerBJ && dealerBJ) return { result: "push", payout: bet };
  if (playerBJ) return { result: "blackjack_win", payout: Math.floor(bet * 2.5) };
  if (dealerBJ) return { result: "lose", payout: 0 };
  if (dealerBust) return { result: "win", payout: bet * 2 };
  if (playerTotal > dealerTotal) return { result: "win", payout: bet * 2 };
  if (playerTotal < dealerTotal) return { result: "lose", payout: 0 };
  return { result: "push", payout: bet };
}

// Deterministic contextual lines, randomly picked per event — no LLM,
// commentary never touches game state, purely presentational.
const COMMENTARY: Record<string, string[]> = {
  roundStart: ["place your bets.", "here we go.", "cards are cold tonight — good luck."],
  playerBlackjack: ["blackjack. nicely done.", "twenty-one off the deal. can't teach that.", "well, that was fast."],
  playerBust: ["ouch. that's a bust.", "should've stood.", "the house thanks you for that one."],
  playerStandLow: ["you really stood on that?", "bold. we'll see.", "confidence, I respect it."],
  playerStandHigh: ["safe play.", "smart. no need to push it.", "that'll do."],
  dealerBust: ["dealer busts. house loses this one.", "well — that's on me.", "not my night, apparently."],
  dealerBlackjack: ["dealer blackjack. tough beat.", "house draws twenty-one. sorry, table.", "that's a rough one for everyone."],
  push: ["push. nobody wins, nobody loses.", "a tie. anticlimactic, I know."],
  roundEnd: ["that's the round. shuffle up for the next one whenever you're ready.", "good round. table's open for another."],
};

export function pickCommentary(event: keyof typeof COMMENTARY): string {
  const lines = COMMENTARY[event] || [];
  if (lines.length === 0) return "";
  return lines[Math.floor(Math.random() * lines.length)];
}
