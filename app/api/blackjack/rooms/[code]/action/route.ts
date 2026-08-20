import { NextRequest, NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";
import { playAction, type PlayerAction } from "@/lib/blackjack/rounds";

const VALID: PlayerAction[] = ["hit", "stand", "double"];

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    const { action } = await req.json();
    if (!VALID.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    try {
      await playAction(params.code, result.user.id, action);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
