"use client";

import PlayingCard from "@/components/blackjack/Card";

type Card = { rank: string; suit: string };
export type Hand = {
  playerId: string;
  seatIndex: number;
  cards: Card[];
  bet: number;
  doubled: boolean;
  status: string;
  total: number;
  result: string | null;
  payout: number | null;
};
export type Player = { id: string; userId: string; displayName: string; seatIndex: number; balance: number };

export default function PlayerSeat({
  player,
  hand,
  isTurn,
  isMe,
  isHost,
}: {
  player: Player;
  hand: Hand | undefined;
  isTurn: boolean;
  isMe: boolean;
  isHost: boolean;
}) {
  return (
    <div
      className={`w-full rounded-md border bg-paper/95 p-2.5 shadow-sm backdrop-blur-sm transition sm:w-40 ${
        isTurn ? "border-ink ring-1 ring-ink" : "border-line"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-mono text-[11px] text-ink">
          {player.displayName}
          {isMe ? " (you)" : ""}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-fog">{player.balance}</span>
      </div>
      {isHost && <p className="font-mono text-[9px] text-fog">host</p>}

      {hand && hand.cards.length > 0 && (
        <>
          <div className="mt-1.5 flex gap-1">
            {hand.cards.map((c, i) => (
              <PlayingCard key={i} card={c} small />
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-fog">
            <span>
              {hand.bet}
              {hand.doubled ? "×2" : ""} · {hand.total}
            </span>
            <span
              className={
                hand.status === "bust" || hand.result === "lose"
                  ? "text-red-700"
                  : hand.result === "win" || hand.result === "blackjack_win"
                  ? "text-green-700"
                  : "text-fog"
              }
            >
              {hand.result
                ? hand.result === "blackjack_win"
                  ? `+${hand.payout}`
                  : hand.result === "win"
                  ? `+${hand.payout}`
                  : hand.result === "push"
                  ? "push"
                  : "lose"
                : hand.status}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
