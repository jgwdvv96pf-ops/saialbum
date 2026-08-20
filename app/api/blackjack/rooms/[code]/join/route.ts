import { NextRequest, NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";
import { joinRoom } from "@/lib/blackjack/rooms";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    const { displayName } = await req.json().catch(() => ({ displayName: undefined }));
    const name = displayName?.trim() || result.user.email?.split("@")[0] || "player";

    try {
      const { player } = await joinRoom(params.code, result.user.id, name.slice(0, 40));
      return NextResponse.json({ ok: true, seatIndex: player.seat_index });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
