import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getThumbnail } from "@/lib/drive/google";

export async function GET(_req: Request, { params }: { params: { fileId: string } }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thumb = await getThumbnail(params.fileId);
    if (!thumb) {
      return NextResponse.json({ error: "No thumbnail available" }, { status: 404 });
    }
    return new NextResponse(thumb.body, {
      headers: {
        "Content-Type": thumb.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[drive thumbnail error]", err);
    return NextResponse.json({ error: "Failed to load thumbnail" }, { status: 500 });
  }
}
