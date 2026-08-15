import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { searchMessages } from "@/lib/mail/zoho";

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q?.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const start = Number(req.nextUrl.searchParams.get("start") || "1");
  const limit = Number(req.nextUrl.searchParams.get("limit") || "25");

  try {
    const messages = await searchMessages(q.trim(), { start, limit });
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[mail search error]", err);
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
