import { NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";
import { dealCards } from "@/lib/blackjack/rounds";

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    try {
      await dealCards(params.code, result.user.id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to deal";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
