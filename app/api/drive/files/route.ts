import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listFolderFiles } from "@/lib/drive/google";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await listFolderFiles();
    return NextResponse.json({ files });
  } catch (err) {
    console.error("[drive files error]", err);
    const message = err instanceof Error ? err.message : "Failed to load Drive files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
