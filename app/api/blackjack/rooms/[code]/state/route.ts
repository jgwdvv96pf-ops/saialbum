import { NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";
import { getRoomState } from "@/lib/blackjack/rounds";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    const state = await getRoomState(params.code);
    if (!state) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ state, you: result.user.id });
  });
}
