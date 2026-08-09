import { NextRequest, NextResponse } from "next/server";
import { reorderManifest } from "@/lib/manifest";
import { isAuthed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keys } = await req.json();
  if (!Array.isArray(keys) || keys.some((k) => typeof k !== "string")) {
    return NextResponse.json({ error: "Missing or invalid keys" }, { status: 400 });
  }

  await reorderManifest(keys);

  return NextResponse.json({ ok: true });
}
