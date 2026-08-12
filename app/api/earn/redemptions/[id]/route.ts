import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { updateRedemptionStatus, type RedemptionStatus } from "@/lib/earn/redemptions";

const VALID_STATUSES: RedemptionStatus[] = ["pending", "approved", "rejected", "paid"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await req.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateRedemptionStatus(params.id, status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, redemption: updated });
}
