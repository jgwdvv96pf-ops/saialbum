import { NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";
import { startBettingRound } from "@/lib/blackjack/rounds";

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    try {
      await startBettingRound(params.code, result.user.id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start round";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
