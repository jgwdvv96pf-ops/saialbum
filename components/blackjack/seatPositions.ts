// Percentage {left, top} positions fanning around the front/sides of
// the oval table, keyed by total seated player count. Hand-tuned
// rather than computed via trig — simpler to eyeball-adjust for a
// bounded set (max 6 players) than to get a formula looking right at
// every count.
const PRESETS: Record<number, { left: number; top: number }[]> = {
  1: [{ left: 50, top: 82 }],
  2: [
    { left: 28, top: 78 },
    { left: 72, top: 78 },
  ],
  3: [
    { left: 18, top: 72 },
    { left: 50, top: 86 },
    { left: 82, top: 72 },
  ],
  4: [
    { left: 12, top: 64 },
    { left: 37, top: 82 },
    { left: 63, top: 82 },
    { left: 88, top: 64 },
  ],
  5: [
    { left: 8, top: 55 },
    { left: 28, top: 76 },
    { left: 50, top: 86 },
    { left: 72, top: 76 },
    { left: 92, top: 55 },
  ],
  6: [
    { left: 6, top: 48 },
    { left: 24, top: 68 },
    { left: 40, top: 84 },
    { left: 60, top: 84 },
    { left: 76, top: 68 },
    { left: 94, top: 48 },
  ],
};

export function getSeatPosition(seatIndex: number, totalSeated: number): { left: number; top: number } {
  const clamped = Math.min(Math.max(totalSeated, 1), 6);
  const positions = PRESETS[clamped];
  return positions[Math.min(seatIndex, positions.length - 1)] || { left: 50, top: 80 };
}
