import { PRIZES, TOTAL_WEIGHT, type Prize } from "@/lib/earn/prizes";

// Weighted random pick. Lives server-side on purpose: the client
// should never be trusted to say "I won the jackpot" — it only
// receives an index from here and animates the wheel to match.
export function pickPrize(): { prize: Prize; index: number } {
  let roll = Math.random() * TOTAL_WEIGHT;

  for (let i = 0; i < PRIZES.length; i++) {
    roll -= PRIZES[i].weight;
    if (roll <= 0) {
      return { prize: PRIZES[i], index: i };
    }
  }

  // Floating point edge case — fall back to the last prize.
  const lastIndex = PRIZES.length - 1;
  return { prize: PRIZES[lastIndex], index: lastIndex };
}
