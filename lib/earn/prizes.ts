// Placeholder prize table. Swap labels/values for real ones once the
// points economy and shop-credit redemption are wired up — the wheel
// and spin logic don't care what a prize *means*, only its weight.
export type Prize = {
  id: string;
  label: string;
  points: number; // 0 for "try again"
  weight: number; // relative — doesn't need to sum to anything in particular
  color: string;
};

// Muted, alternating palette instead of a rainbow wheel — keeps it
// consistent with the rest of the site instead of looking like a
// generic prize-wheel plugin.
const COLORS = ["#161513", "#8B8A85", "#C9AA8C", "#4A5D53", "#B0554A"];

const RAW_PRIZES: Omit<Prize, "color">[] = [
  { id: "p5-a", label: "5 pts", points: 5, weight: 200 },
  { id: "try-a", label: "try again", points: 0, weight: 180 },
  { id: "p10-a", label: "10 pts", points: 10, weight: 160 },
  { id: "p15", label: "15 pts", points: 15, weight: 120 },
  { id: "p5-b", label: "5 pts", points: 5, weight: 100 },
  { id: "try-b", label: "try again", points: 0, weight: 90 },
  { id: "p20", label: "20 pts", points: 20, weight: 70 },
  { id: "p10-b", label: "10 pts", points: 10, weight: 50 },
  { id: "p25", label: "25 pts", points: 25, weight: 40 },
  { id: "try-c", label: "try again", points: 0, weight: 30 },
  { id: "p30", label: "30 pts", points: 30, weight: 20 },
  { id: "p50", label: "50 pts", points: 50, weight: 15 },
  { id: "credit50", label: "₱50 shop credit", points: 0, weight: 8 },
  { id: "p75", label: "75 pts", points: 75, weight: 6 },
  { id: "p100", label: "100 pts", points: 100, weight: 4 },
  { id: "jackpot", label: "₱500 JACKPOT", points: 0, weight: 1 },
];

export const PRIZES: Prize[] = RAW_PRIZES.map((p, i) => ({
  ...p,
  color: COLORS[i % COLORS.length],
}));

export const TOTAL_WEIGHT = PRIZES.reduce((sum, p) => sum + p.weight, 0);
