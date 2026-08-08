import { NextRequest, NextResponse } from "next/server";
import { reorderProducts } from "@/lib/shop";
import { isAuthed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.some((k) => typeof k !== "string")) {
    return NextResponse.json({ error: "Missing or invalid ids" }, { status: 400 });
  }

  await reorderProducts(ids);
  return NextResponse.json({ ok: true });
}
