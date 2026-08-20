import { NextRequest, NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";
import { createRoom } from "@/lib/blackjack/rooms";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    const { displayName } = await req.json().catch(() => ({ displayName: undefined }));
    const name = displayName?.trim() || result.user.email?.split("@")[0] || "player";

    const room = await createRoom(result.user.id, name.slice(0, 40));
    return NextResponse.json({ code: room.code });
  });
}
