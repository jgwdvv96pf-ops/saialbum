import { NextRequest, NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";
import { placeBet } from "@/lib/blackjack/rounds";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    const { amount } = await req.json();

    try {
      await placeBet(params.code, result.user.id, Number(amount));
      return NextResponse.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place bet";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
