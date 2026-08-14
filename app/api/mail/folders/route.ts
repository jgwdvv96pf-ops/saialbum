import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listFolders } from "@/lib/mail/zoho";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const folders = await listFolders();
    return NextResponse.json({ folders });
  } catch (err) {
    console.error("[mail folders error]", err);
    const message = err instanceof Error ? err.message : "Failed to load folders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
