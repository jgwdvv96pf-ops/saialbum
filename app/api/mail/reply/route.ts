import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { sendReplyOrForward } from "@/lib/mail/zoho";
import { wrapEmailBody } from "@/lib/mail/template";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId, action, to, subject, content } = await req.json();

  if (!messageId || (action !== "reply" && action !== "forward")) {
    return NextResponse.json({ error: "Missing/invalid messageId or action" }, { status: 400 });
  }
  if (!to?.trim() || !subject?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const fromAddress = process.env.ZOHO_MAIL_FROM_ADDRESS;
  if (!fromAddress) {
    return NextResponse.json({ error: "ZOHO_MAIL_FROM_ADDRESS not configured" }, { status: 500 });
  }

  try {
    await sendReplyOrForward({
      messageId,
      action,
      fromAddress,
      to: to.trim(),
      subject: subject.trim(),
      content: wrapEmailBody(content),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mail reply error]", err);
    const message = err instanceof Error ? err.message : "Failed to send";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
