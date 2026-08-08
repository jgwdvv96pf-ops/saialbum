import { NextRequest, NextResponse } from "next/server";
import { deleteOrder, updateOrderStatus } from "@/lib/orders";
import { isAuthed } from "@/lib/auth";

const VALID_STATUSES = ["new", "confirmed", "fulfilled", "cancelled"];

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

  await updateOrderStatus(params.id, status);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteOrder(params.id);
  return NextResponse.json({ ok: true });
}
