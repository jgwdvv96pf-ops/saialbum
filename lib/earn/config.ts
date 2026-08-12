// Placeholder economics — tune freely, nothing else depends on the
// exact numbers. 100 points = ₱10 to start.
export const POINTS_TO_PHP_RATE = 0.1;
export const MIN_CASH_REDEEM_POINTS = 500; // ₱50 minimum, keeps per-payout effort sane
export const MIN_ITEM_REDEEM_POINTS = 200;

export function pointsToPhp(points: number): number {
  return Math.round(points * POINTS_TO_PHP_RATE * 100) / 100;
}
