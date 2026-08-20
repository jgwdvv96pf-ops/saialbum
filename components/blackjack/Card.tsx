"use client";

type CardData = { rank: string; suit: string };

const RED_SUITS = ["♥", "♦"];

export default function PlayingCard({
  card,
  faceDown,
  small,
}: {
  card?: CardData;
  faceDown?: boolean;
  small?: boolean;
}) {
  const size = small ? "h-14 w-10 text-xs" : "h-20 w-14 text-sm";

  if (faceDown || !card) {
    return (
      <div
        className={`${size} shrink-0 animate-[deal_0.25s_ease-out] rounded-md border border-line bg-ink shadow-sm`}
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(250,250,247,0.06) 0px, rgba(250,250,247,0.06) 2px, transparent 2px, transparent 8px)",
        }}
      />
    );
  }

  const isRed = RED_SUITS.includes(card.suit);

  return (
    <div
      className={`${size} flex shrink-0 animate-[deal_0.25s_ease-out] flex-col justify-between rounded-md border border-line bg-paper px-1.5 py-1 font-mono font-semibold shadow-sm ${
        isRed ? "text-red-700" : "text-ink"
      }`}
    >
      <span>{card.rank}</span>
      <span className="self-end">{card.suit}</span>
    </div>
  );
}
