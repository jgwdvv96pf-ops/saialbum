import { NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";
import { createRedemption, listRedemptions, setRedemptionDiscordMessageId } from "@/lib/earn/redemptions";
import { postRedemptionMessage } from "@/lib/earn/discord-redemptions";
import { pointsToPhp, MIN_CASH_REDEEM_POINTS, MIN_ITEM_REDEEM_POINTS } from "@/lib/earn/config";
import { isAuthed } from "@/lib/auth";

// Admin only — this is the redemption queue, not something an
// ordinary signed-in earn user should be able to list.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const redemptions = await listRedemptions();
  return NextResponse.json({ redemptions });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    const body = await req.json();
    const { kind, points, itemLabel, gcashNumber, note } = body;

    if (kind !== "cash" && kind !== "item") {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    const pointsCost = Number(points);
    if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
      return NextResponse.json({ error: "Invalid points amount" }, { status: 400 });
    }
    if (pointsCost > result.user.balance) {
      return NextResponse.json({ error: "Not enough points" }, { status: 400 });
    }

    if (kind === "cash") {
      if (pointsCost < MIN_CASH_REDEEM_POINTS) {
        return NextResponse.json(
          { error: `Minimum ${MIN_CASH_REDEEM_POINTS} points for cash redemption` },
          { status: 400 }
        );
      }
      if (!gcashNumber?.trim()) {
        return NextResponse.json({ error: "GCash number required" }, { status: 400 });
      }
    } else {
      if (pointsCost < MIN_ITEM_REDEEM_POINTS) {
        return NextResponse.json(
          { error: `Minimum ${MIN_ITEM_REDEEM_POINTS} points for item redemption` },
          { status: 400 }
        );
      }
      if (!itemLabel?.trim()) {
        return NextResponse.json({ error: "Item description required" }, { status: 400 });
      }
    }

    try {
      const redemption = await createRedemption({
        userId: result.user.id,
        kind,
        pointsCost,
        payoutPhp: kind === "cash" ? pointsToPhp(pointsCost) : undefined,
        itemLabel: kind === "item" ? itemLabel.trim().slice(0, 200) : undefined,
        gcashNumber: kind === "cash" ? gcashNumber.trim().slice(0, 40) : undefined,
        note: note ? String(note).trim().slice(0, 300) : undefined,
      });

      const messageId = await postRedemptionMessage(redemption, result.user.email);
      if (messageId) {
        await setRedemptionDiscordMessageId(redemption.id, messageId);
        // keep the returned object in sync for the client, though it's
        // not strictly needed since the client doesn't render this id
      }

      return NextResponse.json({ ok: true, redemption });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Redemption failed";
      const status = message === "Not enough points" ? 400 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
