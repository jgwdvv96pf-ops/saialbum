import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { findUserByEmail, adjustPoints } from "@/lib/earn/adjustments";
import { notifyPointAdjustment } from "@/lib/earn/discord-adjustments";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, points, reason } = await req.json();
  const delta = Number(points);

  if (!email || !Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: "Missing/invalid email or points" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "No user with that email" }, { status: 404 });
  }

  try {
    const trimmedReason = reason ? String(reason).slice(0, 300) : undefined;
    const result = await adjustPoints(user.id, delta, trimmedReason);

    await notifyPointAdjustment({
      email: user.email,
      points: delta,
      reason: trimmedReason ?? null,
      newBalance: result.balance,
    });

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Adjustment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
