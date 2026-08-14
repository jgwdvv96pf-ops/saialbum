import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listMessages, getMessageContent, markMessageRead } from "@/lib/mail/zoho";

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderId = req.nextUrl.searchParams.get("folderId");
  const messageId = req.nextUrl.searchParams.get("messageId");

  if (!folderId) {
    return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
  }

  try {
    if (messageId) {
      const content = await getMessageContent(folderId, messageId);
      await markMessageRead(folderId, messageId).catch(() => {});
      return NextResponse.json({ content });
    }

    const start = Number(req.nextUrl.searchParams.get("start") || "0");
    const limit = Number(req.nextUrl.searchParams.get("limit") || "25");
    const messages = await listMessages(folderId, { start, limit });
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[mail messages error]", err);
    const message = err instanceof Error ? err.message : "Failed to load mail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
