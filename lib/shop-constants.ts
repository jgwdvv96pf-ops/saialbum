// Kept separate from lib/shop.ts on purpose: lib/shop.ts pulls in the
// AWS SDK (server-only R2 client), and client components import
// CURRENCY — importing it from lib/shop.ts would bundle that
// server-only code into the browser.
export const CURRENCY = "₱";
